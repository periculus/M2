#!/usr/bin/env python3
"""Simple test to see what's sent when LaTeX is disabled."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

print("=== Setup ===")
kernel.do_execute("R = QQ[x,y]", silent=False)

print("\n=== Test with LaTeX enabled ===")
print(f"enable_latex: {kernel.enable_latex}")

# Capture the actual _send_output call
original_send_output = kernel._send_output
output_calls = []

def capture_send_output(result, original_code):
    output_calls.append({
        'result': result.copy(),
        'original_code': original_code,
        'enable_latex': kernel.enable_latex
    })
    return original_send_output(result, original_code)

kernel._send_output = capture_send_output

# Test with LaTeX enabled
kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print(f"Captured {len(output_calls)} output calls")
if output_calls:
    call = output_calls[-1]
    result = call['result']
    print(f"enable_latex during call: {call['enable_latex']}")
    print(f"Result has html: {'html' in result and bool(result['html'])}")
    print(f"Result has latex: {'latex' in result and bool(result['latex'])}")

print("\n=== Disable LaTeX ===")
kernel.do_execute("%latex off", silent=False)
print(f"enable_latex after disable: {kernel.enable_latex}")

print("\n=== Test with LaTeX disabled ===")
output_calls.clear()
kernel.do_execute("matrix{{5,6},{7,8}}", silent=False)

print(f"Captured {len(output_calls)} output calls")
if output_calls:
    call = output_calls[-1]
    result = call['result']
    print(f"enable_latex during call: {call['enable_latex']}")
    print(f"Result has html: {'html' in result and bool(result['html'])}")
    print(f"Result has latex: {'latex' in result and bool(result['latex'])}")

print("\nTest completed!")