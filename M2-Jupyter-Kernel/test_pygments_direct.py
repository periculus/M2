#!/usr/bin/env python3
"""
Test Pygments lexer directly to see the HTML output structure.
"""

import sys
sys.path.insert(0, 'm2_kernel')

from m2_lexer import M2Lexer
from pygments import highlight
from pygments.formatters import HtmlFormatter
import re

def test_pygments_highlighting():
    """Test the Pygments lexer directly."""
    print("Testing Pygments M2 Lexer HTML Output")
    print("=" * 60)
    
    # Sample M2 code
    code = """-- This is a comment
R = QQ[x,y,z]
I = ideal(x^2, y^2, z^2)
G = gb I
betti res I

-- Test keywords
if dim I == 0 then (
    print "Zero dimensional"
) else (
    print "Positive dimension"
)

-- Test function definition  
f = x -> x^2 + 1
g = method()
g(ZZ) := n -> n^3
"""
    
    # Create lexer and formatter
    lexer = M2Lexer()
    formatter = HtmlFormatter(
        cssclass='highlight',
        linenos=False,
        style='default'
    )
    
    # Generate highlighted HTML
    highlighted_html = highlight(code, lexer, formatter)
    
    print("\nGenerated HTML:")
    print("-" * 60)
    print(highlighted_html)
    
    # Extract CSS classes used
    print("\nCSS Classes found:")
    print("-" * 60)
    css_classes = set(re.findall(r'class="([^"]+)"', highlighted_html))
    for cls in sorted(css_classes):
        print(f"  - {cls}")
    
    # Generate CSS styles
    css = formatter.get_style_defs('.highlight')
    print("\nGenerated CSS (first 500 chars):")
    print("-" * 60)
    print(css[:500] + "...")
    
    # Test specific token recognition
    print("\nToken Recognition Test:")
    print("-" * 60)
    tokens = list(lexer.get_tokens(code))
    
    # Count token types
    token_types = {}
    for token_type, value in tokens:
        type_name = str(token_type)
        if type_name not in token_types:
            token_types[type_name] = []
        if value.strip() and len(token_types[type_name]) < 5:  # First 5 examples
            token_types[type_name].append(repr(value))
    
    for token_type, examples in sorted(token_types.items()):
        if examples:
            print(f"  {token_type}: {', '.join(examples[:3])}")

def test_notebook_cell_rendering():
    """Test how a notebook cell would be rendered."""
    print("\n\nTesting Notebook Cell Rendering")
    print("=" * 60)
    
    # Simulate what happens in a notebook
    from IPython.lib.lexers import get_pygments_lexer
    
    try:
        # Try to get the M2 lexer as IPython would
        lexer = get_pygments_lexer('macaulay2')
        print(f"IPython found lexer: {lexer.__class__.__name__}")
    except Exception as e:
        print(f"IPython couldn't find M2 lexer: {e}")
        
        # Try with our lexer
        from pygments.lexers import get_lexer_by_name
        try:
            lexer = get_lexer_by_name('macaulay2')
            print(f"Pygments found lexer: {lexer.__class__.__name__}")
        except Exception as e2:
            print(f"Pygments couldn't find M2 lexer either: {e2}")

def check_mime_types():
    """Check what MIME types the kernel is producing."""
    print("\n\nChecking MIME Types in Kernel")
    print("=" * 60)
    
    import json
    
    # Read an executed cell output
    with open('test_syntax_notebook_executed.ipynb', 'r') as f:
        notebook = json.load(f)
    
    for i, cell in enumerate(notebook['cells']):
        if cell['cell_type'] != 'code':
            continue
            
        print(f"\nCell {i + 1}:")
        for j, output in enumerate(cell.get('outputs', [])):
            if output['output_type'] == 'execute_result':
                mime_types = list(output['data'].keys())
                print(f"  Output {j + 1} MIME types: {mime_types}")
                
                # Check if any contain highlighted code
                for mime in mime_types:
                    content = output['data'][mime]
                    if isinstance(content, list):
                        content = ''.join(content)
                    
                    # Look for Pygments markers
                    if any(marker in content for marker in ['<span class=', '<div class="highlight"', '<pre class=']):
                        print(f"    → {mime} contains syntax highlighting!")

if __name__ == "__main__":
    test_pygments_highlighting()
    test_notebook_cell_rendering()
    check_mime_types()