# M2 Syntax Highlighting Guide for JupyterLab

This guide explains how to enable full syntax highlighting for Macaulay2 in JupyterLab.

## Overview

We've created a comprehensive syntax highlighting system for M2 that includes:

1. **CodeMirror 6 Language Package** (`codemirror-lang-m2/`): Core language support
2. **JupyterLab Extension** (`jupyterlab-m2/`): Integration with JupyterLab
3. **Pygments Lexer**: Server-side highlighting (already included in kernel)

## Installation

### Option 1: Automated Installation (Recommended)

Run the build script from the M2-Jupyter-Kernel directory:

```bash
cd /path/to/M2-Jupyter-Kernel
./build_m2_extension.sh
```

Then restart JupyterLab.

### Option 2: Manual Installation

1. **Build the CodeMirror language package:**
   ```bash
   cd codemirror-lang-m2
   npm install
   npm run build
   ```

2. **Build the JupyterLab extension:**
   ```bash
   cd ../jupyterlab-m2
   npm install
   npm run build
   ```

3. **Install the extension:**
   ```bash
   pip install -e .
   jupyter labextension develop . --overwrite
   ```

4. **Restart JupyterLab**

## Verification

To verify the installation:

1. Run: `jupyter labextension list`
   - You should see `jupyterlab-m2` in the list

2. Open JupyterLab and create a new M2 notebook
   - Code should be syntax highlighted with:
     - Keywords in bold (if, then, else, for, while, etc.)
     - Types in a distinct color (Ring, Ideal, Matrix, etc.)
     - Functions in another color (gb, res, ideal, etc.)
     - Comments in italics
     - Strings and numbers highlighted appropriately

## Features

The syntax highlighting includes:

- **1763+ M2 symbols** from the official vim dictionary
- **Categorized highlighting**:
  - Keywords (30): control flow, declarations
  - Types (802): all M2 types
  - Functions (928): built-in functions
  - Constants (3): pi, ii, infinity
- **Smart indentation** for code blocks
- **Bracket matching** for parentheses, brackets, braces
- **Code folding** for lists, arrays, hash tables
- **Basic autocomplete** for all M2 symbols

## Troubleshooting

### Extension not loading

1. Check that the extension is installed:
   ```bash
   jupyter labextension list
   ```

2. Check browser console for errors:
   - Open Developer Tools (F12)
   - Look for errors mentioning "m2" or "macaulay2"

3. Try rebuilding:
   ```bash
   cd jupyterlab-m2
   npm run clean:all
   npm install
   npm run build
   jupyter labextension develop . --overwrite
   ```

### Syntax highlighting not working

1. Ensure the kernel is running (check kernel indicator in notebook)
2. Try creating a new notebook
3. Check that language is set to "Macaulay2" (bottom right of notebook)

### Development mode

For development, you can watch for changes:

```bash
cd jupyterlab-m2
npm run watch
```

Then in another terminal:
```bash
jupyter lab --watch
```

## Technical Details

### Architecture

1. **Lezer Grammar** (`m2.grammar`): Defines M2 syntax rules
2. **Token Classification** (`tokens.ts`): Lists all M2 symbols by category  
3. **Highlighting Rules** (`highlight.ts`): Maps tokens to styles
4. **Language Support** (`index.ts`): Configures CodeMirror features
5. **JupyterLab Plugin** (`jupyterlab-m2/src/index.ts`): Registers with JupyterLab

### Adding New Keywords/Functions

To add new M2 symbols:

1. Edit `codemirror-lang-m2/src/tokens.ts`
2. Add to appropriate array (keywords, types, functions, constants)
3. Rebuild: `npm run build`
4. Reload JupyterLab

## Future Enhancements

Planned improvements:

1. **Context-aware autocomplete**: Suggest relevant completions based on context
2. **Hover documentation**: Show help on hover
3. **Go-to-definition**: Navigate to symbol definitions
4. **Error highlighting**: Show syntax errors inline
5. **Code formatting**: Auto-format M2 code

## Contributing

To contribute improvements:

1. Fork the repository
2. Make changes in `codemirror-lang-m2/` or `jupyterlab-m2/`
3. Test thoroughly
4. Submit a pull request

## License

MIT License - same as M2-Jupyter-Kernel