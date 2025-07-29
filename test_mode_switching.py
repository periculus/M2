#!/usr/bin/env python3

"""
Test script for M2 Jupyter kernel mode switching functionality.
This script tests the dynamic mode switching between Standard and WebApp modes.
"""

import subprocess
import sys
import time
import json

def run_m2_command(code):
    """Run a command through the M2 kernel and return the result."""
    # Use the M2 kernel directly 
    try:
        result = subprocess.run([
            sys.executable, '-c', f'''
import sys
sys.path.insert(0, "/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel")
from m2_kernel.m2_process import M2Process

# Create M2 process
m2 = M2Process(None)
result = m2.execute("{code}")
print(json.dumps(result, indent=2))
'''
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return json.loads(result.stdout.strip())
        else:
            return {"error": result.stderr, "success": False}
            
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

def test_mode_switching():
    """Test the mode switching functionality."""
    print("Testing M2 Mode Switching")
    print("=" * 40)
    
    # Test matrix output in WebApp mode (should contain LaTeX)
    print("\n1. Testing matrix in WebApp mode:")
    result = run_m2_command("matrix{{1,2},{3,4}}")
    if result.get('success'):
        print(f"Success: {result['success']}")
        print(f"Contains LaTeX tags: {'\\\\' in result.get('text', '')}")
        print(f"Text output: {result.get('text', '')[:200]}...")
    else:
        print(f"Error: {result.get('error')}")
    
    # Test switching to Standard mode
    print("\n2. Testing switch to Standard mode:")
    result = run_m2_command("%latex off")
    if result.get('success'):
        print(f"Mode switch result: {result.get('text', '')}")
    else:
        print(f"Error: {result.get('error')}")
    
    # Test matrix output in Standard mode (should be plain text)
    print("\n3. Testing matrix in Standard mode:")
    result = run_m2_command("matrix{{5,6},{7,8}}")
    if result.get('success'):
        print(f"Success: {result['success']}")
        print(f"Contains LaTeX tags: {'\\\\' in result.get('text', '')}")
        print(f"Text output: {result.get('text', '')[:200]}...")
    else:
        print(f"Error: {result.get('error')}")
    
    # Test switching back to WebApp mode
    print("\n4. Testing switch back to WebApp mode:")
    result = run_m2_command("%latex on")
    if result.get('success'):
        print(f"Mode switch result: {result.get('text', '')}")
    else:
        print(f"Error: {result.get('error')}")
    
    # Test matrix output in WebApp mode again
    print("\n5. Testing matrix in WebApp mode again:")
    result = run_m2_command("matrix{{9,10},{11,12}}")
    if result.get('success'):
        print(f"Success: {result['success']}")
        print(f"Contains LaTeX tags: {'\\\\' in result.get('text', '')}")
        print(f"Text output: {result.get('text', '')[:200]}...")
    else:
        print(f"Error: {result.get('error')}")

if __name__ == "__main__":
    test_mode_switching()