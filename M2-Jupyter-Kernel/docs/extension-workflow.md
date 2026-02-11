# M2 JupyterLab Extension: Complete Workflow Reference
Last verified: 2026-02-10 | M2 1.25.06 | JupyterLab 4.4.5 | Node 25.1.0 | Lezer 1.4.x
Source of truth for: build/deploy commands, version matrix, update triggers

## Overview

The M2 JupyterLab extension consists of three independent pipelines:
1. **Grammar** — Lezer parser for syntax highlighting and code intelligence
2. **Documentation** — Symbol database for tooltips and autocompletion
3. **Extension Build** — TypeScript compilation, webpack bundling, deployment

Detailed architecture docs: [grammar.md](grammar.md), [highlighting.md](highlighting.md), [code-intelligence.md](code-intelligence.md), [symbol-pipeline.md](symbol-pipeline.md)

## Version Matrix

| Component | Current Version | How to Check |
|-----------|----------------|--------------|
| Macaulay2 | 1.25.06 | `M2 --version` |
| JupyterLab | 4.4.5 | `jupyter lab --version` |
| CodeMirror | 6.x | `package.json` → `@codemirror/language` |
| Lezer (LR) | 1.4.x | `package.json` → `@lezer/lr` |
| Node.js | 25.1.0 | `node --version` |
| Python | 3.13.5 | `python3 --version` |
| TypeScript | ~5.0.2 | `package.json` → devDependencies |

> Versions reflect the development venv (`M2-Jupyter-Kernel/venv/`). System-wide versions may differ.

## Python Environment

The extension is developed inside a **per-project venv** at `M2-Jupyter-Kernel/venv/`.

### Setup (one-time)

**fish:**
```fish
cd M2-Jupyter-Kernel
python3 -m venv venv
source venv/bin/activate.fish
python3 -m pip install 'jupyterlab>=4.0.0' ipykernel
python3 -m pip install -e .
```

**bash:**
```bash
cd M2-Jupyter-Kernel
python3 -m venv venv
source venv/bin/activate
python3 -m pip install 'jupyterlab>=4.0.0' ipykernel
python3 -m pip install -e .
```

### Conventions
- Always use `python3` (not `python`) in human-facing commands — `python` may not exist outside venvs
- Use `python3 -m pip` instead of bare `pip` to avoid interpreter mismatches
- Each project gets its own venv (never install into system Python)
- The venv should use Python 3.13+ (current Homebrew stable)
- Activate the venv before any build/deploy commands

## Update Triggers

| Trigger | What Must Be Rerun | Docs to Update |
|---------|-------------------|----------------|
| New M2 release | `generate_symbols.py`, corpus test | symbol-pipeline.md, MEMORY.md |
| Grammar change | lezer-generator, corpus test, full build | grammar.md, PARSING_ERROR_ANALYSIS.md |
| JupyterLab major bump | Full build, smoke test | This file (version matrix) |
| CodeMirror/Lezer bump | Full build, corpus test | This file (version matrix) |
| New symbol type/category | `highlight.js`, `generate_symbols.py`, build | grammar.md, highlighting.md |
| Color scheme change | `index.ts`, `m2Language.ts`, `style/index.css` | highlighting.md |

## Directory Layout

```
M2-Jupyter-Kernel/
├── codemirror-lang-m2/          # Grammar development (independent workspace)
│   ├── src/
│   │   ├── m2.grammar           # THE grammar (edit here)
│   │   ├── parser.js            # Generated parser (npx lezer-generator output)
│   │   ├── parser.terms.js      # Generated term IDs
│   │   ├── highlight.js         # Tag → highlighting mappings
│   │   └── tokens.ts            # Type/Builtin/Constant token lists
│   └── test/
│       ├── test_corpus.js       # Full corpus test (2593 .m2 files, 1 raw doc excluded)
│       └── analyze_errors.js    # Detailed error categorization
├── src/                         # Extension TypeScript source
│   ├── index.ts                 # Extension entry point (registers language, CSS overrides)
│   ├── m2Language.ts            # LRLanguage definition (folding, completion, hover)
│   ├── m2Hover.ts               # Rich hover tooltip implementation
│   ├── m2Symbols.json           # Generated symbol database (266KB, 1763 entries)
│   └── parser/                  # Parser files copied from codemirror-lang-m2
│       ├── m2.grammar           # Copy of grammar (reference only)
│       ├── parser.js            # Copy of generated parser
│       ├── parser.terms.js      # Copy of generated terms
│       └── highlight.js         # Copy of highlight mappings
├── lib/                         # tsc output (.js files)
│   └── parser/                  # CRITICAL: must manually copy .js files here
├── scripts/
│   └── generate_symbols.py      # Documentation extraction script
├── style/
│   └── index.css                # CSS for hover tooltips + highlighting overrides
└── @m2_jupyter/.../labextension/  # Webpack build output
    ├── static/                  # Bundle files (remoteEntry.*.js, etc.)
    └── package.json             # Extension metadata
```

## Pipeline 1: Grammar

### When to run
- Changing syntax parsing rules, adding new token types, fixing parsing errors
- See [grammar.md](grammar.md) for architecture details

### Steps (fish)
```fish
cd M2-Jupyter-Kernel/codemirror-lang-m2

# 1. Edit the grammar
vim src/m2.grammar

# 2. Compile grammar (generates parser.js + parser.terms.js)
npx lezer-generator src/m2.grammar -o src/parser.js

# 3. Run corpus test (target: <1% error rate)
node test/test_corpus.js
# For detailed breakdown:
node test/analyze_errors.js

# 4. Copy to extension source
cp src/parser.js src/parser.terms.js ../src/parser/
cp src/highlight.js ../src/parser/
```

### Steps (bash)
```bash
# Same commands — no fish-specific syntax in this pipeline
```

### Key references
- Operator precedence: `M2/Macaulay2/d/binding.d` (lines 215-371)
- Bison grammar: `M2/Macaulay2/c/grammar.y`
- Symbol dictionary: `M2/Macaulay2/editors/vim/m2.vim.dict`

## Pipeline 2: Documentation Symbols

### When to run
- New M2 version, new symbols, tooltip improvements
- See [symbol-pipeline.md](symbol-pipeline.md) for full details

### Steps
```fish
cd M2-Jupyter-Kernel
python3 scripts/generate_symbols.py
# Output: src/m2Symbols.json (~266 KB, 1763 entries)
```

### Requirements
- Python 3, M2 in PATH (optional — gracefully skipped), M2 source at `../M2/`

## Pipeline 3: Extension Build & Deploy

### When to run
- After any change to `src/*.ts`, `src/m2Symbols.json`, `style/*.css`, or parser files

### Steps (fish)
```fish
cd M2-Jupyter-Kernel

# 1. Compile TypeScript
npx tsc --sourceMap

# 2. CRITICAL: Copy parser .js files to lib/ (tsc only compiles .ts)
# Only needed if grammar was rebuilt (Pipeline 1)
cp src/parser/parser.js src/parser/parser.terms.js src/parser/highlight.js lib/parser/

# 3. Build webpack extension
jupyter labextension build --development True .

# 4. Deploy to venv
set SRC @m2_jupyter/jupyterlab_m2_codemirror/labextension
set DEST venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror
cp $SRC/static/* $DEST/static/
cp $SRC/package.json $DEST/

# 5. Restart JupyterLab
jupyter lab
```

### Steps (bash)
```bash
cd M2-Jupyter-Kernel
npx tsc --sourceMap
cp src/parser/parser.js src/parser/parser.terms.js src/parser/highlight.js lib/parser/
jupyter labextension build --development True .
SRC=@m2_jupyter/jupyterlab_m2_codemirror/labextension
DEST=venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror
cp $SRC/static/* $DEST/static/
cp $SRC/package.json $DEST/
jupyter lab
```

## Full Rebuild (all pipelines)

```fish
cd M2-Jupyter-Kernel

# Grammar
cd codemirror-lang-m2
npx lezer-generator src/m2.grammar -o src/parser.js
node test/test_corpus.js
cp src/parser.js src/parser.terms.js ../src/parser/
cp src/highlight.js ../src/parser/
cd ..

# Documentation
python3 scripts/generate_symbols.py

# Extension
npx tsc --sourceMap
cp src/parser/parser.js src/parser/parser.terms.js src/parser/highlight.js lib/parser/
jupyter labextension build --development True .
set SRC @m2_jupyter/jupyterlab_m2_codemirror/labextension
set DEST venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror
cp $SRC/static/* $DEST/static/
cp $SRC/package.json $DEST/
```

## Verify Checklist

Run after any change to confirm everything works end-to-end:

```fish
cd M2-Jupyter-Kernel

# 1. Grammar compiles
cd codemirror-lang-m2 && npx lezer-generator src/m2.grammar -o src/parser.js

# 2. Corpus test passes (<1% error rate)
node test/test_corpus.js

# 3. TypeScript compiles clean
cd .. && npx tsc --sourceMap

# 4. Extension builds
cp src/parser/parser.js src/parser/parser.terms.js src/parser/highlight.js lib/parser/
jupyter labextension build --development True .

# 5. Deploy
set SRC @m2_jupyter/jupyterlab_m2_codemirror/labextension
set DEST venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror
cp $SRC/static/* $DEST/static/
cp $SRC/package.json $DEST/

# 6. Symbol generation (only if M2 version changed)
python3 scripts/generate_symbols.py

# 7. Visual smoke tests in JupyterLab
jupyter lab
# See highlighting.md and code-intelligence.md for checklists
```

## Commit History

| Hash | Description |
|------|-------------|
| `5e540d63f3` | Checkpoint before documentation consolidation |
| `866eb1e602` | Grammar 0.17% error rate (try/then/else, number formats, ellipsis, trailing comma) |
| `933ee67528` | Build workflow documentation and parsing error analysis |
| `8a03ac856c` | Rich docs, 100% symbol coverage, option completion, CallExpr folding |
| `be4db23d44` | Code intelligence (autocomplete, hover, folding, AI context) |
| `1d75284c23` | Grammar 0.19% error rate (from 4.34%) |
| `984256101b` | Syntax highlighting colors correct |
| `ef25f0e92c` | Complete Lezer grammar with expression parsing |

## Current Grammar Status (Feb 10, 2026)

- **0.17% error rate** (15,201 errors / 8.9M nodes across 2593 files, 1 raw doc excluded)
- See `codemirror-lang-m2/PARSING_ERROR_ANALYSIS.md` for detailed breakdown
- Remaining errors: mostly `symbol + operator` patterns (~27%), cascading (~15%)
- Fixes applied in `866eb1e602`: try/then/else, number formats, ellipsis, trailing comma, not as ckw
- Known unfixable: `symbol **`, raw SimpleDoc markup, LaTeX in doc strings
