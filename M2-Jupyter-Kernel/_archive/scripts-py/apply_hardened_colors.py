#!/usr/bin/env python3
"""Apply hardened colors to the M2 extension bundle"""

import re
import os
import glob

# Find the webpack bundle
pattern = "venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static/lib_index_js.*.js"
bundles = glob.glob(pattern)

if not bundles:
    pattern2 = "@m2_jupyter/jupyterlab_m2_codemirror/labextension/static/lib_index_js.*.js"
    bundles = glob.glob(pattern2)

if not bundles:
    print("ERROR: Could not find webpack bundle")
    exit(1)

bundle_path = bundles[0]
print(f"Found bundle: {bundle_path}")

# Read the bundle
with open(bundle_path, 'r') as f:
    content = f.read()

# Pattern to find the m2HighlightStyle definition
# Look for the HighlightStyle.define with CSS variables
var_pattern = r'(m2HighlightStyle[^=]*=\s*\w+\.define\s*\()([^)]+)(\))'

# The hardened colors (no CSS variables)
hardened_colors = """[
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.keyword, color: "#0000ff", fontWeight: "bold" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.typeName, color: "#008080", fontWeight: "500" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.function(_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.variableName), color: "#800080" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.bool, color: "#ff1493" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.null, color: "#ff1493" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.variableName, color: "#000000" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.number, color: "#ff8c00" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.string, color: "#008000" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.lineComment, color: "#808080", fontStyle: "italic" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.blockComment, color: "#808080", fontStyle: "italic" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.operator, color: "#000080" },
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.punctuation, color: "#000000" }
]"""

# Replace CSS variable colors with hardcoded ones
replacements = [
    # Replace individual color variables
    (r'color:\s*["\']var\(--jp-mirror-editor-keyword-color[^)]*\)["\']', 'color: "#0000ff"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-type-color[^)]*\)["\']', 'color: "#008080"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-function-color[^)]*\)["\']', 'color: "#800080"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-def-color[^)]*\)["\']', 'color: "#000000"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-number-color[^)]*\)["\']', 'color: "#ff8c00"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-string-color[^)]*\)["\']', 'color: "#008000"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-comment-color[^)]*\)["\']', 'color: "#808080"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-operator-color[^)]*\)["\']', 'color: "#000080"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-delimiter-color[^)]*\)["\']', 'color: "#000000"'),
    (r'color:\s*["\']var\(--jp-mirror-editor-constant-color[^)]*\)["\']', 'color: "#ff1493"'),
]

modified = False
for pattern, replacement in replacements:
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print(f"Replaced: {pattern[:50]}... -> {replacement}")
        modified = True

# Write back if modified
if modified:
    with open(bundle_path, 'w') as f:
        f.write(content)
    print(f"\nUpdated {bundle_path}")
    
    # Also update in venv if different
    venv_path = bundle_path.replace("@m2_jupyter/jupyterlab_m2_codemirror/labextension", 
                                    "venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror")
    if venv_path != bundle_path and os.path.exists(os.path.dirname(venv_path)):
        with open(venv_path, 'w') as f:
            f.write(content)
        print(f"Also updated {venv_path}")
else:
    print("No CSS variables found to replace")
    # Check if already has hardcoded colors
    if "#0000ff" in content and "#008080" in content:
        print("Bundle already has hardcoded colors!")

print("\nDone! Restart JupyterLab to see the changes.")