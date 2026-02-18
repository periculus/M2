/**
 * M2 Oracle: validates syntax snippets against real Macaulay2.
 * Each snippet runs in an isolated M2 process with hard timeout.
 *
 * Usage:
 *   node test/oracle.js test/oracle_snippets.txt     # batch mode
 *   node test/oracle.js --snippet 'x = 1 + 2'        # single snippet
 *   node test/oracle.js --json test/oracle_snippets.txt  # JSON output
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const M2_PATH = '/opt/homebrew/bin/M2';
const TIMEOUT_SECS = 30;

// ============================================================
// Core validation
// ============================================================

/**
 * Validate a single M2 snippet.
 * Pipes snippet directly to M2 stdin and classifies the output.
 * Returns: { status: 'VALID'|'SYNTAX_ERROR'|'RUNTIME_ERROR'|'TIMEOUT'|'CRASH', output: string }
 */
function validateSnippet(snippet) {
  try {
    // Pipe snippet directly to M2 via stdin
    const result = spawnSync(M2_PATH, ['--silent', '--no-prompts', '--no-tty', '--stop'], {
      input: snippet + '\n',
      timeout: TIMEOUT_SECS * 1000,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const combined = stdout + '\n' + stderr;

    // Classify
    if (result.status === null && result.signal === 'SIGTERM') {
      return { status: 'TIMEOUT', output: `Killed after ${TIMEOUT_SECS}s` };
    }

    if (result.signal) {
      return { status: 'CRASH', output: `Signal: ${result.signal}` };
    }

    // Check for syntax/parse errors specifically
    if (/syntax error/i.test(combined) || /parse error/i.test(combined) || /invalid character/i.test(combined)) {
      return { status: 'SYNTAX_ERROR', output: combined.trim().substring(0, 200) };
    }

    // Check for runtime errors (on stderr)
    if (/\berror\b/i.test(stderr)) {
      return { status: 'RUNTIME_ERROR', output: combined.trim().substring(0, 200) };
    }

    return { status: 'VALID', output: combined.trim().substring(0, 200) };
  } catch (e) {
    return { status: 'CRASH', output: e.message.substring(0, 200) };
  }
}

// ============================================================
// Batch mode
// ============================================================

/**
 * Parse oracle_snippets.txt format:
 * # comment lines
 * EXPECTED_STATUS | snippet text
 * EXPECTED_STATUS | multiline\ncontinuation
 */
function parseSnippetsFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const snippets = [];
  let current = null;

  for (const line of content.split('\n')) {
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      if (current) {
        snippets.push(current);
        current = null;
      }
      continue;
    }

    // Check for new snippet: STATUS | code
    const match = line.match(/^(VALID|SYNTAX_ERROR|RUNTIME_ERROR|ANY)\s*\|\s*(.*)$/);
    if (match) {
      if (current) snippets.push(current);
      current = {
        expected: match[1],
        snippet: match[2],
        lineNum: snippets.length + 1,
      };
    } else if (current) {
      // Continuation line
      current.snippet += '\n' + line;
    }
  }
  if (current) snippets.push(current);
  return snippets;
}

function runBatch(filepath, jsonMode = false) {
  const snippets = parseSnippetsFile(filepath);
  const results = [];
  let passed = 0;
  let failed = 0;

  if (!jsonMode) {
    console.log(`=== M2 Oracle Validation ===`);
    console.log(`  Snippets: ${snippets.length}`);
    console.log(`  M2 path: ${M2_PATH}`);
    console.log(`  Timeout: ${TIMEOUT_SECS}s per snippet`);
    console.log();
  }

  for (const { expected, snippet, lineNum } of snippets) {
    const result = validateSnippet(snippet);
    const match = expected === 'ANY' || result.status === expected;

    results.push({ snippet: snippet.substring(0, 60), expected, actual: result.status, match, output: result.output });

    if (!jsonMode) {
      const icon = match ? 'OK' : 'MISMATCH';
      const snippetPreview = snippet.replace(/\n/g, '\\n').substring(0, 50);
      console.log(`  ${icon} | expected: ${expected.padEnd(14)} | got: ${result.status.padEnd(14)} | ${snippetPreview}`);
      if (!match) {
        console.log(`       output: ${result.output.substring(0, 100)}`);
      }
    }

    if (match) passed++; else failed++;
  }

  if (jsonMode) {
    console.log(JSON.stringify({ total: snippets.length, passed, failed, results }, null, 2));
  } else {
    console.log();
    console.log(`=== Oracle Summary ===`);
    console.log(`  Total: ${snippets.length}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Status: ${failed === 0 ? 'ALL MATCH' : 'MISMATCHES FOUND'}`);
  }

  return { total: snippets.length, passed, failed };
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node test/oracle.js test/oracle_snippets.txt');
  console.log('  node test/oracle.js --snippet "x = 1 + 2"');
  console.log('  node test/oracle.js --json test/oracle_snippets.txt');
  process.exit(0);
}

if (args[0] === '--snippet') {
  const snippet = args.slice(1).join(' ');
  const result = validateSnippet(snippet);
  console.log(`Status: ${result.status}`);
  console.log(`Output: ${result.output}`);
  process.exit(result.status === 'VALID' ? 0 : 1);
}

const jsonMode = args[0] === '--json';
const filepath = jsonMode ? args[1] : args[0];

if (!fs.existsSync(filepath)) {
  console.error(`File not found: ${filepath}`);
  process.exit(1);
}

// Check M2 is available
try {
  execSync(`${M2_PATH} --version 2>/dev/null`, { timeout: 5000 });
} catch (e) {
  console.error(`M2 not found at ${M2_PATH}`);
  process.exit(1);
}

const { failed } = runBatch(filepath, jsonMode);
process.exit(failed > 0 ? 1 : 0);
