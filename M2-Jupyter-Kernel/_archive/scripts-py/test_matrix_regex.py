#!/usr/bin/env python3
"""Test matrix regex matching."""

import re

# Test the actual matrix LaTeX from M2
matrix_latex = r"""17:0matrix{{1,2},{3,4}}

o6 = $\left(\!\begin{array}{cc}
1&amp;2\\
3&amp;4
\end{array}\!\right)$

o6 : Matrix ${\mathbb Z}^{2}\,\longleftarrow \,{\mathbb Z}^{2}$"""

print("Original text:")
print(repr(matrix_latex))
print("\nFormatted:")
print(matrix_latex)

# Test the regex
pattern = r'\$\\left\(\\!\\begin{array}.*?\\end{array}\\!\\right\)\$'
matches = re.findall(pattern, matrix_latex, re.DOTALL)

print(f"\nMatches found: {len(matches)}")
for i, match in enumerate(matches):
    print(f"Match {i+1}: {repr(match)}")

# Test the conversion function
def convert_matrix_latex_to_plain(match):
    latex_content = match.group(1) if hasattr(match, 'group') else match
    print(f"Processing LaTeX content: {repr(latex_content)}")
    
    # Extract matrix entries from LaTeX array  
    array_match = re.search(r'\\begin{array}{[^}]*}(.*?)\\end{array}', latex_content, re.DOTALL)
    if array_match:
        matrix_content = array_match.group(1)
        print(f"Matrix content: {repr(matrix_content)}")
        
        # Replace & with spaces and \\ with newlines
        matrix_content = matrix_content.replace('&amp;', ' ').replace('&', ' ')
        rows = matrix_content.split('\\\\')
        print(f"Rows: {rows}")
        
        if len(rows) > 1:
            # Format as ASCII matrix
            formatted_rows = []
            for row in rows:
                row = row.strip()
                if row:
                    formatted_rows.append(f"| {row} |")
            return '\n     '.join(formatted_rows)
    return '[matrix]'

if matches:
    for match in matches:
        result = convert_matrix_latex_to_plain(match)
        print(f"Converted to: {repr(result)}")

# Test the substitution
def matrix_replacer(match):
    return convert_matrix_latex_to_plain(match.group(0))

result = re.sub(pattern, matrix_replacer, matrix_latex, flags=re.DOTALL)
print(f"\nFinal result:")
print(result)