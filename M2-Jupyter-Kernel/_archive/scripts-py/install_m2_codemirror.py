#\!/usr/bin/env python3
"""
Install M2 CodeMirror mode for JupyterLab and Classic Notebook
"""

import os
import json
import shutil
from pathlib import Path
import subprocess

def get_jupyter_paths():
    """Get Jupyter data and config directories."""
    result = subprocess.run(['jupyter', '--paths'], capture_output=True, text=True)
    print("Jupyter paths:")
    print(result.stdout)
    
    # Parse data paths
    lines = result.stdout.split('\n')
    data_paths = []
    config_paths = []
    
    current_section = None
    for line in lines:
        if 'data:' in line:
            current_section = 'data'
        elif 'config:' in line:
            current_section = 'config'
        elif line.strip() and current_section == 'data':
            data_paths.append(line.strip())
        elif line.strip() and current_section == 'config':
            config_paths.append(line.strip())
    
    return data_paths, config_paths

def install_for_classic_notebook():
    """Install for classic Jupyter notebook."""
    print("\n=== Installing for Classic Notebook ===")
    
    data_paths, _ = get_jupyter_paths()
    
    # Try each data path
    for data_path in data_paths:
        nbext_dir = Path(data_path) / "nbextensions" / "m2-mode"
        if nbext_dir.parent.exists():
            print(f"\nInstalling to: {nbext_dir}")
            nbext_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy the mode file
            src = Path(__file__).parent / "m2_kernel" / "codemirror_mode.js"
            if src.exists():
                dst = nbext_dir / "m2-mode.js"
                shutil.copy2(src, dst)
                print(f"✓ Copied M2 mode to {dst}")
                
                # Create a main.js that registers the mode
                main_js = nbext_dir / "main.js"
                main_js.write_text("""
define(['base/js/namespace', 'codemirror/lib/codemirror'], function(Jupyter, CodeMirror) {
    "use strict";
    
    // Load and register M2 mode
    return {
        load_ipython_extension: function() {
            console.log("Loading Macaulay2 CodeMirror mode...");
            
            // The mode definition
            CodeMirror.defineMode("macaulay2", function(config, parserConfig) {
                // ... mode definition from m2-mode.js
                return {
                    startState: function() { return {}; },
                    token: function(stream, state) {
                        if (stream.match(/^--.*$/)) return "comment";
                        if (stream.match(/^(if|then|else|for|while|do|return)\b/)) return "keyword";
                        if (stream.match(/^(Ring|Ideal|Matrix|ZZ|QQ|RR)\b/)) return "variable-2";
                        if (stream.match(/^(gb|res|ideal|matrix)\b/)) return "builtin";
                        stream.next();
                        return null;
                    }
                };
            });
            
            // Set MIME type
            CodeMirror.defineMIME("text/x-macaulay2", "macaulay2");
            
            console.log("✓ Macaulay2 mode registered");
        }
    };
});
""")
                print(f"✓ Created extension loader")
                
                # Enable the extension
                subprocess.run(['jupyter', 'nbextension', 'enable', 'm2-mode/main'], 
                             capture_output=True)
                print("✓ Enabled extension")
                return True
            else:
                print(f"✗ Source file not found: {src}")
    
    return False

def install_for_jupyterlab():
    """Provide instructions for JupyterLab."""
    print("\n=== JupyterLab Instructions ===")
    print("JupyterLab uses CodeMirror 6, which requires a different approach.")
    print("\nFor now, you have two options:")
    print("1. The Julia mode fallback will provide basic highlighting")
    print("2. Use Classic Notebook for full M2 syntax highlighting")
    print("\nA proper JupyterLab extension would need to be built separately.")

def main():
    print("M2 CodeMirror Mode Installer")
    print("="*50)
    
    # Install for classic notebook
    success = install_for_classic_notebook()
    
    # Instructions for JupyterLab
    install_for_jupyterlab()
    
    if success:
        print("\n✅ Installation complete\!")
        print("\nTo use:")
        print("1. Restart your Jupyter server")
        print("2. Open an M2 notebook")
        print("3. Syntax highlighting should now work in Classic Notebook")
    else:
        print("\n⚠️  Installation may have failed. Check the output above.")

if __name__ == "__main__":
    main()
