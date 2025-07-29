#!/usr/bin/env python3

"""
Debug the execution boundary markers with multi-line commands.
"""

import subprocess

def test_execution_boundaries():
    """Test how M2 handles execution boundaries with multi-line commands."""
    
    print("Testing execution boundaries")
    print("=" * 40)
    
    # Simulate what the kernel sends
    test_sequence = """-- EXECUTION_START_123
gbTrace = 2
gb ideal(x^2-y, y^2-z)
-- EXECUTION_END_123"""
    
    print("Test sequence:")
    print(test_sequence)
    print("\n" + "=" * 40)
    
    # Full setup similar to kernel
    full_sequence = f"""
R = ZZ[x,y,z]
{test_sequence}
"""
    
    print("\n1. Testing with M2 WebApp mode:")
    try:
        result = subprocess.run([
            "M2", "--webapp", "--no-prompts"
        ], input=full_sequence, capture_output=True, text=True, timeout=30)
        
        print(f"Return code: {result.returncode}")
        print(f"Raw stdout ({len(result.stdout)} chars):")
        print(repr(result.stdout))
        
        # Parse the output to find the execution boundaries
        lines = result.stdout.split('\n')
        start_found = False
        end_found = False
        captured_lines = []
        
        for i, line in enumerate(lines):
            if "EXECUTION_START_123" in line:
                start_found = True
                print(f"\nFound start marker at line {i}: {repr(line)}")
                continue
            elif "EXECUTION_END_123" in line:
                end_found = True
                print(f"Found end marker at line {i}: {repr(line)}")
                break
            elif start_found:
                captured_lines.append(line)
        
        print(f"\nCaptured between markers ({len(captured_lines)} lines):")
        for i, line in enumerate(captured_lines):
            print(f"  {i:2d}: {repr(line)}")
            
        # Look for actual GroebnerBasis output
        gb_lines = [line for line in captured_lines if 'GroebnerBasis' in line]
        print(f"\nGroebnerBasis lines in captured output: {len(gb_lines)}")
        for gb_line in gb_lines:
            print(f"  {repr(gb_line)}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_execution_boundaries()