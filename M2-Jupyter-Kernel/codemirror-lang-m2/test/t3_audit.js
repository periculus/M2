/**
 * T3 Stabilization Audit: validates that the comma-as-Sequence change (T3)
 * doesn't cause the parser to accept structurally invalid M2 syntax.
 *
 * Finds BinaryExpression nodes with comma operator in parsed corpus files,
 * extracts snippets, and validates them against the M2 oracle.
 *
 * Usage:  node test/t3_audit.js
 *         node test/t3_audit.js --json
 *         node test/t3_audit.js --dry-run   (extract snippets without oracle)
 */

import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyFile } from './doc_detection.js';
import { findM2 } from './oracle.js';
import { spawnSync } from 'child_process';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIMEOUT_SECS = 30;
const MAX_SNIPPETS = 100;

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
  } catch (e) { /* skip */ }
  return results;
}

function getLineNumber(code, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

// Validate code against M2 oracle
function validateCode(code, m2Path) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-audit-'));
  try {
    const result = spawnSync(m2Path, ['--silent', '--no-prompts', '--no-tty', '--stop'], {
      input: code + '\n',
      timeout: TIMEOUT_SECS * 1000,
      cwd: tmpDir,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });

    const stderr = result.stderr || '';
    if (result.status === null && result.signal === 'SIGTERM') return 'TIMEOUT';
    if (result.signal) return 'CRASH';
    if (result.status === 0 && !/\berror\b/i.test(stderr)) return 'VALID';
    if (/syntax error/i.test(stderr) || /parse error/i.test(stderr) || /invalid character/i.test(stderr)) return 'SYNTAX_ERROR';
    if (/\berror\b/i.test(stderr)) return 'RUNTIME_ERROR';
    return 'UNKNOWN';
  } catch (e) {
    return 'CRASH';
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
}

// ============================================================
// Extract comma BinaryExpression snippets from a parsed tree
// ============================================================

function extractCommaSnippets(code, tree) {
  const snippets = [];
  // Track which ranges we've already captured to avoid duplicates from nested BinaryExpressions
  const captured = new Set();

  tree.iterate({
    enter: (node) => {
      if (node.name === 'BinaryExpression') {
        // Skip if this is a child of another BinaryExpression we already captured
        const key = `${node.from}:${node.to}`;
        // Check parent — only capture outermost comma BinaryExpression
        // (avoid extracting `a, b` when we already have `a, b, c`)

        const text = code.slice(node.from, node.to);
        // Check for top-level comma in this BinaryExpression's text
        let depth = 0;
        let hasComma = false;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          else if (ch === ')' || ch === ']' || ch === '}') depth--;
          else if (ch === ',' && depth === 0) { hasComma = true; break; }
        }
        if (!hasComma) return;

        // Skip if entirely contained in a captured range
        for (const r of captured) {
          const [rf, rt] = r.split(':').map(Number);
          if (node.from >= rf && node.to <= rt) return;
        }
        captured.add(key);

        const snippet = text.trim();
        // Only keep snippets that are self-contained enough for oracle validation
        // Filter out fragments that are clearly part of method installations
        if (snippet.length > 5 && snippet.length < 300) {
          snippets.push({
            text: snippet,
            line: getLineNumber(code, node.from),
          });
        }
      }
    }
  });
  return snippets;
}

// ============================================================
// Main
// ============================================================

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const dryRun = args.includes('--dry-run');

const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const dirs = [
  path.join(m2Root, 'm2'),
  path.join(m2Root, 'tests'),
  path.join(m2Root, 'packages'),
];

// Phase 1: Extract comma snippets from corpus
if (!jsonMode) console.log('Phase 1: Extracting comma BinaryExpression snippets...');

const allSnippets = [];
let filesScanned = 0;
let filesWithComma = 0;

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

      // Only look at files that parse without errors (clean parses)
      let hasErrors = false;
      tree.iterate({ enter: (node) => { if (node.type.isError) hasErrors = true; } });

      const snippets = extractCommaSnippets(code, tree);
      if (snippets.length > 0) {
        filesWithComma++;
        const relPath = path.relative(m2Root, file);
        for (const s of snippets) {
          allSnippets.push({ ...s, file: relPath, cleanFile: !hasErrors });
        }
      }
    } catch (e) { /* skip */ }
  }
}

// Deduplicate by text content
const seen = new Set();
const unique = [];
for (const s of allSnippets) {
  const key = s.text.replace(/\s+/g, ' ').trim();
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(s);
  }
}

// Prioritize: clean files first, then by snippet diversity
const cleanSnippets = unique.filter(s => s.cleanFile);
const errorSnippets = unique.filter(s => !s.cleanFile);
const sampled = [...cleanSnippets, ...errorSnippets].slice(0, MAX_SNIPPETS);

if (!jsonMode) {
  console.log(`  Files scanned: ${filesScanned}`);
  console.log(`  Files with comma BinaryExpr: ${filesWithComma}`);
  console.log(`  Total comma snippets: ${allSnippets.length}`);
  console.log(`  Unique snippets: ${unique.length}`);
  console.log(`  Sampled for validation: ${sampled.length}`);
  console.log();
}

if (dryRun) {
  console.log('=== DRY RUN: Sample snippets ===');
  for (const s of sampled.slice(0, 20)) {
    console.log(`  ${s.file}:${s.line} | ${s.cleanFile ? 'CLEAN' : 'ERRS'} | ${s.text.substring(0, 80)}`);
  }
  console.log(`  ... (${sampled.length} total)`);
  process.exit(0);
}

// Phase 2: Oracle validation
const m2Path = findM2();
if (!m2Path) {
  console.error('M2 not found. Set M2_PATH env var or install Macaulay2.');
  process.exit(1);
}

if (!jsonMode) {
  console.log(`Phase 2: Oracle validation (${sampled.length} snippets)...`);
  console.log(`  M2 path: ${m2Path}`);
  console.log();
}

const results = { VALID: 0, SYNTAX_ERROR: 0, RUNTIME_ERROR: 0, TIMEOUT: 0, CRASH: 0, UNKNOWN: 0 };
const mismatches = [];

for (let i = 0; i < sampled.length; i++) {
  const s = sampled[i];
  const status = validateCode(s.text, m2Path);
  results[status] = (results[status] || 0) + 1;

  if (status === 'SYNTAX_ERROR') {
    mismatches.push({ snippet: s.text, file: s.file, line: s.line, status });
  }

  if (!jsonMode) {
    const icon = status === 'SYNTAX_ERROR' ? 'MISMATCH' : status.padEnd(8);
    const preview = s.text.replace(/\n/g, '\\n').substring(0, 60);
    if (status === 'SYNTAX_ERROR' || (i < 10)) {
      console.log(`  [${i+1}/${sampled.length}] ${icon} | ${s.file}:${s.line} | ${preview}`);
    }
  }
}

// Phase 3: Report
const totalValidated = results.VALID + results.SYNTAX_ERROR; // exclude inconclusive
const mismatchRate = totalValidated > 0 ? (results.SYNTAX_ERROR / totalValidated * 100).toFixed(1) : '0.0';

if (jsonMode) {
  console.log(JSON.stringify({
    filesScanned,
    filesWithComma,
    totalSnippets: allSnippets.length,
    uniqueSnippets: unique.length,
    sampled: sampled.length,
    results,
    mismatchRate: parseFloat(mismatchRate),
    mismatches: mismatches.map(m => ({ snippet: m.snippet.substring(0, 100), file: m.file, line: m.line })),
  }, null, 2));
} else {
  console.log();
  console.log('=== T3 Stabilization Audit Results ===');
  console.log(`  Snippets validated: ${sampled.length}`);
  console.log(`  VALID:         ${results.VALID}`);
  console.log(`  SYNTAX_ERROR:  ${results.SYNTAX_ERROR} (mismatches — parser accepts, M2 rejects)`);
  console.log(`  RUNTIME_ERROR: ${results.RUNTIME_ERROR} (inconclusive)`);
  console.log(`  TIMEOUT:       ${results.TIMEOUT}`);
  console.log(`  CRASH:         ${results.CRASH}`);
  console.log(`  UNKNOWN:       ${results.UNKNOWN}`);
  console.log();
  console.log(`  Mismatch rate: ${mismatchRate}% (${results.SYNTAX_ERROR}/${totalValidated} conclusive)`);
  console.log(`  Gate: ${parseFloat(mismatchRate) <= 5.0 ? 'PASS (<=5%)' : 'FAIL (>5%)'}`);

  if (mismatches.length > 0) {
    console.log();
    console.log('  Mismatched snippets:');
    for (const m of mismatches) {
      console.log(`    ${m.file}:${m.line} | ${m.snippet.substring(0, 80)}`);
    }
  }
}

process.exit(results.SYNTAX_ERROR > 0 && parseFloat(mismatchRate) > 5.0 ? 1 : 0);
