# M2 Syntax Highlighting Architecture

## Overview

This document outlines the complete architecture for M2 (Macaulay2) syntax highlighting in JupyterLab, including all files, their roles, and the build/deployment process.

## Component Architecture

### 1. Language Parser (Lezer)

**Files:**
- `src/parser/m2.grammar` - The Lezer grammar definition
- `src/parser/m2-updated.grammar` - Updated grammar with proper syntax nodes
- `src/parser/parser.js` - Generated parser (built from grammar)
- `src/parser/parser.terms.js` - Parser terminal definitions

**Role:** Defines the M2 language syntax and generates a parser that can identify:
- Keywords (`if`, `then`, `else`, `do`, `while`, etc.)
- Types (`QQ`, `ZZ`, `RR`, `Ring`, `Matrix`, etc.)
- Functions (`ideal`, `gb`, `res`, `matrix`, `print`, etc.)
- Comments, strings, numbers, operators

**Key Innovation:** Uses `@specialize` directives to create proper syntax nodes instead of lexical tokens, enabling style application.

### 2. CodeMirror Language Support

**Files:**
- `src/m2Language.ts` - Language support configuration
- `lib/m2Language.js` - Compiled JavaScript version

**Role:** 
- Creates the CodeMirror 6 `LanguageSupport` object
- Maps parser nodes to CodeMirror highlight tags
- Configures language features (comment tokens, bracket matching)

**Key Configuration:**
```typescript
styleTags({
  "Keyword/Keyword": t.keyword,
  "Type/Type": t.typeName,
  "Function/Function": t.function(t.name),
  // ... more mappings
})
```

### 3. JupyterLab Extension

**Files:**
- `src/index.ts` - Extension entry point
- `lib/index.js` - Compiled JavaScript version
- `package.json` - Extension metadata and configuration

**Role:**
- Registers the M2 language with JupyterLab's CodeMirror registry
- Provides language metadata (MIME type, file extensions)
- Integrates with JupyterLab's extension system

### 4. Styling

**Files:**
- `style/index.css` - Main extension styles
- `style/m2-highlighting.css` - Token-specific highlighting styles

**Role:** Defines visual appearance for each token type:
- Keywords: Blue and bold
- Types: Teal
- Functions: Purple
- Comments: Gray and italic
- Strings: Green
- Numbers: Dark orange

### 5. Build Configuration

**Files:**
- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Webpack bundling configuration
- `.babelrc` - Babel transpilation settings
- `pyproject.toml` - Python package configuration
- `jupyterlab-m2-codemirror/` - Symlink for development

**Role:** Configure the build process for:
- TypeScript compilation
- Webpack bundling with node polyfills
- JupyterLab federated module generation

### 6. Testing Files

**Files:**
- `test_parser_roundtrip.js` - Parser validation
- `test_parser_minimal.js` - Minimal parser test
- `test_minimal_codemirror.html` - Standalone CodeMirror test
- `test_css_injection.html` - CSS visualization test
- `test_highlighting.ipynb` - Jupyter notebook for testing
- `RUN_HIGHLIGHTING_TEST.sh` - Automated test script

**Role:** Verify each component works correctly in isolation and together.

## Build Process

### 1. Parser Generation
```bash
cd codemirror-lang-m2
npm run build
# This runs: lezer-generator src/m2.grammar -o src/parser.js
```

### 2. Extension Build
```bash
# Compile TypeScript
npm run build:lib
# or: tsc --sourceMap

# Build JupyterLab extension
npm run build:labextension:dev
# or: jupyter labextension build --development True .
```

### 3. Complete Build Script
```bash
./build_m2_extension.sh
```
This script:
1. Builds the parser in `codemirror-lang-m2/`
2. Compiles TypeScript files
3. Builds the JupyterLab extension
4. Creates the federated module bundle

## JupyterLab Setup Process

### 1. Extension Installation
The extension is installed as a Python package:
```bash
pip install -e .
```
This creates a symlink in the JupyterLab extensions directory.

### 2. JupyterLab Build
```bash
# Clean any existing build
jupyter lab clean --all

# Build JupyterLab with the extension
jupyter lab build
```

### 3. Verification
```bash
# List installed extensions
jupyter labextension list
# Should show: @m2-jupyter/jupyterlab-m2-codemirror
```

## How It All Works Together

1. **Parser Phase**: When code is entered, the Lezer parser tokenizes it into syntax nodes (Keyword, Type, Function, etc.)

2. **Highlighting Phase**: CodeMirror applies CSS classes based on the style tags mapping:
   - `Keyword` nodes → `cm-keyword` class
   - `Type` nodes → `cm-typeName` class
   - `Function` nodes → `cm-function` class

3. **Rendering Phase**: The CSS rules in our stylesheets color these classes appropriately

4. **Integration Phase**: JupyterLab's CodeMirror registry ensures our language support is used for:
   - Files with `.m2` extension
   - Cells with MIME type `text/x-macaulay2`
   - Notebooks with Macaulay2 kernel

## File Structure Summary

```
M2-Jupyter-Kernel/
├── src/
│   ├── index.ts                    # Extension entry point
│   ├── m2Language.ts              # Language support
│   └── parser/
│       ├── m2.grammar             # Original grammar
│       ├── m2-updated.grammar     # Fixed grammar
│       ├── parser.js              # Generated parser
│       └── parser.terms.js        # Parser terms
├── lib/                           # Compiled JavaScript
├── style/
│   ├── index.css                  # Main styles
│   └── m2-highlighting.css        # Token styles
├── codemirror-lang-m2/           # Parser package
│   ├── src/
│   │   └── m2.grammar            # Grammar source
│   └── package.json
├── @m2_jupyter/
│   └── jupyterlab_m2_codemirror/
│       └── labextension/         # Built extension
├── package.json                  # Extension metadata
├── tsconfig.json                 # TypeScript config
├── webpack.config.js             # Webpack config
├── pyproject.toml               # Python package
└── build_m2_extension.sh        # Build script
```

## Current Status

- ✅ Parser correctly identifies M2 syntax elements
- ✅ Extension loads in JupyterLab without errors
- ✅ Language is registered with correct MIME type
- ✅ CSS styles are defined for all token types
- ⚠️ Syntax highlighting not yet visible in editor (debugging in progress)

## Next Steps

1. Debug why CodeMirror 6 styles aren't being applied in JupyterLab
2. Investigate potential theme conflicts
3. Consider adding a custom CodeMirror theme
4. Test with different JupyterLab versions