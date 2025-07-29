#!/usr/bin/env python3
"""Test that comments are not sent to M2."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

print("=== Test comment filtering ===")
# Test the exact content from cell 3 that was causing problems
result = kernel.do_execute("""-- Test 3: Test %pi magic parsing
%pi 2 gb ideal(x^2, y^2)""", silent=False)

print(f"Result status: {result['status']}")

print("\n=== Test comment with %latex ===")
# Test the exact content from cell 5 that was causing problems  
result = kernel.do_execute("""-- Test 5: LaTeX toggle
%latex off""", silent=False)

print(f"Result status: {result['status']}")
print(f"enable_latex after: {kernel.enable_latex}")

print("\nTest completed!")