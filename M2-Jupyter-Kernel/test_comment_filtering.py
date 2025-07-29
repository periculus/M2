#!/usr/bin/env python3
"""Test comment filtering in cell parser."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.cell_parser import M2CellParser

# Test the exact cell from the notebook that's causing problems
test_cell_3 = """-- Test 3: Test %pi magic parsing
%pi 2 gb J"""

parser = M2CellParser()
parsed = parser.parse_cell(test_cell_3)

print(f"Cell magic: {parsed.cell_magic}")
print(f"Number of statements: {len(parsed.statements)}")

for i, stmt in enumerate(parsed.statements):
    print(f"\nStatement {i+1}:")
    print(f"  Code: {repr(stmt.code)}")
    print(f"  Line magic: {stmt.line_magic}")
    print(f"  Lines: {stmt.start_line}-{stmt.end_line}")

# Test cell 5
test_cell_5 = """-- Test 5: LaTeX toggle
%latex off"""

print("\n" + "="*50)
print("Testing cell 5:")
parsed = parser.parse_cell(test_cell_5)

print(f"Cell magic: {parsed.cell_magic}")
print(f"Number of statements: {len(parsed.statements)}")

for i, stmt in enumerate(parsed.statements):
    print(f"\nStatement {i+1}:")
    print(f"  Code: {repr(stmt.code)}")
    print(f"  Line magic: {stmt.line_magic}")
    print(f"  Lines: {stmt.start_line}-{stmt.end_line}")