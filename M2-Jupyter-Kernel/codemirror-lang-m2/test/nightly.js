/**
 * Nightly baseline capture: runs all test suites, captures metrics,
 * writes structured output to _nightly_runs/YYYYMMDD-HHMM/.
 *
 * Usage:  node test/nightly.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cm2Dir = path.resolve(__dirname, '..');
const kernelDir = path.resolve(cm2Dir, '..');

// Create run directory
const now = new Date();
const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').substring(0, 13);
const runDir = path.join(cm2Dir, '_nightly_runs', timestamp);
fs.mkdirSync(runDir, { recursive: true });

console.log(`=== Nightly Baseline Capture ===`);
console.log(`  Output: ${runDir}`);
console.log(`  Time: ${now.toISOString()}`);
console.log();

// Helper: run a command and capture output
function runCapture(label, cmd, outputFile, opts = {}) {
  console.log(`Running: ${label}...`);
  const start = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: cm2Dir,
      encoding: 'utf-8',
      timeout: opts.timeout || 300000, // 5 min default
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    fs.writeFileSync(path.join(runDir, outputFile), output);
    console.log(`  Done (${elapsed}s) → ${outputFile}`);
    return { success: true, output, elapsed: parseFloat(elapsed) };
  } catch (e) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const output = (e.stdout || '') + '\n' + (e.stderr || '');
    fs.writeFileSync(path.join(runDir, outputFile), output);
    console.log(`  Error (${elapsed}s) → ${outputFile}`);
    return { success: false, output, elapsed: parseFloat(elapsed) };
  }
}

// Capture git info
let gitHash = 'unknown';
let gitDate = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: cm2Dir, encoding: 'utf-8' }).trim();
  gitDate = execSync('git log -1 --format=%ci HEAD', { cwd: cm2Dir, encoding: 'utf-8' }).trim().split(' ')[0];
} catch (e) { /* git not available */ }

console.log(`  Git: ${gitHash} (${gitDate})`);
console.log();

// Capture parser size
const parserPath = path.join(kernelDir, 'src', 'parser', 'parser.js');
let parserSize = 0;
try { parserSize = fs.statSync(parserPath).size; } catch (e) { /* not found */ }
console.log(`  Parser size: ${parserSize} bytes`);
console.log();

// ── Run test suites ──

// 1. Fixtures
const fixtures = runCapture('Fixtures', 'node test/test_fixtures.js', 'fixtures.txt');
let fixtureCount = 0;
const fixtureMatch = (fixtures.output || '').match(/(\d+) passed/);
if (fixtureMatch) fixtureCount = parseInt(fixtureMatch[1]);

// 2. Corpus (JSON mode for reliable parsing)
const corpus = runCapture('Corpus', 'node test/test_corpus.js --json', 'corpus.json');
let codeErrors = 0, codeNodes = 0, codeFiles = 0, codeRate = 0, parseTime = 0;
let codeAllFiles = 0, codeAllNodes = 0, codeAllErrors = 0, codeAllRate = 0;
let excluded = { rawDoc: 0, corrupt: 0, invalidSyntax: 0 };
if (corpus.output) {
  try {
    const metrics = JSON.parse(corpus.output);
    codeFiles  = metrics.codeValid.files;
    codeNodes  = metrics.codeValid.nodes;
    codeErrors = metrics.codeValid.errors;
    codeRate   = metrics.codeValid.rate;
    codeAllFiles  = metrics.codeAll.files;
    codeAllNodes  = metrics.codeAll.nodes;
    codeAllErrors = metrics.codeAll.errors;
    codeAllRate   = metrics.codeAll.rate;
    excluded   = metrics.excluded;
    parseTime  = metrics.parseTime;
  } catch (e) {
    console.log('  Warning: failed to parse corpus JSON output');
  }
}

// 3. Analyze errors
const errors = runCapture('Error analysis', 'node test/analyze_errors.js', 'errors.txt');

// 4. Analyze roots
const roots = runCapture('Root-cause analysis', 'node test/analyze_roots.js', 'roots.txt');

// 5. Operator validation
const operators = runCapture('Operator validation', 'node test/validate_operators.js', 'operators.txt');

// ── Write summary.json ──
const summary = {
  timestamp: now.toISOString(),
  git: { hash: gitHash, date: gitDate },
  parser: { size: parserSize, path: parserPath },
  corpus: {
    codeAll:   { files: codeAllFiles, nodes: codeAllNodes, errors: codeAllErrors, rate: codeAllRate },
    codeValid: { files: codeFiles,    nodes: codeNodes,    errors: codeErrors,    rate: codeRate },
    excluded,
    parseTime,
  },
  fixtures: {
    count: fixtureCount,
    passed: fixtures.success,
  },
  operators: {
    passed: operators.success,
  },
  timing: {
    fixtures: fixtures.elapsed,
    corpus: corpus.elapsed,
    errors: errors.elapsed,
    roots: roots.elapsed,
    operators: operators.elapsed,
  },
};

fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log();
console.log(`=== Summary ===`);
console.log(`  Git: ${gitHash} (${gitDate})`);
console.log(`  Parser size: ${parserSize} bytes`);
console.log(`  CODE_VALID: ${codeFiles} files | ${codeNodes} nodes | ${codeErrors} errors | ${codeRate}%`);
console.log(`  CODE_ALL:   ${codeAllFiles} files | ${codeAllNodes} nodes | ${codeAllErrors} errors | ${codeAllRate}%`);
console.log(`  Fixtures: ${fixtureCount} passed`);
console.log(`  Operators: ${operators.success ? 'PASS' : 'FAIL'}`);
console.log(`  Parse time: ${parseTime}s`);
console.log(`  Output: ${runDir}`);
console.log();
console.log(`Saved to: ${path.join(runDir, 'summary.json')}`);
