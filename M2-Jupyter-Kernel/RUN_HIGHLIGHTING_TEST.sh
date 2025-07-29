#!/bin/bash
# Test M2 syntax highlighting in JupyterLab

echo "=== M2 Syntax Highlighting Test Script ==="
echo ""
echo "1. Checking parser..."
node test_parser_minimal.js
echo ""
echo "2. Opening test notebook..."
echo "   - Open browser console (F12)"
echo "   - Look for 'M2 CodeMirror extension is being activated...'"
echo "   - Type: if QQ then gb else ideal"
echo "   - Check if keywords (if/then/else) are blue"
echo "   - Check if types (QQ) are teal"
echo "   - Check if functions (gb/ideal) are purple"
echo ""
echo "3. Starting JupyterLab..."

./venv/bin/jupyter lab --port=8888 test_highlighting.ipynb