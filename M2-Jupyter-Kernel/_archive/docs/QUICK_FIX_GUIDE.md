# Quick Fix Guide for M2 Syntax Highlighting

## Immediate Fix (5 minutes)

If you need highlighting working RIGHT NOW while the proper fixes are being implemented:

### Option 1: Use the Fix Script
```bash
./RUN_TEST_WITH_FIXES.sh
```
This script automatically applies the necessary fixes after building.

### Option 2: Manual Fix After Starting JupyterLab

1. Start JupyterLab normally:
```bash
./RUN_TEST_NOW.sh
```

2. Once JupyterLab is running, open the browser console (F12)

3. Paste this fix:
```javascript
// Fix 1: Override theme colors
const style = document.createElement('style');
style.textContent = `
.cm-keyword, .ͼs { 
  color: #0000ff !important; 
  font-weight: bold !important; 
}
.cm-typeName { 
  color: #008080 !important; 
  font-weight: 500 !important; 
}
.cm-functionName, .cm-variableName.cm-function { 
  color: #800080 !important; 
}
.cm-comment, .cm-lineComment { 
  color: #808080 !important; 
  font-style: italic !important; 
}
.cm-number { color: #ff8c00 !important; }
.cm-string { color: #008000 !important; }
`;
document.head.appendChild(style);

// Fix 2: Apply content-based highlighting
function fixHighlighting() {
  const keywords = ['if', 'then', 'else', 'for', 'while', 'do', 'return', 'break', 'continue'];
  const types = ['Ring', 'Ideal', 'Matrix', 'Module', 'ZZ', 'QQ', 'RR', 'CC', 'List'];
  const functions = ['gb', 'res', 'ideal', 'matrix', 'ring', 'map', 'ker', 'coker'];
  
  document.querySelectorAll('.cm-content span').forEach(span => {
    const text = span.textContent.trim();
    if (keywords.includes(text)) {
      span.style.color = '#0000ff';
      span.style.fontWeight = 'bold';
    } else if (types.includes(text)) {
      span.style.color = '#008080';
    } else if (functions.includes(text)) {
      span.style.color = '#800080';
    }
  });
}

// Apply fixes
fixHighlighting();
setInterval(fixHighlighting, 1000);
console.log('M2 highlighting fixes applied!');
```

4. Your M2 code should now have proper colors:
   - Keywords: Blue
   - Types: Teal
   - Functions: Purple
   - Comments: Gray

## Understanding the Problem

The green highlighting happens because:
1. JupyterLab's theme CSS sets `--jp-mirror-editor-keyword-color: #008000` (green)
2. Our extension uses these CSS variables instead of hardcoded colors
3. The `jupyter lab build` command rebuilds from source, overwriting manual fixes

## Permanent Solution (In Progress)

The proper fix requires:
1. Updating the CodeMirror extension to use hardcoded colors
2. Fixing the parser to properly distinguish token types
3. Rebuilding the extension with these fixes
4. Proper packaging to prevent theme interference

See `M2_HIGHLIGHTING_IMPLEMENTATION_PLAN.md` for the complete solution roadmap.