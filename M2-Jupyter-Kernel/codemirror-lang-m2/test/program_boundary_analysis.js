/**
 * program_boundary analysis: extracts all program_boundary root-cause errors,
 * shows context, and clusters them by pattern.
 *
 * Usage:  node test/program_boundary_analysis.js
 *         node test/program_boundary_analysis.js --all   (include all boundary categories)
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
  let parenDepth = 0, braceDepth = 0, bracketDepth = 0;
  for (const ch of contextBefore) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
  }
  return { parenDepth, braceDepth, bracketDepth };
}

const EXPR_NODE_TYPES = new Set([
  'Identifier', 'Type', 'Builtin', 'Constant', 'Number', 'String', 'TripleString',
  'Boolean', 'Null', 'AssignExpr', 'BinaryExpression', 'CompareExpr', 'UnaryExpr',
  'CallExpr', 'MemberExpr', 'ParenExpr', 'ListExpr', 'JuxtapositionExpr',
  'IfExpr', 'ForExpr', 'WhileExpr', 'TryExpr', 'NewExpr', 'FunctionExpr',
  'ArrowExpr', 'HashExpr', 'SequenceExpr', 'RangeExpr',
]);

// ============================================================
// Error classification (same as analyze_roots.js)
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
// Sub-classify program_boundary errors
// ============================================================
function subClassifyProgramBoundary(error, code) {
  const { from, contextBefore, lineContent, prevType, nextType } = error;
  const trimmedLine = lineContent.trim();

  // Check if inside a large list/call (parser buffer overflow)
  // Count how many comma-separated items are in the nearest enclosing structure
  const beforeChunk = code.slice(Math.max(0, from - 5000), from);
  const commaCount = (beforeChunk.match(/,/g) || []).length;
  const lastOpenBrace = beforeChunk.lastIndexOf('{');
  const lastCloseBrace = beforeChunk.lastIndexOf('}');
  if (lastOpenBrace > lastCloseBrace && commaCount > 200) {
    return 'large_list_overflow';
  }

  // Trailing comma: error after "expr," at end of block
  if (/,\s*$/.test(contextBefore.slice(-20))) {
    const afterText = code.slice(from, from + 20).trim();
    if (afterText.startsWith(')') || afterText.startsWith('}')) {
      return 'trailing_comma';
    }
    return 'post_comma';
  }

  // Empty element: ,, pattern
  if (/,,/.test(code.slice(Math.max(0, from - 5), from + 5))) {
    return 'empty_element';
  }

  // After closing bracket/paren: cascade from earlier error
  if (/[)\]}]\s*$/.test(contextBefore.slice(-10))) {
    return 'post_close_bracket';
  }

  // Newline between expressions at program level
  if (/\n\s*$/.test(contextBefore)) {
    return 'newline_at_program';
  }

  // After semicolon
  if (/;\s*$/.test(contextBefore.slice(-10))) {
    return 'post_semicolon';
  }

  return 'other_program';
}

// ============================================================
// Main
// ============================================================
const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const TARGET_CATEGORIES = includeAll
  ? new Set(['program_boundary', 'statement_boundary', 'newline_sep', 'body_boundary', 'callitems_boundary'])
  : new Set(['program_boundary']);

const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const dirs = [
  path.join(m2Root, 'm2'),
  path.join(m2Root, 'tests'),
  path.join(m2Root, 'packages'),
];

const cases = [];
let filesScanned = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = findFiles(dir, '.m2');

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue;

      const classification = classifyFile(code, file);
      if (classification === 'corrupt' || classification === 'raw_doc' || classification === 'invalid_syntax') continue;

      filesScanned++;
      const tree = parser.parse(code);
      const endOffset = findBareEnd(code);

      // Find ALL errors (not just first 3)
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

      if (errors.length === 0) continue;

      // Root-cause filter: 200-char gap = independent
      const rootCauses = [];
      for (let i = 0; i < Math.min(errors.length, 10); i++) {
        if (i > 0 && errors[i].from - errors[i-1].to < 200) continue;
        rootCauses.push(errors[i]);
      }

      const relPath = path.relative(m2Root, file);

      for (const rc of rootCauses) {
        const category = classifyError(rc, code, classification, endOffset);
        if (!TARGET_CATEGORIES.has(category)) continue;

        const subCategory = category === 'program_boundary'
          ? subClassifyProgramBoundary(rc, code)
          : category;

        // Get context lines
        const lines = code.split('\n');
        const errLine = rc.line;
        const contextLines = [];
        for (let i = Math.max(0, errLine - 6); i <= Math.min(lines.length - 1, errLine + 4); i++) {
          const prefix = i + 1 === errLine ? '>>>' : '   ';
          contextLines.push(`${prefix} L${i + 1}: ${lines[i].slice(0, 100)}`);
        }

        cases.push({
          file: relPath,
          line: errLine,
          category,
          subCategory,
          prevType: rc.prevType,
          nextType: rc.nextType,
          isZeroLength: rc.isZeroLength,
          errorText: rc.text.substring(0, 40),
          lineContent: rc.lineContent.trim().substring(0, 80),
          contextLines,
        });
      }
    } catch (e) { /* skip */ }
  }
}

// ============================================================
// Report
// ============================================================
console.log();
console.log('=== PROGRAM BOUNDARY ANALYSIS ===');
console.log(`  Files scanned: ${filesScanned}`);
console.log(`  Cases found: ${cases.length}`);
console.log();

// Cluster by sub-category
const clusters = {};
for (const c of cases) {
  const key = c.subCategory;
  if (!clusters[key]) clusters[key] = [];
  clusters[key].push(c);
}

// Sort clusters by count
const sorted = Object.entries(clusters).sort((a, b) => b[1].length - a[1].length);

console.log('SUB-CATEGORY         | COUNT | PATTERN');
console.log('---------------------|-------|------------------------------------------');
for (const [sub, items] of sorted) {
  const sample = items[0];
  console.log(`${sub.padEnd(21)}| ${String(items.length).padStart(5)} | ${sample.lineContent.substring(0, 50)}`);
}

// Detailed samples for each cluster
console.log();
console.log('=== DETAILED SAMPLES ===');
for (const [sub, items] of sorted) {
  console.log();
  console.log(`--- ${sub} (${items.length} cases) ---`);
  for (const c of items.slice(0, 3)) {
    console.log(`  ${c.file}:${c.line} [prev: ${c.prevType}, next: ${c.nextType}]`);
    for (const line of c.contextLines) {
      console.log(`    ${line}`);
    }
    console.log();
  }
  if (items.length > 3) {
    console.log(`  ... and ${items.length - 3} more cases`);
    // List remaining files
    for (const c of items.slice(3)) {
      console.log(`    ${c.file}:${c.line} | ${c.lineContent.substring(0, 60)}`);
    }
  }
}

// Summary: actionability assessment
console.log();
console.log('=== ACTIONABILITY ASSESSMENT ===');
for (const [sub, items] of sorted) {
  let action;
  switch (sub) {
    case 'large_list_overflow':
      action = 'UNFIXABLE (Lezer parser buffer limit for very large lists, >300 elements)';
      break;
    case 'trailing_comma':
      action = 'POTENTIALLY FIXABLE (grammar change to allow trailing comma, but +18.9% parser growth risk)';
      break;
    case 'empty_element':
      action = 'POTENTIALLY FIXABLE (grammar change for empty expressions in comma sequences)';
      break;
    case 'post_comma':
      action = 'INVESTIGATE (comma in unexpected position — may be cascade)';
      break;
    case 'post_close_bracket':
      action = 'CASCADE (downstream from earlier error, fixes itself if upstream fixed)';
      break;
    case 'newline_at_program':
      action = 'INVESTIGATE (may need ImplicitSemi improvement)';
      break;
    case 'post_semicolon':
      action = 'INVESTIGATE (semicolon handling edge case)';
      break;
    default:
      action = 'INVESTIGATE';
  }
  console.log(`  ${sub}: ${items.length} cases — ${action}`);
}
