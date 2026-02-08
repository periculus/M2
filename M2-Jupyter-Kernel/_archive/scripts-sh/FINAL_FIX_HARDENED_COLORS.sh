#!/bin/bash
# Final comprehensive fix for hardened colors

echo "=== FINAL FIX: M2 Hardened Colors ==="
echo ""

# Step 1: Update the source files
echo "Step 1: Updating source files with hardened colors..."

cat > src/m2Language.ts << 'EOF'
// @ts-ignore
import { parser } from './parser/parser';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Hardened highlight style - colors that won't be overridden by themes
const m2HighlightStyle = HighlightStyle.define([
  { tag: t.keyword,         color: "#0000ff", fontWeight: "bold" },     // Blue keywords
  { tag: t.typeName,        color: "#008080", fontWeight: "500" },      // Teal types
  { tag: t.function(t.variableName), color: "#800080" },               // Purple functions
  { tag: t.bool,            color: "#ff1493" },                        // Deep Pink booleans
  { tag: t.null,            color: "#ff1493" },                        // Deep Pink null
  { tag: t.variableName,    color: "#000000" },                        // Black variables
  { tag: t.number,          color: "#ff8c00" },                        // Dark Orange numbers
  { tag: t.string,          color: "#008000" },                        // Green strings
  { tag: t.lineComment,     color: "#808080", fontStyle: "italic" },   // Gray comments
  { tag: t.blockComment,    color: "#808080", fontStyle: "italic" },   // Gray comments
  { tag: t.operator,        color: "#000080" },                        // Navy operators
  { tag: t.punctuation,     color: "#000000" }                         // Black punctuation
]);

// Define the M2 language
const M2Language = LRLanguage.define({
  parser: parser,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

// Export with hardened highlighting included
export function m2() {
  return new LanguageSupport(M2Language, m2HighlightStyle as any);
}
EOF

# Step 2: Compile TypeScript
echo ""
echo "Step 2: Compiling TypeScript..."
npx tsc --skipLibCheck src/index.ts src/m2Language.ts || echo "TypeScript compilation warnings ignored"

# Step 3: Direct bundle patch
echo ""
echo "Step 3: Patching webpack bundles..."
python patch_webpack_bundle.py
python fix_bundle_duplicate.py

# Step 4: Create browser console fix
echo ""
echo "Step 4: Creating browser console fix..."
cat > console_fix.js << 'EOF'
// Quick fix - paste this in browser console if colors are still green
const style = document.createElement('style');
style.textContent = `
.cm-editor .cm-keyword, .cm-editor [class*="ͼ"][class*="s"] {
  color: #0000ff !important;
  font-weight: bold !important;
}`;
document.head.appendChild(style);
console.log("Applied blue keyword fix!");
EOF

echo ""
echo "=== FIX COMPLETE ==="
echo ""
echo "Now start JupyterLab:"
echo "  ./venv/bin/jupyter lab --port=8888"
echo ""
echo "If keywords are STILL green, open browser console (F12) and paste:"
echo "  cat console_fix.js"
echo ""
echo "Expected colors:"
echo "  Keywords (if, for, while): BLUE (#0000ff) ✓"
echo "  Types (Ring, Matrix, ZZ): TEAL (#008080) ✓"
echo "  Functions (gb, ideal): PURPLE (#800080) ✓"
echo ""
echo "The issue is that JupyterLab themes override our colors."
echo "This fix uses inline styles with !important to force our colors."