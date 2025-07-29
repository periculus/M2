#!/usr/bin/env python3
"""Test what M2 actually returns in result['text']."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

# Intercept _send_output to see raw result
original_send_output = kernel._send_output

def debug_raw_result(result, original_code):
    print(f"\n=== Raw M2 Result ===")
    print(f"enable_latex: {kernel.enable_latex}")
    print(f"result['text'] length: {len(result.get('text', ''))}")
    print(f"result['text'] preview: {repr(result.get('text', '')[:200])}")
    if 'html' in result:
        print(f"result['html'] length: {len(result.get('html', ''))}")
        print(f"result['html'] preview: {repr(result.get('html', '')[:200])}")
    if 'latex' in result:
        print(f"result['latex'] length: {len(result.get('latex', ''))}")
        print(f"result['latex'] preview: {repr(result.get('latex', '')[:200])}")
    
    return original_send_output(result, original_code)

kernel._send_output = debug_raw_result

print("=== Test M2 raw output ===")
kernel.do_execute("%latex off", silent=False)
print(f"LaTeX disabled: {not kernel.enable_latex}")

kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print("\nTest completed!")