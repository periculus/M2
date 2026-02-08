# M2 Syntax Highlighting Fix Guide

## Overview
The M2 syntax highlighting in JupyterLab has several issues that need to be addressed. This document outlines the problems and their solutions.

## Current Issues

### 1. CSS Theme Variable Override Issue
**Problem**: JupyterLab's theme sets `--jp-mirror-editor-keyword-color: #008000` (green), which overrides our intended blue color for keywords.

**Location**: 
- Source: `/style/index.css`
- Bundled: `static/style_index_css.*.js`

**Fix Required**:
```css
/* Instead of using theme variables */
.cm-keyword {
  color: var(--jp-mirror-editor-keyword-color, #0000ff) !important;
}

/* Use hardcoded colors */
.cm-keyword {
  color: #0000ff !important;
  font-weight: bold !important;
}
```

### 2. Debug Parser Bundle Issue
**Problem**: The webpack bundle contains a debug version of the parser that marks ALL tokens as keywords.

**Location**: 
- Source: `/lib/parser/highlight.js`
- Bundled: `static/lib_index_js.*.js`

**Current (Wrong) Code**:
```javascript
const m2Highlighting = styleTags({
  "Program": tags.keyword,
  "Keyword": tags.keyword,
  "Type": tags.keyword,
  "Function": tags.keyword,
  // Everything is keyword!
})
```

**Fix Required**:
```javascript
const m2Highlighting = styleTags({
  "Keyword": tags.keyword,
  "Type": tags.typeName,
  "Function": tags.function(tags.variableName),
  "Boolean": tags.bool,
  "Null": tags.null,
  "identifier": tags.variableName,
  "Number": tags.number,
  "String": tags.string,
  "LineComment": tags.lineComment,
  "BlockComment": tags.blockComment,
  "Operator": tags.operator,
  "Delimiter": tags.punctuation
})
```

### 3. Parser Limitations
**Problem**: The Lezer parser uses `@specialize` which only highlights exact token matches from the spec_identifier list.

**Current Behavior**:
- Only highlights: `if`, `then`, `else`, `ZZ`, `QQ`, `gb`, `res`, etc. (predefined tokens)
- Does NOT highlight: user-defined variables like `R`, `A`, `x`, `y`

**Fix Options**:
1. Extend the parser grammar to properly parse M2 syntax
2. Use a post-processing approach to identify token types
3. Create a more sophisticated tokenizer

## Complete Fix Process

### Step 1: Fix the Source Files
```bash
# 1. Update CSS to use hardcoded colors
vim style/index.css
# Change all color: var(...) to hardcoded colors

# 2. Update parser highlight.js
vim src/parser/highlight.js
# Ensure proper tag mappings (not all keywords)

# 3. Copy to lib directory
cp src/parser/highlight.js lib/parser/highlight.js
```

### Step 2: Rebuild the Extension
```bash
# Navigate to extension directory
cd @m2_jupyter/jupyterlab_m2_codemirror

# Clean old builds
rm -rf labextension/static/*

# Install dependencies
npm install

# Build TypeScript
npx tsc

# Build webpack bundle
npx webpack --config webpack.config.js

# Or use the npm script
npm run build
```

### Step 3: Deploy the Fixed Extension
```bash
# Copy to JupyterLab extension directory
cp -r labextension/* ../../venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/

# Clear JupyterLab cache
jupyter lab clean --all

# Rebuild JupyterLab
jupyter lab build
```

### Step 4: Verify the Fix
1. Start JupyterLab: `jupyter lab`
2. Create an M2 notebook
3. Check browser console for "M2 CodeMirror extension activating..."
4. Verify colors:
   - Keywords (if, for, while) → Blue (#0000ff)
   - Types (Ring, Matrix, ZZ) → Teal (#008080)
   - Functions (gb, ideal, res) → Purple (#800080)
   - Comments → Gray (#808080)
   - Variables → Default color

## Temporary Workarounds

### 1. CSS Injection (Browser Console)
```javascript
// Paste in browser console
const style = document.createElement('style');
style.textContent = `
.cm-keyword, .ͼs { color: #0000ff !important; }
.cm-typeName { color: #008080 !important; }
.cm-functionName { color: #800080 !important; }
`;
document.head.appendChild(style);
```

### 2. Manual Bundle Edit
```python
# Run fix_parser_bundle.py to patch the webpack bundle
python fix_parser_bundle.py
```

## Root Causes Summary

1. **JupyterLab Rebuild Issue**: The `./RUN_TEST_NOW.sh` script runs `jupyter lab clean --all` followed by `jupyter lab build`, which rebuilds extensions from the source in `@m2_jupyter/jupyterlab_m2_codemirror/labextension/`, overwriting any manual fixes to the bundles
2. **CSS Load Order**: Theme CSS loads after extension CSS, overriding colors with theme variables
3. **Parser Complexity**: Lezer parser requires complex grammar for full language support
4. **Build Process**: Multiple build steps (TypeScript → Webpack → JupyterLab) make debugging difficult

## Quick Fix After Build

Run `./RUN_TEST_WITH_FIXES.sh` instead of `./RUN_TEST_NOW.sh`. This script:
1. Cleans and rebuilds JupyterLab (like RUN_TEST_NOW.sh)
2. Applies the parser and CSS fixes to the webpack bundles
3. Starts JupyterLab with correct highlighting

## Permanent Solution Requirements

1. **Proper Build Pipeline**:
   - Set up proper webpack configuration
   - Ensure CSS is bundled with `!important` flags
   - Version bump to force cache invalidation

2. **Parser Enhancement**:
   - Implement full M2 grammar in Lezer
   - Add contextual parsing for variables
   - Support M2-specific constructs

3. **CSS Isolation**:
   - Use CSS modules or styled-components
   - Ensure styles cannot be overridden by themes
   - Add explicit z-index/specificity management

## Testing Checklist

- [ ] Keywords highlight in blue
- [ ] Types highlight in teal  
- [ ] Functions highlight in purple
- [ ] Comments highlight in gray
- [ ] Numbers highlight appropriately
- [ ] Strings highlight appropriately
- [ ] User variables are visible (even if not highlighted)
- [ ] No console errors
- [ ] Extension loads on startup
- [ ] Highlighting persists after page refresh

## Known Limitations

1. Output cells do not have syntax highlighting (JupyterLab default)
2. User-defined variables are not highlighted (parser limitation)
3. Complex M2 constructs may not parse correctly
4. Some operators may not be recognized

## Next Steps

1. Create proper webpack configuration for production builds
2. Implement comprehensive Lezer grammar for M2
3. Add output cell syntax highlighting
4. Create automated tests for highlighting
5. Package as proper JupyterLab extension with PyPI distribution