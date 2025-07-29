#!/usr/bin/env python3

"""
Test M2 mode switching directly to see what output patterns we get.
"""

import subprocess
import sys

def test_direct_m2_modes():
    """Test M2 modes directly from command line."""
    
    print("Testing M2 Mode Switching")
    print("=" * 40)
    
    # Find M2 binary
    m2_path = "/Users/sverrir/Documents/GitHub/M2/M2/BUILD/test-integration/usr-dist/arm64-Darwin-macOS-15.5/bin/M2"
    
    # Test 1: WebApp mode
    print("\n1. Testing WebApp mode with matrix:")
    try:
        cmd = [
            "fish", "-c", 
            f'echo "matrix{{{{1,2}},{{3,4}}}}" | {m2_path} --webapp --no-prompts'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print(f"Return code: {result.returncode}")
        print(f"Output (first 500 chars): {repr(result.stdout[:500])}")
        print(f"Stderr: {repr(result.stderr[:200])}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Standard mode
    print("\n2. Testing Standard mode with matrix:")
    try:
        cmd = [
            "fish", "-c", 
            f'echo "matrix{{{{1,2}},{{3,4}}}}" | {m2_path} --no-prompts'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print(f"Return code: {result.returncode}")
        print(f"Output (first 500 chars): {repr(result.stdout[:500])}")
        print(f"Stderr: {repr(result.stderr[:200])}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Mode switching within session
    print("\n3. Testing mode switching within session:")
    try:
        cmd = [
            "fish", "-c", 
            f'printf "matrix{{{{1,2}},{{3,4}}}}\\ntopLevelMode = global Standard\\nmatrix{{{{5,6}},{{7,8}}}}\\n" | {m2_path} --webapp --no-prompts'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print(f"Return code: {result.returncode}")
        print(f"Output (first 800 chars): {repr(result.stdout[:800])}")
        print(f"Stderr: {repr(result.stderr[:200])}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_direct_m2_modes()