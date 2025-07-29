#!/bin/bash
# Test script that applies highlighting fixes after build

echo "=== M2 Syntax Highlighting Test with Fixes ==="
echo "Using venv jupyter directly..."

cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel

echo "1. Cleaning JupyterLab..."
./venv/bin/jupyter lab clean --all

echo -e "\n2. Checking extension..."
./venv/bin/jupyter labextension list | grep m2

echo -e "\n3. Building JupyterLab..."
./venv/bin/jupyter lab build

echo -e "\n4. Applying syntax highlighting fixes..."
chmod +x apply_highlighting_fixes.sh
./apply_highlighting_fixes.sh

echo -e "\n5. Starting JupyterLab..."
echo "Once started:"
echo "  - Create new notebook with Macaulay2 kernel"
echo "  - Type some M2 code to test highlighting"
echo "  - Keywords should be BLUE, not green"

./venv/bin/jupyter lab --port=8888