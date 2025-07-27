"""
Enhanced help functionality for M2 Jupyter kernel.

This module provides better shift-tab help with method signatures and documentation.
"""

import re
from typing import Dict, List, Optional, Tuple


def parse_methods_output(output: str) -> List[Dict[str, str]]:
    """
    Parse M2 methods output into structured format.
    
    Handles both plain text and LaTeX/HTML formats.
    """
    methods = []
    
    # First try LaTeX format (new webapp mode)
    # Pattern: \left(\texttt{matrix},\,\texttt{String}\right)
    latex_pattern = r'\\left\(\\texttt\{(\w+)\}(?:,\\,\\texttt\{(\w+)\})*\\right\)'
    
    for match in re.finditer(latex_pattern, output):
        parts = match.groups()
        func_name = parts[0]
        # Extract all parameter types from the full match
        param_pattern = r'\\texttt\{(\w+)\}'
        all_params = re.findall(param_pattern, match.group(0))
        
        if len(all_params) >= 2:
            params = all_params[1:]  # Skip function name
            methods.append({
                'index': str(len(methods)),
                'function': func_name,
                'parameters': params,
                'signature': f"{func_name}({', '.join(params)})"
            })
    
    # If no LaTeX format found, try plain text format
    if not methods:
        # Pattern to match method entries like {0 => (matrix, String)}
        plain_pattern = r'\{(\d+)\s*=>\s*\(([\w\s,]+)\)\s*\}'
        
        for match in re.finditer(plain_pattern, output):
            index = match.group(1)
            signature = match.group(2).strip()
            
            # Split signature into parts
            parts = [p.strip() for p in signature.split(',')]
            
            if len(parts) >= 2:
                func_name = parts[0]
                params = parts[1:]
                
                methods.append({
                    'index': index,
                    'function': func_name,
                    'parameters': params,
                    'signature': f"{func_name}({', '.join(params)})"
                })
    
    return methods


def format_help_output(word: str, methods: List[Dict[str, str]], 
                      additional_info: Optional[str] = None) -> str:
    """
    Format help output for display in Jupyter.
    
    Returns formatted string with function signatures and info.
    """
    lines = []
    
    # Header
    lines.append(f"Help for '{word}':")
    lines.append("=" * (len(lines[0]) + 5))
    
    # Additional info if available
    if additional_info:
        lines.append(additional_info)
        lines.append("")
    
    # Method signatures
    if methods:
        lines.append("Method signatures:")
        for method in methods:
            lines.append(f"  • {method['signature']}")
    else:
        lines.append("No method signatures found.")
    
    # Add usage examples for common functions
    examples = get_usage_examples(word)
    if examples:
        lines.append("")
        lines.append("Examples:")
        for example in examples:
            lines.append(f"  {example}")
    
    return "\n".join(lines)


def format_help_html(word: str, methods: List[Dict[str, str]], 
                    additional_info: Optional[str] = None) -> str:
    """Format help output as HTML for better display."""
    
    html = [f"<div class='m2-help'>"]
    html.append(f"<h4>Help for '{word}'</h4>")
    
    if additional_info:
        html.append(f"<p>{additional_info}</p>")
    
    if methods:
        html.append("<h5>Method signatures:</h5>")
        html.append("<ul style='font-family: monospace;'>")
        for method in methods:
            # Highlight parameter types
            sig = method['signature']
            sig = re.sub(r'\b(Ring|List|Matrix|Ideal|Module|Number|String|Vector)\b', 
                        r'<span style="color: #008080; font-weight: bold;">\1</span>', sig)
            html.append(f"<li>{sig}</li>")
        html.append("</ul>")
    
    examples = get_usage_examples(word)
    if examples:
        html.append("<h5>Examples:</h5>")
        html.append("<pre style='background-color: #f5f5f5; padding: 10px;'>")
        html.extend(examples)
        html.append("</pre>")
    
    html.append("</div>")
    
    # Add some CSS
    css = """
    <style>
    .m2-help {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 10px;
    }
    .m2-help h4 {
        color: #1c701c;
        margin-bottom: 10px;
    }
    .m2-help h5 {
        color: #333;
        margin-top: 15px;
        margin-bottom: 5px;
    }
    .m2-help ul {
        margin: 5px 0;
    }
    .m2-help li {
        margin: 3px 0;
    }
    </style>
    """
    
    return css + "\n".join(html)


def get_usage_examples(word: str) -> List[str]:
    """Get usage examples for common M2 functions."""
    
    examples = {
        'matrix': [
            'matrix {{1,2,3},{4,5,6}}  -- 2x3 matrix',
            'matrix(QQ, {{1,2},{3,4}})  -- matrix over QQ',
            'matrix(R, {{x,y},{y,x^2}})  -- matrix over ring R'
        ],
        'ideal': [
            'ideal(x^2, y^2, x*y)  -- ideal from generators',
            'ideal matrix {{x,y,z}}  -- ideal from 1-row matrix',
            'ideal(R, {x^2-1, y^2-1})  -- ideal in ring R'
        ],
        'ring': [
            'ring(I)  -- get ring of ideal I',
            'ring(M)  -- get ring of matrix M'
        ],
        'gb': [
            'gb I  -- compute Gröbner basis',
            'gb(I, DegreeLimit=>10)  -- with degree limit'
        ],
        'res': [
            'res M  -- compute resolution',
            'res(M, LengthLimit=>5)  -- limit length'
        ],
        'QQ': [
            'QQ[x,y,z]  -- polynomial ring over rationals',
            'QQ[x,y,z,Degrees=>{2,3,1}]  -- with weights'
        ],
        'ZZ': [
            'ZZ[x,y]  -- polynomial ring over integers',
            'ZZ/101  -- integers mod 101'
        ]
    }
    
    return examples.get(word, [])


def get_function_info(word: str) -> Dict[str, str]:
    """Get basic information about M2 functions."""
    
    info = {
        'matrix': {
            'type': 'MethodFunctionWithOptions',
            'description': 'Create a matrix from a list of lists or other input',
            'returns': 'Matrix'
        },
        'ideal': {
            'type': 'MethodFunctionSingle',
            'description': 'Create an ideal from generators',
            'returns': 'Ideal'
        },
        'ring': {
            'type': 'MethodFunction',
            'description': 'Get the ring of an object or create a ring',
            'returns': 'Ring'
        },
        'gb': {
            'type': 'MethodFunctionWithOptions',
            'description': 'Compute a Gröbner basis',
            'returns': 'GroebnerBasis',
            'options': ['DegreeLimit', 'PairLimit', 'Strategy']
        },
        'res': {
            'type': 'MethodFunctionWithOptions',
            'description': 'Compute a free resolution',
            'returns': 'ChainComplex',
            'options': ['LengthLimit', 'DegreeLimit', 'Strategy']
        },
        'ker': {
            'type': 'MethodFunction',
            'description': 'Compute the kernel of a matrix or map',
            'returns': 'Module or Ideal'
        },
        'coker': {
            'type': 'MethodFunction',
            'description': 'Compute the cokernel of a matrix or map',
            'returns': 'Module'
        },
        'QQ': {
            'type': 'Ring',
            'description': 'The field of rational numbers'
        },
        'ZZ': {
            'type': 'Ring',
            'description': 'The ring of integers'
        }
    }
    
    return info.get(word, {})