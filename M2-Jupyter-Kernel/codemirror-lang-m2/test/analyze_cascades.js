/**
 * Cascade-origin attribution: for each body_boundary / callitems_boundary
 * root-cause error, find the EARLIEST error in the same file and classify it.
 * This reveals what upstream parse failures cause the cascade.
 *
 * Usage:  node test/analyze_cascades.js
 */

import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyFile } from './doc_detection.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Helpers (shared with analyze_roots.js)
// ============================================================
function findFiles(dir, ext, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findFiles(fullPath, ext, results);
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

function getLineNumber(code, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

function getLineAt(code, offset) {
  let start = offset;
  while (start > 0 && code[start - 1] !== '\n') start--;
  let end = offset;
  while (end < code.length && code[end] !== '\n') end++;
  return code.slice(start, end);
}

function findBareEnd(code) {
  const lines = code.split('\n');
  let offset = 0;
  for (const line of lines) {
    if (/^\s*end\s*$/.test(line)) return offset;
    offset += line.length + 1;
  }
  return -1;
}

function parenNesting(contextBefore) {
  let parenDepth = 0, braceDepth = 0;
  for (const ch of contextBefore) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
  }
  return { parenDepth, braceDepth };
}

const EXPR_NODE_TYPES = new Set([
  'Identifier', 'Type', 'Builtin', 'Constant', 'Number', 'String', 'TripleString',
  'Boolean', 'Null', 'AssignExpr', 'BinaryExpression', 'CompareExpr', 'UnaryExpr',
  'CallExpr', 'MemberExpr', 'ParenExpr', 'ListExpr', 'JuxtapositionExpr',
  'IfExpr', 'ForExpr', 'WhileExpr', 'TryExpr', 'NewExpr', 'FunctionExpr',
  'ArrowExpr', 'HashExpr', 'SequenceExpr', 'RangeExpr',
]);

// ============================================================
// Error extraction — get ALL errors in a file (not just first 3)
// ============================================================
function findAllErrors(code, tree) {
  const errors = [];
  tree.iterate({
    enter: (node) => {
      if (node.type.isError) {
        const from = node.from, to = node.to;
        const text = code.slice(from, Math.min(to, from + 50)).trim();
        const contextBefore = code.slice(Math.max(0, from - 200), from);
        const lineContent = getLineAt(code, from);
        const line = getLineNumber(code, from);
        const isZeroLength = from === to;

        let prevType = null;
        let cursor = tree.cursor();
        cursor.moveTo(from);
        if (cursor.moveTo(from - 1)) {
          while (cursor.type.isError && cursor.from > 0) {
            if (!cursor.moveTo(cursor.from - 1)) break;
          }
          if (!cursor.type.isError) prevType = cursor.type.name;
        }

        let nextType = null;
        let cursor2 = tree.cursor();
        cursor2.moveTo(to);
        if (to < code.length && cursor2.moveTo(to + 1)) {
          while (cursor2.type.isError && cursor2.to < code.length) {
            if (!cursor2.moveTo(cursor2.to + 1)) break;
          }
          if (!cursor2.type.isError) nextType = cursor2.type.name;
        }

        errors.push({ from, to, text, contextBefore, lineContent, line, isZeroLength, prevType, nextType });
      }
    }
  });
  return errors;
}

// ============================================================
// Classifier (same as analyze_roots.js)
// ============================================================
function classifyError(error, code, fileClassification, endOffset = -1) {
  const { text, contextBefore, lineContent, from, isZeroLength, prevType, nextType } = error;
  const trimmedLine = lineContent.trim();

  if (/^\/\/[^/]/.test(trimmedLine) || /^\/\/$/.test(trimmedLine)) {
    const beforeOnLine = lineContent.slice(0, lineContent.indexOf(text)).trim();
    if (beforeOnLine.length === 0) return 'c_style_comment';
  }
  if (/\/\/\//.test(contextBefore.slice(-20)) || /^\/\/\//.test(text)) return 'triple_string_boundary';
  if (/^\$/.test(text) || text === '$') return 'unrecognized_char';

  const englishWords = /^(the|a|an|is|are|was|were|has|have|had|this|that|these|those|it|its|we|our|you|your|can|will|may|should|could|would|each|any|all|no|not|but|also|such|some|than|more|only|just|here|there|where|when|how|what|which|who)\b/i;
  if (englishWords.test(text)) return 'english_prose';

  const { parenDepth, braceDepth } = parenNesting(contextBefore);
  if (parenDepth > 0 || braceDepth > 0) {
    const nearSemicolon = text === ';' ||
      (isZeroLength && /;\s*$/.test(contextBefore.slice(-10))) ||
      (isZeroLength && /^\s*;/.test(code.slice(from, from + 10)));
    if (nearSemicolon) return 'semicolon_in_call';
  }

  if (prevType === 'CompareOp' && (nextType === 'CompareOp' || /^[<>=*\-]+$/.test(text))) return 'divider_line';
  if (/^[-=*<>]{4,}$/.test(trimmedLine)) return 'divider_line';
  if (/^\s*--/.test(code.slice(from, from + 20)) || (nextType === 'LineComment')) return 'comment_boundary';

  const endsWithExpr = /[a-zA-Z0-9_)\]}"']\s*$/.test(contextBefore);
  const atLineStart = /\n\s*$/.test(contextBefore);
  if (endsWithExpr && atLineStart) return 'newline_sep';
  if (isZeroLength && EXPR_NODE_TYPES.has(prevType) && EXPR_NODE_TYPES.has(nextType)) return 'statement_boundary';

  if (error.prevType === 'JuxtapositionExpr' || error.prevType === 'Identifier') {
    const startsWithOp = /^[+\-*/<>=!@#%^&|~?]/.test(text);
    if (!startsWithOp && /^[a-zA-Z]/.test(text)) return 'jux_non_atom';
  }

  if (fileClassification === 'auto_generated') return 'auto_gen_pattern';
  if (endOffset >= 0 && from >= endOffset) return 'post_end';
  if (/[^\x00-\x7F]/.test(text)) return 'unicode_char';
  if (text === '?' && /^\s*\?/.test(lineContent)) return 'question_mark_op';
  if (/^[<>]=/.test(text) && (parenDepth > 0 || braceDepth > 0)) return 'comparison_prefix';
  if (isZeroLength && nextType === 'Body') return 'body_boundary';
  if (isZeroLength && nextType === 'CallItems') return 'callitems_boundary';
  if (isZeroLength && (nextType === 'Program' || nextType === '?')) return 'program_boundary';
  if (text === ',' || text === ';') return 'separator_context';

  return 'other';
}

// ============================================================
// Main: cascade-origin analysis
// ============================================================
const CASCADE_CATEGORIES = new Set(['body_boundary', 'callitems_boundary']);

const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const dirs = [
  path.join(m2Root, 'm2'),
  path.join(m2Root, 'tests'),
  path.join(m2Root, 'packages'),
];

// Track: upstream root category -> { count, downstream cascade count, files }
const upstreamRoots = {};
// Track: (upstream, downstream) pairs
const upstreamDownstreamPairs = {};
// Files with cascade errors
let cascadeFiles = 0;
let totalCascadeRoots = 0;
let totalCascadeErrors = 0; // downstream boundary errors linked to upstream
let filesWithOnlyCascade = 0; // files where FIRST error is cascade (no clear upstream)

const startTime = Date.now();

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = findFiles(dir, '.m2');

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue;

      const classification = classifyFile(code, file);
      if (classification === 'corrupt' || classification === 'raw_doc' || classification === 'invalid_syntax') continue;

      const tree = parser.parse(code);
      const endOffset = findBareEnd(code);
      const allErrors = findAllErrors(code, tree);
      if (allErrors.length === 0) continue;

      // Classify all errors
      const classified = allErrors.map(e => ({
        ...e,
        category: classifyError(e, code, classification, endOffset),
      }));

      // Find root causes using same gap analysis (>200 chars = independent)
      const rootCauses = [];
      for (let i = 0; i < Math.min(classified.length, 10); i++) {
        if (i > 0 && classified[i].from - classified[i-1].to < 200) continue;
        rootCauses.push(classified[i]);
      }

      // Check if any root cause is a cascade category
      const hasCascade = rootCauses.some(r => CASCADE_CATEGORIES.has(r.category));
      if (!hasCascade) continue;

      cascadeFiles++;
      const relPath = path.relative(m2Root, file);

      // For each cascade root cause, find the earliest NON-cascade error before it
      for (const cascadeRoot of rootCauses.filter(r => CASCADE_CATEGORIES.has(r.category))) {
        totalCascadeRoots++;

        // Find earliest error in the file (regardless of gap analysis)
        const earliestError = classified[0];
        const earliestCategory = earliestError.category;

        // Is the earliest error itself a cascade?
        if (CASCADE_CATEGORIES.has(earliestCategory)) {
          // No clear upstream — the very first error is cascade
          const key = 'self_cascade:' + cascadeRoot.category;
          if (!upstreamRoots[key]) upstreamRoots[key] = { count: 0, downstreamErrors: 0, files: [] };
          upstreamRoots[key].count++;
          if (upstreamRoots[key].files.length < 3) {
            upstreamRoots[key].files.push({
              file: relPath,
              cascadeLine: cascadeRoot.line,
              earliestLine: earliestError.line,
              earliestText: earliestError.text.substring(0, 30),
            });
          }
          continue;
        }

        // We have a non-cascade upstream root
        if (!upstreamRoots[earliestCategory]) {
          upstreamRoots[earliestCategory] = { count: 0, downstreamErrors: 0, files: [] };
        }
        upstreamRoots[earliestCategory].count++;

        // Count how many boundary errors this upstream error causes
        // (all cascade errors in the file after the earliest error)
        const downstreamCount = classified.filter(
          e => CASCADE_CATEGORIES.has(e.category) && e.from > earliestError.from
        ).length;
        upstreamRoots[earliestCategory].downstreamErrors += downstreamCount;
        totalCascadeErrors += downstreamCount;

        if (upstreamRoots[earliestCategory].files.length < 5) {
          upstreamRoots[earliestCategory].files.push({
            file: relPath,
            cascadeLine: cascadeRoot.line,
            earliestLine: earliestError.line,
            earliestText: earliestError.text.substring(0, 30),
            earliestLineContent: earliestError.lineContent.trim().substring(0, 80),
            downstreamCount,
          });
        }

        // Track upstream->downstream pairs
        const pairKey = earliestCategory + ' -> ' + cascadeRoot.category;
        if (!upstreamDownstreamPairs[pairKey]) upstreamDownstreamPairs[pairKey] = 0;
        upstreamDownstreamPairs[pairKey]++;
      }
    } catch (e) { /* skip */ }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ============================================================
// Report
// ============================================================
console.log();
console.log('=== CASCADE-ORIGIN ATTRIBUTION ===');
console.log(`  Files with cascade errors: ${cascadeFiles}`);
console.log(`  Total cascade root causes: ${totalCascadeRoots}`);
console.log(`  Total downstream boundary errors linked: ${totalCascadeErrors}`);
console.log(`  Analysis time: ${elapsed}s`);
console.log();

// Ranked table
const sortedRoots = Object.entries(upstreamRoots).sort((a, b) => b[1].count - a[1].count);
console.log('UPSTREAM ROOT             | CASCADES | DOWNSTREAM | TOP FILES');
console.log('--------------------------|----------|------------|------------------------------------------');
for (const [root, info] of sortedRoots) {
  const files = info.files.slice(0, 3).map(f => f.file + ':' + f.earliestLine).join(', ');
  console.log(
    `${root.padEnd(26)}| ${String(info.count).padStart(8)} | ${String(info.downstreamErrors).padStart(10)} | ${files}`
  );
}

// Pair analysis
console.log();
console.log('UPSTREAM -> DOWNSTREAM PAIRS:');
const sortedPairs = Object.entries(upstreamDownstreamPairs).sort((a, b) => b[1] - a[1]);
for (const [pair, count] of sortedPairs) {
  console.log(`  ${count}x  ${pair}`);
}

// Detailed samples for top 5 upstream roots
console.log();
console.log('=== DETAILED SAMPLES (top 5 upstream roots) ===');
for (const [root, info] of sortedRoots.slice(0, 5)) {
  console.log();
  console.log(`--- ${root} (${info.count} cascade origins, ${info.downstreamErrors} downstream errors) ---`);
  for (const f of info.files.slice(0, 3)) {
    console.log(`  ${f.file}:${f.earliestLine} -> cascade at line ${f.cascadeLine}`);
    if (f.earliestText) console.log(`    Error text: "${f.earliestText}"`);
    if (f.earliestLineContent) console.log(`    Line: ${f.earliestLineContent}`);
    if (f.downstreamCount !== undefined) console.log(`    Downstream boundary errors: ${f.downstreamCount}`);
  }
}

// JSON output mode
if (process.argv.includes('--json')) {
  const json = {
    cascadeFiles,
    totalCascadeRoots,
    totalCascadeErrors,
    upstreamRoots: Object.fromEntries(
      sortedRoots.map(([k, v]) => [k, { count: v.count, downstreamErrors: v.downstreamErrors }])
    ),
    pairs: Object.fromEntries(sortedPairs),
    elapsed: parseFloat(elapsed),
  };
  process.stderr.write(JSON.stringify(json, null, 2) + '\n');
}
