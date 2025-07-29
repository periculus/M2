#!/usr/bin/env python3
"""Test the output ordering and semicolon fixes."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

print("=== Test 1: Semicolon suppression ===")
result = kernel.do_execute("gbTrace = 2;", silent=False)
print(f"Status: {result['status']}")
print(f"Should have no output (semicolon suppression)")

print("\n=== Test 2: Multiple commands ===")
code = """R = QQ[x,y,z]
I = ideal(x^2-y, y^2-z)  
gb I
res I"""
result = kernel.do_execute(code, silent=False)
print(f"Status: {result['status']}")

print("\n=== Test 3: LaTeX toggle ===")
# First disable LaTeX
result = kernel.do_execute("%latex off", silent=False)
print(f"LaTeX disabled status: {result['status']}")
print(f"enable_latex = {kernel.enable_latex}")

# Try matrix output
result = kernel.do_execute("matrix {{1,2},{3,4}}", silent=False)
print(f"Matrix result status: {result['status']}")

# Re-enable LaTeX
result = kernel.do_execute("%latex on", silent=False)
print(f"LaTeX enabled status: {result['status']}")
print(f"enable_latex = {kernel.enable_latex}")

print("\n=== Test 4: Progress with specific command ===")
result = kernel.do_execute("%pi 2", silent=False)
code = """S = QQ[a,b,c,d]
J = ideal(a^2-b*c, b^2-c*d)
gb J
res J"""
result = kernel.do_execute(code, silent=False)
print(f"Multi-command with progress status: {result['status']}")

print("\nAll tests completed!")