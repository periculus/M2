// Quick script to list files with most errors
import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {classifyFile} from './doc_detection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const M2_ROOT = path.resolve(__dirname, '../../../M2/Macaulay2');

function walk(d) {
  const files = [];
  for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
    const full = path.join(d, ent.name);
    if (ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== '_archive') {
      walk(full).forEach(f => files.push(f));
    } else if (ent.isFile() && ent.name.endsWith('.m2')) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(M2_ROOT);
const results = [];
for (const f of allFiles) {
  const rel = path.relative(M2_ROOT, f);
  const code = fs.readFileSync(f, 'utf-8');
  const cls = classifyFile(rel, code);
  if (cls === 'raw_doc' || cls === 'invalid_syntax') continue;
  const tree = parser.parse(code);
  let errors = 0;
  tree.iterate({enter: n => { if (n.type.isError) errors++; }});
  if (errors > 0) results.push({file: rel, errors, size: code.length, cls});
}
results.sort((a, b) => b.errors - a.errors);

console.log('Top 30 files by error count:');
console.log('Errors | Size(KB)| Class      | File');
console.log('-------|---------|------------|-----');
for (const r of results.slice(0, 30)) {
  const kb = (r.size / 1024).toFixed(1).padStart(6);
  console.log(String(r.errors).padStart(6) + ' | ' + kb + ' | ' + r.cls.padEnd(10) + ' | ' + r.file);
}
console.log();
console.log(`Total files with errors: ${results.length} / ${allFiles.length - /* excluded */ 0}`);
console.log(`Total errors: ${results.reduce((s, r) => s + r.errors, 0)}`);
console.log(`Top 10 account for: ${results.slice(0, 10).reduce((s, r) => s + r.errors, 0)} errors (${(results.slice(0, 10).reduce((s, r) => s + r.errors, 0) / results.reduce((s, r) => s + r.errors, 0) * 100).toFixed(1)}%)`);
console.log(`Top 20 account for: ${results.slice(0, 20).reduce((s, r) => s + r.errors, 0)} errors (${(results.slice(0, 20).reduce((s, r) => s + r.errors, 0) / results.reduce((s, r) => s + r.errors, 0) * 100).toFixed(1)}%)`);

// Breakdown excluding outliers
const outlierPatterns = ['SchurVeronese/', 'PrimaryDecomposition/examples.m2', 'Schubert2/doc.m2', 'CotangentSchubert/puzzles/'];
const normal = results.filter(r => !outlierPatterns.some(p => r.file.includes(p)));
const outliers = results.filter(r => outlierPatterns.some(p => r.file.includes(p)));

console.log();
console.log('=== OUTLIER FILES (buffer overflow / non-M2 syntax) ===');
console.log(`  ${outliers.length} files, ${outliers.reduce((s, r) => s + r.errors, 0)} errors`);
for (const r of outliers) {
  console.log(`  ${String(r.errors).padStart(6)} | ${r.file}`);
}

console.log();
console.log('=== NORMAL FILES (representative M2 code) ===');
console.log(`  ${normal.length} files, ${normal.reduce((s, r) => s + r.errors, 0)} errors`);
console.log();
console.log('Errors | Size(KB)| Class      | File');
console.log('-------|---------|------------|-----');
for (const r of normal) {
  const kb = (r.size / 1024).toFixed(1).padStart(6);
  console.log(String(r.errors).padStart(6) + ' | ' + kb + ' | ' + r.cls.padEnd(10) + ' | ' + r.file);
}

// Bucket by error count ranges
const ranges = [[1,1],[2,3],[4,7],[8,15],[16,50]];
console.log();
console.log('=== DISTRIBUTION (normal files) ===');
for (const [lo, hi] of ranges) {
  const bucket = normal.filter(r => r.errors >= lo && r.errors <= hi);
  if (bucket.length > 0)
    console.log(`  ${lo}-${hi} errors: ${bucket.length} files, ${bucket.reduce((s,r) => s + r.errors, 0)} total errors`);
}

// Bucket by directory
const byDir = {};
for (const r of normal) {
  const dir = r.file.split('/').slice(0, r.file.startsWith('packages/') ? 2 : 1).join('/');
  if (!byDir[dir]) byDir[dir] = {files: 0, errors: 0};
  byDir[dir].files++;
  byDir[dir].errors += r.errors;
}
console.log();
console.log('=== BY DIRECTORY (normal files) ===');
for (const [dir, v] of Object.entries(byDir).sort((a,b) => b[1].errors - a[1].errors)) {
  console.log(`  ${String(v.errors).padStart(4)} errors in ${String(v.files).padStart(2)} files | ${dir}`);
}
