#!/usr/bin/env python3
"""Fix the M2 parser bundle to use correct highlighting instead of debug version"""

import re

bundle_path = "venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static/lib_index_js.11db4f197f7531d041f5.js"

# Read the bundle
with open(bundle_path, 'r') as f:
    content = f.read()

# Find the m2Highlighting section
old_pattern = r'const m2Highlighting = \(0,_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__\.styleTags\)\(\{[^}]+\}\)'

# The correct highlighting mapping
new_highlighting = '''const m2Highlighting = (0,_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.styleTags)({
  "Keyword": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.keyword,
  "Type": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.typeName,
  "Function": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.function(_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.variableName),
  "Boolean": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.bool,
  "Null": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.null,
  "identifier": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.variableName,
  "Number": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.number,
  "String": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.string,
  "LineComment": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.lineComment,
  "BlockComment": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.blockComment,
  "Operator": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.operator,
  "Delimiter": _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.punctuation
})'''

# Replace the highlighting
if re.search(old_pattern, content):
    content = re.sub(old_pattern, new_highlighting, content)
    print("Found and replaced m2Highlighting definition")
    
    # Write back
    with open(bundle_path, 'w') as f:
        f.write(content)
    print(f"Updated {bundle_path}")
    
    # Also update the backup in labextension
    backup_path = "@m2_jupyter/jupyterlab_m2_codemirror/labextension/static/lib_index_js.11db4f197f7531d041f5.js"
    try:
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"Also updated {backup_path}")
    except:
        print(f"Could not update backup at {backup_path}")
else:
    print("Could not find m2Highlighting pattern to replace")
    print("Searching for the pattern...")
    
    # Try to find where it is
    if "m2Highlighting" in content:
        idx = content.index("m2Highlighting")
        print(f"Found m2Highlighting at position {idx}")
        print("Context:")
        print(content[max(0, idx-100):idx+200])

print("\nAfter running this, restart JupyterLab to see the changes.")