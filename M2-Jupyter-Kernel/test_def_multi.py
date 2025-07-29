#!/usr/bin/env python3
"""Test multiple %def commands in a single cell."""

from m2_kernel.kernel import M2Kernel

# Create kernel
kernel = M2Kernel()

# Track some definitions
kernel.code_intelligence.track_definitions('S = QQ[a,b,c,d]', cell_id='cell_1')
kernel.code_intelligence.track_definitions('I = ideal(a^2, b^2)', cell_id='cell_2')
kernel.code_intelligence.track_definitions('f = x -> x^2 + 1', cell_id='cell_3')

# Test multiple %def commands in one cell
outputs = []
def mock_send(socket, msg_type, content):
    outputs.append((msg_type, content))

kernel.send_response = mock_send
kernel.iopub_socket = None

# Execute cell with multiple %def commands
test_code = """
%def S
%def I
%def f
"""

result = kernel.do_execute(test_code.strip(), silent=False)

print(f"Result: {result['status']}")
print(f"Outputs: {len(outputs)}")

# Show each output
for i, (msg_type, content) in enumerate(outputs):
    if 'data' in content and 'text/plain' in content['data']:
        print(f"\nOutput {i+1}:")
        print(content['data']['text/plain'])