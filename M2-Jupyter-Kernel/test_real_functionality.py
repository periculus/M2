#!/usr/bin/env python3
"""Test the real functionality that was reported broken."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel
import time

# Create kernel instance
kernel = M2Kernel()

print("=== Test 1: Multiple commands with semicolon suppression ===")
# Test multiple commands with semicolon
result = kernel.do_execute("""R = QQ[x,y,z]
gbTrace = 2;
L = ideal(x^2 - y, y^2 - z)
gb L""", silent=False)
print(f"Status: {result['status']}")

print("\n=== Test 2: %latex off and on ===")
# Test %latex toggle
result = kernel.do_execute("%latex off", silent=False)
print(f"LaTeX off - kernel state: {kernel.enable_latex}")

# Test with some math
result = kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)
print(f"Matrix result status: {result['status']}")

# Turn LaTeX back on
result = kernel.do_execute("%latex on", silent=False)
print(f"LaTeX on - kernel state: {kernel.enable_latex}")

print("\n=== Test 3: Check if semicolon truly suppresses output ===")
# This should not show output
result = kernel.do_execute("J = ideal(x^2, y^3);", silent=False)
print(f"Semicolon command status: {result['status']}")

# This should show output
result = kernel.do_execute("J", silent=False)
print(f"Show J status: {result['status']}")

print("\nAll tests completed!")