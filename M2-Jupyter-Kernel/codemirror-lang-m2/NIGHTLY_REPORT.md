# Nightly Grammar Improvement Report

**Date**: 2026-02-18
**Commit baseline**: `801a10b599`

## Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| CODE-only errors | 4,419 | 4,410 | **-9** |
| CODE-only error rate | 0.0496% | 0.0494% | -0.0002pp |
| Fixtures | 625 | 633 | **+8** |
| Parser size (bytes) | 263,488 | 263,636 | +148 (+0.06%) |
| Parse time | 18.6s | ~19s | ~+0.4s |

## Changes

### Pre-flight: scopeMinusTokenizer build fix

`package.json` build scripts (`build:parser`, `build:lib`, `build:lib:prod`) were missing `scopeMinusTokenizer.js` from their copy commands. The grammar imports it via `@external tokens`, so builds would fail without manual copies. Fixed by adding it to all three scripts.

### Milestone A: Instrumentation (zero grammar changes)

Four new test infrastructure files created:

1. **`test/gate.fish`** — Per-commit gate script. Verifies: grammar compiles, external tokenizer sync (all `@external` .js files exist in both `src/parser/` and `lib/parser/`), fixtures pass, corpus errors ≤ baseline, parser size delta < 10%, operator validation passes. 6/6 checks pass.

2. **`test/analyze_roots.js`** — Root-cause analysis. Finds the first 3 anchored errors per file, classifies them, and produces a ranked table. Results: 361 files with errors, 636 independent root causes. Categories: `other` 558 (87.7%), `newline_sep` 72 (11.3%), `triple_string_boundary` 5 (0.8%), `c_style_comment` 1 (0.2%).

3. **`test/oracle.js` + `test/oracle_snippets.txt`** — M2 oracle validation harness. Validates syntax snippets against real M2 (`/opt/homebrew/bin/M2`), using isolated process per snippet with 30s timeout. 46/46 snippets correctly classified (VALID, SYNTAX_ERROR, RUNTIME_ERROR, or ANY).

4. **`test/nightly.js`** — Orchestrator. Creates `_nightly_runs/YYYYMMDD-HHMM/` directories, captures baseline metrics, runs all test suites, writes `summary.json`.

### Milestone B: TripleString greedy slash fix

**Grammar change** (1 line in `m2.grammar`):
```
// Before:
TripleString { "///" (![/] | "/" ![/] | "//" ![/] | "////")* "///" }

// After:
TripleString { "///" (![/] | "/" ![/] | "//" ![/] | "////" "/"*)* "///" }
```

Change: `"////"` → `"////" "/"*"` — body greedily consumes 4+ consecutive slashes. This prevents the modulo-4 self-closing bug where slash counts satisfying `(n-6) % 4 === 0` caused TripleStrings to close prematurely within long slash runs.

**Impact**: All 9 error reductions come from `PrimaryDecomposition/examples.m2` (68 → 59 errors). The file uses paired 58-slash divider lines as TripleString documentation blocks. The DFA's longest-match semantics make paired dividers span correctly (spanning match is longer than self-closing match).

**Fixtures added**: 4 new test blocks (8 assertions) — greedy body with 5 slashes, 58-slash divider pair spanning, M2 `////` escape preservation.

## Root-Cause Analysis

| Category | Count | % | Description |
|----------|-------|---|-------------|
| other | 558 | 87.7% | Uncategorized (needs subcategorization) |
| newline_sep | 72 | 11.3% | Implicit semicolon expected but not produced |
| triple_string_boundary | 5 | 0.8% | Error adjacent to `///` sequence |
| c_style_comment | 1 | 0.2% | `//` at line start in non-operator context |

The `other` category (87.7%) is too broad. Top error tokens: `,` (1134), `)` (775), `;` (597) — mostly cascading from earlier root failures.

## Open Items

1. **TripleString parity**: M2's `////` escape creates parity-dependent close behavior (odd N stays open, even N self-closes). The DFA handles paired dividers via longest-match, but standalone odd-count dividers self-close when they should stay open. An external tokenizer was prototyped but deferred — the escape algorithm's parity behavior causes body slash sequences to NOT close at even-count boundaries, making TripleStrings span too widely. Needs a hybrid DFA/external approach.

2. **Root-cause subcategorization**: The `other` category needs breaking down into actionable subcategories (English prose, juxtaposition failures, operator precedence mismatches, etc.).

3. **Implicit semicolon in Body**: Phase-1 attempt failed (+81 errors). Body-level implicit semi may need a fundamentally different approach (indentation tracking or GLR).

## Gate Status

All 6 checks pass:
- Grammar compiles ✓
- External tokenizer sync ✓
- Fixtures: 633 pass, 0 fail ✓
- Corpus: 4,410 ≤ 4,419 baseline ✓
- Parser size: +148 bytes (+0.06%) < 10% ✓
- Operator validation: PASS ✓
