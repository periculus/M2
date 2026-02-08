#!/usr/bin/env node
// Full corpus test: parse ALL .m2 files and report error rates
const {parser} = require('../src/parser.js');
const fs = require('fs');
const path = require('path');

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

let totalFiles = 0, totalNodes = 0, totalErrors = 0;
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

      const tree = parser.parse(code);
      const { totalNodes: nodes, errorNodes: errors, errorTexts } = analyzeTree(code, tree);

      totalFiles++;
      totalNodes += nodes;
      totalErrors += errors;

      const errorRate = nodes > 0 ? (errors / nodes * 100) : 0;
      if (errorRate > 10 && nodes > 20) {
        worstFiles.push({ file: path.relative(m2Root, file), errorRate: errorRate.toFixed(1), nodes, errors });
      }

      // Count common error patterns
      for (const text of errorTexts) {
        const key = text.substring(0, 20);
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    } catch (e) { /* skip unreadable files */ }
  }
}

console.log('\n=== CORPUS TEST RESULTS ===');
console.log(`Files tested: ${totalFiles}`);
console.log(`Total nodes: ${totalNodes}`);
console.log(`Error nodes: ${totalErrors}`);
console.log(`Error rate: ${(totalErrors / totalNodes * 100).toFixed(2)}%`);
console.log(`Target: <5%`);
console.log(`Status: ${(totalErrors / totalNodes * 100) < 5 ? 'PASS' : 'NEEDS IMPROVEMENT'}`);

if (worstFiles.length > 0) {
  console.log(`\n=== WORST FILES (>10% error rate) ===`);
  worstFiles.sort((a, b) => b.errorRate - a.errorRate);
  worstFiles.slice(0, 15).forEach(f => {
    console.log(`  ${f.errorRate}% errors | ${f.errors}/${f.nodes} nodes | ${f.file}`);
  });
}

// Top error patterns
const sorted = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
if (sorted.length > 0) {
  console.log(`\n=== TOP ERROR PATTERNS ===`);
  sorted.slice(0, 15).forEach(([text, count]) => {
    console.log(`  ${count}x | "${text}"`);
  });
}
