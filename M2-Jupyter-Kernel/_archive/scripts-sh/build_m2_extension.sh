#!/bin/bash
# Build and install M2 language support for JupyterLab

set -e

echo "Building M2 CodeMirror language package..."
cd codemirror-lang-m2
npm install
npm run build
cd ..

echo "Building JupyterLab M2 extension..."
cd jupyterlab-m2
npm install
npm run build
cd ..

echo "Installing JupyterLab extension..."
cd jupyterlab-m2
pip install -e .
jupyter labextension develop . --overwrite
cd ..

echo "M2 language support has been installed!"
echo "Please restart JupyterLab to see the changes."
echo ""
echo "To verify installation, run:"
echo "  jupyter labextension list"
echo ""
echo "You should see 'jupyterlab-m2' in the list of extensions."