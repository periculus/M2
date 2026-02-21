#!/usr/bin/env node
// drift_check.js — Compare keyword_manifest.json against current grammar/tokenizer.
// Reports discrepancies between M2 source-of-truth and Lezer implementation.
// Run: node test/drift_check.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load manifest
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'keyword_manifest.json'), 'utf-8'));

// Load grammar source
const grammarSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'm2.grammar'), 'utf-8');

// Load controlFlowTokenizer source
const tokenizerSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'controlFlowTokenizer.js'), 'utf-8');

// Load highlight source
const highlightSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'highlight.js'), 'utf-8');

// Extract grammar keywords
function extractGrammarKeywords() {
  const ckwMatches = [...grammarSrc.matchAll(/ckw<"(\w+)">/g)].map(m => m[1]);
  const kwMatches = [...grammarSrc.matchAll(/kw<"(\w+)">/g)].map(m => m[1]);
  const externalTokens = [...grammarSrc.matchAll(/@external tokens \w+ from "[^"]+" \{([^}]+)\}/g)]
    .flatMap(m => m[1].split(',').map(t => t.trim()).filter(Boolean));
  return { ckw: [...new Set(ckwMatches)], kw: [...new Set(kwMatches)], externalTokens };
}

// Extract tokenizer emitIfShiftable calls
function extractTokenizerKeywords() {
  const matches = [...tokenizerSrc.matchAll(/emitIfShiftable\(input,\s*stack,\s*"(\w+)",\s*(\w+)\)/g)];
  return matches.map(m => ({ word: m[1], token: m[2] }));
}

// Extract highlight keywords
function extractHighlightKeywords() {
  const lines = highlightSrc.split('\n');
  const keywords = [];
  for (const line of lines) {
    const match = line.match(/"([^"]+)":\s*t\.(\w+)/);
    if (match) {
      const words = match[1].split(/\s+/).filter(w => w.length > 0);
      keywords.push(...words.map(w => ({ word: w, tag: match[2] })));
    }
  }
  return keywords;
}

console.log('=== KEYWORD DRIFT CHECK ===\n');

const grammarKw = extractGrammarKeywords();
const tokenizerKw = extractTokenizerKeywords();
const highlightKw = extractHighlightKeywords();

let issues = 0;

// Check 1: Clause keywords — mechanism alignment
console.log('--- Clause Keyword Mechanism Check ---');
for (const [word, info] of Object.entries(manifest.clauseKeywords)) {
  if (word.startsWith('_')) continue;

  const isCkw = grammarKw.ckw.includes(word);
  const isExternalToken = tokenizerKw.some(t => t.word === word);
  const status = info.status;

  if (status === 'MECHANISM_MISMATCH') {
    console.log(`  MISMATCH: "${word}" — reserved keyword uses ckw (should be external tokenizer)`);
    issues++;
  } else if (status === 'ALIGNED') {
    if (!isExternalToken) {
      console.log(`  WARNING: "${word}" marked ALIGNED but not in external tokenizer`);
      issues++;
    } else {
      console.log(`  OK: "${word}" — external tokenizer, aligned`);
    }
  }
}

// Check 2: Drift entries
console.log('\n--- Drift Detection ---');
for (const [key, info] of Object.entries(manifest.drift)) {
  if (info.status === 'EXTRA_KEYWORD') {
    const inGrammar = grammarKw.ckw.includes(key) || grammarKw.kw.includes(key);
    if (inGrammar) {
      console.log(`  DRIFT: "${key}" in grammar but NOT in M2 source — should be removed`);
      issues++;
    } else {
      console.log(`  FIXED: "${key}" drift already resolved`);
    }
  } else if (info.status === 'STRUCTURE_MISMATCH') {
    console.log(`  DRIFT: ${key} — ${info.source}`);
    console.log(`         Grammar: ${info.grammar}`);
    issues++;
  }
}

// Check 3: External tokenizer coverage
console.log('\n--- External Tokenizer Coverage ---');
const externalWords = new Set(tokenizerKw.map(t => t.word));
const expectedExternal = ['if', 'then', 'else', 'try', 'catch', 'from', 'do', 'list'];
// Future: add 'to', 'in', 'when', 'of' as they're rolled out
for (const word of expectedExternal) {
  if (externalWords.has(word)) {
    console.log(`  OK: "${word}" has external tokenizer`);
  } else {
    console.log(`  MISSING: "${word}" should have external tokenizer`);
    issues++;
  }
}

// Check 4: Highlight coverage
console.log('\n--- Highlight Coverage ---');
const highlightWords = new Set(highlightKw.map(h => h.word));
const allKeywords = [
  ...Object.keys(manifest.clauseKeywords).filter(k => !k.startsWith('_')),
  ...Object.keys(manifest.statementStarters).filter(k => !k.startsWith('_')),
  ...Object.keys(manifest.binaryKeywords).filter(k => !k.startsWith('_'))
];
for (const word of allKeywords) {
  // External tokens use Kw suffix in highlight
  const kwName = word.charAt(0).toUpperCase() + word.slice(1) + 'Kw';
  const hasHighlight = highlightWords.has(word) || highlightWords.has(kwName);
  if (!hasHighlight) {
    console.log(`  MISSING: "${word}" not highlighted`);
    issues++;
  }
}

// Summary
console.log(`\n=== SUMMARY: ${issues} issue(s) found ===`);
if (issues === 0) {
  console.log('All keywords aligned with M2 source.');
} else {
  console.log('Run keyword alignment sprint to resolve.');
}
process.exit(issues > 0 ? 1 : 0);
