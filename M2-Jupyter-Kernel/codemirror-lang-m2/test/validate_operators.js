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
// 4. Compare and report
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
const extras = [];
for (const op of [...grammarOps].sort()) {
  if (!bindingOps.has(op)) {
    extras.push(op);
  }
}

console.log(`  binding.d operators:    ${bindingOps.size}`);
console.log(`  In OperatorSymbol:      ${inGrammar.length}`);
console.log(`  Excluded (with reason): ${excluded.length}`);
if (extras.length > 0) {
  console.log(`  Grammar extras:         ${extras.length} (in grammar but not binding.d)`);
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

if (extras.length > 0) {
  console.log('NOTE: Operators in grammar but not found in binding.d:');
  for (const op of extras) {
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

console.log(`Status: ${missing.length === 0 ? 'PASS' : 'FAIL'}`);
process.exit(missing.length > 0 ? 1 : 0);
