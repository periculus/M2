#!/usr/bin/env python3
"""
Test that magic commands are properly displayed.
"""

import sys
import io
from contextlib import redirect_stdout

# Mock the kernel environment
class MockKernel:
    def __init__(self):
        self.execution_count = 1
        self.outputs = []
    
    def _send_output(self, result, code):
        self.outputs.append((result, code))
        print(f"Output sent: {result.get('text', '')}")
    
    def send_response(self, *args):
        pass

# Test the magic handling
from m2_kernel.m2_process import M2Process

process = M2Process()

# Test %pi magic
print("Testing %pi magic:")
result = process.execute("%pi 2")
print(f"Result: {result}")
print(f"Text: {result.get('text')}")
print(f"Success: {result.get('success')}")
print()

# Test %help magic  
print("Testing %help magic:")
result = process.execute("%help")
print(f"Success: {result.get('success')}")
print(f"Text length: {len(result.get('text', ''))}")
print(f"First line: {result.get('text', '').split(chr(10))[0] if result.get('text') else 'None'}")
print()

# Test invalid magic
print("Testing invalid magic:")
result = process.execute("%invalid")
print(f"Success: {result.get('success')}")
print(f"Text: {result.get('text')}")
print()

# Test %%pi magic
print("Testing %%pi magic:")
result = process.execute("%%pi 1")
print(f"Result: {result}")
print(f"Text: {result.get('text')}")
print(f"Success: {result.get('success')}")