#!/bin/bash
# Simple test without cleaning - just start JupyterLab

echo "=== M2 Syntax Highlighting Test (No Clean) ==="
echo "Starting JupyterLab directly without cleaning..."

cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel

echo "Extension status:"
./venv/bin/jupyter labextension list | grep m2

echo -e "\nStarting JupyterLab..."
echo "Instructions:"
echo "1. Open browser console (F12)" 
echo "2. Create new notebook with Macaulay2 kernel"
echo "3. Type some M2 code:"
echo "   if QQ then gb else ideal"
echo "   -- This is a comment"
echo "   R = ZZ[x,y,z]"
echo "4. Look for syntax highlighting (keywords should be colored)"
echo "5. Check console for messages like 'M2 CodeMirror extension activating...'"

./venv/bin/jupyter lab --port=8889 --no-browser