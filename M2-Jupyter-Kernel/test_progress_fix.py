#!/usr/bin/env python
"""Test progress indicators with real M2 kernel execution"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel
import time

def test_progress_indicators():
    """Test that progress indicators work with the fixed kernel"""
    
    print("Testing progress indicators...")
    
    # Create kernel instance
    kernel = M2Kernel()
    
    # Test cases that should show progress
    test_codes = [
        "gb I",
        "res I", 
        "decompose I"
    ]
    
    for code in test_codes:
        print(f"\n--- Testing: {code} ---")
        
        # Check if it's detected as long-running
        is_long = kernel.progress_tracker.is_long_running_operation(code)
        op_type = kernel.progress_tracker.detect_operation_type(code)
        
        print(f"Long-running: {is_long}, Operation type: {op_type}")
        
        if is_long:
            print("This should show progress indicators when executed in Jupyter")
        else:
            print("This will NOT show progress indicators")
    
    # Test actual execution with a simple case
    print(f"\n--- Testing actual execution ---")
    try:
        result = kernel.do_execute("1 + 1", False)
        print(f"Execution result: {result['status']}")
    except Exception as e:
        print(f"Execution failed: {e}")
    
    # Cleanup
    try:
        kernel.do_shutdown(False)
    except:
        pass

if __name__ == "__main__":
    test_progress_indicators()