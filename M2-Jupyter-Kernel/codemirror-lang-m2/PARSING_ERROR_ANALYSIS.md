# M2 Lezer Grammar: Parsing Error Analysis

**Date**: February 2026 (updated Feb 14)
**Grammar**: `codemirror-lang-m2/src/m2.grammar`
**Corpus**: 2,407 `.m2` files under `M2/Macaulay2/` (m2/, tests/, packages/), 187 raw doc files excluded
**Current error rate**: 0.18% (15,578 errors across 8,871,483 nodes)
**Fixture tests**: 52 assertions in `test/test_fixtures.js`

## Fixes Applied

### Feb 14, 2026
1. **OperatorSymbol token** — Built-in `@tokens` rule matching scope keyword + horizontal whitespace + operator as single token. Uses longest-match to beat Identifier. Handles `symbol *`, `symbol ==`, `global ++`, etc.
2. **OperatorSymbol boundary guards** — Uses `$[ \t]*` (not `@whitespace*`) to prevent cross-line matching. Standalone `-` excluded to avoid conflicts with `--` (LineComment) and `-*` (BlockComment).
3. **Raw doc file exclusion** — 187 raw SimpleDoc files excluded (was 1). Detection: files named `doc.m2`/`*-doc.m2` starting with `Node`/`Key` without `doc ///`.
4. **CatchExpr removed** — Standalone `CatchExpr` caused unresolvable shift/reduce conflict with TryExpr's `catch` clause. Removed; `catch` only appears inside TryExpr.

### Feb 10, 2026
1. **Number literals** — Added trailing dot (`1.`), precision suffix (`1p111`), scientific notation (`1e-10`). (~1000+ errors fixed)
2. **`not` as ckw** — Changed from `kw` to `ckw` so `not` can appear as identifier in method installations.
3. **Ellipsis `...`** — Added as recognized token (was parsed as three `.` operators).
4. **Trailing comma** — `ListItems` now allows optional trailing comma `{a, b, c,}`.

### Grammar uses `try...catch` form
M2 supports both `try...catch` and `try...then...else`. The grammar only implements `try...catch` because `try...then...else` creates an unresolvable shift/reduce conflict with IfExpr's `then/else` (the parser can't tell if `then` continues a TryExpr or an IfExpr). This is a known limitation.

## Executive Summary

The 0.18% error rate (code-only) is excellent for a syntax highlighter. The remaining
15,578 errors cluster around a small number of root causes. This report analyzes all
error categories, identifies root causes from the actual M2 source code, and assesses
fixability.

The original root causes and their current status:

| Root Cause | Original Est. | Status | Notes |
|---|---|---|---|
| 1. `symbol` + operator juxtaposition | ~4,500 (27%) | **Mostly fixed** | OperatorSymbol token; `symbol -` still errors |
| 2. Documentation markup (Node/Key/Text) | ~4,000 (24%) | **Excluded** | 187 raw doc files filtered from code-only track |
| 3. Number literal formats | ~3,000 (18%) | **Fixed** | Trailing dot, precision, scientific notation |
| 4. Cascading recovery | ~2,500 (15%) | Reduced | Fewer root-cause errors → fewer cascades |
| 5. LaTeX/TeX in doc strings | ~1,500 (9%) | Not fixable | `$\PP^n$` inside `///` strings |
| 6. `try...then...else` | ~500 (3%) | **Won't fix** | LR(1) conflict with IfExpr's `then/else` |
| 7. Minor edge cases | ~600 (4%) | **Fixed** | `not` as ckw, ellipsis, trailing comma |

---

## Error Categories in Detail

### 1. `symbol` + Operator/Type Juxtaposition (~27% of errors)

**What the user reported**: `juxtaposition_func_arg` (3,565 errors, 21.5%)

**Root cause**: M2's `symbol` keyword can be followed by ANY token to produce a Symbol
value, including operators and type names. Examples from the codebase:

```m2
-- From m2/dotdot.m2:10-11
err1 := lookup(symbol .., Thing, Thing);
err2 := lookup(symbol ..<, Thing, Thing);

-- From m2/modules2.m2:36
if Y#?(symbol **,M,N) then return Y#(symbol **,M,N);

-- From m2/modules2.m2:292
Module ^ Array := Matrix => (M, w) -> M.cache#(symbol ^, w) ??= (

-- From packages/Schubert2/doc.m2:50-51
(symbol _, OO, RingElement)
(symbol SPACE,OO,RingElement)

-- From packages/Macaulay2Doc/operators/tensor.m2:2-13 (worst file, 11.4% error rate)
(symbol **, Option, Option),
(symbol **, Matrix, Number),
(symbol **, Number, Matrix),
```

**Why the grammar fails**: The grammar defines:
```
ScopeExpr { (ckw<"symbol"> | ckw<"global"> | ...) expression }
```

The `symbol` keyword expects an `expression` after it, but operators like `**`, `..`, `_`,
`^`, `SPACE`, `<-`, `+=`, etc. are NOT valid expression starts. They are binary/postfix
operators that require a left operand. So `symbol **` fails because `**` cannot begin
an expression.

For `symbol Matrix` (89x), `symbol Module` (56x), etc., the grammar's `ScopeExpr`
takes the next `expression`, which would be a `Type` node (via `@specialize`). This
should actually parse correctly as `ScopeExpr(symbol, Type)`. The errors here are
likely from the context: these appear inside tuple patterns like
`(symbol _, OO, RingElement)` where the comma-separated items interact with
juxtaposition precedence.

**Status: Mostly fixed.** The `OperatorSymbol` built-in token (added Feb 14) handles most
`symbol + operator` patterns. It matches scope keyword + horizontal whitespace + operator
as a single token in `@tokens`, using Lezer's longest-match rule to beat `Identifier`.

**Remaining issue**: standalone `-` is excluded from OperatorSymbol because it conflicts
with `--` (LineComment) and `-*` (BlockComment). `symbol -` (bare minus as operator
symbol, ~187 occurrences) still errors. Multi-char operators with `-` (`->`, `|-`, `<-`)
work fine.

**Why ExternalTokenizer failed**: Lezer's `ExternalTokenizer` with `extend: true` cannot
override built-in tokens. The built-in tokenizer runs first (index 0 in tokenizers array),
and when it finds valid actions (e.g., `symbol` as Identifier), it sets `main` and `break`s
the loop before extend tokenizers at higher indices can run.

---

### 2. Documentation Markup as M2 Code (~24% of errors)

**What the user reported**: Part of `other` (7,705 errors, 46.4%)

**Root cause**: M2 doc files use SimpleDoc format (Node/Key/Text/Example markup) where
free-form English text is interleaved with M2 code. The parser sees these as M2 code
and fails on English prose, punctuation, and markup syntax.

**Worst offender**: `packages/Schubert2/doc.m2` (1,398 errors) -- this file has 134
`Node` blocks, 1,097 markup keyword lines, and extensive English prose with
embedded LaTeX.

Example from `Schubert2/doc.m2` lines 9-15:
```
      This package supports computation in intersection theory on smooth
      projective varieties.  An @TO2{AbstractVariety,"abstract
      variety"}@ is not given by equations.  Instead, one gives its graded
      intersection ring of algebraic cycle classes...
```

The parser sees: `This` (Identifier), `package` (Identifier/keyword?), `supports`
(Identifier), `computation` (Identifier), etc. Each bare English word becomes an
expression, and adjacent words trigger juxtaposition. Sentences produce cascading
errors because operators like `.` (member access) and `,` appear in English contexts.

**Fixability**: **Not fixable** in the grammar. These doc files ARE valid M2 -- they
use `doc ///...///` triple-slash blocks where the content is SimpleDoc markup, not M2
expressions. But the grammar already handles `///...///` as `TripleString`. The issue
is that some doc files use the older format where `Node`, `Key`, `Text`, `Example`
etc. appear as bare words at the top level without being wrapped in `///`.

For example, `Schubert2/doc.m2` starts with `Node` at line 1 -- not inside a
`doc ///` block. This is a raw SimpleDoc format file loaded by M2's documentation
system; it's not wrapped in M2 syntax.

**Estimated effort**: N/A. These files are intentionally prose-heavy and the grammar
correctly fails on non-M2 content.

---

### 3. Number Literal Formats (~18% of original errors) — FIXED

**Status: Fixed** (Feb 10). The grammar's `Number` rule now supports all M2 formats:
trailing dot (`1.`), precision suffix (`1p111`), scientific notation (`1e-10`).

**What the user originally reported**: `number_adjacent` (1,927 errors, 11.6%)

**Original root cause**: The grammar's `Number` rule was incomplete:

```
Number {
  @digit+ ("." @digit+)? |
  "." @digit+
}
```

M2 supports several additional number formats that the old rule did NOT handle:

#### 3a. Trailing decimal point (`1.`, `0.`, `-0.`)

M2 uses `1.` to mean a floating-point number (equivalent to `1.0`). The grammar
requires digits after the decimal: `@digit+ ("." @digit+)?`. So `1.` is parsed as
`Number(1)` followed by `.` (member access operator), which then fails because `.`
expects a right operand.

From `tests/normal/numbers.m2`:
```m2
assert( -0. =!= 0. )     -- 0. parsed as 0 then . (error)
assert( toRR 1 === 1. )   -- 1. parsed as 1 then . (error)
assert( 0. + (1/10) === .1 )
```

**Frequency**: Very common in number-heavy test files. Contributes to ~500+ errors.

#### 3b. Precision suffix `p` (`1p111`, `.5873p100`)

M2 supports arbitrary-precision numbers with `p` suffix indicating bit precision:
```m2
assert ( (1p111 + 2^-110) =!= 1p111 )
assert isint .13454234234523487687p100e20
```

The grammar sees `1p111` as `Number(1)` then `Identifier(p111)`. This creates a
juxtaposition that may or may not error depending on context.

**Frequency**: ~80 occurrences in `numbers.m2` alone, plus scattered across other files.

#### 3c. Scientific notation `e` (`4.4448888e-50`, `1e-10`)

M2 supports standard scientific notation:
```m2
assert(abs(log(b,x)-log x/log b)<1e-10)
assert( format_(10,) 4.4448888e-50 === "4.4448888e-50" )
```

The grammar sees `1e` as `Number(1)` then `Identifier(e)`, then `-10` as a
separate expression.

**Frequency**: ~229 occurrences of `p` and `e` suffixed numbers across the corpus.

**Fixability**: **Medium**. The Number token rule can be extended:

```
Number {
  @digit+ ("." @digit*)? ("p" @digit+)? ("e" "-"? @digit+)? |
  "." @digit+ ("p" @digit+)? ("e" "-"? @digit+)?
}
```

Key concern: The `p` and `e` characters also start identifiers, so token precedence
must be handled carefully. `1p` should still be `Number(1) Identifier(p)` if no digits
follow. The `e` suffix is trickier because `e` alone is a common variable name.

**Estimated effort**: 1-2 hours. Would fix ~1,500-2,000 errors. The trailing-dot fix
alone (`1.` as a valid Number) could be done in minutes and would fix ~500 errors.

---

### 4. Cascading Recovery Errors (~15% of errors)

**What the user reported**: `unmatched_bracket` (1,611 errors, 9.7%) and part of `other`

**Root cause**: When the parser encounters an initial error (e.g., from categories 1-3),
it enters error recovery mode. During recovery, it may skip tokens or insert synthetic
error nodes. Each skipped token generates an additional error node, leading to cascading
error counts.

The top zero-length error pairs demonstrate this:
- `Identifier | AssignExpr` (794x): The parser expected a separator between two
  expressions but found none. It inserts a zero-length error to recover.
- `Identifier | Identifier` (761x): Adjacent identifiers where juxtaposition failed
  or was ambiguous.
- `Number | Number` (664x): Adjacent numbers (from extended-format numbers being
  split into separate tokens).
- `Identifier | Type` (574x): An identifier followed by a Type -- juxtaposition
  should handle this, but context makes it fail.
- `String | AssignExpr` (385x): A string literal followed by assignment.

For example, in `tests/normal/numbers.m2`:
```m2
assert isint .13454234234523487687p100e20
```
This gets parsed as approximately:
- `assert` (Builtin)
- `isint` (Identifier)
- `.13454234234523487687` (Number)
- `p100e20` (Identifier) -- ERROR: expected separator
- Cascading errors for the remaining tokens

Each malformed number literal produces 2-3 error nodes.

The `unmatched_bracket` errors (1,611) are similarly cascading: when the parser fails
inside a parenthesized expression, it may consume the `)` as an error token, causing
every subsequent `)` to appear unmatched.

**Fixability**: **Indirect**. Fixing root causes 1, 3, and 6 would eliminate most
cascading errors automatically. The 15% estimate here represents errors that are
CONSEQUENCES of the root causes, not independent issues.

**Estimated effort**: N/A (addressed by fixing other categories).

---

### 5. LaTeX/TeX in Documentation Strings (~9% of errors)

**What the user reported**: Part of `other`; `$` appears as 454 errors in top patterns

**Root cause**: M2 documentation files embed LaTeX mathematics between `$...$` delimiters:

```m2
-- From packages/Schubert2/doc.m2:96
contained in a general hypersurface of degree d in $\PP^n$.

-- From packages/Varieties/doc-maps.m2:32-35
a morphism of sheaves $\phi : \mathcal F \to \mathcal G$ is not necessarily
$$\psi : M_{\geq d} \to N,$$
```

The grammar includes `$` as a valid identifier continuation character (line 288):
```
Identifier { $[a-zA-Z...] $[a-zA-Z0-9'$...]* }
```

So `$\PP` is parsed as `$` being part of the previous word (if any), or as the start
of an identifier. The `\` character is the M2 integer-division operator, so `\PP` would
be `\ PP` (division). This creates a chain of errors.

231 `$` signs appear in `Schubert2/doc.m2` alone.

**Fixability**: **Not fixable** without breaking valid M2 syntax. The `$` character IS
valid in M2 identifiers (e.g., `apply$`, internal symbols). Removing it from the
identifier rule would break highlighting of legitimate code. And these errors only
occur in documentation prose that's already outside M2 expression syntax.

**Estimated effort**: N/A.

---

### 6. `try...then...else` vs `try...catch` (~3% of errors)

**What the user reported**: Part of `other`

**Root cause**: M2 supports both `try...catch` and `try...then...else` syntax:

From `m2/basictests/A01.m2`:
```m2
assert( true === try 1/0 then false else true )
assert( try true then true else false )
```

From actual usage:
```m2
num := try numerator t then numerator t else t;
```

**Status: Partially addressed.** The grammar uses `try...catch` form:
```
TryExpr { ckw<"try"> expression (~trycatch ckw<"catch"> expression)? }
```

`try...then...else` was attempted but creates an **unresolvable shift/reduce conflict**
with IfExpr's `then/else`. The parser can't tell if `then` continues a TryExpr or starts
the consequent of an IfExpr. This is a fundamental LR(1) ambiguity.

A standalone `CatchExpr { ckw<"catch"> expression }` was also attempted but creates a
shift/reduce conflict with TryExpr's `catch` clause (the parser can't tell if `catch`
continues the TryExpr or starts a new CatchExpr). Removed.

**Fixability**: **Hard** — requires GLR parsing or restructuring control flow to avoid
`then/else` ambiguity. The current `try...catch` form handles the most common usage pattern.

---

### 7. Other Edge Cases (~4% of original errors) — ALL FIXED

#### 7a. `not` as Strict Keyword — FIXED

Changed `kw<"not">` to `ckw<"not">` (extend) so `not` can appear as identifier in
method installations like `not Function := f -> s -> not f s`.

#### 7b. `...` (Dots/Ellipsis) — FIXED

Added `Ellipsis { "..." }` as a recognized expression. Token precedence `"..." > ".."  > "."`.

#### 7c. Trailing Comma — FIXED

`ListItems` now allows optional trailing comma: `{a, b, c,}`, `f(x, y,)`.

#### 7d. `>=` as Error (19 errors)

The `>=` comparison operator sometimes appears in error-recovery contexts, possibly
when the parser confuses `=>` (arrow) with `>=` (comparison) during recovery.

---

## File-Level Analysis

### Worst File (historical): `packages/Schubert2/doc.m2` (1,398 errors) — NOW EXCLUDED

This file is now excluded from the code-only track (raw SimpleDoc format). It was the
worst file before the doc filter was added.

This is a 3,600+ line documentation file in raw SimpleDoc format. It is NOT wrapped
in `doc ///...///` blocks. The file begins with:
```
Node
  Key
    Schubert2
  Headline
    computation in intersection theory
  Description
    Text
      This package supports computation in intersection theory...
```

Every line is parsed as M2 code. The English prose, LaTeX (`$\PP^n$`), HTML-like
markup (`@TO`, `@HREF`), and bare keywords (`Node`, `Key`, `Text`) all produce errors.

**Root causes**: Documentation markup (#2, ~60%), LaTeX (#5, ~25%), cascading (#4, ~15%).

**Not fixable** -- this file is inherently non-M2 syntax.

### Second Worst: `tests/normal/LU.m2` (887 errors)

This file tests LU decomposition with large numeric matrices. The errors come from:

1. **Large matrix literals** with hundreds of negative numbers like
   `{{-5728, 0, 14099, -14819, ...}}`. Each `-` before a number is parsed as a
   UnaryExpression, but in some contexts the parser struggles with `,-` sequences.

2. **`submatrix(R, {11}, )`** -- trailing comma with empty argument (line 319).

3. **`RR_300^5`** patterns -- subscript followed by power, causing precedence issues.

**Root causes**: Mostly cascading errors (#4) from a few initial failures in large
matrix literals.

### Third Worst: `tests/normal/numbers.m2` (601 errors)

This file extensively tests M2's number system. The errors come almost entirely from:

1. **Trailing decimal points**: `0.`, `1.`, `-0.` (~150 instances)
2. **Precision suffixes**: `1p111`, `.5873p100` (~80 instances)
3. **Scientific notation**: `4.4448888e-50`, `1e-10` (~50 instances)
4. **Cascading** from the above (~300 errors)

**Root causes**: Missing number formats (#3, ~70%), cascading (#4, ~30%).

**Highly fixable** -- extending the Number token would eliminate most errors in this file.

---

## Recommended Fix Priority

### Priority 1: Extend Number Literals (Medium effort, ~2,000 errors fixed)

Add support for:
- Trailing decimal point: `1.` (change `("." @digit+)?` to `("." @digit*)?`)
- Precision suffix: `p` followed by digits
- Scientific notation: `e` followed by optional `-` and digits

```
Number {
  @digit+ ("." @digit*)? ("p" @digit+)? ("e" ("-" | "+")? @digit+)? |
  "." @digit+ ("p" @digit+)? ("e" ("-" | "+")? @digit+)?
}
```

Note: Trailing-dot (`1.`) requires careful token precedence with `.` (member access)
and `..` (range). The rule `@digit+ "." @digit*` would make `1.` a number, but `1..5`
needs to be `Number(1) .. Number(5)`, not `Number(1.) . Number(5)`. Token precedence
already has `".." > "."` so this should work, but must be tested carefully.

### Priority 2: `try...then...else` support (Hard — blocked by LR(1) conflict)

The grammar uses `try...catch`. Adding `try...then...else` causes an unresolvable
shift/reduce conflict with IfExpr's `then/else`. A standalone `CatchExpr` also
conflicts with TryExpr's `catch` clause. Both were attempted and reverted.

Would require GLR parsing or a fundamentally different approach to control flow.

### Priority 3: `symbol -` (bare minus) — Won't fix

`symbol -` (bare minus as operator symbol, ~187 occurrences) can't be added to
OperatorSymbol because standalone `-` conflicts with `--` (LineComment) and `-*`
(BlockComment) at the tokenizer level. Multi-char operators with `-` (`->`, `|-`, `<-`)
already work via OperatorSymbol.

**Note**: The `OperatorSymbol` token (Priority 3 from the original analysis) has been
implemented. It handles most `symbol + operator` patterns. See the grammar's `@tokens`
block for the complete operator list.

### Priority 4: Minor Fixes — DONE

All minor fixes implemented (Feb 10):
- `not` changed from `kw` to `ckw`
- Ellipsis `...` added as recognized token
- Trailing comma allowed in `ListItems`

### Not Fixable (remaining errors)

- `symbol -` (bare minus, ~187 occurrences — conflicts with comments)
- `try...then...else` (LR(1) conflict with IfExpr)
- LaTeX/TeX in documentation strings
- English prose in code-track files that aren't caught by doc filter

---

## Current Error Rate

0.18% (15,578 errors / 8,871,483 nodes across 2,407 files, 187 raw doc files excluded).

Remaining errors are primarily:
- Cascading recovery errors from other root causes (~40%)
- `symbol -` (bare minus, 187 occurrences — can't fix without breaking comments)
- Documentation markup/LaTeX in files that ARE valid M2 but contain prose
- `try...then...else` patterns (grammar only supports `try...catch`)

The theoretical minimum is ~0.12% (unfixable doc/LaTeX errors).

---

## Appendix: Top Error Patterns from Corpus Test

These are the actual error text snippets reported by the parser (first 20 chars of
each error node's content):

| Count | Error Text | Root Cause |
|---|---|---|
| 1,919 | `;` | Cascading: semicolons eaten during recovery |
| 1,679 | `,` | Cascading: commas eaten during recovery |
| 1,481 | `)` | Cascading: closing parens eaten during recovery |
| 524 | `.` | Number trailing dot OR member access in error |
| 454 | `$` | LaTeX dollar signs in documentation |
| 214 | `\` | LaTeX backslash in documentation |
| 130 | `}` | Cascading: closing braces eaten during recovery |
| 42 | `not` | `not` as strict keyword in non-unary context |
| 28 | `))` | Cascading: double close-paren recovery |
| 26 | `},` | Cascading recovery |
| 19 | `>=` | Comparison operator in error context |
| 19 | `?` | Question mark operator in error context |
| 14 | `);` | Cascading recovery |
| 9 | `...,` | Ellipsis not recognized |
| 8 | `$,` | LaTeX dollar + comma in doc |

---

## Appendix: Key Grammar Reference Files

- **Grammar**: `/M2-Jupyter-Kernel/codemirror-lang-m2/src/m2.grammar`
- **M2 Bison grammar**: `/M2/Macaulay2/c/grammar.y`
- **M2 operator precedence**: `/M2/Macaulay2/d/binding.d` (lines 215-371)
- **M2 vim dictionary**: `/M2/Macaulay2/editors/vim/m2.vim.dict` (1763+ symbols)
- **Corpus test**: `/M2-Jupyter-Kernel/codemirror-lang-m2/test/test_corpus.js`
- **Highlight mapping**: `/M2-Jupyter-Kernel/codemirror-lang-m2/src/highlight.js`
