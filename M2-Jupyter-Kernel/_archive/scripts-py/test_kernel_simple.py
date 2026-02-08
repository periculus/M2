#!/usr/bin/env python3
"""Simple test to check if kernel is working properly."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

# Test 1: Simple computation
print("Test 1: Simple matrix")
result = kernel.do_execute("matrix {{1,2},{3,4}}", silent=False)
print(f"Status: {result['status']}")
print(f"Execution count: {result.get('execution_count')}")

# Test 2: Magic command
print("\nTest 2: Magic command")
result = kernel.do_execute("%help", silent=False)
print(f"Status: {result['status']}")

# Test 3: Check latest log entries
print("\nChecking recent logs...")
import subprocess
try:
    logs = subprocess.check_output(
        "tail -n 50 ~/.m2_kernel_logs/m2_kernel_*.log | grep -E '(latex|html|webapp|control)' | tail -20",
        shell=True,
        text=True
    )
    print("Recent relevant logs:")
    print(logs)
except:
    print("Could not read logs")