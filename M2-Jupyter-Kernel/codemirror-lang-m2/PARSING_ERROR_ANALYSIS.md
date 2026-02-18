# M2 Lezer Grammar: Parsing Error Analysis

**Date**: February 2026 (updated Feb 18)
**Grammar**: `codemirror-lang-m2/src/m2.grammar`
**Corpus**: 2,594 `.m2` files under `M2/Macaulay2/` (m2/, tests/, packages/)
**Canonical metric source**: `node test/test_corpus.js` — run to regenerate all numbers below
**Current error rate**: 0.053% code-only (4,737 errors / 8,915,295 nodes) | 0.07% all files
**Code files**: 2,552 | **Doc files excluded**: 42 raw SimpleDoc + 0 corrupt
**Doc-heavy files** (informational, included in code-only): 388 (Macaulay2Doc/, *-doc.m2)
**Fixture tests**: 529 assertions in `test/test_fixtures.js` + 17 classifier tests
**Operator validation**: 67/67 operators covered — `node test/validate_operators.js`

## Metrics Policy

The corpus test (`test/test_corpus.js`) reports **three tracks**:
- **ALL files**: Every `.m2` file in the corpus (includes raw doc files)
- **CODE-ONLY**: Excludes raw SimpleDoc and corrupt files — **primary metric**
- **Strict code**: Informational — CODE-ONLY minus doc-heavy files (Macaulay2Doc/, *-doc.m2 with >50% `document{}` blocks). Doc-heavy files are valid M2 code wrapping documentation; they stay in CODE-ONLY.

The primary metric is **CODE-ONLY error rate**. Parse time is reported for regression detection.

## Fixes Applied

### Feb 18, 2026
1. **Augmented assignment operators** (`da098e8`) — Added 29 augmented assignment operators (`+=`, `-=`, `*=`, etc.) to AssignExpr, derived from binding.d's `opsWithBinaryMethod`. Same precedence as `=`, right-associative. Also added to OperatorSymbol for `symbol +=` patterns. Validator (`validate_operators.js`) derives expected set from binding.d source, zero hardcoding. Error rate: 5,166 → 5,063 (-103 errors).
2. **Unary `??` (null-check) operator** — Added `!or "??" expression` to UnaryExpression. M2's `??` is both prefix (`?? x`) and binary (`x ?? y`), defined as `unarybinaryright("??")` in binding.d at the same precedence as `or`. All 5 errors in `augmented-assignment.m2` eliminated. Error rate: 5,063 → 5,057 (-6 errors).
3. **Method installation fixture coverage** — Verified `Type Op Type := func` patterns already parse correctly (BinaryExpression as LHS of AssignExpr). Added 13 fixture tests locking in behavior for real M2 patterns.
4. **CallItems: empty first argument in function calls** — Introduced `CallItems` rule (allows leading comma for `f(, x)` patterns) scoped to `CallExpr(...)` only. `ListItems` stays strict for `{}`, `[]`, `<||>`. Fixes patterns like `prepend(, yAxis)`, `part(, 0, wts, f)`, `sub2(,ring f,v)` from M2 core. Confirmed by grammar.y `arglistornull`. Error rate: 5,057 → 4,850 (-207 errors). Key category changes: `juxtaposition_func_arg` 702→671 (-31), `unmatched_bracket` 879→823 (-56), `Identifier|Identifier` 46→39 (-7).
5. **OperatorSymbol in juxArg** — Added `OperatorSymbol` to `juxArg` rule so juxtaposition patterns like `TO symbol *`, `print symbol ++` parse as JuxtapositionExpr. Data-gated: `symbol ^` (7x) and `symbol ==` (4x) error patterns eliminated. Large cascading benefit in doc-heavy files: `juxtaposition_english_text` 148→51 (-97). Error rate: 4,850 → 4,737 (-113 errors). Combined with Fix 4: 5,057 → 4,737 (-320 total).

### Feb 17, 2026
1. **Implicit statement separation (ImplicitSemi)** — Added ContextTracker + ExternalTokenizer for newline-as-statement-separator, following the JavaScript Lezer ASI pattern. `spaces[@export]` + `newline[@export]` replace single `space` token; ContextTracker tracks newline boundaries; ExternalTokenizer emits zero-width `ImplicitSemi` with `fallback:true` + `canShift()` guard. Only active in `@top Program`, NOT in `Body` (parenthesized expressions). The `canShift` guard is critical: without it, `fallback:true` emits at error recovery positions causing +2,400 regression; with it, net -84 errors. Key patterns fixed: `Identifier|AssignExpr` 402→327 (-18.7%), `Number|AssignExpr` 217→185 (-14.7%), `newline_statement_sep` 53→18 (-66%). Error rate: 5,250 → 5,166 (0.0597% → 0.0579%).
2. **TripleString `////` escape (partial fidelity)** — Added `"////"` as content alternative in TripleString token rule. M2's lexer (`lex.d:getstringslashes`) treats `////` as an escape (4 slashes → 1 output slash). The grammar-level fix handles common cases (XML.m2, OpenMath.m2, Text.m2 patterns where `////` appears mid-string before a proper `///` close). Error rate: 5,269 → 5,050 (219 errors eliminated, parser change only). Full parity with M2's character-by-character state machine may require an external tokenizer in a future pass.
2. **3-track file classification** — `classifyFile()` in `doc_detection.js` returns `'code'`, `'raw_doc'`, `'doc_heavy'`, or `'corrupt'`. Classification order: `corrupt` → `doc_heavy` (path-based) → `raw_doc` (content-based) → `code`. Merge conflict marker detection added (zero found, cheap insurance). Doc-heavy track is informational — files stay in CODE-ONLY.
3. **Classification ordering fix** — Moved path-based `doc_heavy` check (Macaulay2Doc/, *-doc.m2) BEFORE content-based `raw_doc` check. Without this, `isRawDocFile`'s `document { Key => }` heuristic caught 235 Macaulay2Doc files as `raw_doc` (excluded) instead of `doc_heavy` (included). Raw doc exclusions: 277 → 42. Doc-heavy informational: 153 → 388.
4. **Parse-tree TripleString regions** — `analyze_errors.js`'s `findTripleStringRegions()` now extracts TripleString node positions from the parse tree instead of using naive `indexOf("///")` scanning, which mishandled `////` escapes.

### Feb 15, 2026
1. **External tokenizer for control-flow keywords** — `IfKw`, `ThenKw`, `ElseKw`, `TryKw`, `CatchKw` emitted by `controlFlowTokenizer.js` using `stack.canShift()` gating. Replaces `ckw` (`@extend`) which failed inside parens/braces because juxtaposition consumed keywords as Identifiers. Error rate: 0.10% → 0.06% (3,284 errors eliminated).
2. **Full TryExpr support** — All 5 forms: `try e`, `try e catch e`, `try e then e`, `try e then e else e`, `try e else e`. Previously only `try...catch` was supported.
3. **AngleBarListExpr** — `<| ... |>` syntax for angle-bar lists. 53 errors eliminated.
4. **Truncation operators** — `_>`, `_>=`, `_<`, `_<=` as single binary operators. 18 errors eliminated.
5. **`<` in OperatorSymbol** — `symbol <` now produces OperatorSymbol.
6. **Dangling-else resolution** — `!ambigElse` precedence marker (like JavaScript's Lezer grammar) + `~ambigThen` GLR marker.

### Feb 14, 2026
1. **OperatorSymbol token** — Built-in `@tokens` rule matching scope keyword + horizontal whitespace + operator as single token. Uses longest-match to beat Identifier. Handles `symbol *`, `symbol ==`, `global ++`, etc.
2. **OperatorSymbol boundary guards** — Uses `$[ \t]*` (not `@whitespace*`) to prevent cross-line matching. Standalone `-` excluded to avoid conflicts with `--` (LineComment) and `-*` (BlockComment).
3. **Raw doc file exclusion** — 277 raw SimpleDoc files excluded (initially 1, expanded to 187 via filename detection, then 277 via content-based detection). Detection: files named `doc.m2`/`*-doc.m2` starting with `Node`/`Key` without `doc ///`, plus files starting with `document { ... Key => ... }` blocks.
4. **CatchExpr removed** — Standalone `CatchExpr` caused unresolvable shift/reduce conflict with TryExpr's `catch` clause. Removed; `catch` only appears inside TryExpr.
5. **LeadingDotNumber** — Parser-level rule `LeadingDotNumber { "." Number }` to distinguish `.4` (leading-dot number literal) from `C.0` (member access). At expression start, the parser shifts `"."` into LeadingDotNumber. After an expression, LR shift/reduce preference makes `"."` shift into BinaryExpression for member access. This resolves the ambiguity without any tokenizer tricks.

### Feb 10, 2026
1. **Number literals** — Added trailing dot (`1.`), precision suffix (`1p111`), scientific notation (`1e-10`). (~1000+ errors fixed)
2. **`not` as ckw** — Changed from `kw` to `ckw` so `not` can appear as identifier in method installations.
3. **Ellipsis `...`** — Added as recognized token (was parsed as three `.` operators).
4. **Trailing comma** — `ListItems` now allows optional trailing comma `{a, b, c,}`.

### Grammar supports all TryExpr forms (Feb 15 fix)
M2 supports `try...catch`, `try...then`, `try...then...else`, and `try...else`. All 5 forms are now supported thanks to the external tokenizer approach. Previously only `try...catch` worked because `ckw` keywords created unresolvable shift/reduce conflicts with IfExpr's `then/else`. The external tokenizer with `canShift()` gating + `~ambigThen` GLR marker + `!ambigElse` precedence marker resolves all conflicts.

## Executive Summary

The 0.053% error rate (code-only) is excellent for a syntax highlighter. The remaining
~4,737 errors cluster around a small number of root causes. This report analyzes all
error categories, identifies root causes from the actual M2 source code, and assesses
fixability.

The original root causes and their current status:

| Root Cause | Original Est. | Status | Notes |
|---|---|---|---|
| 1. `symbol` + operator juxtaposition | ~4,500 (27%) | **Mostly fixed** | OperatorSymbol token; `symbol -` still errors |
| 2. Documentation markup (Node/Key/Text) | ~4,000 (24%) | **Excluded** | 277 raw doc files filtered from code-only track |
| 3. Number literal formats | ~3,000 (18%) | **Fixed** | Trailing dot, precision, scientific notation |
| 4. Cascading recovery | ~2,500 (15%) | Reduced | Fewer root-cause errors → fewer cascades |
| 5. LaTeX/TeX in doc strings | ~1,500 (9%) | Not fixable | `$\PP^n$` inside `///` strings |
| 6. `try...then...else` | ~500 (3%) | **Fixed** | External tokenizer resolves all forms |
| 7. Minor edge cases | ~600 (4%) | **Fixed** | `not` as ckw, ellipsis, trailing comma |
| 8. Control flow in nested contexts | ~3,284 | **Fixed** | External tokenizer for if/then/else/try/catch |
| 9. Cross-line juxtaposition | ~84 | **Reduced** | ImplicitSemi at Program level (canShift guard) |

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

**Fixability**: **DONE** (Feb 10). Number token now supports trailing dot, precision suffix (`p`),
and scientific notation (`e`). Leading-dot numbers handled by `LeadingDotNumber` parser rule (Feb 14).
~1,000+ errors eliminated.

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

### 6. `try...then...else` vs `try...catch` (~3% of errors) — FIXED

**Status: Fixed** (Feb 15). The external tokenizer approach resolves all forms.

M2 supports 5 forms: `try e`, `try e catch e`, `try e then e`, `try e then e else e`, `try e else e`.

**Previous approach (ckw)**: Used `@extend` contextual keywords. This created an
unresolvable shift/reduce conflict between TryExpr's `then/else` and IfExpr's `then/else`.

**Current approach (external tokens)**: `controlFlowTokenizer.js` emits `TryKw`, `ThenKw`,
`ElseKw`, `CatchKw` as distinct terminals using `stack.canShift()`. Dangling-then resolved
with `~ambigThen` GLR marker. Dangling-else resolved with `!ambigElse` precedence marker
(same pattern as JavaScript's Lezer grammar). See `docs/grammar.md` "External Tokenizer"
section for full architecture.

**Known tradeoff**: `if` and `try` are now always keyword-like (canShift always true where
an expression is expected). Method installations like `if Thing := ...` will get parse
errors. This is acceptable because nested control flow `(if x then y else z)` is far more
common in the corpus.

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

**Mostly fixed** — Number token extensions (Feb 10) eliminated ~1000+ errors from this file.

---

## Recommended Fix Priority

### Priority 1: Extend Number Literals — DONE (Feb 10)

Number token now supports trailing dot (`1.`), precision suffix (`1p111`), scientific
notation (`1e-10`), and leading-dot numbers via `LeadingDotNumber` parser rule.
See Feb 10 fixes above.

### Priority 2: `try...then...else` support — DONE (Feb 15)

All 5 TryExpr forms now work, including inside nested contexts (parens, braces,
function calls). Resolved via external tokenizer with `canShift()` gating.

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
- LaTeX/TeX in documentation strings
- English prose in code-track files that aren't caught by doc filter
- `ckw` keywords (`for`, `while`, `do`) in nested contexts with binary operators (e.g., `while x > 0 do ...` inside parens fails because `>` breaks the ckw mechanism)

### Known Tradeoffs

- `if`/`try` are now always keyword-like (external tokens). Method installations like `if Thing := (x) -> ...` produce parse errors. This is the cost of correct nested parsing.
  - **Corpus search (Feb 15)**: 0 instances of `if`/`try` used as identifiers across all 2,594 .m2 files. The regression is theoretical only — no real M2 code is affected.
  - Negative fixtures in `test_fixtures.js` (lines 384-444) document and assert this behavior.
- `then`/`else`/`catch` as standalone identifiers work correctly (canShift returns false without preceding if/try).

### Revisit Triggers

Re-evaluate these decisions if:
- **Doc preprocessing**: Doc-region errors exceed 5% of code-only errors (currently 4.0% per `analyze_errors.js` DOC-REGION section), or doc-file detector misses increase beyond 10 files
- **Bare `-` fix**: `symbol -` errors exceed 500 occurrences (currently ~187), or an external tokenizer approach is found that doesn't conflict with `--`/`-*` comments
- **`if`/`try` keyword regression**: Any real-world `.m2` file uses `if` or `try` as an identifier (currently 0 instances in 2,594 files)
- **ckw nested contexts**: `for`/`while`/`do` inside parens with binary operators becomes a common pattern (currently rare in corpus)

---

## Known Non-Code Inputs

The corpus contains files that are valid M2 but NOT normal executable code. These are
**intentionally excluded** from the CODE-ONLY error metric but **included** in the ALL metric.

### Raw SimpleDoc Files (42 files, excluded from CODE-ONLY)

**Detection criteria** (implemented in `test/doc_detection.js:isRawDocFile()`, shared by `test_corpus.js` and `analyze_errors.js`):
1. Filename is `doc.m2` or ends with `-doc.m2`, with raw `Node`/`Key` markup at start
2. Content-based: files starting with `document { ... Key => ...}` blocks (raw SimpleDoc)
3. First 500 chars do NOT contain `doc ///` (not wrapped in M2 syntax)

**Important**: Path-based `doc_heavy` checks run BEFORE `isRawDocFile` to prevent
Macaulay2Doc files (which often start with `document { Key => }`) from being incorrectly
excluded as `raw_doc`.

**Why excluded**: These files use SimpleDoc markup format (Node/Key/Headline/Text/Example
blocks) that is loaded by M2's documentation system but is not M2 expression syntax.
English prose, LaTeX math, and HTML-like markup produce cascading parse errors.

**Examples**: `packages/Schubert2/doc.m2` (1,398 errors), `packages/Varieties/doc-maps.m2`

### LaTeX/TeX in Documentation Strings (NOT excluded)

Files containing `///` doc blocks with embedded LaTeX (`$\PP^n$`, `$$\psi$$`) are **not
excluded** — they are valid M2 code where the TripleString token handles most of the content.
Errors occur at `$` signs that break out of string boundaries, which is rare.

### Prose in Code Comments (NOT excluded)

English text in `--` line comments and `-* *-` block comments is correctly parsed as
comment tokens and produces zero errors. Only prose OUTSIDE of comments/strings causes errors.

## Current Error Rate

0.053% code-only (4,737 errors) | 0.07% all files. 42 raw SimpleDoc files excluded from code-only track.
Run `node test/test_corpus.js` for exact numbers (canonical source).

Remaining errors are primarily:
- Cascading recovery errors from other root causes (~40%)
- `symbol -` (bare minus — can't fix without breaking comments)
- Documentation markup/LaTeX in code-track files that aren't caught by doc filter
- `ckw` keywords (`for`, `while`, `do`, etc.) failing inside nested contexts with operators
- Cross-line juxtaposition (reduced by ImplicitSemi but not eliminated — only fires at Program level)

---

## Appendix: Top Error Patterns from Corpus Test (Feb 18, 2026)

These are the actual error text snippets reported by the parser (first 20 chars of
each error node's content, code-only track):

| Count | Error Text | Root Cause |
|---|---|---|
| 1,172 | `,` | Cascading: commas eaten during recovery |
| 771 | `)` | Cascading: closing parens eaten during recovery |
| 604 | `;` | Cascading: semicolons eaten during recovery |
| 52 | `}` | Cascading: closing braces eaten during recovery |
| 34 | `\|` | Pipe operator in error context |
| 26 | `?` | Question mark operator in error context |
| 20 | `>=` | Comparison operator in error context |
| 11 | `//` | Division in error context |
| 9 | `))`| Cascading: double-close eaten during recovery |
| 9 | `==>` | Arrow operator in error context |
| 9 | `_` | Subscript operator in error context |
| 6 | `///` | TripleString boundary |
| 5 | `'` | Apostrophe in identifier context |

---

## Appendix: Key Grammar Reference Files

- **Grammar**: `/M2-Jupyter-Kernel/codemirror-lang-m2/src/m2.grammar`
- **M2 Bison grammar**: `/M2/Macaulay2/c/grammar.y`
- **M2 operator precedence**: `/M2/Macaulay2/d/binding.d` (lines 215-371)
- **M2 vim dictionary**: `/M2/Macaulay2/editors/vim/m2.vim.dict` (1763+ symbols)
- **Corpus test**: `/M2-Jupyter-Kernel/codemirror-lang-m2/test/test_corpus.js`
- **Highlight mapping**: `/M2-Jupyter-Kernel/codemirror-lang-m2/src/highlight.js`
