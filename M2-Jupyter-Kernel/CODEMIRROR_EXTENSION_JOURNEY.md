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

## Recent Issues and Debugging (July 2025)

### 6. Keywords and Types Not Highlighting in Live Editor

**Problem**: After successful installation, only partial highlighting works
- Comments (gray), strings (red), numbers, and some functions (`ideal`) are highlighted
- Keywords (`if`, `then`, `else`, `for`) show as plain text
- Types (`QQ`, `ZZ`, `RR`, `CC`, `Ring`) show as plain text
- HTML exports via Pygments show correct highlighting, but live editor doesn't

**Symptoms**:
- Extension loads ("JupyterLab M2 CodeMirror extension activated!" in console)
- Language registration verification message doesn't appear
- Syntax errors with line endings (`syntax error at 'else'\n`)

**Investigation Steps**:
1. **Parser File Synchronization**:
   - Discovered `lib/parser/` files were outdated
   - Still had generic "Word" tokens instead of specific Keyword/Type/Function tokens
   - Manually copied updated parser files: `cp src/parser/*.js lib/parser/`

2. **Enhanced Extension Debugging**:
   ```typescript
   // Added detailed logging to track registration
   console.log('Created language support:', languageSupport);
   console.log('Language support structure:', {
     'has language': !!languageSupport.language,
     'has support': !!languageSupport.support,
     'language name': languageSupport.language?.name
   });
   ```

3. **Multiple Language Variants**:
   - Registered multiple variants: `macaulay2`, `m2`, `Macaulay2`, `M2`
   - Different kernels might use different identifiers
   - Added timeout-based verification to check registration

4. **Line Ending Issues**:
   - User reported syntax errors with `\n` characters
   - Suggests parser might have CR/LF handling issues
   - M2 kernel shows errors like: `error: syntax error at 'else'\n`

**Current Status**:
- Extension loads but language registration might be incomplete
- Basic highlighting works (comments, strings, numbers)
- Specific token types (keywords, types) not recognized
- Verification message doesn't appear in console

### 7. Build System Complexities

**Problem**: Yarn/npm conflicts in build process
- `jlpm` (JupyterLab's yarn) shows workspace configuration errors
- Had to use direct commands instead of npm scripts

**Solution**: Use explicit build commands
```bash
npx tsc --skipLibCheck --esModuleInterop
jupyter labextension build --dev-build
```

### 8. Extension Architecture Insights

**Key Discoveries**:
1. **Token Definition Location**: Parser tokens must be defined in multiple places:
   - `src/parser/m2.grammar` - Grammar definition
   - `src/parser/parser.terms.js` - Token constants
   - `lib/parser/` - Compiled versions must match

2. **Language Registration**: Must register with exact MIME type matching kernel:
   - Kernel reports: `mimetype: 'text/x-macaulay2'`
   - Extension must register same MIME type
   - CodeMirror mode name must match

3. **Debugging Approach**: Added comprehensive logging:
   - Language support creation
   - Registration attempts
   - Post-registration verification
   - Widget inspection for active notebooks

## Debugging Checklist

When syntax highlighting doesn't work:

1. **Check Parser Files**:
   ```bash
   # Ensure lib matches src
   diff src/parser/parser.terms.js lib/parser/parser.terms.js
   ```

2. **Verify Extension Loading**:
   - Open browser console (F12)
   - Look for "JupyterLab M2 CodeMirror extension activated!"
   - Check for any error messages

3. **Test Basic Elements**:
   - Comments should be gray
   - Strings should be red
   - Numbers should be colored
   - If these work, parser is loading

4. **Check Language Registration**:
   - Look for "Verified: macaulay2 language is registered"
   - If missing, registration might have failed

5. **Kernel Configuration**:
   - Verify kernel shows as "Macaulay2" (not "M2")
   - Check notebook metadata has correct `codemirror_mode`

## Success Metrics

✅ Live syntax highlighting in JupyterLab
⚠️  Recognition of M2 keywords, types, and functions (partially working)
✅ Proper comment and string handling
✅ Integration with M2 kernel
✅ Easy installation via pip
⚠️  Full token recognition (keywords/types need fixing)

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

## Test Files Created

During debugging, several test files were created:

1. **`debug_codemirror.ipynb`** - Test notebook with M2 code samples
2. **`test_syntax.ipynb`** - Clean test notebook for syntax highlighting
3. **`SYNTAX_HIGHLIGHTING_DEBUG.md`** - Debug summary and checklist
4. **`test_fixed_issues.html`** - HTML export showing Pygments works correctly

## Conclusion

The journey from a failing standard extension to a working federated extension taught valuable lessons about JupyterLab's architecture, CodeMirror 6's capabilities, and the importance of proper development environment setup. The federated extension approach proved to be the key to success, allowing us to bypass webpack configuration limitations and create a functional M2 syntax highlighting extension.

However, as of July 2025, the extension still has issues with recognizing specific token types (keywords and types) in the live editor, despite the parser being correctly configured. The investigation continues to determine why the language registration isn't completing successfully and why the verification messages don't appear in the console.