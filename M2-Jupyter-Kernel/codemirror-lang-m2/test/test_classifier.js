// Tests for the file classifier (classifyFile) in doc_detection.js.
// Run: node test/test_classifier.js
import { isRawDocFile, classifyFile } from './doc_detection.js';

let passed = 0, failed = 0;
function assert(condition, message) {
  if (condition) { passed++; } else { failed++; console.log(`  FAIL: ${message}`); }
}

console.log('=== isRawDocFile ===');

// Raw SimpleDoc: doc.m2 starting with Node/Key
assert(isRawDocFile('Node\n  Key => foo\n  Headline => bar', '/pkg/doc.m2') === true,
  'doc.m2 with Node/Key should be raw doc');

// *-doc.m2 with Node/Key
assert(isRawDocFile('Key\n  Headline => stuff', '/pkg/Foo-doc.m2') === true,
  'Foo-doc.m2 with Key should be raw doc');

// doc.m2 wrapped in doc /// (NOT raw)
assert(isRawDocFile('doc ///\nNode\n  Key => foo\n///', '/pkg/doc.m2') === false,
  'doc.m2 with doc /// wrapper should NOT be raw doc');

// Normal code file
assert(isRawDocFile('R = QQ[x,y,z]\nI = ideal(x^2, y^2)', '/pkg/MyPkg.m2') === false,
  'Normal code should NOT be raw doc');

// Content-based: document{} with Key =>
assert(isRawDocFile('document {\n  Key => foo,\n  Headline => bar\n}', '/pkg/stuff.m2') === true,
  'document{} with Key => should be raw doc');

console.log('');
console.log('=== classifyFile ===');

// Normal code → 'code'
assert(classifyFile('R = QQ[x,y]\nI = ideal(x^2)', '/M2/Macaulay2/packages/MyPkg.m2') === 'code',
  'Normal code file should be code');

// Raw doc → 'raw_doc'
assert(classifyFile('Node\n  Key => foo\n  Headline => bar', '/M2/Macaulay2/packages/Foo/doc.m2') === 'raw_doc',
  'Raw SimpleDoc should be raw_doc');

// Macaulay2Doc path → 'doc_heavy'
assert(classifyFile('doc ///\nNode\n///', '/M2/Macaulay2/packages/Macaulay2Doc/functions.m2') === 'doc_heavy',
  'Macaulay2Doc/ path should be doc_heavy');

// Macaulay2Doc path with document{Key=>} content → 'doc_heavy' (NOT raw_doc)
// This is the key regression test: isRawDocFile's content check would catch this
// if path-based doc_heavy didn't run first.
assert(classifyFile('document {\n  Key => myFunction,\n  Headline => "does stuff"\n}', '/M2/Macaulay2/packages/Macaulay2Doc/doc.m2') === 'doc_heavy',
  'Macaulay2Doc/ with document{Key=>} should be doc_heavy, not raw_doc');

// *-doc.m2 with mostly document{} blocks → 'doc_heavy'
// Must have enough code at start to avoid isRawDocFile (first 500 chars checked).
// Use doc /// wrapper so it's clearly M2 code, not raw SimpleDoc.
{
  const header = Array(40).fill('-- documentation file for Foo').join('\n') + '\n';
  const manyDocs = Array(20).fill('document {\n  Headline => "stuff",\n  Usage => "f(x)"\n}').join('\n');
  const code = header + manyDocs;
  assert(classifyFile(code, '/M2/Macaulay2/packages/Foo/Foo-doc.m2') === 'doc_heavy',
    '*-doc.m2 with >50% document blocks should be doc_heavy');
}

// *-doc.m2 with mostly code → 'code' (name alone is not enough)
{
  const code = Array(50).fill('f = x -> x + 1').join('\n') + '\ndocument {\n  Key => f\n}';
  assert(classifyFile(code, '/M2/Macaulay2/packages/Foo/Foo-doc.m2') === 'code',
    '*-doc.m2 with <50% document blocks should be code');
}

// Merge conflict markers → 'corrupt'
{
  const corrupt = 'some code\n<<<<<<< HEAD\nversion A\n=======\nversion B\n>>>>>>> branch\nmore code';
  assert(classifyFile(corrupt, '/M2/Macaulay2/packages/Foo.m2') === 'corrupt',
    'File with merge markers should be corrupt');
}

// <<<<<<< mid-line → NOT corrupt
{
  const code = 'x = "<<<<<<< not a real marker"';
  assert(classifyFile(code, '/M2/Macaulay2/packages/Foo.m2') === 'code',
    '<<<<<<< mid-line should NOT be corrupt');
}

// Only <<<<<<< without ======= and >>>>>>> → NOT corrupt
{
  const code = '<<<<<<< HEAD\nsome stuff';
  assert(classifyFile(code, '/M2/Macaulay2/packages/Foo.m2') === 'code',
    'Only <<<<<<< without full markers should NOT be corrupt');
}

// === Real corpus examples (regression tests) ===
console.log('');
console.log('=== Real corpus examples ===');

// Macaulay2Doc/doc12.m2 pattern: document{Key=>} in first 500 chars, under Macaulay2Doc/
// Before fix: was misclassified as raw_doc. After fix: doc_heavy.
{
  const code = '--\t\tCopyright 1993-1999 by Daniel R. Grayson\n\ndocument {\n     Key => {HeaderType},\n     Headline => "a class of lists"\n}';
  assert(classifyFile(code, '/M2/Macaulay2/packages/Macaulay2Doc/doc12.m2') === 'doc_heavy',
    'Macaulay2Doc/doc12.m2 pattern (document{Key=>}) should be doc_heavy');
}

// Schubert2/doc.m2 pattern: pure SimpleDoc starting with Node (genuine raw_doc)
{
  const code = 'Node\n  Key\n    Schubert2\n  Headline\n    computation in intersection theory\n  Description\n    Text\n';
  assert(classifyFile(code, '/M2/Macaulay2/packages/Schubert2/doc.m2') === 'raw_doc',
    'Schubert2/doc.m2 (pure SimpleDoc with Node) should be raw_doc');
}

// genera-doc.m2 pattern: *-doc.m2 with mostly document{} blocks (doc-heavy)
{
  const header = '--- status: draft\n--- author(s): Decker, Popescu\n--- notes:\n\n';
  const docs = Array(15).fill('document {\n  Headline => "stuff",\n  Usage => "f(x)"\n}').join('\n');
  const code = header + docs;
  assert(classifyFile(code, '/M2/Macaulay2/packages/Varieties/genera-doc.m2') === 'doc_heavy',
    'genera-doc.m2 pattern (mostly document{} blocks) should be doc_heavy');
}

console.log('');
console.log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
