#!/bin/bash
# Start JupyterLab from the project root with the correct venv

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_JUPYTER="$PROJECT_ROOT/venv/bin/jupyter"

echo "Project root: $PROJECT_ROOT"
echo "Starting JupyterLab with venv..."

cd "$PROJECT_ROOT"
"$VENV_JUPYTER" lab --port=8888