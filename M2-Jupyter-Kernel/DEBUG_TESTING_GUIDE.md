# M2 Syntax Highlighting Debug Testing Guide

This guide shows how to test the enhanced debugging features we've added to track down the syntax highlighting issue.

## 1. Standalone Test (Outside JupyterLab)

First, test the parser in isolation:

```bash
# Open the standalone test page in your browser
open standalone_test.html
```

In the browser:
1. Open DevTools (F12)
2. Inspect the code elements
3. Check if spans have the correct CSS classes:
   - Keywords (`if`, `then`, `else`) → `class="cm-keyword"`
   - Types (`QQ`, `ZZ`, `RR`) → `class="cm-typeName"`
   - Functions (`ideal`, `gb`, `res`) → `class="cm-functionName"`

**If highlighting works here**, the parser is correct and the issue is in JupyterLab.
**If not**, there's a problem with the grammar or parser.

## 2. JupyterLab Debug Test

Start JupyterLab and watch the console:

```bash
# Kill any existing JupyterLab
pkill -f "jupyter-lab"

# Start fresh
./start_jupyter.fish
```

### Console Messages to Look For

1. **Timing**: `⚡️ M2 plugin activating at 2025-07-28T...`
2. **Activation**: `JupyterLab M2 CodeMirror extension activated!`
3. **Language Support**: `Created language support: {...}`
4. **Registration**: `Language registered successfully`
5. **Verification**: `Verified: macaulay2 language is registered`
6. **Refresh Check**: Either `✅ Editors refreshed` or `⚠️ refreshAll method not available`

### Test in a Notebook

1. Create/open a notebook with M2 kernel
2. Type some M2 code:
```m2
-- Keywords
if true then print "hello"

-- Types
R = QQ[x,y,z]

-- Functions
I = ideal(x^2, y^2)
```

3. **Watch the console** for debug output:
   - `🔍 M2 DebugHighlighter: Analyzing syntax tree...`
   - Token listings: `Token: "if" → type: Keyword`
   - Summary: `✅ Keywords detected: N` or `❌ No keywords detected!`

## 3. DOM and CSS Inspection

While in JupyterLab with M2 code:

1. Right-click on a keyword (like `if`) → Inspect Element
2. Check the `<span>` element:
   - Does it have `class="cm-keyword"`?
   - What CSS rules are applied in the Styles panel?
   - Is the color being overridden?

3. Check our custom styles are loaded:
   - Look for rules from `m2-highlighting.css`
   - Should see blue keywords, teal types, purple functions
   - Debug borders should appear under tokens

## 4. Troubleshooting Based on Results

### If Standalone Works but JupyterLab Doesn't:

**A. No Debug Output in Console**
- Extension might not be loading
- Check: `jupyter labextension list`
- Rebuild: `jupyter lab clean --all && jupyter lab build`

**B. Debug Shows "No keywords detected"**
- Parser isn't recognizing tokens
- Check `lib/parser/parser.terms.js` has correct tokens
- Regenerate: `npx lezer-generator src/parser/m2.grammar -o src/parser/parser.js`

**C. Tokens Detected but No Highlighting**
- Theme issue - CSS not applied
- Check DOM for correct classes
- Verify CSS is loaded

**D. Wrong Token Types**
- If you see `Token: "if" → type: Identifier` instead of `Keyword`
- Grammar precedence issue
- Parser not matching correctly

### Quick Fixes to Try:

1. **Force Refresh**: After notebook loads, run in console:
   ```javascript
   // In browser console
   jupyterlab.commands.execute('notebook:refresh')
   ```

2. **Check MIME Type**: In notebook metadata, ensure:
   ```json
   "language_info": {
     "mimetype": "text/x-macaulay2"
   }
   ```

3. **Test Fresh Notebook**: Create new notebook AFTER extension loads

## 5. Debug Flag

To disable verbose logging, edit `src/m2Language.ts`:
```typescript
const DEBUG = false;  // Change from true to false
```
Then rebuild the extension.

## Summary Checklist

- [ ] Standalone test shows correct highlighting
- [ ] Extension loads (timing message appears)
- [ ] Language registered (verification message)
- [ ] Debug plugin runs (syntax tree analysis)
- [ ] Correct tokens detected (Keywords: ✅)
- [ ] DOM shows correct CSS classes
- [ ] Custom styles are applied

Report which step fails to pinpoint the exact issue!