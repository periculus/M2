#!/usr/bin/env python3
"""Test the latest fixes."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel
import time

# Create kernel instance
kernel = M2Kernel()

print("=== Test 1: Output with trace info ===")
# Set gbTrace first
kernel.do_execute("gbTrace = 2;", silent=False)
# Now test gb with trace
result = kernel.do_execute("gb ideal(x^2, y^2)", silent=False)
print(f"Status: {result['status']}")

print("\n=== Test 2: %latex magic ===")
# Test %latex off
result = kernel.do_execute("%latex off", silent=False)
print(f"LaTeX off status: {result['status']}")
print(f"Kernel enable_latex = {kernel.enable_latex}")

# Test %latex on
result = kernel.do_execute("%latex on", silent=False)
print(f"LaTeX on status: {result['status']}")
print(f"Kernel enable_latex = {kernel.enable_latex}")

print("\n=== Test 3: Input echo handling ===")
# Execute something that might produce input echo
result = kernel.do_execute("52:0 on", silent=False)
print(f"Input echo test status: {result['status']}")

# Check recent logs for our fixes
print("\n=== Checking logs for fix verification ===")
import subprocess
try:
    # Check for latex magic handling
    latex_logs = subprocess.check_output(
        "tail -50 ~/.m2_kernel_logs/m2_kernel_*.log | grep -i 'latex.*magic' | tail -5",
        shell=True,
        text=True
    )
    if latex_logs:
        print("LaTeX magic logs:")
        print(latex_logs)
    
    # Check for output filtering
    filter_logs = subprocess.check_output(
        "tail -50 ~/.m2_kernel_logs/m2_kernel_*.log | grep -i 'filter.*output' | tail -5", 
        shell=True,
        text=True
    )
    if filter_logs:
        print("\nOutput filtering logs:")
        print(filter_logs)
except:
    print("Could not read logs")

print("\nAll tests completed!")