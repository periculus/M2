#!/usr/bin/env python3
"""
Test line magic semantics - should only affect code on the same line.
"""

import re

def test_line_magic_parsing():
    """Test parsing of line magic with code on same line."""
    
    test_cases = [
        # (input, expected_magic, expected_remaining)
        ("%pi 2 gb J", "%pi 2", "gb J"),
        ("%pi 2", "%pi 2", ""),
        ("%timeout=600 res I", "%timeout=600", "res I"),
        ("%pi", "%pi", ""),
        ("%pi 1 I = ideal(x^2)", "%pi 1", "I = ideal(x^2)"),
    ]
    
    pattern = r'^(%\w+(?:\s+[^\s]+)?)\s*(.*)$'
    
    print("Testing Line Magic Parsing")
    print("=" * 50)
    
    for input_line, expected_magic, expected_remaining in test_cases:
        match = re.match(pattern, input_line.strip())
        if match:
            magic = match.group(1)
            remaining = match.group(2)
            
            print(f"\nInput: '{input_line}'")
            print(f"Magic: '{magic}' (expected: '{expected_magic}')")
            print(f"Remaining: '{remaining}' (expected: '{expected_remaining}')")
            
            if magic == expected_magic and remaining == expected_remaining:
                print("✅ PASS")
            else:
                print("❌ FAIL")
        else:
            print(f"\nInput: '{input_line}'")
            print("❌ NO MATCH")


def test_multiline_behavior():
    """Test that line magic doesn't affect subsequent lines."""
    
    cells = [
        # Cell 1: Line magic with code on same line
        """%pi 2 gb J
res I""",
        
        # Cell 2: Line magic with no code on same line
        """%pi 2
gb J""",
        
        # Cell 3: Multiple line magics
        """%pi 1 gb I
%pi 2 gb J
res K""",
    ]
    
    print("\n\nTesting Multiline Behavior")
    print("=" * 50)
    
    for i, cell in enumerate(cells, 1):
        print(f"\nCell {i}:")
        print("Input:")
        print(cell)
        print("\nExpected behavior:")
        
        lines = cell.split('\n')
        for line in lines:
            if line.strip().startswith('%pi'):
                match = re.match(r'^(%\w+(?:\s+[^\s]+)?)\s*(.*)$', line.strip())
                if match and match.group(2):
                    print(f"  - '{match.group(2)}' executes WITH progress")
                else:
                    print(f"  - Line magic has no effect (no code on same line)")
            else:
                print(f"  - '{line}' executes WITHOUT progress")


if __name__ == "__main__":
    test_line_magic_parsing()
    test_multiline_behavior()