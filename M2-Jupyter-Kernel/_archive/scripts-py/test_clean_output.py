#!/usr/bin/env python3
"""Test the cleaned output that's sent to Jupyter."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

# Intercept the final send_response to see cleaned output
original_send_response = kernel.send_response

def capture_final_output(socket, msg_type, content):
    if msg_type == 'execute_result':
        data = content.get('data', {})
        print(f"\n*** FINAL CLEANED OUTPUT ***")
        print(f"enable_latex: {kernel.enable_latex}")
        print(f"MIME types: {list(data.keys())}")
        if 'text/plain' in data:
            plain = data['text/plain']
            print(f"Clean text length: {len(plain)}")
            print(f"Clean text content: {repr(plain)}")
            print(f"Contains LaTeX: {'$' in plain}")
            print(f"Contains HTML: {'<' in plain}")
    return original_send_response(socket, msg_type, content)

kernel.send_response = capture_final_output

print("=== Test LaTeX cleaning ===")
kernel.do_execute("%latex off", silent=False)
print(f"LaTeX disabled: {not kernel.enable_latex}")

kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print("\n=== Test LaTeX enabled for comparison ===")
kernel.do_execute("%latex on", silent=False)
kernel.do_execute("matrix{{5,6},{7,8}}", silent=False)

print("\nTest completed!")