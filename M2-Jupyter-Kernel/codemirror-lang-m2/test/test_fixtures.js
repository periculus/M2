// Parser-shape fixtures: verify specific patterns produce expected parse trees.
// Each fixture specifies input code, then asserts on the node types at the top level.
//
// Run: node test/test_fixtures.js
import {parser} from '../src/parser.js';

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

// Collect all node names in tree (for parse-shape assertions)
function allNodeNames(code) {
  const tree = parser.parse(code);
  const names = new Set();
  tree.iterate({ enter: (node) => { names.add(node.name); } });
  return names;
}

// Check that a specific text fragment parses as a specific node type
function hasNodeWithText(code, typeName, expectedText) {
  const tree = parser.parse(code);
  let found = false;
  tree.iterate({
    enter: (node) => {
      if (node.name === typeName && code.slice(node.from, node.to) === expectedText) {
        found = true;
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
console.log('=== Control-Flow Keywords as Identifiers (Negative Tests) ===');
// When if/then/else/try/catch appear outside control-flow context, the external
// tokenizer's canShift() must return false, letting them remain as Identifier.

// "then" as standalone identifier (no preceding if)
{
  const code = 'then';
  const id = findNode(code, 'Identifier');
  assert(id !== null && id.text === 'then', `"${code}" should be Identifier, got: ${id && id.name}`);
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode === null, `"${code}" must NOT produce IfExpr`);
}

// "else" as standalone identifier (no preceding if...then)
{
  const code = 'else';
  const id = findNode(code, 'Identifier');
  assert(id !== null && id.text === 'else', `"${code}" should be Identifier`);
}

// "catch" as standalone identifier (no preceding try)
{
  const code = 'catch';
  const id = findNode(code, 'Identifier');
  assert(id !== null && id.text === 'catch', `"${code}" should be Identifier`);
}

// Assignment to "then" — M2 allows this
{
  const code = 'then = 5';
  const assign = findNode(code, 'AssignExpr');
  assert(assign !== null, `"${code}" should produce AssignExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// "then" in arithmetic — no IfExpr context
{
  const code = 'then + else * catch';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode === null, `"${code}" must NOT produce IfExpr`);
  const tryNode = findNode(code, 'TryExpr');
  assert(tryNode === null, `"${code}" must NOT produce TryExpr`);
}

// Known tradeoff: "if" and "try" are always keyword-like (external tokens).
// Inside a list, canShift(IfKw) returns true because IfExpr IS a valid expression.
// So {if, then, else, try, catch} → IfKw starts IfExpr, comma is unexpected → error.
// This is acceptable: using "if"/"try" as bare identifiers in lists is extremely rare.
{
  const code = '{then, else, catch}';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}
// But if/try start control flow, so they cause errors when used as identifiers in lists:
{
  const code = '{if, try}';
  assert(errorCount(code) > 0, `"${code}" should have errors (if/try are always keywords)`);
}

// Member access: x.then — "then" is identifier on RHS of dot
{
  const code = 'x.then';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression (member access)`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Subscript: x_catch — "catch" is identifier
{
  const code = 'x_catch';
  const bin = findNode(code, 'BinaryExpression');
  assert(bin !== null, `"${code}" should produce BinaryExpression (subscript)`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Function call with keyword names as args: f(then, else)
{
  const code = 'f(then, else)';
  const call = findNode(code, 'CallExpr');
  assert(call !== null, `"${code}" should produce CallExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  const ifNode = findNode(code, 'IfExpr');
  assert(ifNode === null, `"${code}" must NOT produce IfExpr`);
}

// Assignment: catch = x -> x (method installation)
{
  const code = 'catch = x -> x';
  const assign = findNode(code, 'AssignExpr');
  assert(assign !== null, `"${code}" should produce AssignExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// "try" as identifier in arithmetic
{
  const code = 'try + 1';
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Known limitation: "if"/"try" as identifiers in method installations now error.
// With external tokens, `if` always starts IfExpr, so `if Thing := ...` parses
// as IfExpr{condition=Thing, ...} and := is unexpected. This is the tradeoff
// for correct nested parsing of (if x then y else z).
{
  const code = 'if Thing := (x) -> x > 0';
  assert(errorCount(code) > 0, `"${code}" should have errors (if is always a keyword)`);
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

console.log('');
console.log('=== Parse-Shape Assertions (AST structure, not just error count) ===');

// IfExpr structure: must contain IfKw, ThenKw, ElseKw as node names
{
  const code = 'if x then y else z';
  const names = allNodeNames(code);
  assert(names.has('IfExpr'), `"${code}" tree must contain IfExpr`);
  assert(names.has('IfKw'), `"${code}" tree must contain IfKw`);
  assert(names.has('ThenKw'), `"${code}" tree must contain ThenKw`);
  assert(names.has('ElseKw'), `"${code}" tree must contain ElseKw`);
}

// IfExpr without else: no ElseKw
{
  const code = 'if x then y';
  const names = allNodeNames(code);
  assert(names.has('IfExpr'), `"${code}" tree must contain IfExpr`);
  assert(names.has('ThenKw'), `"${code}" tree must contain ThenKw`);
  assert(!names.has('ElseKw'), `"${code}" tree must NOT contain ElseKw`);
}

// TryExpr with catch: must contain TryKw, CatchKw
{
  const code = 'try f() catch g()';
  const names = allNodeNames(code);
  assert(names.has('TryExpr'), `"${code}" tree must contain TryExpr`);
  assert(names.has('TryKw'), `"${code}" tree must contain TryKw`);
  assert(names.has('CatchKw'), `"${code}" tree must contain CatchKw`);
  assert(names.has('TrySuffix'), `"${code}" tree must contain TrySuffix`);
}

// TryExpr with then/else: must contain ThenKw, ElseKw, NOT CatchKw
{
  const code = 'try x then y else z';
  const names = allNodeNames(code);
  assert(names.has('TryExpr'), `"${code}" tree must contain TryExpr`);
  assert(names.has('ThenKw'), `"${code}" tree must contain ThenKw`);
  assert(names.has('ElseKw'), `"${code}" tree must contain ElseKw`);
  assert(!names.has('CatchKw'), `"${code}" tree must NOT contain CatchKw`);
}

// Nested IfExpr inside parens: still has full structure
{
  const code = '(if a then b else c)';
  const names = allNodeNames(code);
  assert(names.has('ParenExpr'), `"${code}" tree must contain ParenExpr`);
  assert(names.has('IfExpr'), `"${code}" tree must contain IfExpr`);
  assert(names.has('IfKw'), `"${code}" tree must contain IfKw`);
  assert(names.has('ThenKw'), `"${code}" tree must contain ThenKw`);
  assert(names.has('ElseKw'), `"${code}" tree must contain ElseKw`);
}

// Nested IfExpr as function argument
{
  const code = 'f(if a then b else c, d)';
  const names = allNodeNames(code);
  assert(names.has('CallExpr'), `"${code}" tree must contain CallExpr`);
  assert(names.has('IfExpr'), `"${code}" tree must contain IfExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ForExpr: check clause keywords present (uses ckw, so atoms-only on each side)
{
  const code = 'for i from 0 to 10 do f(i)';
  const names = allNodeNames(code);
  assert(names.has('ForExpr'), `"${code}" tree must contain ForExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ForExpr with when clause
{
  const code = 'for i from 0 to n when even(i) do print i';
  const names = allNodeNames(code);
  assert(names.has('ForExpr'), `"${code}" tree must contain ForExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// WhileExpr (condition must be atom-like for ckw to work)
{
  const code = 'while cond do f()';
  const names = allNodeNames(code);
  assert(names.has('WhileExpr'), `"${code}" tree must contain WhileExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// Assignment with arrow: specific node text
{
  const code = 'f = x -> x + 1';
  assert(hasNodeWithText(code, 'AssignExpr', 'f = x -> x + 1'), `"${code}" AssignExpr should span full text`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// JuxtapositionExpr shape: flatten entries M should have nested juxtaposition
{
  const code = 'flatten entries M';
  const names = allNodeNames(code);
  assert(names.has('JuxtapositionExpr'), `"${code}" tree must contain JuxtapositionExpr`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// LoadExpr shape
{
  const code = 'load "MyPackage.m2"';
  const names = allNodeNames(code);
  assert(names.has('LoadExpr'), `"${code}" tree must contain LoadExpr`);
  assert(names.has('String'), `"${code}" tree must contain String`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ScopeExpr shape with OperatorSymbol: global == should NOT produce ScopeExpr
{
  const code = 'global ==';
  const names = allNodeNames(code);
  assert(names.has('OperatorSymbol'), `"${code}" tree must contain OperatorSymbol`);
  assert(!names.has('ScopeExpr'), `"${code}" tree must NOT contain ScopeExpr (OperatorSymbol wins)`);
}

console.log('');
console.log('=== Comment/Operator Boundary Edge Cases ===');

// symbol followed by "-" then identifier (bare minus excluded from OperatorSymbol)
{
  const code = 'symbol -x';
  const os = findNode(code, 'OperatorSymbol');
  assert(os === null, `"symbol -x" must NOT produce OperatorSymbol (bare minus excluded)`);
}

// symbol followed by "- " (minus space) — not OperatorSymbol
{
  const code = 'symbol - x';
  const os = findNode(code, 'OperatorSymbol');
  assert(os === null, `"symbol - x" must NOT produce OperatorSymbol`);
}

// symbol followed by "->" (multi-char with minus) IS OperatorSymbol
{
  const code = 'symbol ->';
  const os = findNode(code, 'OperatorSymbol');
  assert(os !== null, `"${code}" should produce OperatorSymbol`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// symbol followed by "|-" IS OperatorSymbol
{
  const code = 'symbol |-';
  const os = findNode(code, 'OperatorSymbol');
  assert(os !== null, `"${code}" should produce OperatorSymbol`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// "-- " at start of line is always LineComment, even after identifier
{
  const code = 'x -- comment';
  const lc = findNode(code, 'LineComment');
  assert(lc !== null, `"${code}" should produce LineComment`);
}

// "-* *-" block comment in expression context
{
  const code = 'x -* block *- + y';
  const bc = findNode(code, 'BlockComment');
  assert(bc !== null, `"${code}" should produce BlockComment`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

console.log('');
console.log('=== OperatorSymbol Representative Matrix ===');

// Tests a representative sample of operators across all 4 scope starters.
// Not exhaustive (67 operators exist); validates cross-product coverage for
// 11 structurally distinct operators. Full operator coverage is validated
// by test/validate_operators.js against binding.d.
// A. All 4 scope starters × representative operators
{
  const starters = ['symbol', 'global', 'local', 'threadLocal'];
  const ops = ['*', '==', '++', '^**', '_>=', '<|', '...', '||', '|-', '#', '\\'];
  for (const kw of starters) {
    for (const op of ops) {
      const code = `${kw} ${op}`;
      const os = findNode(code, 'OperatorSymbol');
      assert(os !== null, `"${code}" should produce OperatorSymbol`);
      assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
    }
  }
}

// B. Boundary cases
{
  // Tab separator
  const tabCode = 'symbol\t*';
  assert(findNode(tabCode, 'OperatorSymbol') !== null, `"symbol\\t*" (tab) should produce OperatorSymbol`);
  assert(errorCount(tabCode) === 0, `"symbol\\t*" should have 0 errors`);

  // Multiple spaces
  const spaceCode = 'symbol  *';
  assert(findNode(spaceCode, 'OperatorSymbol') !== null, `"symbol  *" (2 spaces) should produce OperatorSymbol`);
  assert(errorCount(spaceCode) === 0, `"symbol  *" should have 0 errors`);

  // Newline rejects (cross-line guard)
  const nlCode = 'symbol\n*x';
  assert(findNode(nlCode, 'OperatorSymbol') === null, `"symbol\\n*x" must NOT produce OperatorSymbol (cross-line)`);

  // Bare scope keyword (no operator follows)
  const bareCode = 'symbol x';
  assert(findNode(bareCode, 'OperatorSymbol') === null, `"symbol x" must NOT produce OperatorSymbol (x is identifier)`);
}

// C. Comment collisions
{
  // -- starts LineComment, not OperatorSymbol
  const dashDash = 'symbol --comment';
  assert(findNode(dashDash, 'OperatorSymbol') === null, `"symbol --comment" must NOT produce OperatorSymbol`);
  assert(findNode(dashDash, 'LineComment') !== null, `"symbol --comment" must produce LineComment`);

  // -* starts BlockComment, not OperatorSymbol
  const dashStar = 'symbol -* block *-';
  assert(findNode(dashStar, 'OperatorSymbol') === null, `"symbol -* block *-" must NOT produce OperatorSymbol`);
  assert(findNode(dashStar, 'BlockComment') !== null, `"symbol -* block *-" must produce BlockComment`);

  // Bare minus: NOT OperatorSymbol (already tested, but included for completeness)
  assert(findNode('symbol -x', 'OperatorSymbol') === null, `"symbol -x" must NOT produce OperatorSymbol`);
  assert(findNode('symbol - x', 'OperatorSymbol') === null, `"symbol - x" must NOT produce OperatorSymbol`);

  // Multi-char with minus: IS OperatorSymbol
  assert(findNode('symbol ->', 'OperatorSymbol') !== null, `"symbol ->" should produce OperatorSymbol`);
  assert(findNode('symbol |-', 'OperatorSymbol') !== null, `"symbol |-" should produce OperatorSymbol`);
  assert(findNode('symbol <-', 'OperatorSymbol') !== null, `"symbol <-" should produce OperatorSymbol`);
}

// D. Longest-match conflicts
{
  // ... vs .. — ellipsis should win when fully present
  const dotdotdot = findNode('symbol ...', 'OperatorSymbol');
  assert(dotdotdot !== null, `"symbol ..." should produce OperatorSymbol`);
  // Verify it matched the full "..." not just ".."
  assert(dotdotdot && dotdotdot.text.endsWith('...'), `"symbol ..." OperatorSymbol should end with "..."`);

  const dotdot = findNode('symbol ..', 'OperatorSymbol');
  assert(dotdot !== null, `"symbol .." should produce OperatorSymbol`);

  // <| vs < — <| should win
  const angleBar = findNode('symbol <|', 'OperatorSymbol');
  assert(angleBar !== null, `"symbol <|" should produce OperatorSymbol`);
  assert(angleBar && angleBar.text.endsWith('<|'), `"symbol <|" should match full "<|"`);

  const lt = findNode('symbol <', 'OperatorSymbol');
  assert(lt !== null, `"symbol <" should produce OperatorSymbol`);

  // === vs == — === should win
  const tripleEq = findNode('symbol ===', 'OperatorSymbol');
  assert(tripleEq !== null, `"symbol ===" should produce OperatorSymbol`);
  assert(tripleEq && tripleEq.text.endsWith('==='), `"symbol ===" should match full "==="`);

  const doubleEq = findNode('symbol ==', 'OperatorSymbol');
  assert(doubleEq !== null, `"symbol ==" should produce OperatorSymbol`);

  // ^** vs ^* vs ^ — longest wins
  const hatStarStar = findNode('symbol ^**', 'OperatorSymbol');
  assert(hatStarStar !== null, `"symbol ^**" should produce OperatorSymbol`);
  assert(hatStarStar && hatStarStar.text.endsWith('^**'), `"symbol ^**" should match full "^**"`);

  const hatStar = findNode('symbol ^*', 'OperatorSymbol');
  assert(hatStar !== null, `"symbol ^*" should produce OperatorSymbol`);

  const hat = findNode('symbol ^', 'OperatorSymbol');
  assert(hat !== null, `"symbol ^" should produce OperatorSymbol`);

  // _>= vs _> vs _ — longest wins
  const underscoreGE = findNode('symbol _>=', 'OperatorSymbol');
  assert(underscoreGE !== null, `"symbol _>=" should produce OperatorSymbol`);
  assert(underscoreGE && underscoreGE.text.endsWith('_>='), `"symbol _>=" should match full "_>="`);

  const underscoreGT = findNode('symbol _>', 'OperatorSymbol');
  assert(underscoreGT !== null, `"symbol _>" should produce OperatorSymbol`);

  const underscore = findNode('symbol _', 'OperatorSymbol');
  assert(underscore !== null, `"symbol _" should produce OperatorSymbol`);

  // New: ^> and ^< (added by validate_operators.js finding)
  assert(findNode('symbol ^>', 'OperatorSymbol') !== null, `"symbol ^>" should produce OperatorSymbol`);
  assert(errorCount('symbol ^>') === 0, `"symbol ^>" should have 0 errors`);
  assert(findNode('symbol ^<', 'OperatorSymbol') !== null, `"symbol ^<" should produce OperatorSymbol`);
  assert(errorCount('symbol ^<') === 0, `"symbol ^<" should have 0 errors`);
}

console.log('');
console.log('=== TripleString Lexer Fidelity ===');
// Partial fidelity increment: tests prove which M2 //// escape patterns
// achieve parity with lex.d:getstringslashes. The grammar rule adds "////"
// as a content alternative, so 4 consecutive slashes are consumed as content
// rather than triggering a premature close.

// 1. Basic triple-string
{
  const code = '///hello///';
  assert(findNode(code, 'TripleString') !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// 2. Four-slash escape (M2's //// → 1 output slash)
{
  const code = '///before //// after///';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  // Verify single TripleString spans entire input
  assert(ts && ts.from === 0 && ts.to === code.length, `"${code}" TripleString should span entire input`);
}

// 3. Real-world XML-like pattern: //// in middle with proper /// close
//    In XML.m2, ////<bar/>////\n continues to next line (no close on same line).
//    This test verifies the useful case: //// escape mid-string with clean close.
{
  const code = '////<foo>bar</foo>//// and more///';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  assert(ts && ts.from === 0 && ts.to === code.length, `"${code}" TripleString should span entire input`);
}

// 4. Multiple escapes
{
  const code = '///a //// b //// c///';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  assert(ts && ts.from === 0 && ts.to === code.length, `"${code}" TripleString should span entire input`);
}

// 5. Seven slashes: //// (content) + /// (close) = 7
{
  const code = '///content///////';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// 6. Eight slashes: //// + //// = 8 (stays open, needs closing ///)
{
  const code = '///a //////// b///';
  const ts = findNode(code, 'TripleString');
  assert(ts !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
  assert(ts && ts.from === 0 && ts.to === code.length, `"${code}" TripleString should span entire input`);
}

// 7. Empty triple-string: /// + /// = 6 slashes
{
  const code = '//////';
  assert(findNode(code, 'TripleString') !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// 8. One slash in content
{
  const code = '///a/b///';
  assert(findNode(code, 'TripleString') !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// 9. Two slashes in content
{
  const code = '///a//b///';
  assert(findNode(code, 'TripleString') !== null, `"${code}" should produce TripleString`);
  assert(errorCount(code) === 0, `"${code}" should have 0 errors, got: ${errorCount(code)}`);
}

// ============================================================
// Summary
// ============================================================
console.log('');
console.log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
