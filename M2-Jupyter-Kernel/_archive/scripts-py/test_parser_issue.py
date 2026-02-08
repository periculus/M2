#!/usr/bin/env python3
"""Test the cell parser to see why it's not splitting statements."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.cell_parser import M2CellParser

# Test code that should be split into multiple statements
test_code = """-- Test 4: Multiple commands with proper output ordering
R = QQ[x,y,z]
gbTrace = 1
L = ideal(x^2 - y, y^2 - z)
gb L
res L"""

parser = M2CellParser()
parsed = parser.parse_cell(test_code)

print(f"Cell magic: {parsed.cell_magic}")
print(f"Number of statements: {len(parsed.statements)}")

for i, stmt in enumerate(parsed.statements):
    print(f"\nStatement {i+1}:")
    print(f"  Code: {repr(stmt.code)}")
    print(f"  Line magic: {stmt.line_magic}")
    print(f"  Lines: {stmt.start_line}-{stmt.end_line}")