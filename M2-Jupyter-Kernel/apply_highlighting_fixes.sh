#!/bin/bash
# Apply M2 syntax highlighting fixes after JupyterLab build

echo "=== Applying M2 Syntax Highlighting Fixes ==="

# Find the webpack bundle
BUNDLE=$(find venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static -name "lib_index_js.*.js" | head -1)

if [ -z "$BUNDLE" ]; then
    echo "ERROR: Could not find webpack bundle"
    exit 1
fi

echo "Found bundle: $BUNDLE"

# Apply parser fix
echo "Fixing parser highlighting mappings..."
python fix_parser_bundle.py

# Apply CSS fix by injecting into the CSS bundle
CSS_BUNDLE=$(find venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static -name "style_index_css.*.js" | head -1)

if [ -n "$CSS_BUNDLE" ]; then
    echo "Found CSS bundle: $CSS_BUNDLE"
    echo "Applying CSS color fixes..."
    
    # Create a Python script to fix the CSS
    cat > fix_css_colors.py << 'EOF'
import sys
import re

css_bundle = sys.argv[1]

with open(css_bundle, 'r') as f:
    content = f.read()

# Replace theme variables with hardcoded colors
replacements = [
    (r'var\(--jp-mirror-editor-keyword-color,\s*#0000ff\)', '#0000ff'),
    (r'var\(--jp-mirror-editor-def-color,\s*#008080\)', '#008080'),
    (r'var\(--jp-mirror-editor-builtin-color,\s*#800080\)', '#800080'),
    (r'#008000\s*!important;\s*/\*\s*keywords\s*\*/', '#0000ff !important; /* keywords */'),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Also fix any .cm-keyword rules
content = re.sub(
    r'(\.cm-keyword\s*\{[^}]*color:\s*)([^;]+)(;[^}]*\})',
    r'\1#0000ff !important\3',
    content
)

with open(css_bundle, 'w') as f:
    f.write(content)

print(f"Fixed CSS in {css_bundle}")
EOF

    python fix_css_colors.py "$CSS_BUNDLE"
    rm fix_css_colors.py
fi

echo ""
echo "=== Fixes Applied ==="
echo "Now start JupyterLab with: ./venv/bin/jupyter lab"
echo ""
echo "Expected colors:"
echo "  - Keywords (if, for, while): Blue (#0000ff)"
echo "  - Types (Ring, Matrix, ZZ): Teal (#008080)"
echo "  - Functions (gb, ideal, res): Purple (#800080)"
echo "  - Comments: Gray (#808080)"