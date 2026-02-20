/**
 * Root-cause analysis: finds the first 3 anchored errors per file.
 * Unlike analyze_errors.js (which counts ALL errors), this identifies
 * independent root causes to guide grammar fixes.
 *
 * Usage:  node test/analyze_roots.js
 */

import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyFile } from './doc_detection.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Helpers
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
  } catch (e) { /* skip unreadable dirs */ }
  return results;
}

// Get line number from character offset
function getLineNumber(code, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

// Get line content at offset
function getLineAt(code, offset) {
  let start = offset;
  while (start > 0 && code[start - 1] !== '\n') start--;
  let end = offset;
  while (end < code.length && code[end] !== '\n') end++;
  return code.slice(start, end);
}

// Find the first N error nodes in a parse tree
function findFirstErrors(code, tree, maxErrors = 3) {
  const errors = [];
  tree.iterate({
    enter: (node) => {
      if (node.type.isError && errors.length < maxErrors * 2) {
        const from = node.from;
        const to = node.to;
        const text = code.slice(from, Math.min(to, from + 50)).trim();
        const contextBefore = code.slice(Math.max(0, from - 200), from);
        const contextAfter = code.slice(to, Math.min(code.length, to + 200));
        const line = getLineNumber(code, from);
        const lineContent = getLineAt(code, from);
        const isZeroLength = from === to;

        // Find preceding non-error node
        let prevType = null;
        let prevText = null;
        let cursor = tree.cursor();
        cursor.moveTo(from);
        if (cursor.moveTo(from - 1)) {
          while (cursor.type.isError && cursor.from > 0) {
            if (!cursor.moveTo(cursor.from - 1)) break;
          }
          if (!cursor.type.isError) {
            prevType = cursor.type.name;
            prevText = code.slice(cursor.from, Math.min(cursor.to, cursor.from + 30));
          }
        }

        // Find following non-error node
        let nextType = null;
        let nextText = null;
        let cursor2 = tree.cursor();
        cursor2.moveTo(to);
        if (to < code.length && cursor2.moveTo(to + 1)) {
          while (cursor2.type.isError && cursor2.to < code.length) {
            if (!cursor2.moveTo(cursor2.to + 1)) break;
          }
          if (!cursor2.type.isError) {
            nextType = cursor2.type.name;
            nextText = code.slice(cursor2.from, Math.min(cursor2.to, cursor2.from + 30));
          }
        }

        errors.push({ from, to, text, contextBefore, contextAfter, line, lineContent, isZeroLength, prevType, prevText, nextType, nextText });
      }
    }
  });
  return errors.slice(0, maxErrors);
}

// Check if position is inside unclosed parens/braces by counting unmatched openers
function parenNesting(contextBefore) {
  let parenDepth = 0;
  let braceDepth = 0;
  for (const ch of contextBefore) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
  }
  return { parenDepth, braceDepth };
}

// Expression-like node types (nodes that represent or end an expression)
const EXPR_NODE_TYPES = new Set([
  'Identifier', 'Type', 'Builtin', 'Constant', 'Number', 'String', 'TripleString',
  'Boolean', 'Null', 'AssignExpr', 'BinaryExpression', 'CompareExpr', 'UnaryExpr',
  'CallExpr', 'MemberExpr', 'ParenExpr', 'ListExpr', 'JuxtapositionExpr',
  'IfExpr', 'ForExpr', 'WhileExpr', 'TryExpr', 'NewExpr', 'FunctionExpr',
  'ArrowExpr', 'HashExpr', 'SequenceExpr', 'RangeExpr',
]);

// Find byte offset of first bare statement-level `end`.
function findBareEnd(code) {
  const lines = code.split('\n');
  let offset = 0;
  for (const line of lines) {
    if (/^\s*end\s*$/.test(line)) return offset;
    offset += line.length + 1;
  }
  return -1;
}

// Classify a root-cause error
function classifyError(error, code, fileClassification, endOffset = -1) {
  const { text, contextBefore, lineContent, from, isZeroLength, prevType, nextType } = error;

  // c_style_comment: // at line start or after whitespace (not in operator context)
  const trimmedLine = lineContent.trim();
  if (/^\/\/[^/]/.test(trimmedLine) || /^\/\/$/.test(trimmedLine)) {
    // Check if it could be an operator (preceded by expression)
    const beforeOnLine = lineContent.slice(0, lineContent.indexOf(text)).trim();
    if (beforeOnLine.length === 0) {
      return 'c_style_comment';
    }
  }

  // triple_string_boundary: error adjacent to /// sequence
  if (/\/\/\//.test(contextBefore.slice(-20)) || /^\/\/\//.test(text)) {
    return 'triple_string_boundary';
  }

  // unrecognized_char: $ or other chars the tokenizer can't handle
  if (/^\$/.test(text) || text === '$') {
    return 'unrecognized_char';
  }

  // english_prose: words that look like English prose
  const englishWords = /^(the|a|an|is|are|was|were|has|have|had|this|that|these|those|it|its|we|our|you|your|can|will|may|should|could|would|each|any|all|no|not|but|also|such|some|than|more|only|just|here|there|where|when|how|what|which|who)\b/i;
  if (englishWords.test(text)) {
    return 'english_prose';
  }

  // semicolon_in_call: `;` causing error inside parenthesized/braced call
  // Detect: error near `;` while inside unclosed parens or braces
  const { parenDepth, braceDepth } = parenNesting(contextBefore);
  if (parenDepth > 0 || braceDepth > 0) {
    // Error text is `;` itself, or zero-length error right before/after `;`
    const nearSemicolon = text === ';' ||
      (isZeroLength && /;\s*$/.test(contextBefore.slice(-10))) ||
      (isZeroLength && /^\s*;/.test(code.slice(from, from + 10)));
    if (nearSemicolon) {
      return 'semicolon_in_call';
    }
  }

  // divider_line: consecutive comparison/decoration operators (e.g., -----, *****,  ======)
  // Typically prevType is CompareOp or error text is repeated operator chars
  if (prevType === 'CompareOp' && (nextType === 'CompareOp' || /^[<>=*\-]+$/.test(text))) {
    return 'divider_line';
  }
  // Also catch lines that are purely operator repetition (decorative dividers)
  if (/^[-=*<>]{4,}$/.test(trimmedLine)) {
    return 'divider_line';
  }

  // comment_boundary: error adjacent to line comment (--)
  // Error before a line comment, or contextAfter starts with --
  if (/^\s*--/.test(code.slice(from, from + 20)) || (nextType === 'LineComment')) {
    return 'comment_boundary';
  }

  // newline_sep: looks like a statement boundary issue
  // Error at start of line, preceded by an expression that could end a statement
  const endsWithExpr = /[a-zA-Z0-9_)\]}"']\s*$/.test(contextBefore);
  const atLineStart = /\n\s*$/.test(contextBefore);
  if (endsWithExpr && atLineStart) {
    return 'newline_sep';
  }

  // statement_boundary: zero-length error between two expression-like nodes
  // (not caught by newline_sep because may be on same line or other context)
  if (isZeroLength && EXPR_NODE_TYPES.has(prevType) && EXPR_NODE_TYPES.has(nextType)) {
    return 'statement_boundary';
  }

  // jux_non_atom: juxtaposition where RHS doesn't look like an atom
  if (error.prevType === 'JuxtapositionExpr' || error.prevType === 'Identifier') {
    const startsWithOp = /^[+\-*/<>=!@#%^&|~?]/.test(text);
    if (!startsWithOp && /^[a-zA-Z]/.test(text)) {
      return 'jux_non_atom';
    }
  }

  // auto_gen_pattern: error in auto-generated file
  if (fileClassification === 'auto_generated') {
    return 'auto_gen_pattern';
  }

  // ── New sub-categories (previously lumped into 'other') ──

  // post_end: error occurs after bare `end` statement (M2 stops loading here)
  if (endOffset >= 0 && from >= endOffset) {
    return 'post_end';
  }

  // unicode_char: error text contains non-ASCII characters (·, 𝔞, etc.)
  if (/[^\x00-\x7F]/.test(text)) {
    return 'unicode_char';
  }

  // question_mark_op: `?` used as documentation operator at line start
  if (text === '?' && /^\s*\?/.test(lineContent)) {
    return 'question_mark_op';
  }

  // comparison_prefix: `>=` or `<=` used as unary prefix inside calls (sheaf idiom)
  if (/^[<>]=/.test(text) && (parenDepth > 0 || braceDepth > 0)) {
    return 'comparison_prefix';
  }

  // body_boundary: zero-length error where next node is Body
  // (expression ended but parser expected continuation before Body block)
  if (isZeroLength && nextType === 'Body') {
    return 'body_boundary';
  }

  // callitems_boundary: zero-length error where next node is CallItems
  if (isZeroLength && nextType === 'CallItems') {
    return 'callitems_boundary';
  }

  // buffer_overflow: parser truncation in very large lists (>300 elements)
  // Lezer has a finite buffer; lists with hundreds of comma-separated elements
  // exhaust it. UNFIXABLE without forking Lezer internals.
  // Signals: high comma density AND positive bracket nesting (inside unclosed structure).
  if (isZeroLength && (nextType === 'Program' || nextType === '?')) {
    const beforeChunk = code.slice(Math.max(0, from - 5000), from);
    const commaCount = (beforeChunk.match(/,/g) || []).length;
    // Use net nesting depth, not lastIndexOf (which misses nesting)
    let depth = 0;
    for (const ch of beforeChunk) {
      if (ch === '{' || ch === '(') depth++;
      else if (ch === '}' || ch === ')') depth = Math.max(0, depth - 1);
    }
    if (depth > 0 && commaCount > 200) {
      return 'buffer_overflow';
    }
  }

  // program_boundary: zero-length error at program level or before `?`
  if (isZeroLength && (nextType === 'Program' || nextType === '?')) {
    return 'program_boundary';
  }

  // separator_context: comma or semicolon causing error in unexpected context
  if (text === ',' || text === ';') {
    return 'separator_context';
  }

  return 'other';
}

// ============================================================
// Main
// ============================================================
const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const dirs = [
  path.join(m2Root, 'm2'),
  path.join(m2Root, 'tests'),
  path.join(m2Root, 'packages'),
];

// Categories
const categories = {};
const categorySamples = {};
const categoryByClass = { code: {}, doc_heavy: {}, auto_generated: {} };

let totalFilesWithErrors = 0;
let totalRootCauses = 0;
let filesProcessed = 0;
let skippedInvalidSyntax = 0;
let skippedRawDoc = 0;
let skippedCorrupt = 0;

const startTime = Date.now();

for (const dir of dirs) {
  if (!fs.existsSync(dir)) { console.log('Skipping (not found):', dir); continue; }
  const files = findFiles(dir, '.m2');

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue;

      const classification = classifyFile(code, file);
      if (classification === 'corrupt') { skippedCorrupt++; continue; }
      if (classification === 'raw_doc') { skippedRawDoc++; continue; }
      if (classification === 'invalid_syntax') { skippedInvalidSyntax++; continue; }

      const tree = parser.parse(code);
      const endOffset = findBareEnd(code);
      const errors = findFirstErrors(code, tree, 3);
      if (errors.length === 0) continue;

      filesProcessed++;
      totalFilesWithErrors++;
      const relPath = path.relative(m2Root, file);
      const classKey = classification === 'code' ? 'code' :
                       classification === 'doc_heavy' ? 'doc_heavy' : 'auto_generated';

      // Process each anchored error
      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];

        // Gap analysis: if > 200 chars from previous error, likely independent
        if (i > 0 && error.from - errors[i-1].to < 200) {
          continue; // likely cascading from previous error
        }

        const category = classifyError(error, code, classification, endOffset);
        categories[category] = (categories[category] || 0) + 1;
        totalRootCauses++;

        // Track by file classification
        if (!categoryByClass[classKey][category]) categoryByClass[classKey][category] = 0;
        categoryByClass[classKey][category]++;

        // Keep top samples
        if (!categorySamples[category]) categorySamples[category] = [];
        if (categorySamples[category].length < 5) {
          categorySamples[category].push({
            file: relPath,
            line: error.line,
            text: error.text.substring(0, 40),
            lineContent: error.lineContent.trim().substring(0, 80),
            prevType: error.prevType
          });
        }
      }
    } catch (e) { /* skip unreadable files */ }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ============================================================
// Report
// ============================================================
console.log();
console.log('=== ROOT-CAUSE ANALYSIS ===');
console.log(`  Files with errors: ${totalFilesWithErrors}`);
console.log(`  Independent root causes: ${totalRootCauses}`);
const exclusions = [];
if (skippedInvalidSyntax > 0) exclusions.push(`${skippedInvalidSyntax} invalid_syntax`);
if (skippedRawDoc > 0) exclusions.push(`${skippedRawDoc} raw_doc`);
if (skippedCorrupt > 0) exclusions.push(`${skippedCorrupt} corrupt`);
if (exclusions.length > 0) console.log(`  Excluded: ${exclusions.join(', ')} files`);
console.log(`  Analysis time: ${elapsed}s`);
console.log();

// Ranked table
const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
console.log('CATEGORY                | COUNT | %     | TOP SAMPLES');
console.log('------------------------|-------|-------|------------------------------------------');
for (const [cat, count] of sorted) {
  const pct = (count / totalRootCauses * 100).toFixed(1);
  const samples = (categorySamples[cat] || []).slice(0, 3)
    .map(s => `${s.file}:${s.line}`).join(', ');
  console.log(`${cat.padEnd(24)}| ${String(count).padStart(5)} | ${pct.padStart(5)}% | ${samples}`);
}

// By file classification
console.log();
console.log('BY FILE CLASSIFICATION:');
for (const [cls, cats] of Object.entries(categoryByClass)) {
  const total = Object.values(cats).reduce((a, b) => a + b, 0);
  if (total === 0) continue;
  console.log(`  ${cls}: ${total} root causes`);
  const clsSorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of clsSorted) {
    console.log(`    ${cat}: ${count}`);
  }
}

// Detailed samples for top 5 categories
console.log();
console.log('=== DETAILED SAMPLES (top 5 categories) ===');
for (const [cat] of sorted.slice(0, 5)) {
  const samples = categorySamples[cat] || [];
  console.log();
  console.log(`--- ${cat} (${categories[cat]} occurrences) ---`);
  for (const s of samples.slice(0, 3)) {
    console.log(`  ${s.file}:${s.line}`);
    console.log(`    Error text: "${s.text}"`);
    console.log(`    Line: ${s.lineContent}`);
    if (s.prevType) console.log(`    Prev node: ${s.prevType}`);
  }
}
