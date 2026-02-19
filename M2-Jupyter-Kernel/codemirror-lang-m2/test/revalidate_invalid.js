/**
 * Revalidate INVALID_SYNTAX manifest entries against real Macaulay2.
 * For each manifest entry, runs the file through M2 and checks if it's still rejected.
 *
 * Usage:
 *   node test/revalidate_invalid.js              # check all entries
 *   node test/revalidate_invalid.js --verbose    # show M2 raw transcript
 *
 * Exit codes:
 *   0 = all entries confirmed (or M2 not available → SKIPPED)
 *   1 = stale entries found (file now passes M2)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { INVALID_SYNTAX, validateManifest } from './doc_detection.js';
import { findM2 } from './oracle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const verbose = process.argv.includes('--verbose');

// ============================================================
// Validate manifest schema first
// ============================================================

const schemaErrors = validateManifest();
if (schemaErrors.length > 0) {
  console.error('Manifest schema errors:');
  for (const err of schemaErrors) console.error(`  ${err}`);
  process.exit(1);
}

// ============================================================
// Check M2 availability
// ============================================================

const m2Path = findM2();
if (!m2Path) {
  console.log('=== Manifest Revalidation ===');
  console.log('  Status: SKIPPED (M2 not found)');
  console.log('  Set M2_PATH env var or install Macaulay2 to enable.');
  process.exit(0);
}

// Verify M2 runs
try {
  execSync(`"${m2Path}" --version 2>/dev/null`, { timeout: 5000 });
} catch (e) {
  console.log('=== Manifest Revalidation ===');
  console.log(`  Status: SKIPPED (M2 at ${m2Path} not runnable)`);
  process.exit(0);
}

// ============================================================
// Validate each manifest entry
// ============================================================

const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const TIMEOUT_SECS = 30;

function validateFile(filepath) {
  const code = fs.readFileSync(filepath, 'utf-8');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-reval-'));
  try {
    const result = spawnSync(m2Path, ['--silent', '--no-prompts', '--no-tty', '--stop'], {
      input: code + '\n',
      timeout: TIMEOUT_SECS * 1000,
      cwd: tmpDir,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const rawTranscript = stdout + (stderr ? '\n---STDERR---\n' + stderr : '');

    if (result.status === null && result.signal === 'SIGTERM') {
      return { status: 'TIMEOUT', rawTranscript };
    }
    if (result.signal) {
      return { status: 'CRASH', rawTranscript };
    }
    if (result.status === 0 && !/\berror\b/i.test(stderr)) {
      return { status: 'VALID', rawTranscript };
    }
    if (/syntax error/i.test(stderr) || /parse error/i.test(stderr) || /invalid character/i.test(stderr)) {
      return { status: 'SYNTAX_ERROR', rawTranscript };
    }
    if (/\berror\b/i.test(stderr)) {
      return { status: 'RUNTIME_ERROR', rawTranscript };
    }
    return { status: 'UNKNOWN', rawTranscript };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
}

console.log('=== Manifest Revalidation ===');
console.log(`  M2 path: ${m2Path}`);
console.log(`  Entries: ${INVALID_SYNTAX.length}`);
console.log();

let confirmed = 0;
let stale = 0;
let warnings = 0;
let missing = 0;

for (const entry of INVALID_SYNTAX) {
  const fullPath = path.join(m2Root, entry.path);
  process.stdout.write(`  ${entry.path}: `);

  if (!fs.existsSync(fullPath)) {
    console.log('MISSING (file not found in corpus)');
    missing++;
    continue;
  }

  const result = validateFile(fullPath);

  if (result.status === 'VALID') {
    console.log('STALE — file is now valid, REMOVE from manifest');
    stale++;
  } else if (result.status === 'SYNTAX_ERROR') {
    console.log('confirmed (SYNTAX_ERROR)');
    confirmed++;
  } else if (result.status === 'RUNTIME_ERROR') {
    console.log('inconclusive (RUNTIME_ERROR — M2 hit runtime error before reaching potential syntax errors; --stop masks later errors)');
    warnings++;
  } else if (result.status === 'TIMEOUT') {
    console.log('inconclusive (TIMEOUT — check manually)');
    warnings++;
  } else if (result.status === 'CRASH') {
    console.log('inconclusive (CRASH — check manually)');
    warnings++;
  } else {
    console.log(`inconclusive (${result.status} — check manually)`);
    warnings++;
  }

  if (verbose) {
    console.log(`    --- Raw Transcript ---`);
    console.log(result.rawTranscript.split('\n').map(l => `    ${l}`).join('\n'));
    console.log();
  }
}

console.log();
console.log('=== Summary ===');
console.log(`  Confirmed: ${confirmed}`);
if (stale > 0) console.log(`  STALE: ${stale} (files now pass M2 — remove from manifest!)`);
if (warnings > 0) console.log(`  Inconclusive: ${warnings}`);
if (missing > 0) console.log(`  Missing: ${missing}`);
console.log(`  Status: ${stale > 0 ? 'FAIL — stale entries found' : 'PASS'}`);

process.exit(stale > 0 ? 1 : 0);
