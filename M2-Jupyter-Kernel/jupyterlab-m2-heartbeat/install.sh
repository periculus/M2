#!/usr/bin/env bash

# Install script for M2 Heartbeat JupyterLab extension

echo "Installing M2 Heartbeat extension for JupyterLab..."

# Check if node/npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if jupyter is installed
if ! command -v jupyter &> /dev/null; then
    echo "Error: Jupyter is not installed."
    exit 1
fi

# Install jlpm if not available
if ! command -v jlpm &> /dev/null; then
    echo "Installing jupyterlab package manager..."
    npm install -g yarn
fi

# Install dependencies
echo "Installing dependencies..."
jlpm install || npm install

# Build the extension
echo "Building extension..."
jlpm run build || npm run build

# Install the extension in development mode
echo "Installing extension in JupyterLab..."
jupyter labextension develop . --overwrite

echo "✅ M2 Heartbeat extension installed successfully!"
echo ""
echo "To use:"
echo "1. Restart JupyterLab"
echo "2. Open a notebook with M2 kernel"
echo "3. Look for the 💓 indicator in the status bar"
echo ""
echo "The heartbeat will:"
echo "- Pulse slowly when kernel is idle"
echo "- Pulse quickly when computing"
echo "- Turn gray if kernel dies"