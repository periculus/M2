#!/usr/bin/env node
// Parser-shape fixtures: verify specific patterns produce expected parse trees.
// Each fixture specifies input code, then asserts on the node types at the top level.
//
// Run: node test/test_fixtures.js
const {parser} = require('../src/parser.js');

let passed = 0, failed = 0;

// ============================================================
// Helpers
// ============================================================

// Collect top-level expression nodes (children of Program, skipping semicolons)
function topNodes(code) {
  const tree = parser.parse(code);
  const nodes = [];
  const cursor = tree.cursor();
  if (!cursor.firstChild()) return nodes;
  do {
    nodes.push({
      name: cursor.name,
      from: cursor.from,
      to: cursor.to,
      text: code.slice(cursor.from, cursor.to),
      isError: cursor.type.isError,
    });
  } while (cursor.nextSibling());
  return nodes;
}

// Count total error nodes in tree
function errorCount(code) {
  const tree = parser.parse(code);
  let errors = 0;
  tree.iterate({ enter: (node) => { if (node.type.isError) errors++; } });
  return errors;
}

// Find first node of a given type
function findNode(code, typeName) {
  const tree = parser.parse(code);
  let found = null;
  tree.iterate({
    enter: (node) => {
      if (!found && node.name === typeName) {
        found = { name: node.name, from: node.from, to: node.to, text: code.slice(node.from, node.to) };
      }
    }
  });
  return found;
}

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL: ${message}`);
  }
}

// ============================================================
// Fixtures
// ============================================================

console.log('=== OperatorSymbol Token ===');

// Basic: symbol + space + operator → single OperatorSymbol token
{
  const code = 'symbol *';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(node && node.text === 'symbol *', `"${code}" OperatorSymbol should span full text, got: ${node && node.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

{
  const code = 'symbol ==';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

{
  const code = 'symbol ++';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

{
  const code = 'symbol _';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Multi-character operators
{
  const code = 'symbol ===>';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(node && node.text === 'symbol ===>', `"${code}" OperatorSymbol text, got: ${node && node.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// No space between keyword and operator
{
  const code = 'symbol*';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// global, local, threadLocal variants
{
  const code = 'global ==';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

{
  const code = 'local +';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// In context: inside parens with commas (real M2 pattern)
{
  const code = '(symbol **, Matrix, Matrix)';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

{
  const code = 'lookup(symbol .., Thing, Thing)';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"${code}" should produce OperatorSymbol node`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== OperatorSymbol Boundary Guards ===');

// CRITICAL: symbol followed by newline + operator must NOT become OperatorSymbol
{
  const code = 'symbol\n*x';
  const node = findNode(code, 'OperatorSymbol');
  assert(node === null, `"symbol\\n*x" must NOT produce OperatorSymbol (cross-line)`);
  // "symbol" should be an identifier or ScopeExpr keyword, "*x" should be UnaryExpression
}

// symbol followed by newline + another expression
{
  const code = 'symbol\nx';
  const node = findNode(code, 'OperatorSymbol');
  assert(node === null, `"symbol\\nx" must NOT produce OperatorSymbol`);
}

// symbol followed by comment — must not eat the dash from --
{
  const code = 'symbol --comment\nx';
  const node = findNode(code, 'OperatorSymbol');
  assert(node === null, `"symbol --comment" must NOT produce OperatorSymbol`);
  // The -- should start a LineComment, not be eaten by OperatorSymbol
  const comment = findNode(code, 'LineComment');
  assert(comment !== null, `"symbol --comment" should have a LineComment node`);
}

// symbol followed by block comment — must not eat the dash from -*
{
  const code = 'symbol -* block *- x';
  // The -* should start a BlockComment; "symbol" should be ScopeExpr keyword
  const comment = findNode(code, 'BlockComment');
  assert(comment !== null, `"symbol -* block *-" should have a BlockComment node`);
  const opSym = findNode(code, 'OperatorSymbol');
  assert(opSym === null, `"symbol -* block *-" must NOT produce OperatorSymbol`);
}

// symbol with tab (horizontal whitespace) + operator — should work
{
  const code = 'symbol\t*';
  const node = findNode(code, 'OperatorSymbol');
  assert(node !== null, `"symbol\\t*" should produce OperatorSymbol (tab is horizontal whitespace)`);
  assert(errorCount(code) === 0, `"symbol\\t*" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== ScopeExpr (symbol + expression) ===');

// symbol + identifier → ScopeExpr (not OperatorSymbol)
{
  const code = 'symbol x';
  const scope = findNode(code, 'ScopeExpr');
  const opSym = findNode(code, 'OperatorSymbol');
  assert(scope !== null, `"${code}" should produce ScopeExpr`);
  assert(opSym === null, `"${code}" should NOT produce OperatorSymbol`);
}

{
  const code = 'global x';
  const scope = findNode(code, 'ScopeExpr');
  assert(scope !== null, `"${code}" should produce ScopeExpr`);
}

{
  const code = 'local myVar';
  const scope = findNode(code, 'ScopeExpr');
  assert(scope !== null, `"${code}" should produce ScopeExpr`);
}

console.log('');
console.log('=== TryExpr (try...catch form) ===');

// try...catch
{
  const code = 'try f() catch g()';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// try without catch
{
  const code = 'try f()';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== Core Expression Fixtures ===');

// Juxtaposition
{
  const code = 'gb I';
  const jux = findNode(code, 'JuxtapositionExpr');
  assert(jux !== null, `"${code}" should produce JuxtapositionExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Number formats
{
  const code = '1.5p100e20';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Trailing comma in list
{
  const code = 'f(x, y,)';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Subscript + range
{
  const code = 'x_0 .. x_n';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// For loop
{
  const code = 'for i from 0 to 10 do f(i)';
  const forNode = findNode(code, 'ForExpr');
  assert(forNode !== null, `"${code}" should produce ForExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// If/then/else
{
  const code = 'if x then y else z';
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode !== null, `"${code}" should produce IfExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// not as ckw (can appear as identifier in method installation)
{
  const code = 'not x';
  const unary = findNode(code, 'UnaryExpression');
  assert(unary !== null, `"${code}" should produce UnaryExpression`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Triple string
{
  const code = '/// doc string ///';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Ellipsis
{
  const code = 'x...';
  const ell = findNode(code, 'Ellipsis');
  assert(ell !== null, `"${code}" should produce Ellipsis`);
}

console.log('');
console.log('=== Leading-Dot Numbers ===');

// .4 parses as Number (not dot + 4)
{
  const code = '.4';
  const num = findNode(code, 'Number');
  assert(num !== null && num.text === '.4', `"${code}" should produce Number(.4), got: ${num && num.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .5e3 parses as Number
{
  const code = '.5e3';
  const num = findNode(code, 'Number');
  assert(num !== null && num.text === '.5e3', `"${code}" should produce Number(.5e3), got: ${num && num.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .5p100 parses as Number
{
  const code = '.5p100';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// x = .4 (leading-dot in expression context)
{
  const code = 'x = .4';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const num = findNode(code, 'Number');
  assert(num !== null && num.text === '.4', `"${code}" Number should be .4, got: ${num && num.text}`);
}

// 1 + .4 (leading-dot after operator)
{
  const code = '1 + .4';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// member access x.y still works (dot as operator)
{
  const code = 'x.y';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression (member access)`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .. range operator not affected
{
  const code = 'x .. y';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .? operator not affected
{
  const code = 'x .? y';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== Empty Argument Slots ===');

// map(M, , B) — empty middle argument
{
  const code = 'map(M, , B)';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const call = findNode(code, 'CallExpr');
  assert(call !== null, `"${code}" should produce CallExpr`);
}

// Multiple empty slots
{
  const code = 'f(a, , , b)';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Trailing comma
{
  const code = 'f(a, b,)';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Empty slot in braces
{
  const code = '{a, , b}';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Empty list still works
{
  const code = '{}';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Empty parens still work
{
  const code = 'f()';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== ??= Assignment Operator ===');

// Basic ??= assignment
{
  const code = 'x ??= 0';
  const assign = findNode(code, 'AssignExpr');
  assert(assign !== null, `"${code}" should produce AssignExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ??= with expression RHS
{
  const code = 'x ??= y + z';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ?? still works as binary operator
{
  const code = 'x ?? y';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ============================================================
// Summary
// ============================================================
console.log('');
console.log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
