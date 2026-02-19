/**
 * M2 Oracle: validates M2 code against real Macaulay2.
 * Each validation runs in an isolated M2 process with hard timeout.
 *
 * Usage:
 *   node test/oracle.js test/oracle_snippets.txt          # batch mode
 *   node test/oracle.js --snippet 'x = 1 + 2'             # single snippet
 *   node test/oracle.js --json test/oracle_snippets.txt    # JSON output
 *   node test/oracle.js --file path/to/file.m2             # validate whole file
 *   node test/oracle.js --scan-candidates                  # targeted scan
 *   node test/oracle.js --scan-candidates --top=20         # top N by error rate
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TIMEOUT_SECS = 30;

// ============================================================
// M2 path discovery (env var → PATH lookup → common locations)
// ============================================================

export function findM2() {
  // 1. Explicit env var (CI, other machines)
  if (process.env.M2_PATH && fs.existsSync(process.env.M2_PATH)) return process.env.M2_PATH;
  // 2. PATH lookup via `which`
  try {
    const p = execSync('which M2', { encoding: 'utf-8', timeout: 5000 }).trim();
    if (p && fs.existsSync(p)) return p;
  } catch (e) { /* not on PATH */ }
  // 3. Common install locations
  for (const loc of ['/opt/homebrew/bin/M2', '/usr/local/bin/M2', '/usr/bin/M2']) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

// ============================================================
// Structured validation result
// ============================================================

/**
 * Classification contract (checked in order):
 * 1. Signal SIGTERM → TIMEOUT
 * 2. Other signal → CRASH
 * 3. Exit code 0, no error on stderr → VALID
 * 4. stderr matches syntax/parse/invalid character → SYNTAX_ERROR
 * 5. stderr matches generic error → RUNTIME_ERROR
 * 6. Else → UNKNOWN (conservative, requires human review)
 */
function classifyResult(result) {
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const rawTranscript = stdout + (stderr ? '\n---STDERR---\n' + stderr : '');

  // 1. Timeout
  if (result.status === null && result.signal === 'SIGTERM') {
    return { status: 'TIMEOUT', exitCode: null, signal: 'SIGTERM', rawTranscript, errorSnippet: `Killed after ${TIMEOUT_SECS}s` };
  }

  // 2. Crash
  if (result.signal) {
    return { status: 'CRASH', exitCode: null, signal: result.signal, rawTranscript, errorSnippet: `Signal: ${result.signal}` };
  }

  // 3. Success
  if (result.status === 0 && !/\berror\b/i.test(stderr)) {
    return { status: 'VALID', exitCode: 0, signal: null, rawTranscript, errorSnippet: null };
  }

  // 4. Syntax error
  if (/syntax error/i.test(stderr) || /parse error/i.test(stderr) || /invalid character/i.test(stderr)) {
    return { status: 'SYNTAX_ERROR', exitCode: result.status, signal: null, rawTranscript, errorSnippet: stderr.trim().substring(0, 200) };
  }

  // 5. Runtime error
  if (/\berror\b/i.test(stderr)) {
    return { status: 'RUNTIME_ERROR', exitCode: result.status, signal: null, rawTranscript, errorSnippet: stderr.trim().substring(0, 200) };
  }

  // 6. Unknown — conservative fallback
  return { status: 'UNKNOWN', exitCode: result.status, signal: null, rawTranscript, errorSnippet: (stdout + stderr).trim().substring(0, 200) };
}

// ============================================================
// Core validation
// ============================================================

/**
 * Validate M2 code piped to stdin.
 * Runs in isolated temp directory to prevent side effects.
 */
function validateCode(code, m2Path) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm2-oracle-'));
  try {
    const result = spawnSync(m2Path, ['--silent', '--no-prompts', '--no-tty', '--stop'], {
      input: code + '\n',
      timeout: TIMEOUT_SECS * 1000,
      cwd: tmpDir,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });
    return classifyResult(result);
  } catch (e) {
    return { status: 'CRASH', exitCode: null, signal: null, rawTranscript: e.message, errorSnippet: e.message.substring(0, 200) };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
}

/** Validate a single snippet (backward compat wrapper). */
function validateSnippet(snippet, m2Path) {
  return validateCode(snippet, m2Path);
}

/** Validate a whole file by piping its contents (NOT using load). */
function validateFile(filepath, m2Path) {
  const code = fs.readFileSync(filepath, 'utf-8');
  return validateCode(code, m2Path);
}

// ============================================================
// Batch mode (snippet files)
// ============================================================

function parseSnippetsFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const snippets = [];
  let current = null;

  for (const line of content.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      if (current) { snippets.push(current); current = null; }
      continue;
    }
    const match = line.match(/^(VALID|SYNTAX_ERROR|RUNTIME_ERROR|ANY)\s*\|\s*(.*)$/);
    if (match) {
      if (current) snippets.push(current);
      current = { expected: match[1], snippet: match[2], lineNum: snippets.length + 1 };
    } else if (current) {
      current.snippet += '\n' + line;
    }
  }
  if (current) snippets.push(current);
  return snippets;
}

function runBatch(filepath, m2Path, jsonMode = false) {
  const snippets = parseSnippetsFile(filepath);
  const results = [];
  let passed = 0, failed = 0;

  if (!jsonMode) {
    console.log(`=== M2 Oracle Validation ===`);
    console.log(`  Snippets: ${snippets.length}`);
    console.log(`  M2 path: ${m2Path}`);
    console.log(`  Timeout: ${TIMEOUT_SECS}s per snippet`);
    console.log();
  }

  for (const { expected, snippet } of snippets) {
    const result = validateSnippet(snippet, m2Path);
    const match = expected === 'ANY' || result.status === expected;
    results.push({ snippet: snippet.substring(0, 60), expected, actual: result.status, match, errorSnippet: result.errorSnippet });

    if (!jsonMode) {
      const icon = match ? 'OK' : 'MISMATCH';
      const preview = snippet.replace(/\n/g, '\\n').substring(0, 50);
      console.log(`  ${icon} | expected: ${expected.padEnd(14)} | got: ${result.status.padEnd(14)} | ${preview}`);
      if (!match) console.log(`       output: ${(result.errorSnippet || '').substring(0, 100)}`);
    }

    if (match) passed++; else failed++;
  }

  if (jsonMode) {
    console.log(JSON.stringify({ total: snippets.length, passed, failed, results }, null, 2));
  } else {
    console.log();
    console.log(`=== Oracle Summary ===`);
    console.log(`  Total: ${snippets.length}  Passed: ${passed}  Failed: ${failed}`);
    console.log(`  Status: ${failed === 0 ? 'ALL MATCH' : 'MISMATCHES FOUND'}`);
  }

  return { total: snippets.length, passed, failed };
}

// ============================================================
// Scan candidates: targeted validation of high-error-rate files
// ============================================================

async function scanCandidates(m2Path, topN = 15) {
  // Dynamic imports — only load parser for scan mode
  const { parser } = await import('../src/parser.js');
  const { classifyFile } = await import('./doc_detection.js');

  const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
  const dirs = [
    path.join(m2Root, 'm2'),
    path.join(m2Root, 'tests'),
    path.join(m2Root, 'packages'),
  ];

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

  // Phase A: fast Lezer parse to find candidates
  console.log('Phase A: Finding high-error-rate candidates...');
  const candidates = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = findFiles(dir, '.m2');
    for (const file of files) {
      try {
        const code = fs.readFileSync(file, 'utf-8');
        if (code.length > 500000) continue;
        const classification = classifyFile(code, file);
        if (classification !== 'code') continue; // only scan normal code files

        const tree = parser.parse(code);
        let nodes = 0, errors = 0;
        tree.iterate({ enter: (node) => { nodes++; if (node.type.isError) errors++; } });

        const errorRate = nodes > 0 ? (errors / nodes * 100) : 0;
        if (errorRate > 10 && nodes > 20) {
          candidates.push({ file: path.relative(m2Root, file), fullPath: file, errorRate, nodes, errors });
        }
      } catch (e) { /* skip */ }
    }
  }

  candidates.sort((a, b) => b.errorRate - a.errorRate);
  const selected = candidates.slice(0, topN);
  console.log(`  Found ${candidates.length} candidates, validating top ${selected.length}...`);
  console.log();

  // Phase B: M2 oracle validation of candidates
  const results = [];
  for (const candidate of selected) {
    const result = validateFile(candidate.fullPath, m2Path);
    results.push({ ...candidate, m2Status: result.status, errorSnippet: result.errorSnippet });
    const icon = result.status === 'SYNTAX_ERROR' ? 'SYNTAX_ERR' : result.status;
    console.log(`  ${icon.padEnd(12)} | ${candidate.errorRate.toFixed(1)}% parser errors | ${candidate.file}`);
    if (result.status === 'SYNTAX_ERROR') {
      console.log(`             | ${result.errorSnippet}`);
    }
  }

  console.log();
  const syntaxErrors = results.filter(r => r.m2Status === 'SYNTAX_ERROR');
  console.log(`=== Scan Summary ===`);
  console.log(`  Candidates: ${selected.length}`);
  console.log(`  SYNTAX_ERROR: ${syntaxErrors.length}`);
  console.log(`  VALID: ${results.filter(r => r.m2Status === 'VALID').length}`);
  console.log(`  RUNTIME_ERROR: ${results.filter(r => r.m2Status === 'RUNTIME_ERROR').length}`);
  console.log(`  Other: ${results.filter(r => !['SYNTAX_ERROR','VALID','RUNTIME_ERROR'].includes(r.m2Status)).length}`);

  if (syntaxErrors.length > 0) {
    console.log();
    console.log('SYNTAX_ERROR files (candidates for invalid_syntax manifest):');
    for (const f of syntaxErrors) {
      console.log(`  ${f.file}`);
    }
  }

  return results;
}

// ============================================================
// CLI (only runs when oracle.js is the main module)
// ============================================================

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node test/oracle.js test/oracle_snippets.txt          # batch snippet validation');
    console.log('  node test/oracle.js --snippet "x = 1 + 2"             # single snippet');
    console.log('  node test/oracle.js --json test/oracle_snippets.txt    # JSON batch output');
    console.log('  node test/oracle.js --file path/to/file.m2             # validate whole file');
    console.log('  node test/oracle.js --scan-candidates                  # targeted scan');
    console.log('  node test/oracle.js --scan-candidates --top=20         # top N candidates');
    process.exit(0);
  }

  // Find M2
  const m2Path = findM2();
  if (!m2Path) {
    console.error('M2 not found. Set M2_PATH env var or install Macaulay2.');
    process.exit(1);
  }

  // Check M2 is actually runnable
  try {
    execSync(`"${m2Path}" --version 2>/dev/null`, { timeout: 5000 });
  } catch (e) {
    console.error(`M2 found at ${m2Path} but not runnable`);
    process.exit(1);
  }

  // --snippet mode
  if (args[0] === '--snippet') {
    const snippet = args.slice(1).join(' ');
    const result = validateSnippet(snippet, m2Path);
    console.log(`Status: ${result.status}`);
    console.log(`Exit code: ${result.exitCode}`);
    if (result.errorSnippet) console.log(`Error: ${result.errorSnippet}`);
    process.exit(result.status === 'VALID' ? 0 : 1);
  }

  // --file mode
  if (args[0] === '--file') {
    const filepath = args[1];
    if (!filepath || !fs.existsSync(filepath)) {
      console.error(`File not found: ${filepath}`);
      process.exit(1);
    }
    console.log(`Validating: ${filepath}`);
    console.log(`M2 path: ${m2Path}`);
    const result = validateFile(filepath, m2Path);
    console.log(`Status: ${result.status}`);
    console.log(`Exit code: ${result.exitCode}`);
    if (result.errorSnippet) console.log(`Error: ${result.errorSnippet}`);
    if (args.includes('--verbose')) console.log(`\n--- Raw Transcript ---\n${result.rawTranscript}`);
    process.exit(result.status === 'VALID' ? 0 : 1);
  }

  // --scan-candidates mode
  if (args[0] === '--scan-candidates') {
    const topArg = args.find(a => a.startsWith('--top='));
    const topN = topArg ? parseInt(topArg.split('=')[1]) : 15;
    console.log(`M2 path: ${m2Path}`);
    await scanCandidates(m2Path, topN);
    process.exit(0);
  }

  // Default: batch mode
  const jsonMode = args[0] === '--json';
  const filepath = jsonMode ? args[1] : args[0];

  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  const { failed } = runBatch(filepath, m2Path, jsonMode);
  process.exit(failed > 0 ? 1 : 0);
}
