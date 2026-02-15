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
console.log('=== TryExpr (all 5 forms) ===');
// External tokenizer (controlFlowTokenizer.js) provides IfKw, ThenKw, ElseKw,
// TryKw, CatchKw as distinct tokens from Identifier. This enables correct parsing
// of control flow inside any context (parens, braces, function call args).

// Form 1: try e
{
  const code = 'try f()';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Form 2: try e catch e
{
  const code = 'try f() catch g()';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Form 3: try e then e
{
  const code = 'try x then y';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Form 4: try e then e else e
{
  const code = 'try 1/0 then false else true';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Form 5: try e else e
{
  const code = 'try x else y';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Parse-shape: then/else consumed by TryExpr as keywords (not Identifier)
{
  const code = 'try 1/0 then false else true';
  const tree = parser.parse(code);
  let thenAsIdentifier = false;
  let elseAsIdentifier = false;
  tree.iterate({enter: (node) => {
    if (node.name === 'Identifier') {
      const text = code.slice(node.from, node.to);
      if (text === 'then') { thenAsIdentifier = true; }
      if (text === 'else') { elseAsIdentifier = true; }
    }
  }});
  assert(!thenAsIdentifier, `"${code}" must NOT have "then" as Identifier`);
  assert(!elseAsIdentifier, `"${code}" must NOT have "else" as Identifier`);
}

// try with catch and binary expression before catch
{
  const code = 'try 1/0 catch e';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== IfExpr ===');

// IfExpr at top level
{
  const code = 'if x then y else z';
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode !== null, `"${code}" should produce IfExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// IfExpr inside parens (previously failed with ckw)
{
  const code = '(if x then y else z)';
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode !== null, `"${code}" should produce IfExpr inside parens`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// IfExpr as function argument
{
  const code = 'f(if x then y else z)';
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode !== null, `"${code}" should produce IfExpr inside call`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// TryExpr inside parens with binary expression
{
  const code = '(try 1/0 then false else true)';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr inside parens`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// TryExpr as function argument
{
  const code = 'f(try 1/0 then y else z)';
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr inside call`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// assert(try ... then ... else ...) — from A01.m2
{
  const code = 'assert(try true then true else false)';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode !== null, `"${code}" should produce TryExpr`);
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

// .4 parses as LeadingDotNumber (not dot + 4)
{
  const code = '.4';
  const ldn = findNode(code, 'LeadingDotNumber');
  assert(ldn !== null && ldn.text === '.4', `"${code}" should produce LeadingDotNumber(.4), got: ${ldn && ldn.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .5e3 parses as LeadingDotNumber
{
  const code = '.5e3';
  const ldn = findNode(code, 'LeadingDotNumber');
  assert(ldn !== null && ldn.text === '.5e3', `"${code}" should produce LeadingDotNumber(.5e3), got: ${ldn && ldn.text}`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// .5p100 parses as LeadingDotNumber
{
  const code = '.5p100';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// x = .4 (leading-dot in expression context)
{
  const code = 'x = .4';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const ldn = findNode(code, 'LeadingDotNumber');
  assert(ldn !== null && ldn.text === '.4', `"${code}" LeadingDotNumber should be .4, got: ${ldn && ldn.text}`);
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

// C.0 — member access with digit, MUST be BinaryExpression (not juxtaposition)
{
  const code = 'C.0';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression (member access)`);
  const ldn = findNode(code, 'LeadingDotNumber');
  assert(ldn === null, `"${code}" must NOT produce LeadingDotNumber`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// s.0 — same pattern
{
  const code = 's.0';
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

console.log('');
console.log('=== AngleBarList <| |> ===');

// Basic angle bar list literal
{
  const code = '<| x, y, z |>';
  const abl = findNode(code, 'AngleBarListExpr');
  assert(abl !== null, `"${code}" should produce AngleBarListExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Empty angle bar list
{
  const code = '<| |>';
  const abl = findNode(code, 'AngleBarListExpr');
  assert(abl !== null, `"${code}" should produce AngleBarListExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Angle bar list in assignment
{
  const code = 'i = <| x, y, z |>';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const abl = findNode(code, 'AngleBarListExpr');
  assert(abl !== null, `"${code}" should produce AngleBarListExpr`);
  const assign = findNode(code, 'AssignExpr');
  assert(assign !== null, `"${code}" should produce AssignExpr`);
}

// R<|T|> — parses as juxtaposition + AngleBarListExpr (correct highlighting)
{
  const code = 'R<|T|>';
  const abl = findNode(code, 'AngleBarListExpr');
  assert(abl !== null, `"${code}" should produce AngleBarListExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// R<|T,X|> — multiple args
{
  const code = 'R<|T,X|>';
  const abl = findNode(code, 'AngleBarListExpr');
  assert(abl !== null, `"${code}" should produce AngleBarListExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Parse shape: <| should NOT produce CompareOp
{
  const code = '<| x, y |>';
  const cmp = findNode(code, 'CompareOp');
  assert(cmp === null, `"${code}" must NOT produce CompareOp (< should not be separate)`);
}

// < still works as comparison when not followed by |
{
  const code = 'x < y';
  const cmp = findNode(code, 'CompareOp');
  assert(cmp !== null, `"${code}" should produce CompareOp`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// | still works as binary operator when not followed by >
{
  const code = 'x | y';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// symbol <| tokenizes as OperatorSymbol
{
  const code = 'symbol <|';
  const os = findNode(code, 'OperatorSymbol');
  assert(os !== null, `"${code}" should produce OperatorSymbol`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// symbol < tokenizes as OperatorSymbol (bare less-than)
{
  const code = 'symbol <';
  const os = findNode(code, 'OperatorSymbol');
  assert(os !== null, `"${code}" should produce OperatorSymbol`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== Truncation Operators _> _>= _< _<= ===');

// _> as single binary operator (not _ then >)
{
  const code = '2 _> 3';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  // Should NOT produce CompareOp
  const cmp = findNode(code, 'CompareOp');
  assert(cmp === null, `"${code}" must NOT produce CompareOp (> should not be separate)`);
}

// _>= as single operator
{
  const code = '2 _>= 3';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// _< as single operator
{
  const code = '2 _< 3';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// _<= as single operator
{
  const code = '2 _<= 3';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Plain _ still works as subscript
{
  const code = 'x_0';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression (subscript)`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Method installation form: ZZ _> ZZ := (a,b) -> a^b
{
  const code = 'ZZ _> ZZ := (a,b) -> a^b';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// symbol _> tokenizes as OperatorSymbol
{
  const code = 'symbol _>';
  const os = findNode(code, 'OperatorSymbol');
  assert(os !== null, `"${code}" should produce OperatorSymbol`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ============================================================
// Summary
// ============================================================
console.log('');
console.log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
