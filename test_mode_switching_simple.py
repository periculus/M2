#!/usr/bin/env python3

"""
Simple test script to verify M2 mode switching works correctly.
This creates a test notebook to verify the mode switching functionality.
"""

import nbformat as nbf

def create_test_notebook():
    """Create a test notebook to verify mode switching."""
    
    # Create a new notebook
    nb = nbf.v4.new_notebook()
    
    # Add cells to test mode switching
    cells = [
        nbf.v4.new_code_cell("""-- Test 1: Matrix in default WebApp mode (should show LaTeX)
matrix{{1,2},{3,4}}"""),
        
        nbf.v4.new_code_cell("""%latex off  -- Switch to Standard mode"""),
        
        nbf.v4.new_code_cell("""-- Test 2: Matrix in Standard mode (should show plain text ASCII art)
matrix{{5,6},{7,8}}"""),
        
        nbf.v4.new_code_cell("""-- Test 3: Ideal in Standard mode (should show plain text)
I = ideal(x^2-1, y^2-1)"""),
        
        nbf.v4.new_code_cell("""%latex on  -- Switch back to WebApp mode"""),
        
        nbf.v4.new_code_cell("""-- Test 4: Matrix in WebApp mode again (should show LaTeX)
matrix{{9,10},{11,12}}"""),
        
        nbf.v4.new_code_cell("""-- Test 5: Ideal in WebApp mode (should show LaTeX)
J = ideal(a^3-b^2, b^3-c^2)"""),
        
        nbf.v4.new_markdown_cell("""# Expected Results

**Test 1** (WebApp mode): Matrix should display as LaTeX with mathematical formatting

**Test 2** (Standard mode): Matrix should display as ASCII art:
```
| 5 6 |
| 7 8 |
```

**Test 3** (Standard mode): Ideal should display as plain text without LaTeX

**Test 4** (WebApp mode): Matrix should display as LaTeX again

**Test 5** (WebApp mode): Ideal should display with LaTeX formatting

The key test is **Test 2** - this should show plain ASCII art instead of LaTeX when `%latex off` is active.""")
    ]
    
    # Add all cells to notebook
    nb.cells = cells
    
    # Write the notebook
    with open('/Users/sverrir/Documents/GitHub/M2/test_mode_switching.ipynb', 'w') as f:
        nbf.write(nb, f)
    
    print("Created test notebook: test_mode_switching.ipynb")
    print("\nTo test:")
    print("1. Open the notebook in Jupyter")
    print("2. Run all cells in order")
    print("3. Verify that Test 2 shows ASCII art instead of LaTeX")
    print("4. Verify that Tests 1, 4, 5 show LaTeX formatting")

if __name__ == "__main__":
    create_test_notebook()