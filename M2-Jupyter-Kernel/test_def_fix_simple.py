#!/usr/bin/env python3
"""Simple test of %def fix."""

from m2_kernel.kernel import M2Kernel

# Create kernel
kernel = M2Kernel()

# Track definitions
kernel.code_intelligence.track_definitions('S = QQ[a,b,c,d]', cell_id='cell_1')

# Test with a single %def command
outputs = []
def mock_send(socket, msg_type, content):
    outputs.append((msg_type, content))

kernel.send_response = mock_send
kernel.iopub_socket = None

# Execute
result = kernel.do_execute('%def S', silent=False)

print(f"Result: {result['status']}")
print(f"Outputs: {len(outputs)}")

for msg_type, content in outputs:
    if 'data' in content and 'text/plain' in content['data']:
        print(f"\nOutput text:\n{content['data']['text/plain']}")