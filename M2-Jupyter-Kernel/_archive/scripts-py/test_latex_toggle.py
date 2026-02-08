#!/usr/bin/env python3
"""Test LaTeX toggle functionality specifically."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

print("=== Initial state ===")
print(f"enable_latex: {kernel.enable_latex}")

print("\n=== Setting up ring ===")
result = kernel.do_execute("R = QQ[x,y]", silent=False)
print(f"Result status: {result['status']}")

print(f"\n=== Before %latex off ===")
print(f"enable_latex: {kernel.enable_latex}")

print("\n=== Running %latex off ===")
result = kernel.do_execute("%latex off", silent=False)
print(f"Magic result status: {result['status']}")
print(f"enable_latex after magic: {kernel.enable_latex}")

print("\n=== Testing matrix with LaTeX disabled ===")
result = kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)
print(f"Matrix result status: {result['status']}")
print(f"enable_latex during matrix: {kernel.enable_latex}")

print("\n=== Running %latex on ===")
result = kernel.do_execute("%latex on", silent=False)
print(f"Magic result status: {result['status']}")
print(f"enable_latex after enabling: {kernel.enable_latex}")

print("\n=== Testing matrix with LaTeX enabled ===")
result = kernel.do_execute("matrix{{5,6},{7,8}}", silent=False)
print(f"Matrix result status: {result['status']}")
print(f"enable_latex during matrix: {kernel.enable_latex}")

print("\nTest completed!")