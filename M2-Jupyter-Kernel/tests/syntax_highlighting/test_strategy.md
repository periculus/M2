# M2 Syntax Highlighting Test Strategy

## Problem Statement
Only basic tokens (numbers, strings, comments) are being highlighted, but language features (keywords, types, functions) are not getting proper styling despite the parser recognizing them correctly.

## Testing Approach

### 1. Automated Browser Testing
- Use Playwright for cross-browser testing
- Programmatically interact with JupyterLab
- Capture DOM states and console logs

### 2. Parser Verification
- Test parser output independently
- Verify token recognition
- Compare AST structures

### 3. CSS and DOM Analysis
- Extract applied CSS classes
- Check style computation
- Verify class inheritance

### 4. Integration Testing
- End-to-end workflow testing
- Visual regression testing
- Performance monitoring

## Key Questions to Answer

1. **Parser Output**: Is the parser correctly identifying keywords/types/functions?
2. **DOM Classes**: Are the correct CSS classes being applied to tokens?
3. **CSS Loading**: Are our styles actually loaded and not overridden?
4. **Theme Integration**: Is JupyterLab's theme system interfering?
5. **Extension Loading**: Is our language support being used for M2 cells?

## Test Implementation Plan

### Phase 1: Parser Unit Tests
- Verify parser generates correct node types
- Test all token categories
- Check nested node structure

### Phase 2: Browser Automation
- Launch JupyterLab with Playwright
- Create M2 notebook
- Type test code
- Capture DOM and styles

### Phase 3: Debugging Tools
- Console log injection
- DOM mutation observer
- Style computation tracker
- Network request monitor

### Phase 4: Reporting
- HTML report with screenshots
- Token classification table
- Style inheritance diagram
- Performance metrics