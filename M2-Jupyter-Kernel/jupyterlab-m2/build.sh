#!/bin/bash
# Simple build script for JupyterLab M2 extension

echo "Building TypeScript..."
npx tsc --sourceMap

echo "Building JupyterLab extension..."
jupyter labextension build --development True .

echo "Build complete!"