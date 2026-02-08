# CORRECT Test Procedure - Using venv Jupyter

## IMPORTANT: You're using system jupyter!

You cleaned the **system JupyterLab** at `/opt/homebrew/Cellar/jupyterlab/4.4.5/`, but our extension is installed in the **venv JupyterLab**.

## Correct Steps

### 1. Activate the venv (for fish shell):
```fish
cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel
source venv/bin/activate.fish
```

### 2. Verify correct jupyter:
```fish
which jupyter
# MUST show: /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel/venv/bin/jupyter
```

### 3. Clean the VENV JupyterLab:
```fish
jupyter lab clean --all
```

### 4. Check extension is installed:
```fish
jupyter labextension list
# Should show: @m2-jupyter/jupyterlab-m2-codemirror
```

### 5. Build JupyterLab:
```fish
jupyter lab build
```

### 6. Start JupyterLab:
```fish
./start_jupyter.fish
# OR if that doesn't work:
jupyter lab --port=8888
```

## Alternative: Use venv jupyter directly

If activation doesn't work, use full paths:

```fish
cd /Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel
./venv/bin/jupyter lab clean --all
./venv/bin/jupyter labextension list
./venv/bin/jupyter lab build
./venv/bin/jupyter lab --port=8888
```

## The Problem

You're mixing two JupyterLab installations:
- **System**: `/opt/homebrew/bin/jupyter` (doesn't have our extension)
- **venv**: `/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel/venv/bin/jupyter` (has our extension)

You must use the venv one for testing!