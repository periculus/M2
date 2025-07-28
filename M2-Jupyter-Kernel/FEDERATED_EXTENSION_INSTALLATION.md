# M2 CodeMirror Federated Extension Installation Guide

## Overview

We've successfully created a federated JupyterLab extension that provides live syntax highlighting for Macaulay2 code. This extension uses:

- CodeMirror 6 with a custom Lezer parser
- JupyterLab's federated extension system
- Full M2 language support

## Installation Steps

### For Users

1. **Install the Python package**:
   ```bash
   pip install jupyterlab_m2_codemirror
   ```

2. **Verify installation**:
   ```bash
   jupyter labextension list
   ```

3. **Restart JupyterLab**:
   ```bash
   jupyter lab
   ```

### For Developers

1. **Clone and enter the extension directory**:
   ```bash
   cd /path/to/M2-Jupyter-Kernel
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build:lib
   jupyter labextension build --development True .
   ```

4. **Install in development mode**:
   ```bash
   pip install -e .
   ```

5. **Watch for changes** (optional):
   ```bash
   npm run watch
   ```

## Features

- **Live Syntax Highlighting**: M2 code is highlighted as you type
- **Token Recognition**: Keywords, types, functions, and operators are properly colored
- **Comment Support**: Both `--` line comments and `-* block comments *-` are recognized
- **String Support**: Regular strings and `///` documentation strings
- **Auto-indentation**: Smart indentation for M2 code blocks
- **Bracket Matching**: Automatic matching of parentheses, brackets, and braces

## Technical Details

### Architecture

1. **Lezer Parser**: Generated from `m2.grammar` to parse M2 syntax
2. **Language Support**: Defined in `m2Language.ts` with highlighting rules
3. **Extension Registration**: Handled in `index.ts` to register with JupyterLab

### File Structure

```
M2-Jupyter-Kernel/
├── src/
│   ├── index.ts           # Extension entry point
│   ├── m2Language.ts      # M2 language definition
│   └── parser/            # Lezer parser files
│       ├── parser.js
│       ├── parser.terms.js
│       └── m2.grammar
├── lib/                   # Compiled TypeScript
├── @m2_jupyter/           # Built extension
│   └── jupyterlab_m2_codemirror/
│       └── labextension/
├── package.json
├── tsconfig.json
└── pyproject.toml
```

## Troubleshooting

### Extension not loading

1. **Clear JupyterLab cache**:
   ```bash
   jupyter lab clean
   jupyter lab build
   ```

2. **Check browser console** for errors (F12)

3. **Verify the extension is built**:
   ```bash
   ls -la @m2_jupyter/jupyterlab_m2_codemirror/labextension/
   ```

### No syntax highlighting

1. **Check kernel language**:
   - Ensure the notebook is using the M2 kernel
   - The language should show as "macaulay2" in the notebook

2. **Verify extension loaded**:
   - Open browser console
   - Look for: "JupyterLab M2 CodeMirror extension activated!"

3. **Force reload**:
   - Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)

## Development Notes

### Modifying the Grammar

To modify the M2 grammar:

1. Edit `src/parser/m2.grammar`
2. Regenerate the parser:
   ```bash
   npx lezer-generator src/parser/m2.grammar -o src/parser/parser.js
   ```
3. Rebuild the extension

### Adding New Keywords/Functions

Edit `src/m2Language.ts` and add to the `styleTags` configuration:

```typescript
styleTags({
  // Add new keywords here
  'newkeyword': t.keyword,
  // Add new functions here
  'newfunction': t.function(t.variableName),
})
```

## Success!

The federated extension architecture successfully bypassed the webpack issues we encountered with the previous approach. Users now have:

- ✅ **Live syntax highlighting** while typing
- ✅ **Proper M2 language recognition**
- ✅ **Full CodeMirror 6 integration**
- ✅ **Easy installation** via pip

The extension is now ready for use and provides the comprehensive M2 syntax highlighting that was requested!