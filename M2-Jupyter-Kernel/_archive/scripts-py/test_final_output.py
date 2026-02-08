#!/usr/bin/env python3
"""Test final output sent to Jupyter."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

print("=== Setup ===")
kernel.do_execute("R = QQ[x,y]", silent=False)

# Capture send_response calls
original_send_response = kernel.send_response
response_calls = []

def capture_send_response(socket, msg_type, content):
    if msg_type == 'display_data':
        response_calls.append({
            'msg_type': msg_type,
            'content': content,
            'enable_latex': kernel.enable_latex
        })
    return original_send_response(socket, msg_type, content)

kernel.send_response = capture_send_response

print("\n=== Test with LaTeX disabled ===")
kernel.do_execute("%latex off", silent=False)
print(f"LaTeX disabled: {not kernel.enable_latex}")

response_calls.clear()
kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print(f"\nCaptured {len(response_calls)} display_data calls")
for i, call in enumerate(response_calls):
    print(f"\nCall {i+1}:")
    print(f"  enable_latex during call: {call['enable_latex']}")
    data = call['content'].get('data', {})
    print(f"  MIME types: {list(data.keys())}")
    
    if 'text/plain' in data:
        plain = data['text/plain']
        print(f"  text/plain length: {len(plain)}")
        print(f"  text/plain preview: {repr(plain[:100])}")
    
    if 'text/html' in data:
        html = data['text/html']
        print(f"  text/html length: {len(html)}")
        print(f"  text/html contains LaTeX: {'$' in html or 'begin{array}' in html}")
        print(f"  text/html preview: {repr(html[:200])}")

print("\nTest completed!")