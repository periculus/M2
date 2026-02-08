#!/bin/bash
# Rebuild M2 extension with correct parser

set -e

echo "=== Rebuilding M2 CodeMirror Extension ==="

# Make sure we have the correct highlight.js
echo "Checking highlight.js..."
if grep -q "make EVERYTHING a keyword" lib/parser/highlight.js 2>/dev/null; then
    echo "ERROR: lib/parser/highlight.js has debug version!"
    echo "Copying correct version..."
    cp src/parser/highlight.js lib/parser/highlight.js
fi

# Find where the extension source is
if [ -d "jupyterlab-m2-codemirror" ]; then
    echo "Found extension source at jupyterlab-m2-codemirror"
    cd jupyterlab-m2-codemirror
elif [ -d "../jupyterlab-m2-codemirror" ]; then
    echo "Found extension source at ../jupyterlab-m2-codemirror" 
    cd ../jupyterlab-m2-codemirror
else
    echo "ERROR: Cannot find jupyterlab-m2-codemirror directory"
    exit 1
fi

# Try to build
if [ -f "package.json" ]; then
    echo "Building extension..."
    npm run build || echo "npm build failed, trying alternative..."
    
    # Alternative: direct webpack if available
    if [ -f "webpack.config.js" ]; then
        npx webpack || echo "webpack failed"
    fi
fi

echo "=== Build attempt complete ==="
echo "You may need to restart JupyterLab to see changes"