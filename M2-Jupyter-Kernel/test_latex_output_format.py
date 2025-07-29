#!/usr/bin/env python3
"""Test LaTeX output format changes."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel
from unittest.mock import Mock

# Create kernel instance
kernel = M2Kernel()

# Mock the send_response method to capture output
captured_outputs = []
original_send_response = kernel.send_response

def mock_send_response(socket, msg_type, content):
    captured_outputs.append({
        'msg_type': msg_type,
        'content': content
    })
    return original_send_response(socket, msg_type, content)

kernel.send_response = mock_send_response

print("=== Setting up ===")
kernel.do_execute("R = QQ[x,y]", silent=False)

print("\n=== LaTeX enabled - expect HTML output ===")
captured_outputs.clear()
kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

for output in captured_outputs:
    if output['msg_type'] == 'display_data':
        data = output['content'].get('data', {})
        print(f"Has text/html: {'text/html' in data}")
        print(f"Has text/plain: {'text/plain' in data}")
        if 'text/html' in data:
            html_content = data['text/html']
            print(f"HTML length: {len(html_content)}")
            print(f"Contains LaTeX: {'$' in html_content or 'begin{array}' in html_content}")

print("\n=== Disabling LaTeX ===")
kernel.do_execute("%latex off", silent=False)

print("\n=== LaTeX disabled - expect plain text only ===")
captured_outputs.clear()
kernel.do_execute("matrix{{5,6},{7,8}}", silent=False)

for output in captured_outputs:
    if output['msg_type'] == 'display_data':
        data = output['content'].get('data', {})
        print(f"Has text/html: {'text/html' in data}")
        print(f"Has text/plain: {'text/plain' in data}")
        if 'text/html' in data:
            html_content = data['text/html']
            print(f"HTML length: {len(html_content)}")
            print(f"Contains LaTeX: {'$' in html_content or 'begin{array}' in html_content}")
        if 'text/plain' in data:
            plain_content = data['text/plain']
            print(f"Plain text length: {len(plain_content)}")

print("\nTest completed!")