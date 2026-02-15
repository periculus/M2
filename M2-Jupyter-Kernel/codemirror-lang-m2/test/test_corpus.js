// Full corpus test: parse ALL .m2 files and report error rates
// Reports dual-track metrics: ALL files and CODE-ONLY (doc-filtered)
import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { isRawDocFile } from './doc_detection.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Find all .m2 files recursively
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

// Count nodes and errors in a parse tree
function analyzeTree(code, tree) {
  let totalNodes = 0;
  let errorNodes = 0;
  let errorTexts = [];

  tree.iterate({
    enter: (node) => {
      totalNodes++;
      if (node.type.isError) {
        errorNodes++;
        const text = code.slice(node.from, Math.min(node.to, node.from + 30));
        if (text.trim()) errorTexts.push(text.trim());
      }
    }
  });
  return { totalNodes, errorNodes, errorTexts };
}

// Main
const m2Root = path.resolve(__dirname, '../../../M2/Macaulay2');
const dirs = [
  path.join(m2Root, 'm2'),
  path.join(m2Root, 'tests'),
  path.join(m2Root, 'packages'),
];

// Dual-track counters
let allFiles = 0, allNodes = 0, allErrors = 0;
let codeFiles = 0, codeNodes = 0, codeErrors = 0;
let skippedDocFiles = 0;
let worstFiles = [];
let errorCounts = {};

for (const dir of dirs) {
  if (!fs.existsSync(dir)) { console.log('Skipping (not found):', dir); continue; }
  const files = findFiles(dir, '.m2');
  console.log(`Found ${files.length} .m2 files in ${path.basename(dir)}/`);

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf-8');
      if (code.length > 500000) continue; // skip very large files

      const isDoc = isRawDocFile(code, file);
      if (isDoc) skippedDocFiles++;

      const tree = parser.parse(code);
      const { totalNodes: nodes, errorNodes: errors, errorTexts } = analyzeTree(code, tree);

      // ALL track (every file)
      allFiles++;
      allNodes += nodes;
      allErrors += errors;

      // CODE-ONLY track (excluding raw doc files)
      if (!isDoc) {
        codeFiles++;
        codeNodes += nodes;
        codeErrors += errors;

        const errorRate = nodes > 0 ? (errors / nodes * 100) : 0;
        if (errorRate > 10 && nodes > 20) {
          worstFiles.push({ file: path.relative(m2Root, file), errorRate: errorRate.toFixed(1), nodes, errors });
        }

        // Count common error patterns (code-only)
        for (const text of errorTexts) {
          const key = text.substring(0, 20);
          errorCounts[key] = (errorCounts[key] || 0) + 1;
        }
      }
    } catch (e) { /* skip unreadable files */ }
  }
}

const allRate = allNodes > 0 ? (allErrors / allNodes * 100) : 0;
const codeRate = codeNodes > 0 ? (codeErrors / codeNodes * 100) : 0;

// Canonical metric source: commit hash + date
let commitInfo = '';
try {
  const hash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  const date = execSync('git log -1 --format=%ci HEAD', { cwd: __dirname }).toString().trim().split(' ')[0];
  commitInfo = ` (commit ${hash}, ${date})`;
} catch (e) { /* git not available */ }

console.log(`\n=== CORPUS TEST RESULTS${commitInfo} ===`);
console.log(`  ALL files:  ${allFiles} files | ${allNodes} nodes | ${allErrors} errors | ${allRate.toFixed(2)}%`);
console.log(`  CODE only:  ${codeFiles} files | ${codeNodes} nodes | ${codeErrors} errors | ${codeRate.toFixed(2)}%`);
console.log(`  Doc files excluded: ${skippedDocFiles}`);
console.log(`Target: <5% (code-only)`);
console.log(`Status: ${codeRate < 5 ? 'PASS' : 'NEEDS IMPROVEMENT'}`);

if (worstFiles.length > 0) {
  console.log(`\n=== WORST FILES (>10% error rate, code-only) ===`);
  worstFiles.sort((a, b) => b.errorRate - a.errorRate);
  worstFiles.slice(0, 15).forEach(f => {
    console.log(`  ${f.errorRate}% errors | ${f.errors}/${f.nodes} nodes | ${f.file}`);
  });
}

// Top error patterns (code-only)
const sorted = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
if (sorted.length > 0) {
  console.log(`\n=== TOP ERROR PATTERNS (code-only) ===`);
  sorted.slice(0, 15).forEach(([text, count]) => {
    console.log(`  ${count}x | "${text}"`);
  });
}
