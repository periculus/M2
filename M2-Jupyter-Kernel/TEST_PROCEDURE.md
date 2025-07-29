# Exact Test Procedure for M2 Syntax Highlighting

## Pre-test Cleanup

1. **Stop any running JupyterLab**:
```bash
pkill -f "jupyter-lab"
```

2. **Clean JupyterLab build cache**:
```bash
cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel
jupyter lab clean --all
```

3. **Verify we're using the venv jupyter**:
```bash
which jupyter
# Should show: /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel/venv/bin/jupyter
```

## Build Steps

4. **Rebuild the extension** (already done, but let's verify):
```bash
cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel
ls -la lib/parser/parser.terms.js
# Should show recent timestamp and contain Keyword=3, Type=5, Function=7
```

5. **Build JupyterLab** (forces it to include our extension):
```bash
jupyter lab build
```

## Start JupyterLab

6. **Start with our script**:
```bash
cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel
./start_jupyter.fish
```

## Testing

7. **Open Browser Console** (F12) BEFORE creating notebook

8. **Create New Notebook**:
   - File → New → Notebook
   - Select "Macaulay2" kernel (NOT "M2")

9. **Enter Test Code** in first cell:
```m2
-- Test highlighting
if true then
    print "hello"
    
R = QQ[x,y,z]
I = ideal(x^2, y^2)
G = gb I
```

10. **Check Console** for:
    - `⚡️ M2 plugin activating at [timestamp]`
    - `JupyterLab M2 CodeMirror extension activated!`
    - `🔍 M2 DebugHighlighter: Analyzing syntax tree...`
    - `✅ Keywords detected: N`
    - `✅ Types detected: N`
    - `✅ Functions detected: N`

11. **Inspect DOM**:
    - Right-click on "if" → Inspect Element
    - Should see `<span class="cm-keyword">if</span>`
    - Check if blue/bold styling is applied

## What We're Testing

- **Extension Path**: `/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel`
- **Parser**: New parser with @specialize nodes (Keyword=3, Type=5, Function=7)
- **Jupyter**: From venv (`/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel/venv/bin/jupyter`)
- **Kernel**: "Macaulay2" (not "M2")

## Expected Results

1. Console shows successful parsing with correct node counts
2. DOM shows correct CSS classes (cm-keyword, cm-typeName, cm-functionName)
3. Visual highlighting: keywords blue/bold, types teal, functions purple

## If It Doesn't Work

Report:
1. Any errors in console
2. What the debug plugin reports
3. What CSS classes are on the spans
4. Screenshot of the code cell

## Quick Verification Commands

```bash
# Check parser has correct nodes
grep -A5 "export const" lib/parser/parser.terms.js

# Check extension is listed
jupyter labextension list | grep m2

# Check which jupyter
which jupyter
```