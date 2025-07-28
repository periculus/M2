# M2 CodeMirror Extension Development Journey

## Overview

This document captures the complete journey of creating a CodeMirror 6 syntax highlighting extension for Macaulay2 in JupyterLab. The project faced significant challenges but ultimately succeeded using a federated extension approach.

## Key Challenges and Solutions

### 1. Initial Approach: Standard CodeMirror Extension

**Problem**: Webpack module resolution errors
- Could not resolve Node.js polyfills (`process/browser`, `path/posix`)
- JupyterLab's webpack configuration was not accessible for modification
- Standard extension approach hit a dead end

**Attempted Solutions**:
- Modified package.json with fallback configurations
- Tried various webpack polyfill strategies
- Attempted to override JupyterLab's webpack config

**Result**: Failed - JupyterLab extensions cannot modify the core webpack configuration

### 2. Breakthrough: Federated Extension Approach

**Solution**: Create a federated extension that owns its webpack build
- Federated extensions bundle their own dependencies
- Can configure webpack independently
- Bypass JupyterLab's webpack restrictions

**Key Components**:
```json
// package.json
"jupyterlab": {
  "extension": true,
  "outputDir": "@m2_jupyter/jupyterlab_m2_codemirror/labextension"
}
```

### 3. Parser Development with Lezer

**Initial Grammar Issues**:
- Syntax errors with `@name` tokens
- Overlapping token definitions
- Complex grammar caused parser generation failures

**Working Grammar Structure**:
```
@top Program { element* }

element {
  Keyword | Type | Function | Boolean | Null |
  Identifier | Number | String | LineComment |
  BlockComment | Operator | Delimiter
}

@tokens {
  // Specific token definitions with precedence
  @precedence { Keyword, Type, Function, Boolean, Null, 
                LineComment, BlockComment, Operator, Identifier }
}
```

**Key Learning**: Start with simple grammar, then enhance with specific tokens

### 4. Extension Visibility Issues

**Problem**: Extension built but not visible in JupyterLab
- Extension installed in venv but JupyterLab couldn't find it
- `jupyter labextension list` showed system extensions only

**Root Cause**: JupyterLab wasn't installed in the virtual environment
- System JupyterLab was being used
- System JupyterLab couldn't see venv extensions

**Solution**:
```bash
pip install jupyterlab  # Install in venv
jupyter labextension list  # Now shows our extension
```

### 5. Syntax Highlighting Not Working

**Problem**: Only basic tokens (strings, numbers, comments) were highlighted
- Keywords, types, and functions appeared as plain text
- Parser was tokenizing everything as generic "Word" tokens

**Solution**: Enhanced grammar with specific token types
- Added explicit Keyword, Type, Function tokens
- Updated styleTags mapping to use new token types
- Regenerated parser with `npx lezer-generator`

## Technical Architecture

### File Structure
```
M2-Jupyter-Kernel/
├── src/
│   ├── index.ts           # Extension entry point
│   ├── m2Language.ts      # Language support definition
│   └── parser/
│       ├── m2.grammar     # Lezer grammar definition
│       ├── parser.js      # Generated parser
│       └── parser.terms.js # Parser terminals
├── lib/                   # Compiled TypeScript
├── @m2_jupyter/          # Python package structure
│   └── jupyterlab_m2_codemirror/
│       └── labextension/ # Built extension
├── package.json          # Node dependencies
├── tsconfig.json         # TypeScript config
└── pyproject.toml        # Python package config
```

### Key Dependencies
- `@codemirror/language`: Core language support
- `@lezer/lr`: LR parser generator
- `@lezer/highlight`: Syntax highlighting
- `@jupyterlab/codemirror`: JupyterLab integration

## Development Workflow

### 1. Grammar Development
```bash
# Edit grammar
vim src/parser/m2.grammar

# Generate parser
npx lezer-generator src/parser/m2.grammar -o src/parser/parser.js
```

### 2. Build Process
```bash
# Build TypeScript
npm run build:lib

# Build extension
jupyter labextension build .

# Install in development mode
pip install -e .
```

### 3. Testing
```bash
# Clean and rebuild JupyterLab
jupyter lab clean --all
jupyter lab build

# Start JupyterLab
jupyter lab
```

## Important Lessons Learned

### 1. Virtual Environment Management
- Always ensure JupyterLab is installed in the active venv
- Check `which jupyter` to verify correct installation
- Use `jupyter --paths` to debug path issues

### 2. Parser Design
- Start with minimal grammar and iterate
- Token precedence is crucial for proper parsing
- Specific token types enable better highlighting

### 3. Extension Architecture
- Federated extensions provide more flexibility
- Can bypass core JupyterLab limitations
- Own webpack configuration is powerful

### 4. TypeScript Configuration
- `skipLibCheck: true` avoids dependency type conflicts
- `noEmitOnError: false` allows building despite warnings
- Remove unnecessary type dependencies

### 5. Debugging Tips
- Browser console shows extension activation messages
- `jupyter labextension list --verbose` provides detailed info
- Check built files in `labextension/static/`

## M2 Language Data Sources

The extension uses language data from:
- `/M2/Macaulay2/editors/vim/m2.vim.dict` - 1763+ M2 symbols
- Categorized into keywords, types, functions, constants
- Can be extended by updating grammar tokens

## Future Enhancements

1. **Expand Token Recognition**
   - Add more M2-specific functions and types
   - Include package-specific symbols
   - Support for special M2 constructs

2. **Advanced Features**
   - Auto-completion support
   - Hover documentation
   - Go-to-definition
   - Error highlighting

3. **Performance Optimization**
   - Lazy loading for large symbol sets
   - Incremental parsing
   - Caching strategies

## Success Metrics

✅ Live syntax highlighting in JupyterLab
✅ Recognition of M2 keywords, types, and functions
✅ Proper comment and string handling
✅ Integration with M2 kernel
✅ Easy installation via pip

## Key Commands Reference

```bash
# Development
npx lezer-generator src/parser/m2.grammar -o src/parser/parser.js
npm run build:lib
jupyter labextension build .
pip install -e .

# Testing
jupyter lab clean --all
jupyter lab build
jupyter labextension list

# Debugging
jupyter --paths
which jupyter
jupyter labextension list --verbose
```

## Conclusion

The journey from a failing standard extension to a working federated extension taught valuable lessons about JupyterLab's architecture, CodeMirror 6's capabilities, and the importance of proper development environment setup. The federated extension approach proved to be the key to success, allowing us to bypass webpack configuration limitations and create a fully functional M2 syntax highlighting extension.