# M2 Lezer Grammar: Parsing Error Analysis

**Date**: February 2026 (updated Feb 21)
**Grammar**: `codemirror-lang-m2/src/m2.grammar`
**Corpus**: 2,625 `.m2` files under `M2/Macaulay2/` (m2/, tests/, packages/)
**Canonical metric source**: `node test/test_corpus.js` — run to regenerate all numbers below
**Current error rate**: 0.008% CODE_VALID (751 errors / 9,534,055 nodes)
**Code files**: 2,551 | **Excluded**: 1 invalid_syntax, 42 raw_doc files
**Fixture tests**: 1,090 assertions in `test/test_fixtures.js` + classifier/snapshot tests
**Operator validation**: 77/77 operators + 32/32 augmented assignments — `node test/validate_operators.js`
**Parser size**: 278,901 bytes
**External tokenizers**: 4 files (controlFlowTokenizer, implicitSemiTokenizer, scopeMinusTokenizer, tripleStringTokenizer)
**External tokens**: 13 control-flow keywords + ImplicitSemi + ScopeMinus + TripleString

## Metrics Policy

The corpus test (`test/test_corpus.js`) reports **three tracks**:
- **CODE_VALID**: Excludes raw SimpleDoc and invalid_syntax files — **primary metric**
- **CODE_EXECUTED**: CODE_VALID minus post-`end` errors (130 errors) — informational
- **CODE_ALL**: All `.m2` files — for historical comparison only

The primary metric is **CODE_VALID error rate**. The gate (`test/gate.fish`) enforces
8 checks: grammar compiles, tokenizer sync, parser sync, fixtures, corpus error rate,
parser size, operator validation, and keyword manifest drift.

## Error Distribution Summary

### By file concentration

Total 751 CODE_VALID errors across 97 files (out of 2,551).

**Outlier files** (37 files, 4,859 errors in CODE_ALL):
- `SchurVeronese/bettiP2_*.m2` (30 files): Auto-generated Betti tables, 1-3 MB each.
  Errors from Lezer parser buffer overflow at ~4KB (MEMORY #47). **Unfixable**.
- `Schubert2/doc.m2`: Raw SimpleDoc markup file. **Excluded** from CODE_VALID.
- `PrimaryDecomposition/examples.m2`: Singular-style `//` comments (not M2 syntax).
- `CotangentSchubert/puzzles/generic-*.m2`: Machine-generated puzzle data.

**Normal files** (85 files, 487 errors):
- 26 files with 1 error (26 total) — isolated edge cases
- 24 files with 2-3 errors (61 total) — single root cause + cascade
- 19 files with 4-7 errors (91 total) — multi-point issues
- 7 files with 8-15 errors (77 total) — structural mismatches
- 9 files with 16-50 errors (232 total) — see worst files below

### Worst normal files

| Errors | File | Cause |
|--------|------|-------|
| 37 | `IntegralClosure/runexamples.m2` | Divider lines, non-standard formatting |
| 34 | `tests/normal/rank-GF-2.m2` | Doc-heavy (extensive prose) |
| 29 | `ExampleFreeResolutions.m2` | Large data lists → buffer overflow |
| 29 | `ToricCohomology.m2` | Undistributed package, unusual syntax |
| 25 | `e/todo-ncalgebra.m2` | Draft/notes, not real M2 code |
| 22 | `K3Surfaces.m2` | Multiple statement boundary issues |
| 20 | `CoincidentRootLoci/equationsDualCRL.m2` | Auto-generated equations |
| 18 | `LocalRings/mike-linkage.m2` | Newline-separated Body expressions |
| 18 | `Polyhedra/.../representation_raw.m2` | Large polymake data (2 MB) |

### By root cause category (138 independent root causes)

| Category | Roots | % | Fixable? |
|----------|-------|---|----------|
| statement_boundary | 40 | 29.0% | Body-level — 3 attempts failed, abandoned |
| program_boundary | 30 | 21.7% | Mostly buffer overflow — unfixable |
| newline_sep | 24 | 17.4% | Body-level — abandoned |
| other | 13 | 9.4% | Case-by-case, mostly cascades |
| post_end | 8 | 5.8% | Dead code after `end` keyword |
| triple_string_boundary | 5 | 3.6% | Edge cases in `///` parsing |
| auto_gen_pattern | 4 | 2.9% | SchurVeronese data files |
| buffer_overflow | 3 | 2.2% | Lezer internal limit — unfixable |
| callitems_boundary | 3 | 2.2% | Cascades |
| body_boundary | 2 | 1.4% | Body-level — abandoned |
| divider_line | 2 | 1.4% | Non-M2 formatting |
| unicode_char | 2 | 1.4% | Remaining after E1 unicode fix |
| separator_context | 1 | 0.7% | Cascade |
| semicolon_in_call | 1 | 0.7% | Body-level — abandoned |

### By file classification

- **code**: 114 root causes (82.6%)
- **auto_generated**: 17 root causes (12.3%) — SchurVeronese data files
- **doc_heavy**: 7 root causes (5.1%) — prose-heavy files

---

## Fix History

### Optimization campaign results (chronological)

| Fix | Description | CODE_VALID delta | Cumulative |
|-----|-------------|-----------------|------------|
| Numbers | Trailing dot, precision suffix, scientific notation | ~-1,000 | ~15,000 |
| External tokenizer | if/then/else/try/catch via canShift | -3,284 | ~12,000 |
| OperatorSymbol | `symbol *`, `symbol ==` as single token | -113 | ~11,500 |
| ImplicitSemi | Newline-as-statement-separator at Program level | -84 | ~11,400 |
| TripleString | External tokenizer matching M2's lex.d exactly | -229 | ~11,200 |
| T1 | `;` in CallItems (M2 allows `;` in function calls) | -1,187 | ~5,000 |
| T2 | Prefix `>=`/`<=`/`>`/`<` (unary comparison) | -62 | ~4,900 |
| T3 | Comma as Sequence operator (binary `,`) | -1,003 | ~3,900 |
| Fix B | `?` as prefix unary operator | -61 | ~3,800 |
| Fix C | `symbol` + bracket tokens | -10 | ~3,800 |
| Fix D | TrailingDotNumber in juxtaposition | -21 | ~3,800 |
| Fix F | ListKw/DoKw external tokenizer | -417 | ~1,200 |
| KW Phase 1 | Remove `by`, fix ForExpr structure | -1 | ~1,200 |
| KW Phase 2 | from/to/when/in/of external tokenizers | +0 | ~1,200 |
| E1 | @detectDelim + unicode operators + `<\|`/`\|>` CallExpr | -8 | 751 |

### E1: Structural fixes (Feb 21, 2026)

1. **`@detectDelim`** — Adds `closedBy`/`openedBy` node properties for bracket matching
   in CodeMirror. Zero-risk, no error change.

2. **Unicode operators** — Added `·` (U+00B7), `⊗` (U+2297), `⊠` (U+22A0), `⧢` (U+29E2)
   as binary operators at `!times` precedence. Added `⇒` (U+21D2) at `!assign` precedence
   (synonym for `=>`). Added augmented forms `·=`, `⊠=`, `⧢=`. Split Identifier Unicode
   range to exclude `⊗` and `⊠` (they were in `\u2200-\u22FF`). All oracle-confirmed.

3. **`<|`/`|>` as CallExpr** — `expression !call "<|" ListItems? "|>"` added to CallExpr.
   Handles free algebra creation: `QQ<| x, y |>`. Oracle-confirmed.

**Result**: CODE_VALID 759→751 (-8), ROOT_VALID 142→138 (-4), parser +6.0%.

### E2: Body-level newline insertion — ABANDONED

Three attempts at inserting statement breaks inside parenthesized expressions all failed:

1. **Attempt 1** (+2,700 errors): Added `semi` to Body rule. `canShift(ImplicitSemi)` returns
   true everywhere inside Body → massive false positive emission.

2. **Attempt 2** (+81 errors): 2-bit context (PREV_CAN_END|NEWLINE_SEEN) + `isExprStarter`
   + `canShift`. Still too coarse — `other` +49, `unmatched_bracket` +21.

3. **Attempt 3** (8.3% precision): Text-based instrumentation scanning 16,620 fire sites.
   15,239 in clean files (550 files). Root cause: character-based guards cannot distinguish
   clause keywords (`else`, `then`, `or`) from statement-starting identifiers.

**Conclusion**: Body-level newline insertion is permanently abandoned. The fundamental problem
is that M2's clause keywords are syntactically indistinguishable from identifiers without
parser state context, and parser state context is too permissive inside Body.

---

## Remaining Error Categories

### 1. Statement boundary (40 root causes, ~29%)

Errors at boundaries between statements inside parenthesized blocks. Example:
```m2
(X,p,q) := flattenRing(A, opts, Result => (resultTemplate#0,,));
```
The empty tuple slot `(a,,b)` is valid M2 but the grammar can't parse it without +18.9%
parser size growth (MEMORY #40).

**Status**: Unfixable within current Lezer LR constraints.

### 2. Program boundary (30 root causes, ~22%)

Mostly **buffer overflow** from Lezer's internal ~4KB parser buffer limit. Lists with
>300 elements cause parser truncation. The SchurVeronese Betti table files and large
data files (Polyhedra, ExampleFreeResolutions) hit this limit.

**Status**: Unfixable (Lezer parser internals).

### 3. Newline separation (24 root causes, ~17%)

Newlines acting as implicit statement separators inside parenthesized expressions. The
grammar only handles ImplicitSemi at Program (top-level), not inside Body (parens/braces).

**Status**: Unfixable. Three attempts at Body-level insertion all failed (see E2 above).

### 4. Post-end errors (8 root causes, ~6%)

Code after `end` keyword at the end of package files. M2 stops parsing at `end`, but our
grammar continues. Not user-visible (CODE_EXECUTED metric excludes these: 751→621).

**Status**: Low priority. Could add `end` as a terminator but not worth the complexity.

### 5. Triple-string boundary (5 root causes, ~4%)

Edge cases where `///` doc string boundaries interact with comments or other patterns.
The external tokenizer (`tripleStringTokenizer.js`) mirrors M2's `lex.d:getstringslashes`
exactly, so these are genuine ambiguities in the source files.

### 6. Buffer overflow (3 root causes, ~2%)

Explicit buffer overflow cases in `exports.m2`, `Matroids/foundations.m2`, `TSpreadIdeals.m2`.
Same root cause as program_boundary buffer overflow.

**Status**: Unfixable (Lezer internal limit).

---

## Architecture

### External tokenizers (4 files)

| File | Tokens | Purpose |
|------|--------|---------|
| `controlFlowTokenizer.js` | 13 keywords | `canShift` disambiguation for clause/control keywords |
| `implicitSemiTokenizer.js` | ImplicitSemi | Newline-as-statement-separator at Program level |
| `scopeMinusTokenizer.js` | ScopeMinus | `symbol -` without parser table explosion |
| `tripleStringTokenizer.js` | TripleString | Exact mirror of M2's `lex.d:getstringslashes` |

### Keyword mechanism summary

| Mechanism | Keywords | Why |
|-----------|----------|-----|
| External tokenizer (canShift) | if, then, else, try, catch, list, do, from, to, when, in, of, NewFrom | Reserved keywords that must be distinguished from Identifier mid-expression |
| `ckw` (@extend) | while, for, new, return, break, continue, throw, not, time, shield, debug, load, use, export, needs | Statement starters — ckw allows Identifier fallback for method installations |
| `kw` (@specialize) | and, or, xor | Binary keywords — must stay as kw (ckw causes +34 regression) |

### Gate checks (8/8 required)

1. Grammar compiles
2. External tokenizer files synced to `src/parser/` and `lib/parser/`
3. Parser files synced
4. All 1,090 fixtures pass
5. Corpus error rate within tolerance
6. Parser size within +10% of baseline
7. Operator validation (77 operators + 32 augmented)
8. Keyword manifest drift check

---

## Appendix: Key Reference Files

- **Grammar**: `codemirror-lang-m2/src/m2.grammar`
- **M2 parser**: `M2/Macaulay2/d/parser.d`
- **M2 operator precedence**: `M2/Macaulay2/d/binding.d` (lines 215-371)
- **M2 lexer**: `M2/Macaulay2/d/lex.d`
- **Corpus test**: `codemirror-lang-m2/test/test_corpus.js`
- **Root-cause analysis**: `codemirror-lang-m2/test/analyze_roots.js`
- **Gate script**: `codemirror-lang-m2/test/gate.fish`
- **Oracle validator**: `codemirror-lang-m2/test/oracle.js`
- **Keyword manifest**: `codemirror-lang-m2/test/keyword_manifest.json`
- **Drift checker**: `codemirror-lang-m2/test/drift_check.js`
- **Fixture tests**: `codemirror-lang-m2/test/test_fixtures.js`
- **Operator validator**: `codemirror-lang-m2/test/validate_operators.js`
- **Highlight mapping**: `codemirror-lang-m2/src/highlight.js`
