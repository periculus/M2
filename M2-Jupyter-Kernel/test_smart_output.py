#!/usr/bin/env python3
"""
Test smart output handling for large LaTeX results.
"""

# Test cases for smart LaTeX output handling

test_cases = """
# Small output - should use LaTeX
1. Simple polynomial:
   R = QQ[x,y,z]
   I = ideal(x^2 + y^2 - 1)
   I

2. Small matrix (3x3):
   M = matrix{{1,2,3},{4,5,6},{7,8,9}}
   M

# Large output - should disable LaTeX
3. Large matrix (20x20):
   N = random(ZZ^20, ZZ^20)
   N

4. Long polynomial (100+ terms):
   R = QQ[x]
   f = sum for i from 1 to 100 list x^i
   f

5. Complex nested structure:
   S = QQ[a,b,c,d,e,f,g,h]
   J = ideal(a*b*c + d*e*f + g*h, a^2*b + c^2*d + e^2*f + g^2*h)
   res J  -- Resolution can be large

# User can check output to see:
# - Small outputs show with LaTeX (math notation)
# - Large outputs show plain text with blue notice
"""

print("Test cases for smart output handling:")
print("=====================================")
print(test_cases)
print("\nTo test in Jupyter:")
print("1. Run each test case in a separate cell")
print("2. Small outputs should show LaTeX rendering")
print("3. Large outputs should show plain text with a notice:")
print("   '⚡ LaTeX rendering disabled for large output. Showing plain text for better performance.'")