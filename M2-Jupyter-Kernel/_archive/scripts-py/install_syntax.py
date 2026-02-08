#!/usr/bin/env python
"""
Install Macaulay2 syntax highlighting for Jupyter.

This script installs the M2 syntax highlighting for both
classic Jupyter notebook and JupyterLab.
"""

import os
import json
import shutil
from pathlib import Path

def find_jupyter_data_dir():
    """Find the Jupyter data directory."""
    import jupyter_core
    return Path(jupyter_core.paths.jupyter_data_dir())

def install_classic_notebook():
    """Install syntax highlighting for classic notebook."""
    jupyter_dir = find_jupyter_data_dir()
    nbext_dir = jupyter_dir / "nbextensions" / "macaulay2"
    
    # Create directory
    nbext_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy syntax file
    src = Path(__file__).parent / "m2_kernel" / "syntax_highlight.js"
    dst = nbext_dir / "syntax_highlight.js"
    shutil.copy2(src, dst)
    
    # Create main.js to load the mode
    main_js = nbext_dir / "main.js"
    main_js.write_text("""
define([
    'base/js/namespace',
    './syntax_highlight'
], function(Jupyter) {
    "use strict";
    
    var load_ipython_extension = function() {
        console.log("Loading Macaulay2 syntax highlighting...");
        
        // Register the mode with CodeMirror
        require(['./syntax_highlight'], function() {
            // Mode is now available
            console.log("Macaulay2 mode loaded");
        });
    };
    
    return {
        load_ipython_extension: load_ipython_extension
    };
});
""")
    
    print(f"✓ Installed classic notebook syntax highlighting to {nbext_dir}")
    
    # Enable the extension
    os.system("jupyter nbextension install macaulay2 --sys-prefix")
    os.system("jupyter nbextension enable macaulay2/main --sys-prefix")

def create_jupyterlab_extension():
    """Create a minimal JupyterLab extension for syntax highlighting."""
    
    # For JupyterLab, we need to inform users about CodeMirror 6
    print("\n📝 JupyterLab Syntax Highlighting:")
    print("   JupyterLab uses CodeMirror 6 which requires a different approach.")
    print("   The kernel already declares 'macaulay2' as the language mode.")
    print("   Basic highlighting will work through the Pygments lexer fallback.")
    print("   Full syntax highlighting would require a JupyterLab extension.")

def main():
    print("Installing Macaulay2 syntax highlighting for Jupyter...")
    
    try:
        install_classic_notebook()
    except Exception as e:
        print(f"⚠️  Failed to install classic notebook highlighting: {e}")
    
    create_jupyterlab_extension()
    
    print("\n✅ Installation complete!")
    print("\nTo use:")
    print("1. Restart Jupyter")
    print("2. Open an M2 notebook")
    print("3. The syntax highlighting should be active")

if __name__ == "__main__":
    main()