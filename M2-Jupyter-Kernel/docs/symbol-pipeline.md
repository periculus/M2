# M2 Symbol Documentation Pipeline
Last verified: 2026-02-10 | M2 1.25.06 | JupyterLab 4.4.5 | Node 25.1.0 | Lezer 1.4.x
Source of truth for: generate_symbols.py, m2Symbols.json schema, update procedures

## Overview

`scripts/generate_symbols.py` generates `src/m2Symbols.json` (266 KB, 1763 entries, 100% documented). This file drives autocompletion, hover tooltips, and option completion.

## Data Sources (in priority order)

| Priority | Source | What It Provides | File Path |
|----------|--------|-----------------|-----------|
| 1 | Vim dictionary | 1763 symbol names + categories | `M2/Macaulay2/editors/vim/m2.vim.dict` |
| 2 | SimpleDoc `document {}` blocks | Headlines, usage, inputs, outputs, options | `M2/Macaulay2/packages/Macaulay2Doc/**/*.m2` |
| 3 | SimpleDoc `doc /// ... ///` blocks | Same as above, indentation-based format | Same directory tree |
| 4 | Package `newPackage()` calls | Package-level headlines | `M2/Macaulay2/packages/*.m2` |
| 5 | Recursive package scan | Remaining undocumented symbol docs | All `packages/**/*.m2` files |
| 6 | M2 help command | Headlines for symbols without SimpleDoc | Runs `M2 --stop --no-readline --silent` |
| 7 | `FALLBACK_DESCRIPTIONS` dict | Hand-written descriptions for ~71 internal symbols | In `generate_symbols.py` itself |

## Pipeline Steps (what `generate_symbols.py` does)

1. **Read symbol names** from vim dictionary → 1763 symbols
2. **Categorize** each as keyword/type/function/constant (hardcoded lists in script)
3. **Parse SimpleDoc `document { ... }` blocks** from Macaulay2Doc (380 files, 1710 blocks)
   - Extracts: `Key`, `Headline`, `Usage`, `Inputs`, `Outputs`
   - Extracts option keys from `Key => {[funcName, OptionName]}` patterns
   - Extracts option types/descriptions from `Inputs => { OptionName => Type => "desc" }`
4. **Parse `doc /// ... ///` blocks** (indentation-based SimpleDoc inside triple-slash strings)
5. **Parse `newPackage("Name", Headline => "...")` calls** from package files
6. **Recursively scan** all other package `.m2` files for remaining undocumented symbols
7. **Merge option data** — map functions to their options with types and descriptions
8. **Run M2 help extraction** (`extract_m2_help_headlines()`) for symbols still without headlines
9. **Apply `FALLBACK_DESCRIPTIONS`** dict for keywords, constants, and internal symbols

## How to Re-Run After M2 Version Update

```fish
cd M2-Jupyter-Kernel

# 1. Regenerate symbols (requires M2 in PATH for step 6)
python3 scripts/generate_symbols.py
# Output: src/m2Symbols.json
# Prints coverage stats to stderr

# 2. Check coverage
# Script reports: total symbols, documented count, undocumented list

# 3. If new undocumented symbols appear:
#    a. Check if they have M2 help → script handles this automatically
#    b. If not, add to FALLBACK_DESCRIPTIONS dict in generate_symbols.py

# 4. Rebuild extension
npx tsc --sourceMap
jupyter labextension build --development True .
# Deploy to venv (see extension-workflow.md)
```

```bash
# Same commands work in bash
cd M2-Jupyter-Kernel
python3 scripts/generate_symbols.py
npx tsc --sourceMap
jupyter labextension build --development True .
```

## How to Add Fallback Descriptions

For symbols that have no SimpleDoc documentation and no M2 help headline:

1. Edit `scripts/generate_symbols.py`
2. Add to the `FALLBACK_DESCRIPTIONS` dict near the top:
   ```python
   FALLBACK_DESCRIPTIONS = {
       ...
       'NewSymbol': 'brief description of what it does',
   }
   ```
3. Re-run the script

## JSON Schema (`src/m2Symbols.json`)

```json
[
  {
    "label": "string",       // REQUIRED: symbol name
    "type": "string",        // REQUIRED: "keyword" | "type" | "function" | "constant"
    "info": "string",        // Headline description (100% coverage)
    "detail": "string",      // Usage pattern, e.g., "gb I" (718/1763 have this)
    "options": [              // Function options (82/1763 have this)
      {
        "name": "string",    // Option name
        "type": "string",    // Option value type (optional)
        "info": "string"     // Option description (optional)
      }
    ],
    "inputs": [               // Input parameters (527/1763 have this)
      {
        "name": "string",    // Parameter name (optional)
        "type": "string",    // Parameter type (optional)
        "info": "string"     // Parameter description (optional)
      }
    ],
    "outputs": [              // Output types (406/1763 have this)
      {
        "type": "string",    // Output type (optional)
        "info": "string"     // Output description (optional)
      }
    ]
  }
]
```

## Coverage Stats (Feb 2026)

| Metric | Count |
|--------|-------|
| Total symbols | 1763 |
| With headline (`info`) | 1763 (100%) |
| With usage (`detail`) | 718 (41%) |
| With inputs | 527 (30%) |
| With outputs | 406 (23%) |
| With options | 82 (5%) |

## Troubleshooting

### M2 Not in PATH
Script gracefully skips M2 help extraction (step 6). Coverage drops by ~238 symbols that only have M2 help headlines. Add them to `FALLBACK_DESCRIPTIONS` or install M2.

### Unicode Errors
M2 help output may contain non-UTF-8 bytes. The script uses `errors='replace'` when decoding subprocess output. Replacement characters (`\ufffd`) are stripped from headlines.

### Timeout
M2 help extraction has a 300-second timeout for the entire batch. If it times out, the script continues with whatever headlines were extracted. For very large symbol sets, the M2 batch script may need optimization.

### New Symbols Not Appearing
1. Check if the symbol is in `M2/Macaulay2/editors/vim/m2.vim.dict` — this is the master list
2. If not, it won't be included. Add it to the vim dict first (or modify the script to accept additional sources)

## Files Involved

| File | Role |
|------|------|
| `scripts/generate_symbols.py` | Main extraction script (~1008 lines) |
| `src/m2Symbols.json` | Generated output (266 KB) |
| `M2/Macaulay2/editors/vim/m2.vim.dict` | Master symbol list |
| `M2/Macaulay2/packages/Macaulay2Doc/` | Primary documentation source |
| `M2/Macaulay2/packages/*.m2` | Package headlines |
