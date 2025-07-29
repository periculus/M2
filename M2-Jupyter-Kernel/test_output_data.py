#!/usr/bin/env python3
"""Test the actual output_data structure."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

# Create kernel instance
kernel = M2Kernel()

# Modify _send_output to show what data is sent
original_send_output = kernel._send_output

def debug_send_output(result, original_code):
    print(f"\n=== _send_output called ===")
    print(f"enable_latex: {kernel.enable_latex}")
    print(f"result keys: {list(result.keys())}")
    print(f"has html: {'html' in result and bool(result['html'])}")
    print(f"has latex: {'latex' in result and bool(result['latex'])}")
    print(f"has other_output: {'other_output' in result and bool(result['other_output'])}")
    
    # Call original and capture what's sent
    original_send_response = kernel.send_response
    
    def capture_data(socket, msg_type, content):
        print(f"\nSending {msg_type}")
        if msg_type == 'display_data':
            data = content.get('data', {})
            print(f"*** FINAL OUTPUT DATA ***")
            print(f"MIME types sent: {list(data.keys())}")
            if 'text/html' in data:
                html = data['text/html']
                print(f"HTML length: {len(html)}")
                print(f"HTML has LaTeX: {'$' in html or 'begin{array}' in html}")
                print(f"HTML preview: {repr(html[:100])}")
            if 'text/plain' in data:
                plain = data['text/plain']
                print(f"Plain text length: {len(plain)}")
                print(f"Plain text preview: {repr(plain[:100])}")
        return original_send_response(socket, msg_type, content)
    
    kernel.send_response = capture_data
    result = original_send_output(result, original_code)
    kernel.send_response = original_send_response
    return result

kernel._send_output = debug_send_output

print("=== Test with LaTeX disabled ===")
kernel.do_execute("%latex off", silent=False)
kernel.do_execute("matrix{{1,2},{3,4}}", silent=False)

print("\nTest completed!")