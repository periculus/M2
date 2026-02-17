// Operator validation: compare binding.d (canonical) against grammar OperatorSymbol token.
// Parses binding.d by regex pattern (not hardcoded line range) to extract all operator strings.
// Fails hard if new operators appear upstream that aren't in grammar or exclusion list.
//
// Usage: node test/validate_operators.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// 1. Extract operators from binding.d (pattern-based, not line-based)
// ============================================================
const bindingPath = path.resolve(__dirname, '../../../M2/Macaulay2/d/binding.d');
if (!fs.existsSync(bindingPath)) {
  console.log(`SKIP: binding.d not found at ${bindingPath}`);
  process.exit(0);
}
const bindingRaw = fs.readFileSync(bindingPath, 'utf-8');

// Strip M2-style comment lines (-- ...) before pattern matching.
// This prevents matching commented-out operators like --export PowerSharpS := makeKeyword(postfix("^#"))
const bindingCode = bindingRaw.split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n');

// Match all makeKeyword(...("OP")) patterns.
// Covers: unarybinaryleft, binaryright, binaryleft, unarybinaryright, postfix,
//         unaryword, binaryrightword, unarynew, unaryfor, unarywhile, unaryif, etc.
const opPatterns = [
  // Standard operator creators: makeKeyword(func("OP"))
  /makeKeyword\(\w+\("([^"]+)"\)/g,
  // Indirect: varW := func("OP"); then makeKeyword(varW)
  // Match the func("OP") part directly — binaryright/binaryleft/etc.
  /(?:binaryright|binaryleft|unarybinaryleft|unarybinaryright|postfix|unaryword|binaryrightword|nunarybinaryleft)\("([^"]+)"/g,
  // Token declarations: token("OP")  (for else, then, do, list, etc.)
  /\b\w+\s*=\s*token\("([^"]+)"\)/g,
  // Parens-style: parens("OP1","OP2", ...)
  /parens\("([^"]+)","([^"]+)"/g,
];

// Unescape D-language string escapes: "\\\\" → "\\" (actual operator is \\)
function unescapeD(s) {
  return s.replace(/\\\\/g, '\\');
}

const bindingOps = new Set();
for (const pattern of opPatterns) {
  let m;
  while ((m = pattern.exec(bindingCode)) !== null) {
    if (m[2]) {
      bindingOps.add(unescapeD(m[1]));
      bindingOps.add(unescapeD(m[2]));
    } else {
      bindingOps.add(unescapeD(m[1]));
    }
  }
}

// Also catch special(...) forms: special("keyword", ...)
const specialPattern = /special\("([^"]+)"/g;
let sm;
while ((sm = specialPattern.exec(bindingCode)) !== null) {
  bindingOps.add(unescapeD(sm[1]));
}

// ============================================================
// 2. Explicit exclusions with rationale
// ============================================================
const EXCLUDED = {
  '-':            'Conflicts with -- (LineComment) and -* (BlockComment)',
  'and':          'Keyword operator, handled by ckw<"and"> / kw<"and">',
  'or':           'Keyword operator, handled by ckw<"or"> / kw<"or">',
  'xor':          'Keyword operator, handled by ckw<"xor"> / kw<"xor">',
  'not':          'Keyword operator, handled by ckw<"not">',
  '·':            'Unicode interpunct — rare, not in ASCII-focused grammar',
  '⊠':            'Unicode box times — rare, not in ASCII-focused grammar',
  '⧢':            'Unicode shuffle product — rare, not in ASCII-focused grammar',
  ',':            'Comma is punctuation/separator, not an operator symbol',
  'SPACE':        'Juxtaposition — implicit, handled by JuxtapositionExpr',
  '(*)':          'Postfix parens — special syntax, not an operator symbol form',
  // Bracket pairs (not operators, grammar handles as delimiters)
  '(':            'Open paren — delimiter, not operator symbol',
  ')':            'Close paren — delimiter, not operator symbol',
  '{':            'Open brace — delimiter, not operator symbol',
  '}':            'Close brace — delimiter, not operator symbol',
  '[':            'Open bracket — delimiter, not operator symbol',
  ']':            'Close bracket — delimiter, not operator symbol',
  '<|':           'Open angle-bar — handled in OperatorSymbol AND as AngleBarListExpr delimiter',
  '|>':           'Close angle-bar — handled in OperatorSymbol AND as AngleBarListExpr delimiter',
  // Control-flow keywords (handled by external tokenizer or ckw, not OperatorSymbol)
  'else':         'Control-flow keyword, handled by external tokenizer (ElseKw)',
  'then':         'Control-flow keyword, handled by external tokenizer (ThenKw)',
  'do':           'Control-flow keyword, handled by ckw<"do">',
  'list':         'Keyword, not an operator',
  'if':           'Control-flow keyword, handled by external tokenizer (IfKw)',
  'try':          'Control-flow keyword, handled by external tokenizer (TryKw)',
  'catch':        'Control-flow keyword, handled by external tokenizer (CatchKw)',
  'when':         'Clause keyword, handled by ckw<"when">',
  'of':           'Clause keyword, handled by ckw<"of">',
  'in':           'Clause keyword, handled by ckw<"in">',
  'from':         'Clause keyword, handled by ckw<"from">',
  'to':           'Clause keyword, handled by ckw<"to">',
  'new':          'Control-flow keyword, handled by ckw<"new">',
  'for':          'Control-flow keyword, handled by ckw<"for">',
  'while':        'Control-flow keyword, handled by ckw<"while">',
  'TEST':         'Macro keyword, not an operator',
  'time':         'Keyword, handled by ckw<"time">',
  'timing':       'Keyword — not commonly used in symbol context',
  'elapsedTime':  'Keyword, handled by ckw<"elapsedTime">',
  'elapsedTiming':'Keyword — not commonly used in symbol context',
  'breakpoint':   'Keyword — not commonly used in symbol context',
  'profile':      'Keyword — not commonly used in symbol context',
  'shield':       'Keyword, handled by ckw<"shield">',
  'throw':        'Keyword, handled by ckw<"throw">',
  'return':       'Keyword, handled by ckw<"return">',
  'break':        'Keyword, handled by ckw<"break">',
  'continue':     'Keyword, handled by ckw<"continue">',
  'step':         'Keyword — not commonly used in symbol context',
  'symbol':       'Scope keyword — prefix of OperatorSymbol, not an operand',
  'global':       'Scope keyword — prefix of OperatorSymbol, not an operand',
  'threadLocal':  'Scope keyword — prefix of OperatorSymbol, not an operand',
  'local':        'Scope keyword — prefix of OperatorSymbol, not an operand',
};

// ============================================================
// 3. Extract operators from OperatorSymbol in m2.grammar
// ============================================================
const grammarPath = path.resolve(__dirname, '../src/m2.grammar');
const grammarCode = fs.readFileSync(grammarPath, 'utf-8');

// Find the OperatorSymbol { ... } block. Structure:
//   OperatorSymbol { (scope kws) $[ \t]* (operators) }
// Extract from "OperatorSymbol {" to the matching closing brace.
const osStart = grammarCode.indexOf('OperatorSymbol {');
if (osStart === -1) {
  console.log('FAIL: Could not find OperatorSymbol token in m2.grammar');
  process.exit(1);
}
let depth = 0, osEnd = osStart;
for (let i = osStart; i < grammarCode.length; i++) {
  if (grammarCode[i] === '{') depth++;
  else if (grammarCode[i] === '}') { depth--; if (depth === 0) { osEnd = i; break; } }
}
const osBlock = grammarCode.slice(osStart, osEnd + 1);

// Extract all quoted strings from the OperatorSymbol block
const grammarOps = new Set();
const quotedPattern = /"([^"]+)"/g;
let qm;
// Skip the scope keywords — they're prefixes, not operators
const scopeKws = new Set(['symbol', 'global', 'local', 'threadLocal']);
while ((qm = quotedPattern.exec(osBlock)) !== null) {
  if (!scopeKws.has(qm[1])) {
    // Unescape Lezer grammar escapes: \\\\ -> \\
    grammarOps.add(qm[1].replace(/\\\\/g, '\\'));
  }
}

// ============================================================
// 4. Derive expected augmented assignment operators from binding.d
// ============================================================
// Primary source: opsWithBinaryMethod array minus exclusion list, each + "="
// This mirrors the generation logic in binding.d lines 546-599.

// Build symbol name → operator string map from makeKeyword definitions
const symbolMap = new Map();
const makeKwSymPattern = /export\s+(\w+)\s*:=\s*makeKeyword\(\w+\("([^"]+)"\)/g;
let mkm;
while ((mkm = makeKwSymPattern.exec(bindingCode)) !== null) {
  symbolMap.set(mkm[1], unescapeD(mkm[2]));
}

// Extract opsWithBinaryMethod array members
const owbmMatch = bindingCode.match(/opsWithBinaryMethod\s*:=\s*array\(SymbolClosure\)\(([\s\S]*?)\);/);
const owbmSymbols = [];
if (owbmMatch) {
  const symRefPattern = /\b([A-Z]\w*S)\b/g;
  let sr;
  while ((sr = symRefPattern.exec(owbmMatch[1])) !== null) {
    if (sr[1] !== 'SymbolClosure') owbmSymbols.push(sr[1]);
  }
}

// Extract excluded symbols from the augmented assignment while loop.
// The comment "-- augmented assignment operators --" is stripped, so use
// augmentedAssignmentOperatorTable (non-comment code) as the anchor.
const augSectionStart = bindingCode.indexOf('augmentedAssignmentOperatorTable');
const augSectionCode = bindingCode.slice(augSectionStart);
const whileEndIdx = augSectionCode.indexOf('do offset = offset + 1');
const whileBlock = augSectionCode.slice(0, whileEndIdx);
const excludedAugSymbols = new Set();
const excludeSymPattern = /opsWithBinaryMethod\.\(i \+ offset\) === (\w+)/g;
let exm;
while ((exm = excludeSymPattern.exec(whileBlock)) !== null) {
  excludedAugSymbols.add(exm[1]);
}

// Compute expected augmented operators: (opsWithBinaryMethod - excluded) + "="
const expectedAugOps = new Set();
const augBaseOps = new Map(); // augmented op → base op (for reporting)
const unmappedSymbols = []; // symbols not found in symbolMap
for (const sym of owbmSymbols) {
  if (excludedAugSymbols.has(sym)) continue;
  const baseOp = symbolMap.get(sym);
  if (!baseOp) { unmappedSymbols.push(sym); continue; }
  const augOp = baseOp + '=';
  expectedAugOps.add(augOp);
  augBaseOps.set(augOp, baseOp);
}

// ============================================================
// 5. Compare and report (OperatorSymbol validation)
// ============================================================
console.log('=== OPERATOR VALIDATION ===');
console.log();

// Categorize binding.d operators
const inGrammar = [];
const excluded = [];
const missing = [];

for (const op of [...bindingOps].sort()) {
  if (grammarOps.has(op)) {
    inGrammar.push(op);
  } else if (op in EXCLUDED) {
    excluded.push(op);
  } else {
    missing.push(op);
  }
}

// Check for operators in grammar but not in binding.d (extras)
// Classify augmented forms separately so real unexpected extras stay visible
const unexpectedExtras = [];
const augmentedExtras = [];
for (const op of [...grammarOps].sort()) {
  if (!bindingOps.has(op)) {
    if (expectedAugOps.has(op)) {
      augmentedExtras.push(op);
    } else {
      unexpectedExtras.push(op);
    }
  }
}

console.log(`  binding.d operators:    ${bindingOps.size}`);
console.log(`  In OperatorSymbol:      ${inGrammar.length}`);
console.log(`  Excluded (with reason): ${excluded.length}`);
if (augmentedExtras.length > 0) {
  console.log(`  Augmented forms:        ${augmentedExtras.length} (derived from binding.d, expected in OperatorSymbol)`);
}
if (unexpectedExtras.length > 0) {
  console.log(`  Unexpected extras:      ${unexpectedExtras.length} (in grammar but not binding.d)`);
}
console.log(`  Coverage: ${inGrammar.length}/${inGrammar.length + missing.length} expected operators`);
console.log();

if (missing.length > 0) {
  console.log('FAIL: Operators in binding.d but NOT in grammar or exclusions:');
  for (const op of missing) {
    console.log(`  "${op}"`);
  }
  console.log();
  console.log('Action required: Add to OperatorSymbol in m2.grammar OR add to EXCLUDED with rationale.');
  process.exit(1);
}

if (unexpectedExtras.length > 0) {
  console.log('NOTE: Unexpected operators in grammar but not found in binding.d:');
  for (const op of unexpectedExtras) {
    console.log(`  "${op}"`);
  }
  console.log('  (These may be valid — compound operators or token-level constructs.)');
  console.log();
}

// Print excluded with rationale
console.log('Excluded operators:');
for (const op of excluded.sort()) {
  console.log(`  "${op}" — ${EXCLUDED[op]}`);
}
console.log();

console.log(`OperatorSymbol status: ${missing.length === 0 ? 'PASS' : 'FAIL'}`);

// ============================================================
// 6. Augmented Assignment Operator Validation
// ============================================================
// Primary: binding.d-derived augmented operators (section 4)
// Secondary: augmented-assignment.m2 test file (cross-check)

console.log('\n=== AUGMENTED ASSIGNMENT VALIDATION ===\n');

// 6a. Extract augmented operators from AssignExpr rule in grammar
const assignStart = grammarCode.indexOf('AssignExpr {');
let assignDepth = 0, assignEnd = assignStart;
for (let i = assignStart; i < grammarCode.length; i++) {
  if (grammarCode[i] === '{') assignDepth++;
  else if (grammarCode[i] === '}') { assignDepth--; if (assignDepth === 0) { assignEnd = i; break; } }
}
const assignBlock = grammarCode.slice(assignStart, assignEnd + 1);

const grammarAugOps = new Set();
const assignQuoted = /"([^"]+)"/g;
let aqm;
while ((aqm = assignQuoted.exec(assignBlock)) !== null) {
  const op = aqm[1].replace(/\\\\/g, '\\');
  grammarAugOps.add(op);
}

// Augmented operators excluded from grammar with rationale
const EXCLUDED_AUG = {
  '·=':  'Unicode interpunct augmented — rare, not in ASCII-focused grammar',
  '⊠=':  'Unicode box times augmented — rare, not in ASCII-focused grammar',
  '⧢=':  'Unicode shuffle product augmented — rare, not in ASCII-focused grammar',
};

// 6b. Primary check: binding.d-derived augmented ops vs grammar AssignExpr
const augInGrammar = [];
const augExcluded = [];
const augMissing = [];
for (const op of [...expectedAugOps].sort()) {
  if (grammarAugOps.has(op)) {
    augInGrammar.push(op);
  } else if (op in EXCLUDED_AUG) {
    augExcluded.push(op);
  } else {
    augMissing.push(op);
  }
}

console.log('  Primary source: binding.d (opsWithBinaryMethod - exclusions + "=")');
console.log(`  opsWithBinaryMethod:    ${owbmSymbols.length} symbols`);
console.log(`  Excluded from augment:  ${excludedAugSymbols.size} symbols`);
if (unmappedSymbols.length > 0) {
  console.log(`  Unmapped (Unicode etc): ${unmappedSymbols.length} (${unmappedSymbols.join(', ')})`);
}
console.log(`  Expected augmented ops: ${expectedAugOps.size}`);
console.log(`  In AssignExpr:          ${augInGrammar.length}`);
console.log(`  Excluded (Unicode):     ${augExcluded.length}`);
console.log(`  Missing:                ${augMissing.length}`);

if (augMissing.length > 0) {
  console.log('\n  Missing augmented operators (derived from binding.d):');
  for (const op of augMissing) {
    const base = augBaseOps.get(op) || '?';
    console.log(`    "${op}" (base: "${base}")`);
  }
}

// 6c. Secondary check: cross-validate against augmented-assignment.m2 test file
const augTestPath = path.resolve(__dirname, '../../../M2/Macaulay2/tests/normal/augmented-assignment.m2');
let augTestMissing = 0;

if (!fs.existsSync(augTestPath)) {
  console.log(`\n  SKIP secondary: augmented-assignment.m2 not found at ${augTestPath}`);
} else {
  const augTestCode = fs.readFileSync(augTestPath, 'utf-8');

  // Extract augmented operators from test file lines like "x += 3", "x ^^= 5", "x <==>= Foo 3"
  // Match: LHS (word chars, #, ., or *) then whitespace then op= then whitespace
  const testAugOps = new Set();
  const augOpPattern = /^[\w#.*]+\s+((?:[^\s=]|=[^=])*=)\s/gm;
  let am;
  while ((am = augOpPattern.exec(augTestCode)) !== null) {
    const op = am[1];
    // Exclude plain assignment and comparison operators
    if (op === '=' || op === ':=' || op === '==' || op === '!=' ||
        op === '<=' || op === '>=' || op === '===') continue;
    testAugOps.add(op);
  }

  // Cross-check: test file ops that are NOT in binding.d-derived set
  const testOnly = [];
  const testConfirmed = [];
  for (const op of [...testAugOps].sort()) {
    if (expectedAugOps.has(op)) {
      testConfirmed.push(op);
    } else if (!grammarAugOps.has(op)) {
      // Not in derived set AND not in grammar — potential gap
      testOnly.push(op);
    }
  }

  // Check for derived ops not exercised in test file
  const untestedOps = [];
  for (const op of [...expectedAugOps].sort()) {
    if (!testAugOps.has(op)) {
      untestedOps.push(op);
    }
  }

  console.log(`\n  Secondary source: augmented-assignment.m2`);
  console.log(`    Test file operators:  ${testAugOps.size}`);
  console.log(`    Confirmed by both:    ${testConfirmed.length}`);
  if (testOnly.length > 0) {
    console.log(`    Test-only (not derived): ${testOnly.length}`);
    for (const op of testOnly) {
      console.log(`      "${op}"`);
    }
  }
  if (untestedOps.length > 0) {
    console.log(`    Derived but untested: ${untestedOps.length}`);
    for (const op of untestedOps) {
      console.log(`      "${op}" (base: "${augBaseOps.get(op) || '?'}")`);
    }
  }
}

console.log(`\n  Augmented assignment status: ${augMissing.length === 0 ? 'PASS' : 'FAIL'}`);

const totalMissing = missing.length + augMissing.length;
console.log(`\nOverall status: ${totalMissing === 0 ? 'PASS' : 'FAIL'}`);
process.exit(totalMissing > 0 ? 1 : 0);
