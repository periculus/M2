#!/usr/bin/env python3
"""
Test the progress magic implementation.
"""

from m2_kernel.m2_process import M2Process


def test_progress_verbosity():
    """Test the _add_progress_verbosity method."""
    
    process = M2Process()
    
    test_cases = [
        # (code, level, expected_modified)
        ("gb J", 1, "gbTrace = 1;\ngb J"),
        ("gb J", 2, "gbTrace = 2;\ngb J"),
        ("res I", 1, "res I"),  # No modification for res
        ("decompose I", 1, "debugLevel = 1;\ndecompose I"),
    ]
    
    print("Testing Progress Verbosity Modification")
    print("=" * 50)
    
    for code, level, expected in test_cases:
        modified, info = process._add_progress_verbosity(code, level)
        
        print(f"\nOriginal: {code}")
        print(f"Level: {level}")
        print(f"Modified: {modified}")
        print(f"Expected: {expected}")
        print(f"Operations: {info['operations']}")
        
        if modified == expected:
            print("✅ PASS")
        else:
            print("❌ FAIL")


def test_magic_parsing():
    """Test magic command parsing."""
    
    process = M2Process()
    
    # Test the progress magic
    result = process._handle_progress_magic("%pi 2")
    print("\n\nTesting Magic Command Parsing")
    print("=" * 50)
    print(f"Command: %pi 2")
    print(f"Result: {result}")
    print(f"Progress mode: {process._progress_mode}")
    print(f"Progress level: {process._progress_level}")


if __name__ == "__main__":
    test_progress_verbosity()
    test_magic_parsing()