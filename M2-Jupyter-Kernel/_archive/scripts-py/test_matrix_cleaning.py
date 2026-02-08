#!/usr/bin/env python3
"""Test matrix and GroebnerBasis cleaning specifically."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

# Set up
kernel.do_execute("R = QQ[x,y,z]", silent=False)
kernel.do_execute("gbTrace = 2;", silent=False)  
kernel.do_execute("L = ideal(x^2 - y, y^2 - z)", silent=False)

# Intercept the final send_response to see cleaned output
original_send_response = kernel.send_response

def capture_cleaned_output(socket, msg_type, content):
    if msg_type == 'execute_result':
        data = content.get('data', {})
        if 'text/plain' in data:
            plain = data['text/plain']
            print(f"\n*** CLEANED OUTPUT ***")
            print(f"enable_latex: {kernel.enable_latex}")
            print("Cleaned text:")
            print(plain)
            print("---")
    return original_send_response(socket, msg_type, content)

kernel.send_response = capture_cleaned_output

print("=== Test with LaTeX disabled ===")
kernel.do_execute("%latex off", silent=False)

print("\n--- Testing GroebnerBasis output ---")
kernel.do_execute("gb L", silent=False)

print("\n--- Testing matrix output ---")
kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print("\nTest completed!")