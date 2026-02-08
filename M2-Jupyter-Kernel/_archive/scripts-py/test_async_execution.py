#!/usr/bin/env python3
"""
Test the async execution feature of the M2 kernel.

To enable async execution, add this to your Jupyter config:
    c.M2Kernel.use_async_execution = True

Or set the environment variable:
    export M2KERNEL_USE_ASYNC_EXECUTION=true
"""

import asyncio
import time
from jupyter_client import KernelManager
import json


def test_async_execution():
    """Test async execution with multiline code."""
    
    # Start kernel
    km = KernelManager(kernel_name='macaulay2')
    km.start_kernel()
    kc = km.client()
    kc.start_channels()
    
    # Wait for kernel to be ready
    kc.wait_for_ready()
    
    print("Testing Async Execution Mode")
    print("=" * 50)
    
    # Test 1: Simple multiline statement
    print("\nTest 1: Multiline statement")
    print("-" * 30)
    code1 = """R = QQ[x,y,z]
I = ideal(
  x^2 + y^2,
  x*y - z^2
)
gb I"""
    
    print(f"Code:\n{code1}")
    msg_id = kc.execute(code1)
    
    # Collect responses
    outputs = []
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=0.5)
            if msg['parent_header'].get('msg_id') == msg_id:
                msg_type = msg['header']['msg_type']
                if msg_type == 'stream':
                    outputs.append(('stream', msg['content']['text']))
                elif msg_type == 'execute_result':
                    outputs.append(('result', msg['content']['data']))
                elif msg_type == 'display_data':
                    outputs.append(('display', msg['content']['data']))
                elif msg_type == 'status':
                    if msg['content']['execution_state'] == 'idle':
                        break
        except:
            break
    
    print("\nOutputs:")
    for output_type, content in outputs:
        print(f"  {output_type}: {content}")
    
    # Test 2: Multiple statements with magic
    print("\n\nTest 2: Multiple statements with progress")
    print("-" * 30)
    code2 = """%%pi 1
-- Setup polynomial ring
R = QQ[x,y,z,w]

-- Create ideal
I = ideal(x^2, y^2, z^2, w^2)

-- Compute Groebner basis
gb I

-- Compute resolution  
res I"""
    
    print(f"Code:\n{code2}")
    msg_id = kc.execute(code2)
    
    # Collect responses with timing
    start_time = time.time()
    outputs = []
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=0.5)
            if msg['parent_header'].get('msg_id') == msg_id:
                msg_type = msg['header']['msg_type']
                elapsed = time.time() - start_time
                
                if msg_type in ['stream', 'execute_result', 'display_data']:
                    outputs.append((elapsed, msg_type, msg['content']))
                elif msg_type == 'status':
                    if msg['content']['execution_state'] == 'idle':
                        break
        except:
            break
    
    print("\nTimeline of outputs:")
    for elapsed, msg_type, content in outputs:
        print(f"  [{elapsed:.2f}s] {msg_type}: {json.dumps(content, indent=2)[:100]}...")
    
    # Test 3: Hanging operator continuation
    print("\n\nTest 3: Hanging operator continuation")
    print("-" * 30)
    code3 = """a = 1 +
    2 +
    3 +
    4
a"""
    
    print(f"Code:\n{code3}")
    msg_id = kc.execute(code3)
    
    # Get result
    result = None
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=0.5)
            if msg['parent_header'].get('msg_id') == msg_id:
                if msg['header']['msg_type'] == 'execute_result':
                    result = msg['content']['data'].get('text/plain', '')
                elif msg['header']['msg_type'] == 'status':
                    if msg['content']['execution_state'] == 'idle':
                        break
        except:
            break
    
    print(f"Result: {result}")
    
    # Shutdown kernel
    kc.stop_channels()
    km.shutdown_kernel()
    
    print("\n" + "=" * 50)
    print("Test completed!")


if __name__ == "__main__":
    test_async_execution()