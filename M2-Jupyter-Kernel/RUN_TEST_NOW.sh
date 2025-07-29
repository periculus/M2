#!/bin/bash
# Quick test script using venv jupyter

echo "=== M2 Syntax Highlighting Test ==="
echo "Using venv jupyter directly..."

cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel

echo "1. Cleaning JupyterLab..."
./venv/bin/jupyter lab clean --all

echo -e "\n2. Checking extension..."
./venv/bin/jupyter labextension list | grep m2

echo -e "\n3. Building JupyterLab..."
./venv/bin/jupyter lab build

echo -e "\n4. Starting JupyterLab..."
echo "Once started:"
echo "  - Open browser console (F12)"
echo "  - Create new notebook with Macaulay2 kernel"
echo "  - Type: if QQ then gb else ideal"
echo "  - Check console for debug messages"

./venv/bin/jupyter lab --port=8888