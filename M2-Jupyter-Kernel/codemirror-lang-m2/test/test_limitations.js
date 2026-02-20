/**
 * Known limitations: documents patterns that currently fail but are NOT regressions.
 * These are tracked separately from test_fixtures.js so they don't lock bugs in place
 * as acceptance criteria.
 *
 * A limitation is "failing" if it produces error nodes OR if it produces the wrong
 * parse tree structure (silent misparse). Both are tracked.
 *
 * If R&D fixes any of these, move to test_fixtures.js as passing anti-regression.
 *
 * Run: node test/test_limitations.js
 */
import {parser} from '../src/parser.js';

function errorCount(code) {
  const tree = parser.parse(code);
  let errors = 0;
  tree.iterate({ enter: (node) => { if (node.type.isError) errors++; } });
  return errors;
}

const limitations = [
  // FIXED by ListKw/DoKw external tokenizer — moved to test_fixtures.js:
  // 'for i to n-1 list i' — now produces ForExpr
  // 'while i < 5 do f()' — now produces WhileExpr

  // semicolon_in_call: nested loop bodies — inner for/do parsed as juxtaposition
  // Inner `for j do` inside parens becomes Identifier(for) jux Identifier(j) jux Identifier(do)
  // because ckw<"for"> fails inside Body (paren context)
  {
    code: 'for i do (for j do (f j; g j); h i)',
    category: 'semicolon_in_call',
    description: 'Nested for loops — inner for/do parsed as juxtaposition',
    expectedFix: 'External tokenizer for for/while starters (like IfKw/TryKw)',
    check: (code) => {
      const tree = parser.parse(code);
      let count = 0;
      tree.iterate({ enter: (node) => { if (node.name === 'ForExpr') count++; } });
      return count >= 2;
    },
    checkDesc: 'should produce 2 ForExpr nodes (outer + inner)',
  },

  // trailing_comma: trailing comma in Body (MEMORY #40)
  {
    code: '(a, b, c,)',
    category: 'trailing_comma',
    description: 'Trailing comma in Body — parser size growth blocks fix',
    expectedFix: 'External tokenizer for TrailingComma or GLR',
    check: (code) => errorCount(code) === 0,
    checkDesc: 'should have 0 errors',
  },

  // trailing_comma: 2-element trailing comma
  {
    code: '(a, b,)',
    category: 'trailing_comma',
    description: 'Trailing comma in 2-element Body',
    expectedFix: 'Same as above',
    check: (code) => errorCount(code) === 0,
    checkDesc: 'should have 0 errors',
  },

  // empty_element: empty element in Body
  {
    code: '(a,,b)',
    category: 'empty_element',
    description: 'Empty element between commas in Body',
    expectedFix: 'Grammar change for empty expressions',
    check: (code) => errorCount(code) === 0,
    checkDesc: 'should have 0 errors',
  },
];

console.log('=== KNOWN LIMITATIONS ===');
console.log(`  ${limitations.length} patterns documented\n`);

let nowPassing = 0;
let stillFailing = 0;

for (const lim of limitations) {
  const passes = lim.check(lim.code);
  const errors = errorCount(lim.code);
  const status = passes ? 'PASS (FIXED!)' : 'FAIL';
  if (passes) nowPassing++;
  else stillFailing++;

  const errInfo = errors > 0 ? `${errors} errors` : 'silent misparse';
  console.log(`  ${status.padEnd(14)} | ${lim.category.padEnd(22)} | ${lim.code}`);
  console.log(`                 | ${lim.checkDesc} [${passes ? 'YES' : 'NO: ' + errInfo}]`);
  if (passes) {
    console.log(`                 | ^^^ FIXED — move to test_fixtures.js as anti-regression`);
  }
}

console.log();
console.log(`=== SUMMARY: ${stillFailing} still failing, ${nowPassing} now passing ===`);
if (nowPassing > 0) {
  console.log(`  ${nowPassing} limitation(s) have been fixed — move to test_fixtures.js as anti-regression!`);
}
