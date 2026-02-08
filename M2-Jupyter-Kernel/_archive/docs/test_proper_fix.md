# Test Proper Fix

## How to Test

1. Restart JupyterLab (kill current process and run again)
2. Open or create a notebook with `.m2` kernel
3. Type test code:
```m2
-- Test keywords (should be BLUE)
if true then print "hello"
for i in {1,2,3} do print i

-- Test types (should be TEAL)
R = QQ[x,y,z]
I : Ideal

-- Test functions (should be PURPLE)
matrix {{1,2},{3,4}}
ideal(x^2, y^2)
```

## What to Look For

1. Keywords (if, then, for, do) should be **BLUE** not green
2. Types (QQ, Ideal) should be **TEAL**
3. Functions (matrix, ideal, print) should be **PURPLE**

## Browser Console

Check browser console for:
- "M2 CodeMirror extension activating..."
- "M2 language registered successfully"
- "M2 color overrides applied"
- "Keywords will be blue (not green like Python)"

## If Still Green

The fix patches the webpack bundle to:
1. Use parser highlighting (like Python)
2. Add CSS overrides for M2-specific colors

This means M2 cells get blue keywords while Python cells stay green.

## Implementation Details

The proper fix:
- Removes HighlightStyle.define() which doesn't work with themes
- Uses parser's built-in highlighting via propSources (like Python)
- Injects CSS with `[data-language="macaulay2"]` selector
- This makes M2 cells blue while preserving Python's green