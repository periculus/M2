#!/usr/bin/env python3
"""Fix duplicate m2Language in bundle"""

import glob

# Find the webpack bundle
bundles = glob.glob("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static/lib_index_js.*.js")

if bundles:
    bundle_path = bundles[0]
    print(f"Fixing bundle: {bundle_path}")
    
    with open(bundle_path, 'r') as f:
        content = f.read()
    
    # Find the duplicate section
    # The correct one has HighlightStyle, the duplicate doesn't
    start_correct = content.find('/***/ "./lib/m2Language.js":')
    if start_correct != -1:
        # Find where the correct module ends (at the duplicate start)
        duplicate_start = content.find('/***/ ((__unused_webpack_module', start_correct + 100)
        if duplicate_start != -1:
            # Find the end of the duplicate (next module)
            next_module = content.find('/***/ "./lib/parser/', duplicate_start)
            if next_module != -1:
                # Remove the duplicate
                content = content[:duplicate_start] + '\n\n' + content[next_module:]
                
                with open(bundle_path, 'w') as f:
                    f.write(content)
                print("Fixed duplicate m2Language module")
                
                # Also fix the other copy
                alt_path = bundle_path.replace("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror",
                                             "@m2_jupyter/jupyterlab_m2_codemirror/labextension")
                try:
                    with open(alt_path, 'w') as f:
                        f.write(content)
                    print(f"Also fixed {alt_path}")
                except:
                    pass

print("\nNow restart JupyterLab to see blue keywords!")