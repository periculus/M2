#!/usr/bin/env python3

"""
Test specific issues found in test_fixed_issues.ipynb notebook.
"""

import sys
import re
sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')

from m2_kernel.m2_process import M2Process

def test_groebner_basis_output():
    """Test that GroebnerBasis objects appear in output properly."""
    print("=== TEST: GroebnerBasis Output ===")
    
    process = M2Process()
    try:
        process.start_process()
        
        # Set up ideal
        process.execute('T = QQ[a,b,c]; J = ideal(a^4, b^4, c^4)')
        
        # Test GroebnerBasis computation
        result = process.execute('gb J')
        
        print(f"Success: {result['success']}")
        print(f"Has output var: {bool(result.get('output_var'))}")
        print(f"Has HTML: {bool(result.get('html'))}")
        print(f"HTML contains GroebnerBasis: {'GroebnerBasis' in result.get('html', '')}")
        print(f"HTML preview: {result.get('html', '')[:200]}...")
        
        # Check if GroebnerBasis object is properly formatted
        if 'GroebnerBasis' in result.get('html', ''):
            print("✓ GroebnerBasis object found in HTML")
            if '<samp class="token class-name">GroebnerBasis</samp>' in result.get('html', ''):
                print("✗ Raw HTML tokens found - should be rendered HTML")
                return False
            else:
                print("✓ GroebnerBasis properly formatted")
                return True
        else:
            print("✗ GroebnerBasis object missing from output")
            return False
            
    finally:
        if hasattr(process, 'cleanup'):
            process.cleanup()

def test_input_echo_filtering():
    """Test that input echoes are properly filtered out."""
    print("\n=== TEST: Input Echo Filtering ===")
    
    process = M2Process()
    try:
        process.start_process()
        
        # Test with magic command that creates echoes
        result = process.execute('%pi 2 gb ideal(x^2 - y, y^2)')
        
        print(f"Success: {result['success']}")
        print(f"Other output: {repr(result.get('other_output', ''))}")
        
        # Check for input echo patterns that should be filtered
        other_out = result.get('other_output', '')
        
        issues = []
        if re.search(r'\d+:\d+', other_out):
            issues.append("Position markers found")
        if re.search(r'i\d+\s*:', other_out):
            issues.append("Input prompts found")
        if 'gbTrace' in other_out and '=' in other_out:
            issues.append("Assignment echoes found")
            
        if issues:
            print(f"✗ Input echo issues: {', '.join(issues)}")
            return False
        else:
            print("✓ Input echoes properly filtered")
            return True
            
    finally:
        if hasattr(process, 'cleanup'):
            process.cleanup()

def test_comment_echo_filtering():
    """Test that comment echoes don't appear in other output."""
    print("\n=== TEST: Comment Echo Filtering ===")
    
    process = M2Process()
    try:
        process.start_process()
        
        # Test comment followed by magic command
        result = process.execute('%latex off')
        
        print(f"Success: {result['success']}")
        print(f"Other output: {repr(result.get('other_output', ''))}")
        
        # Comments should not appear in other_output
        other_out = result.get('other_output', '')
        if 'Test 5' in other_out or 'LaTeX toggle' in other_out:
            print("✗ Comment echo found in other output")
            return False
        else:
            print("✓ Comment echoes properly filtered")
            return True
            
    finally:
        if hasattr(process, 'cleanup'):
            process.cleanup()

def test_html_rendering():
    """Test that HTML content is properly rendered, not shown as raw text."""
    print("\n=== TEST: HTML Rendering ===")
    
    process = M2Process()
    try:
        process.start_process()
        
        # Create a GroebnerBasis that should have HTML formatting
        result = process.execute('R = QQ[x,y]; gb ideal(x^2, y^2)')
        
        print(f"Success: {result['success']}")
        print(f"HTML: {result.get('html', '')[:300]}...")
        
        html_content = result.get('html', '')
        
        # Check for raw HTML tokens vs properly processed content
        if '<samp class="token class-name">' in html_content:
            print("✗ Raw HTML tokens found - content not processed properly")
            return False
        elif 'GroebnerBasis' in html_content:
            print("✓ GroebnerBasis content properly processed")
            return True
        else:
            print("? No GroebnerBasis content found")
            return False
            
    finally:
        if hasattr(process, 'cleanup'):
            process.cleanup()

def main():
    """Run all notebook issue tests."""
    import re
    
    print("Testing specific issues found in test_fixed_issues.ipynb notebook\n")
    
    tests = [
        test_groebner_basis_output,
        test_html_rendering,
        test_input_echo_filtering,
        test_comment_echo_filtering,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed with exception: {e}")
            failed += 1
    
    print(f"\n=== RESULTS ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total: {passed + failed}")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)