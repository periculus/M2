#!/usr/bin/env python3
"""
Test script for the multiline parser functionality.
"""

from m2_kernel.cell_parser import M2CellParser, ParsedCell


def test_parser():
    parser = M2CellParser()
    
    # Test cases
    test_cases = [
        # Simple single statement
        ("R = QQ[x,y,z]", 1, None),
        
        # Multiple statements
        ("R = QQ[x,y,z]\nI = ideal(x^2, y^2)\ngb I", 3, None),
        
        # Multiline statement with unbalanced delimiters
        ("I = ideal(\n  x^2 + y^2,\n  x*y - z^2\n)", 1, None),
        
        # Cell magic
        ("%%pi 2\nR = QQ[x,y,z]\ngb ideal(x^2, y^2)", 2, ("pi", "2")),
        
        # Line magic
        ("%pi 1\ngb ideal(x^2, y^2)", 1, None),
        
        # Comments and empty lines
        ("-- This is a comment\n\nR = QQ[x,y,z]\n\n-- Another comment\nI = ideal(x^2)", 2, None),
        
        # Control structures
        ("if x > 0 then\n  print \"positive\"\nelse\n  print \"non-positive\"", 1, None),
        
        # Hanging operators
        ("a = 1 +\n  2 +\n  3", 1, None),
        
        # Triple slash strings
        ('s = ///\nThis is a\nmultiline string\n///', 1, None),
        
        # Complex example with everything
        ('%%pi 3\n-- Setup\nR = QQ[x,y,z]\n\nI = ideal(\n  x^2 + y^2,\n  x*y\n)\n\n%timeout=600\ngb I', 2, ("pi", "3")),
    ]
    
    print("Testing M2 Cell Parser\n" + "="*50)
    
    for i, (code, expected_statements, expected_cell_magic) in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Code:\n{code}")
        print("-" * 30)
        
        result = parser.parse_cell(code)
        
        print(f"Cell magic: {result.cell_magic}")
        print(f"Number of statements: {len(result.statements)}")
        
        for j, stmt in enumerate(result.statements):
            print(f"\nStatement {j+1}:")
            print(f"  Line magic: {stmt.line_magic}")
            print(f"  Code: {repr(stmt.code)}")
            print(f"  Lines: {stmt.start_line}-{stmt.end_line}")
        
        # Verify expectations
        if len(result.statements) != expected_statements:
            print(f"❌ Expected {expected_statements} statements, got {len(result.statements)}")
        else:
            print(f"✅ Statement count correct")
        
        if result.cell_magic != expected_cell_magic:
            print(f"❌ Expected cell magic {expected_cell_magic}, got {result.cell_magic}")
        else:
            print(f"✅ Cell magic correct")
        
        print("=" * 50)


def test_delimiter_counting():
    parser = M2CellParser()
    
    test_strings = [
        ("()", True),
        ("(())", True),
        ("(()", False),
        ("{[()]}", True),
        ("{[(])}", False),
        ('"string with ) paren"', True),
        ('///string with ) paren///', True),
        ('-- comment with )', True),
        ('-* block comment with ) *-', True),
    ]
    
    print("\nTesting Delimiter Balance\n" + "="*50)
    
    for text, expected_balanced in test_strings:
        balance = parser._count_delimiters(text)
        is_balanced = balance.is_balanced()
        
        status = "✅" if is_balanced == expected_balanced else "❌"
        print(f"{status} '{text}' -> {balance} (balanced: {is_balanced})")


def test_continuation_detection():
    parser = M2CellParser()
    
    test_cases = [
        ("a = 1", False),
        ("a = 1 +", True),
        ("if x then", True),
        ("if x then y else z", False),
        ("while true do", True),
        ("f(x,", True),
        ("f(x)", False),
    ]
    
    print("\nTesting Continuation Detection\n" + "="*50)
    
    for code, expected_needs_continuation in test_cases:
        needs_cont = parser.needs_continuation(code)
        status = "✅" if needs_cont == expected_needs_continuation else "❌"
        print(f"{status} '{code}' -> needs continuation: {needs_cont}")


if __name__ == "__main__":
    test_parser()
    test_delimiter_counting()
    test_continuation_detection()