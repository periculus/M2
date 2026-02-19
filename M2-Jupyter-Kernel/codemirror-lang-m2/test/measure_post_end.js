/**
 * Measure errors in post-`end` sections of .m2 files.
 *
 * M2's `end` keyword at statement level stops file loading — all code after
 * it is intentionally unreachable. This script counts parser errors that
 * occur after bare `end` lines to determine if post-`end` content is a
 * significant source of corpus errors.
 *
 * Usage:  node test/measure_post_end.js
 */

import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyFile } from './doc_detection.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

/**
 * Find the byte offset of the first bare `end` at statement level.
 * Returns -1 if no bare `end` found.
 *
 * A "bare end" is a line that is just `end` (possibly with whitespace),
 * not part of a larger expression like `x.end` or `end = 5`.
 */
function findBareEnd(code) {
  const lines = code.split('\n');
  let offset = 0;
  for (const line of lines) {
    if (/^\s*end\s*$/.test(line)) {
      return offset;
    }
    offset += line.length + 1; // +1 for newline
  }
  return -1;
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

let totalFiles = 0;
let filesWithEnd = 0;
let totalErrors = 0;        // all errors in CODE_VALID files
let postEndErrors = 0;       // errors after bare `end`
let preEndErrors = 0;        // errors before bare `end`
let filesWithPostEndErrors = 0;
let skipped = { rawDoc: 0, corrupt: 0, invalidSyntax: 0 };

// Samples for reporting
const samples = [];

const startTime = Date.now();

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = findFiles(dir, '.m2');

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue;

      const classification = classifyFile(code, file);
      if (classification === 'corrupt') { skipped.corrupt++; continue; }
      if (classification === 'raw_doc') { skipped.rawDoc++; continue; }
      if (classification === 'invalid_syntax') { skipped.invalidSyntax++; continue; }

      totalFiles++;
      const tree = parser.parse(code);

      // Count all errors
      let fileErrors = 0;
      let filePostEndErrors = 0;
      const endOffset = findBareEnd(code);

      tree.iterate({
        enter: (node) => {
          if (node.type.isError) {
            fileErrors++;
            if (endOffset >= 0 && node.from >= endOffset) {
              filePostEndErrors++;
            }
          }
        }
      });

      totalErrors += fileErrors;

      if (endOffset >= 0) {
        filesWithEnd++;
        postEndErrors += filePostEndErrors;
        preEndErrors += (fileErrors - filePostEndErrors);

        if (filePostEndErrors > 0) {
          filesWithPostEndErrors++;
          const relPath = path.relative(m2Root, file);
          if (samples.length < 20) {
            // Count lines after end
            const postEndCode = code.slice(endOffset);
            const postEndLines = postEndCode.split('\n').length - 1;
            samples.push({
              file: relPath,
              endOffset,
              totalErrors: fileErrors,
              postEndErrors: filePostEndErrors,
              postEndLines,
            });
          }
        }
      }
    } catch (e) { /* skip unreadable */ }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ============================================================
// Report
// ============================================================
console.log();
console.log('=== POST-`end` ERROR MEASUREMENT ===');
console.log(`  CODE_VALID files: ${totalFiles}`);
console.log(`  Files with bare \`end\`: ${filesWithEnd} (${(filesWithEnd / totalFiles * 100).toFixed(1)}%)`);
console.log(`  Files with post-\`end\` errors: ${filesWithPostEndErrors}`);
console.log();
console.log(`  Total errors (CODE_VALID): ${totalErrors}`);
console.log(`  Post-\`end\` errors: ${postEndErrors} (${(postEndErrors / totalErrors * 100).toFixed(1)}% of total)`);
console.log(`  Pre-\`end\` errors: ${preEndErrors}`);
console.log(`  Errors in files without \`end\`: ${totalErrors - postEndErrors - preEndErrors}`);
console.log();

// Decision gate
if (postEndErrors < 100) {
  console.log(`  DECISION: <100 post-\`end\` errors → No action needed`);
} else if (postEndErrors < 300) {
  console.log(`  DECISION: 100-300 post-\`end\` errors → Add as sub-category (measurement only, no exclusion)`);
} else {
  console.log(`  DECISION: >300 post-\`end\` errors → Warrant explicit policy decision`);
}

console.log();
console.log(`  Analysis time: ${elapsed}s`);

// Top samples
if (samples.length > 0) {
  console.log();
  console.log('=== TOP FILES WITH POST-`end` ERRORS ===');
  samples.sort((a, b) => b.postEndErrors - a.postEndErrors);
  for (const s of samples.slice(0, 10)) {
    console.log(`  ${s.file}`);
    console.log(`    Total errors: ${s.totalErrors}, post-end: ${s.postEndErrors}, post-end lines: ${s.postEndLines}`);
  }
}
