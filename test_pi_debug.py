#!/usr/bin/env python3

"""
Debug script to understand %pi gb output issues.
"""

import subprocess
import re

def test_pi_gb_output():
    """Test what output we get from %pi gb command."""
    
    print("Testing %pi gb output patterns")
    print("=" * 40)
    
    # Test the exact sequence that %pi 2 gb J would produce
    m2_commands = """
R = ZZ[x,y,z]
J = ideal(x^2-y, y^2-z)
gbTrace = 2
gb J
"""
    
    print("\n1. Testing direct gbTrace + gb sequence:")
    try:
        result = subprocess.run([
            "M2", "--webapp", "--no-prompts"
        ], input=m2_commands, capture_output=True, text=True, timeout=30)
        
        print(f"Return code: {result.returncode}")
        print(f"Raw output:")
        print(repr(result.stdout))
        print(f"\nParsed output:")
        print(result.stdout)
        print(f"\nStderr:")
        print(repr(result.stderr))
        
        # Analyze patterns
        lines = result.stdout.split('\n')
        print(f"\nLine analysis:")
        for i, line in enumerate(lines):
            if line.strip():
                print(f"  {i:2d}: {repr(line)}")
                
        # Look for position markers
        position_markers = [line for line in lines if re.match(r'^\s*\d+:\d+', line)]
        print(f"\nPosition markers found: {len(position_markers)}")
        for marker in position_markers:
            print(f"  {repr(marker)}")
            
        # Look for trace output
        trace_lines = [line for line in lines if line.strip().startswith('--')]
        print(f"\nTrace lines found: {len(trace_lines)}")
        for trace in trace_lines:
            print(f"  {repr(trace)}")
            
        # Look for GroebnerBasis output
        gb_lines = [line for line in lines if 'GroebnerBasis' in line]
        print(f"\nGroebnerBasis lines found: {len(gb_lines)}")
        for gb in gb_lines:
            print(f"  {repr(gb)}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_pi_gb_output()