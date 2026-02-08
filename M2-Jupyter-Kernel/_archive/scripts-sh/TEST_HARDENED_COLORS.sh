#!/bin/bash
# Test script with hardened colors implementation

echo "=== M2 Syntax Highlighting Test with Hardened Colors ==="
echo ""
echo "This script will:"
echo "1. Ensure hardened colors are in the extension"
echo "2. Start JupyterLab for testing"
echo ""

# Add the hardened m2Language.js to the bundle
echo "Injecting hardened highlight styles into extension..."

# Create a temporary patch script
cat > inject_hardened_styles.js << 'EOF'
// Inject hardened styles into m2Language
const fs = require('fs');
const path = require('path');

// Find the m2Language.js file
const libPath = path.join(__dirname, 'lib/m2Language.js');
if (fs.existsSync(libPath)) {
  let content = fs.readFileSync(libPath, 'utf8');
  
  // Check if already has hardened styles
  if (!content.includes('#0000ff')) {
    console.log('Adding hardened styles to m2Language.js...');
    
    // Add import for HighlightStyle
    if (!content.includes('HighlightStyle')) {
      content = `import { HighlightStyle } from "@codemirror/language";\nimport { tags as t } from "@lezer/highlight";\n` + content;
    }
    
    // Add hardened style definition before m2() function
    const stylesDef = `
// Hardened highlight style with inline colors
const m2HighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#0000ff", fontWeight: "bold" },
  { tag: t.typeName, color: "#008080", fontWeight: "500" },
  { tag: t.function(t.variableName), color: "#800080" },
  { tag: t.bool, color: "#ff1493" },
  { tag: t.null, color: "#ff1493" },
  { tag: t.variableName, color: "#000000" },
  { tag: t.number, color: "#ff8c00" },
  { tag: t.string, color: "#008000" },
  { tag: t.lineComment, color: "#808080", fontStyle: "italic" },
  { tag: t.blockComment, color: "#808080", fontStyle: "italic" },
  { tag: t.operator, color: "#000080" },
  { tag: t.punctuation, color: "#000000" }
]);
`;
    
    // Insert before export function m2()
    content = content.replace(/export function m2\(\)/, stylesDef + '\nexport function m2()');
    
    // Update return statement to include style
    content = content.replace(
      /return new LanguageSupport\(M2Language\);/,
      'return new LanguageSupport(M2Language, m2HighlightStyle);'
    );
    
    fs.writeFileSync(libPath, content);
    console.log('Updated m2Language.js with hardened styles');
  } else {
    console.log('m2Language.js already has hardened styles');
  }
}
EOF

node inject_hardened_styles.js
rm inject_hardened_styles.js

echo ""
echo "Starting JupyterLab..."
echo ""
echo "Test Instructions:"
echo "1. Create a new notebook with Macaulay2 kernel"
echo "2. Type this test code:"
echo "   R = QQ[x,y,z]"
echo "   I = ideal(x^2, y^2)"
echo "   if x > 0 then print \"positive\""
echo ""
echo "Expected colors:"
echo "  - Keywords (if, then): BLUE (#0000ff)"
echo "  - Types (QQ, Ring): TEAL (#008080)"
echo "  - Functions (ideal, print): PURPLE (#800080)"
echo "  - Comments (--): GRAY (#808080)"
echo "  - NOT green!"
echo ""

# Start JupyterLab
./venv/bin/jupyter lab --port=8888