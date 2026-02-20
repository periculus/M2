# Statement-Boundary Campaign Plan

**Status**: B+C+D completed, A blocked, ImplicitSemi deferred
**Created**: 2026-02-20
**Updated**: 2026-02-20 (post full-day campaign)
**Baseline**: CODE_VALID 1,177 | ROOT_VALID 372 | Parser 273,405 bytes (post D)
**Previous**: CODE_VALID 1,198 | ROOT_VALID 376 | Parser 272,637 bytes (post B+C)
**v0.2-stable tag**: CODE_VALID 1,198 | ROOT_VALID 376 | Parser 272,637 bytes

## 1. Problem Summary

After T1 (`;` in CallItems), T2 (prefix comparisons), and T3 (comma as Sequence),
the remaining error categories are dominated by statement-boundary issues:

| Category | Root Causes | % | Description |
|----------|-------------|---|-------------|
| body_boundary | 149 | 38.5% | Cascade from upstream errors → zero-length before Body |
| statement_boundary | 69 | 17.8% | Zero-length between expression nodes (missing separator) |
| newline_sep | 43 | 11.1% | Newline between expressions not recognized as separator |
| program_boundary | 41 | 10.6% | Zero-length at program level (trailing commas, cascades) |
| **Subtotal** | **302** | **78.0%** | All relate to "where does one statement end and another begin?" |

The remaining 85 root causes (22.0%) are: other (18), semicolon_in_call (15),
callitems_boundary (14), post_end (13), separator_context (7), triple_string_boundary (5),
unicode_char (4), auto_gen_pattern (4), question_mark_op (3), divider_line (2).

## 2. Known Constraints

### What Has Already Failed (DO NOT REPEAT)
1. **ImplicitSemi in Body**: Adding `semi` to Body causes +2,700 regression because
   the parser always expects `semi` after expressions in Body, so `canShift` returns
   true everywhere inside parens (MEMORY #17)
2. **ImplicitSemiBody Phase-1**: 2-bit context (PREV_CAN_END|NEWLINE_SEEN) +
   exprEnders Set + isExprStarter(nextChar) + canShift: still +81 errors.
   Guards insufficient for Body-level implicit semi (MEMORY #19)
3. **`expression?` for comma**: Making BinaryExpression comma's right operand optional
   causes +18.9% parser size growth (exceeds 10% gate)

### Fundamental Challenges
- M2 uses newlines as implicit statement separators, but ALSO allows expressions
  to span multiple lines freely
- Inside parenthesized blocks `(...)`, both `;` and newline can separate statements
- `canShift` is too coarse — it fires at error-recovery positions, causing false
  emissions that break correct parses
- Body-level ImplicitSemi needs to distinguish "newline between statements" from
  "newline inside a multi-line expression" — this requires context the LR parser
  doesn't naturally have

## 3. Canary Suite

### Failing Targets (5 remaining — these SHOULD pass after fix)
```
FAIL(1)  (a, b, c,)            -- trailing comma in Body
FAIL(1)  (a, b,)               -- trailing comma in 2-elem Body
FAIL(1)  (a,,b)                -- empty element in Body
FAIL(2)  (Ideal,,)             -- type + empty elements in Body
FAIL(1)  symbol (*)            -- symbol as postfix (needs external tokenizer)
```

### Fixed by B+C (moved to passing anti-regression)
```
FIXED(B)  ? X                   -- unary ? prefix (Fix B: +!prefix "?")
FIXED(B)  if ? ideal q != "x" then 1  -- if ? expr (Fix B)
FIXED(C)  symbol {              -- symbol open brace (Fix C: bracket branch)
FIXED(C)  symbol }              -- symbol close brace (Fix C: bracket branch)
```

### Passing Anti-Regression (22 snippets — these MUST NOT regress)
```
PASS  (\n  x := 1;\n  y := 2\n)       -- multi-stmt Body with newline
PASS  (x := 1; y := 2)                 -- multi-stmt Body inline
PASS  for i from 0 to 5 do (\n  x = i;\n  y = i+1\n)
PASS  for i from 0 to 5 do (\n  x = i;\n  y = i+1;\n)
PASS  x = 1\ny = 2                     -- top-level newline separation
PASS  x = 1;\ny = 2                    -- top-level semi+newline
PASS  f x\ng y                         -- jux-calls on separate lines
PASS  assert(true)\nassert(false)       -- calls on separate lines
PASS  scan(L, x -> (\n  f x;\n  g x;\n))
PASS  apply(L, x -> (\n  f x;\n  g x\n))
PASS  f(a, b,)                         -- trailing comma in CallExpr
PASS  f(a,,b)                          -- empty element in CallExpr
PASS  if x then y else z               -- control flow
PASS  (if x then y else z)             -- control flow in parens
PASS  for i from 0 to 5 do f i         -- for-do jux
PASS  while x do (f x; g x)            -- while-do Body
PASS  try f x catch e then g e          -- try-catch-then
PASS  f x + g y                        -- jux + binary
PASS  dim I, degree I                   -- comma sequence
PASS  x = 1; y = 2                     -- semi-separated stmts
PASS  -- comment\nx = 1                 -- comment then stmt
PASS  x = 1 -- comment                 -- stmt then comment
```

## 4. Experiment Matrix

### Experiment A: Trailing Comma in Body
**Goal**: Fix `(a, b,)`, `(a,,b)` patterns (5 of 9 failing snippets)
**Approach**: Add trailing comma handling to Body without `expression?` on BinaryExpression
**Options**:
- A1: Allow Body to end with `,`: `Body { (expression ";")* expression? ","? }`
  - Risk: shift/reduce with BinaryExpression comma
  - Expected: won't compile (same conflict as Body with comma)
- A2: External tokenizer `TrailingComma` that only fires before `)` when preceded by expression
  - Risk: new tokenizer complexity, canShift correctness
  - Expected: may work, needs +canShift guard
- A3: Handle in Body as `Body { (expression (";"|","))* expression? }` with GLR marker on ","
  - Risk: GLR fork at every comma in Body — parser size growth
  - Expected: unknown parser size impact, could be moderate

**Go/No-Go**: Parser size <= +10%, CODE_VALID improves >= 20, ROOT_VALID improves >= 5

### Experiment B: `?` as Unary Operator — COMPLETED
**Result**: B1 implemented (`!prefix "?" expression` in UnaryExpression).
CODE_VALID -61, ROOT_VALID -6, question_mark_op 3→0. Parser +0.04%. Gate 8/8.
No conflicts with `#?`, `.?`, `??`, `??=` (token precedence resolves).

### Experiment C: `symbol` with Special Tokens — COMPLETED
**Result**: Neither C1 nor C2 — used OperatorSymbol token approach instead.
Added `"(*)"` to shared operator list, added symbol-only branch for `{`, `}`, `(`, `)`, `[`, `]`.
Key discovery: M2's `symbol` consumes ONE token (parser.d:396-401).
Oracle confirmed: `symbol {1}` → SYNTAX_ERROR. `symbol {` → VALID.
CODE_VALID -10, ROOT_VALID -5. Parser +0.18%. Gate 8/8.

### Experiment D: TrailingDotNumber in juxArg — COMPLETED
**Result**: Added `TrailingDotNumber` to `juxArg` rule. M2 treats `1000.method` as
`(1000.) method` (float + juxtaposition), not member access. Oracle-confirmed.
CODE_VALID -21, ROOT_VALID -4. Parser +0.28%. Gate 8/8. 26 new fixtures.

### Experiment E: ImplicitSemi in Body (Phase 2)
**Goal**: Fix broader statement_boundary + newline_sep patterns
**Approach**: Revisit Body-level ImplicitSemi with improved guards
**Prerequisites**: Experiments A-C completed first (they reduce the target surface)
**Options**:
- D1: Indent-tracking context (tree-sitter style)
  - Track indentation level, emit ImplicitSemi on dedent
  - Risk: fundamental mismatch with Lezer's context model (no tree access)
  - Expected: probably not feasible in Lezer
- D2: 3-bit context (NEWLINE + PREV_CAN_END + DEPTH)
  - Add paren/brace depth to context, only emit ImplicitSemi at depth=0 or at matching dedent
  - Risk: context bits are limited (Lezer contexts are checked by identity)
  - Expected: moderate complexity, may reduce false emissions
- D3: Body-level semi with stronger canShift filter
  - Only allow ImplicitSemi in Body when next token STARTS an expression AND prev token ENDED an expression
  - Risk: same as Phase-1 failure, but with better heuristics
  - Expected: incremental improvement, probably still +50-80 errors
- D4: GLR forking for Body with semi
  - `Body { (expression ~bodySemi (";" | ImplicitSemi))* expression? }`
  - Fork at every statement boundary, let parser resolve
  - Risk: massive parser size growth, parse time explosion
  - Expected: probably not feasible

**Go/No-Go**: CODE_VALID improves >= 50, ROOT_VALID improves >= 20, parser size <= +15%, parse time <= +25%

## 5. Execution Order

| # | Experiment | Expected Impact | Risk | Priority |
|---|-----------|----------------|------|----------|
| 1 | B: `?` unary | 3 ROOT_VALID, 10+ CODE_VALID | Low | First |
| 2 | C: `symbol` brackets | 3 ROOT_VALID | Low | Second |
| 3 | A: Trailing comma | 5-10 ROOT_VALID, 30+ CODE_VALID | Medium | Third |
| 4 | D: Body ImplicitSemi | 50+ ROOT_VALID | High | Last |

### Stop Rules
1. Any experiment that regresses CODE_VALID by >10: immediate revert
2. Any experiment that grows parser by >10% without ROOT_VALID gain: revert
3. Two consecutive experiments with <5 ROOT_VALID gain: pause D, reassess
4. Total parse time growth >25% from current baseline: stop all

## 6. Success Criteria

**Minimum success**: Experiments B+C reduce ROOT_VALID by >= 6, no regressions
**Good success**: Experiments A+B+C reduce ROOT_VALID by >= 15, CODE_VALID by >= 50
**Stretch goal**: Experiment D reduces ROOT_VALID by >= 30 (bringing total below 350)

## 7. Open Questions (Updated)

1. ~~Can `?` as prefix unary coexist with `#?`, `.?`, `??` operators?~~
   **ANSWERED (Fix B)**: Yes. Token precedence resolves. No conflicts.
2. ~~Will `symbol (*)` need a new external tokenizer, or can it be handled in grammar?~~
   **ANSWERED (Fix C)**: Handled via OperatorSymbol token. `(*)` added to shared operator list.
   Postfix `M(*)` still open (4 errors, needs external tokenizer, deferred).
3. Is there a Body trailing-comma approach that avoids both parser growth and GLR?
   **Still open**: A1/A2/A3 all untested. Only 5 canary failures remain in this category.
4. Should Body-level ImplicitSemi be abandoned in favor of a fundamentally different
   approach (e.g., error-recovery post-processing)?
   **Leaning yes**: Two failed attempts (MEMORY #17, #19). ckw limitation (MEMORY #32)
   means keywords after binary operators in for/while bounds also fail. External
   tokenizer approach for `list`/`do` (like controlFlowTokenizer for if/then/else)
   is the most promising path but high complexity for 6 separator_context errors.

## 8. Full-Day Campaign Results (2026-02-20)

### Investigations Completed
| Investigation | Finding |
|--------------|---------|
| program_boundary (41→42 root causes) | 42 post_comma = large list overflow (Lezer buffer limit, UNFIXABLE). 7 trailing_comma = blocked (A experiment). 9 other = free-form text |
| statement_boundary (63) | Deeply structural: missing newline-as-separator. ckw limitation prevents `for i to n-1 list i`. External tokenizer needed. |
| semicolon_in_call (15) | All nested for/while bodies with `);` closing. Same Body-level issue as MEMORY #17. Not fixable with narrow changes. |
| body_boundary (148) | 183 self-cascade (no upstream to fix). 16 cascade from statement_boundary. Fixing upstream reduces ~78 downstream. |
| Small categories | separator_context (6): ckw limitation. triple_string_boundary (5): source-level `///` issues. unicode_char (4): `·`/`⇒` operators. auto_gen_pattern (4): parser complexity limit. divider_line (2): post-end/merge markers. None safely fixable. |

### Fixes Applied
| Fix | Impact | Parser | Gate |
|-----|--------|--------|------|
| Fix D: TrailingDotNumber in juxArg | -21 CODE_VALID, -4 ROOT_VALID | +0.28% | 8/8 |

### Error Rate Trajectory
| Milestone | CODE_VALID | Rate | ROOT_VALID |
|-----------|-----------|------|------------|
| Grammar rewrite | ~4,737 | 4.35% | ~1,200 |
| T1: `;` in CallItems | -1,187 | — | — |
| T2: Prefix comparisons | -62 | — | — |
| T3: Comma as Sequence | -1,003 | — | — |
| Fix B: `?` prefix | -61 | — | — |
| Fix C: symbol brackets | -10 | — | — |
| **v0.2-stable** | **1,198** | **0.0126%** | **376** |
| Fix D: TrailingDotNumber | -21 | — | — |
| **Current** | **1,177** | **0.0123%** | **372** |

### Remaining Error Landscape
The 372 remaining root causes break down into:
- **Structural (302, 81.2%)**: body_boundary (148), statement_boundary (63), program_boundary (41), newline_sep (41), semicolon_in_call (15), callitems_boundary (14) — all require Body-level ImplicitSemi or fundamental parser changes
- **Post-end (13, 3.5%)**: Content after `end` statement (M2 ignores, tracked in CODE_EXECUTED)
- **Other (16, 4.3%)**: Miscellaneous patterns
- **Niche (21, 5.6%)**: separator_context (6), triple_string_boundary (5), unicode_char (4), auto_gen_pattern (4), divider_line (2)

### Conclusion
The "safe harvest" is exhausted. Further improvements require either:
1. **External tokenizer for `list`/`do`** keywords (like controlFlowTokenizer) — moderate complexity, ~6 errors
2. **Body-level ImplicitSemi Phase 3** — high complexity, high risk, potentially ~100+ errors
3. **Lezer parser internals** — buffer limit for large lists (~42 errors, unfixable at grammar level)
