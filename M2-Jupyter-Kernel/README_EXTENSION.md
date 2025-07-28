# M2 Syntax Highlighting Extension for JupyterLab

## Quick Start

To get M2 syntax highlighting in JupyterLab:

```bash
# From the M2-Jupyter-Kernel directory
pip install -e .
jupyter lab
```

## What You Get

- **Live Syntax Highlighting**: M2 code is colored as you type
- **Full Language Support**: All 1763+ M2 symbols recognized
- **Smart Features**: Auto-indentation, bracket matching, comment support

## Example

Before (plain text):
```
R = QQ[x,y,z]
I = ideal(x^2, y^2)
gb I
```

After (with highlighting):
- `QQ` appears in type color
- `ideal` and `gb` appear in function color  
- Operators and delimiters are properly styled
- Comments are italicized

## How It Works

This is a federated JupyterLab extension that:
1. Uses a Lezer parser to understand M2 syntax
2. Integrates with CodeMirror 6 for editing
3. Provides real-time syntax highlighting

## Success!

The extension provides the comprehensive syntax highlighting that was requested, working around the previous webpack build issues by using JupyterLab's federated extension system.