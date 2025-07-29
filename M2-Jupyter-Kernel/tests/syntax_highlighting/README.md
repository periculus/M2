# M2 Syntax Highlighting Test Suite

## Overview

This test suite provides comprehensive automated testing for M2 syntax highlighting in JupyterLab. It includes:

1. **Parser Unit Tests** - Verify the Lezer parser correctly identifies tokens
2. **Browser Automation** - Test highlighting in real JupyterLab using Playwright
3. **DOM Inspector** - Debug tool for analyzing CodeMirror state in the browser
4. **Automated Reporting** - Screenshots, logs, and detailed analysis

## Setup

```bash
cd tests/syntax_highlighting
npm install
npm run install-playwright
```

## Running Tests

### Full Test Suite
```bash
npm test
```

This will:
- Start JupyterLab if not running
- Run parser unit tests
- Run browser automation tests
- Generate screenshots and reports
- Create a debugging bookmarklet

### Individual Tests

```bash
# Parser tests only
npm run test:parser

# Browser tests only (requires JupyterLab running)
npm run test:browser

# Browser tests with debug mode (keeps browser open)
npm run test:debug
```

## Test Results

### Parser Tests
- Verifies token recognition for keywords, types, functions
- Outputs to console with pass/fail status
- Tests edge cases and mixed token scenarios

### Browser Tests
- Takes screenshots of highlighted code
- Extracts DOM information about applied CSS classes
- Checks if expected tokens have correct highlighting
- Saves detailed reports to `./logs/`

### Generated Files

```
./screenshots/
  - keywords.png
  - types.png
  - functions.png
  - mixed.png

./logs/
  - full_report.json
  - keywords_report.json
  - types_report.json
  - functions_report.json
  - mixed_report.json

./debugger_bookmarklet.txt
```

## Debugging

### Using the DOM Inspector

1. Open the generated `debugger_bookmarklet.txt`
2. Copy the entire content
3. Create a new bookmark in your browser with this as the URL
4. Navigate to JupyterLab with an M2 notebook
5. Click the bookmark to inject the debugger
6. Open browser console and use:
   - `debugM2()` - Analyze all CodeMirror editors
   - `debugM2CSS()` - Check CSS rules and styles
   - `debugM2Refresh()` - Force refresh editors

### What to Look For

1. **Parser Output**: Check if tokens are correctly identified
   - Keywords: if, then, else, etc.
   - Types: QQ, ZZ, Ring, etc.
   - Functions: ideal, gb, matrix, etc.

2. **CSS Classes**: Verify correct classes are applied
   - `.cm-keyword` for keywords
   - `.cm-typeName` for types
   - `.cm-function` for functions

3. **Style Computation**: Check final computed styles
   - Colors should match JupyterLab theme variables
   - Font weight/style should be applied

4. **Console Errors**: Look for any JavaScript errors
   - Extension loading errors
   - Parser errors
   - CSS loading failures

## Common Issues

### No Highlighting
- Check if extension is loaded: `jupyter labextension list`
- Verify CSS is imported in browser Network tab
- Check console for errors

### Partial Highlighting
- Only numbers/strings/comments highlighted → Parser issue
- Check parser output with unit tests
- Verify styleTags mapping

### Wrong Colors
- Check CSS specificity conflicts
- Verify JupyterLab theme variables
- Use DOM inspector to check computed styles

## Next Steps

Based on test results:

1. **If parser tests fail**: Fix grammar/highlighting configuration
2. **If browser tests fail**: Check extension integration
3. **If both pass but no highlighting**: Deep dive with DOM inspector

The test suite provides comprehensive data to diagnose and fix highlighting issues.