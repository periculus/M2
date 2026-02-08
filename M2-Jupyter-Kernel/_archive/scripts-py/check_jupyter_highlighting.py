#!/usr/bin/env python3
"""
Check how JupyterLab applies syntax highlighting.
"""

import json

def check_notebook_rendering():
    """Check how notebook cells are rendered."""
    print("Checking JupyterLab Syntax Highlighting")
    print("=" * 60)
    
    # Read the notebook
    with open('test_syntax_notebook.ipynb', 'r') as f:
        notebook = json.load(f)
    
    print("\nNotebook metadata:")
    print(f"  Kernel: {notebook['metadata']['kernelspec']['name']}")
    lang_info = notebook['metadata']['language_info']
    print(f"  Language: {lang_info.get('name', 'N/A')}")
    print(f"  CodeMirror mode: {lang_info.get('codemirror_mode', 'N/A')}")
    print(f"  Pygments lexer: {lang_info.get('pygments_lexer', 'N/A')}")
    
    print("\nCell source code (raw):")
    for i, cell in enumerate(notebook['cells']):
        if cell['cell_type'] == 'code':
            print(f"\nCell {i + 1}:")
            source = cell['source']
            if isinstance(source, list):
                source = ''.join(source)
            print(f"  {source[:100]}...")

def explain_highlighting():
    """Explain how highlighting works in JupyterLab."""
    print("\n\nHow Syntax Highlighting Works in JupyterLab:")
    print("=" * 60)
    
    print("""
1. **Input Cells (While Typing)**:
   - Uses CodeMirror in the browser
   - Requires a CodeMirror mode matching 'codemirror_mode' in language_info
   - Currently set to 'macaulay2' but no such mode is installed
   - Falls back to no highlighting
   
2. **Output Cells (After Execution)**:
   - The kernel can return highlighted HTML in outputs
   - Currently returns mathematical formatting, not code highlighting
   
3. **Notebook Export/Conversion**:
   - Uses Pygments lexer specified in 'pygments_lexer'
   - Our M2 lexer works perfectly for this
   - Used when converting notebooks to HTML, PDF, etc.

4. **Current Status**:
   - ✅ Pygments lexer: Working (for exports)
   - ❌ CodeMirror mode: Not installed (no live highlighting)
   - ✅ Kernel outputs: Formatted math, not highlighted code
   
5. **What Users See**:
   - No syntax highlighting while typing (CodeMirror mode missing)
   - Mathematical LaTeX output after execution
   - Proper highlighting only when exporting notebook
""")

def test_nbconvert():
    """Test notebook conversion to see Pygments in action."""
    print("\n\nTesting nbconvert with Pygments:")
    print("=" * 60)
    
    import subprocess
    
    # Convert to HTML
    cmd = ['jupyter', 'nbconvert', '--to', 'html', 'test_syntax_notebook.ipynb', '--output', 'test_highlighted.html']
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Successfully converted to HTML")
            print("   Check test_highlighted.html to see Pygments highlighting!")
            
            # Check if the HTML contains highlighting
            with open('test_highlighted.html', 'r') as f:
                html_content = f.read()
                
            if 'class="highlight"' in html_content or 'pygments' in html_content.lower():
                print("   ✅ HTML contains Pygments syntax highlighting")
            else:
                print("   ❌ No Pygments highlighting found in HTML")
                
        else:
            print(f"❌ Conversion failed: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_notebook_rendering()
    explain_highlighting()
    test_nbconvert()