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
        const contextBefore = code.slice(Math.max(0, from - 100), from);
        const contextAfter = code.slice(to, Math.min(code.length, to + 100));
        const line = getLineNumber(code, from);
        const lineContent = getLineAt(code, from);

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

        errors.push({ from, to, text, contextBefore, contextAfter, line, lineContent, prevType, prevText });
      }
    }
  });
  return errors.slice(0, maxErrors);
}

// Classify a root-cause error
function classifyError(error, code) {
  const { text, contextBefore, lineContent, from } = error;

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

  // newline_sep: looks like a statement boundary issue
  // Error at start of line, preceded by an expression that could end a statement
  const endsWithExpr = /[a-zA-Z0-9_)\]}"']\s*$/.test(contextBefore);
  const atLineStart = /\n\s*$/.test(contextBefore);
  if (endsWithExpr && atLineStart) {
    return 'newline_sep';
  }

  // jux_non_atom: juxtaposition where RHS doesn't look like an atom
  if (error.prevType === 'JuxtapositionExpr' || error.prevType === 'Identifier') {
    const startsWithOp = /^[+\-*/<>=!@#%^&|~?]/.test(text);
    if (!startsWithOp && /^[a-zA-Z]/.test(text)) {
      return 'jux_non_atom';
    }
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

const startTime = Date.now();

for (const dir of dirs) {
  if (!fs.existsSync(dir)) { console.log('Skipping (not found):', dir); continue; }
  const files = findFiles(dir, '.m2');

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue;

      const classification = classifyFile(code, file);
      if (classification === 'corrupt' || classification === 'raw_doc') continue;

      const tree = parser.parse(code);
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

        const category = classifyError(error, code);
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
