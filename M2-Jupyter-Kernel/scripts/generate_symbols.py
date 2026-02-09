#!/usr/bin/env python3
"""Generate m2Symbols.json for CodeMirror autocompletion.

Reads the M2 vim dictionary and categorizes symbols into
keyword/type/function/constant for use by the JupyterLab extension.
"""

import json
import os
import sys

# Known keywords (control flow, logical operators, etc.)
KEYWORDS = {
    'if', 'then', 'else', 'when', 'do', 'while', 'for', 'from', 'to', 'in',
    'by', 'of', 'break', 'continue', 'return', 'try', 'catch', 'throw',
    'local', 'global', 'threadLocal', 'export', 'exportMutable',
    'symbol', 'new', 'use', 'load', 'needs',
    'and', 'or', 'not', 'xor',
    'true', 'false', 'null',
    'time', 'elapsedTime', 'shield', 'debug',
}

# Known constants
CONSTANTS = {
    'pi', 'ii', 'ee', 'oo', 'infinity',
    'InfiniteNumber', 'IndeterminateNumber',
    'EulerConstant', 'CatalanConstant', 'GoldenRatio',
    'stdio', 'stderr',
}

# Known types (explicit list for precision, plus pattern-based heuristic)
KNOWN_TYPES = {
    'ZZ', 'QQ', 'RR', 'CC', 'RRi', 'GF', 'Boolean', 'Nothing', 'Thing',
    'Ring', 'Ideal', 'Module', 'Matrix', 'MutableMatrix', 'Vector',
    'ChainComplex', 'ChainComplexMap', 'GradedModule', 'GradedModuleMap',
    'PolynomialRing', 'QuotientRing', 'FractionField', 'GaloisField',
    'Monoid', 'MonoidElement', 'MonomialIdeal', 'MonomialOrder',
    'BasicList', 'List', 'Sequence', 'Array', 'MutableList',
    'HashTable', 'MutableHashTable', 'OptionTable', 'Tally', 'Set', 'Dictionary',
    'Net', 'Symbol', 'Number', 'String', 'Type', 'Function',
    'RingElement', 'RingMap', 'InexactNumber', 'InexactField',
    'CoherentSheaf', 'SheafOfRings', 'SheafMap',
    'Variety', 'ProjectiveVariety', 'AffineVariety',
    'File', 'Database', 'Method', 'Command',
    'Package', 'Manipulator', 'Option', 'IndexedVariable',
    'Expression', 'Holder', 'BinaryOperation',
    'ScriptedFunctor', 'SelfInitializingType', 'WrapperType',
    'Resolution', 'GroebnerBasis', 'LocalRing', 'Elimination',
    'ProjectiveHilbertPolynomial', 'EngineRing', 'FreeModule',
    'ImmutableType', 'CacheFunction', 'CacheTable',
    'GeneralOrderedMonoid', 'OrderedMonoid', 'ProductOrder',
    'Descent', 'RingFamily', 'InexactFieldFamily',
    'ComplexField', 'RealField',
}

# Brief descriptions for the most commonly used symbols
DESCRIPTIONS = {
    # Functions
    'gb': 'Compute a Groebner basis',
    'res': 'Compute a free resolution',
    'ideal': 'Create an ideal',
    'matrix': 'Create a matrix',
    'ring': 'Create a ring',
    'map': 'Create a ring or module map',
    'ker': 'Compute the kernel',
    'coker': 'Compute the cokernel',
    'image': 'Compute the image',
    'decompose': 'Decompose a variety or ideal',
    'primaryDecomposition': 'Primary decomposition of an ideal',
    'minimalPrimes': 'Minimal primes of an ideal',
    'associatedPrimes': 'Associated primes of a module',
    'saturate': 'Saturate an ideal',
    'quotient': 'Ideal quotient',
    'hilbertFunction': 'Hilbert function value',
    'hilbertPolynomial': 'Hilbert polynomial',
    'hilbertSeries': 'Hilbert series',
    'betti': 'Betti numbers',
    'regularity': 'Castelnuovo-Mumford regularity',
    'codim': 'Codimension',
    'dim': 'Krull dimension',
    'degree': 'Degree of a variety or module',
    'genus': 'Geometric genus',
    'pdim': 'Projective dimension',
    'homology': 'Homology of a chain complex',
    'cohomology': 'Sheaf cohomology',
    'Hom': 'Module of homomorphisms',
    'Ext': 'Ext module',
    'Tor': 'Tor module',
    'basis': 'Basis of a module in a given degree',
    'gens': 'Generators of a module or ideal',
    'mingens': 'Minimal generators',
    'trim': 'Trim a module presentation',
    'prune': 'Prune a module',
    'minimalPresentation': 'Minimal presentation',
    'transpose': 'Transpose of a matrix',
    'dual': 'Dual module',
    'rank': 'Rank of a module or matrix',
    'det': 'Determinant',
    'trace': 'Trace of a matrix',
    'factor': 'Factor an integer or polynomial',
    'gcd': 'Greatest common divisor',
    'lcm': 'Least common multiple',
    'isPrime': 'Test if prime',
    'random': 'Random element',
    'select': 'Select elements satisfying a condition',
    'apply': 'Apply a function to elements',
    'scan': 'Apply a function for side effects',
    'any': 'Test if any element satisfies a condition',
    'all': 'Test if all elements satisfy a condition',
    'member': 'Test membership',
    'position': 'Position of first match',
    'sort': 'Sort a list',
    'unique': 'Remove duplicates',
    'tally': 'Tally elements',
    'toList': 'Convert to list',
    'flatten': 'Flatten nested lists',
    'join': 'Join lists',
    'take': 'Take elements from a list',
    'drop': 'Drop elements from a list',
    'first': 'First element',
    'last': 'Last element',
    'length': 'Length of a list',
    'append': 'Append to a list',
    'prepend': 'Prepend to a list',
    'delete': 'Delete from a list',
    'reverse': 'Reverse a list',
    'print': 'Print to standard output',
    'error': 'Signal an error',
    'assert': 'Assert a condition',
    'toString': 'Convert to string',
    'class': 'Class of an object',
    'parent': 'Parent class',
    'methods': 'List methods for a function',
    'substitute': 'Substitute values',
    'promote': 'Promote to a larger ring',
    'lift': 'Lift to a smaller ring',
    'entries': 'Matrix entries as nested list',
    'numgens': 'Number of generators',
    'numrows': 'Number of rows',
    'numcols': 'Number of columns',
    'coefficientRing': 'Coefficient ring',
    'leadTerm': 'Lead term',
    'leadCoefficient': 'Lead coefficient',
    'leadMonomial': 'Lead monomial',
    'resolution': 'Free resolution',
    'net': 'Net (formatted display)',
    'peek': 'Peek at internal structure',
    'value': 'Value of a symbol',
    'describe': 'Describe an object',
    'loadPackage': 'Load a package',
    'installPackage': 'Install a package',
    'needsPackage': 'Load package if needed',
    'viewHelp': 'View documentation',
    'sin': 'Sine', 'cos': 'Cosine', 'tan': 'Tangent',
    'exp': 'Exponential', 'log': 'Natural logarithm',
    'sqrt': 'Square root', 'abs': 'Absolute value',
    'set': 'Create a set',
    'keys': 'Keys of a hash table',
    'values': 'Values of a hash table',
    'pairs': 'Key-value pairs',
    'regex': 'Regular expression match',
    'match': 'Pattern matching',
    'replace': 'String replacement',
    'use': 'Use a ring or package',
    'vars': 'Variables of a ring',
    # Types
    'ZZ': 'Ring of integers',
    'QQ': 'Field of rational numbers',
    'RR': 'Field of real numbers (default precision 53)',
    'CC': 'Field of complex numbers',
    'RRi': 'Real interval field',
    'Ring': 'The class of all rings',
    'Ideal': 'The class of all ideals',
    'Module': 'The class of all modules',
    'Matrix': 'The class of all matrices',
    'List': 'The class of all lists',
    'Sequence': 'The class of all sequences',
    'HashTable': 'The class of all hash tables',
    'String': 'The class of all strings',
    'Boolean': 'true or false',
    'Number': 'The class of all numbers',
    'ChainComplex': 'The class of all chain complexes',
    'PolynomialRing': 'The class of all polynomial rings',
    # Constants
    'pi': 'The constant pi',
    'ii': 'The square root of -1',
    'ee': 'The base of natural logarithms',
    'infinity': 'Positive infinity',
    'oo': 'Positive infinity (shorthand)',
}


def categorize(name):
    """Categorize a symbol as keyword, type, function, or constant."""
    if name in KEYWORDS:
        return 'keyword'
    if name in CONSTANTS:
        return 'constant'
    if name in KNOWN_TYPES:
        return 'type'
    # Heuristic: starts with uppercase and no underscore = likely a type/class
    if name and name[0].isupper():
        return 'type'
    # Everything else is a function/variable
    return 'function'


def main():
    # Find the vim dictionary
    script_dir = os.path.dirname(os.path.abspath(__file__))
    kernel_dir = os.path.dirname(script_dir)
    m2_repo = os.path.join(os.path.dirname(kernel_dir), 'M2')
    dict_path = os.path.join(m2_repo, 'Macaulay2', 'editors', 'vim', 'm2.vim.dict')

    if not os.path.exists(dict_path):
        print(f"Error: vim dictionary not found at {dict_path}", file=sys.stderr)
        sys.exit(1)

    # Parse the dictionary
    with open(dict_path, 'r') as f:
        content = f.read()

    # Extract symbols from the last long line
    symbols = []
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('"'):
            continue
        if ' ' in line and len(line) > 100:
            symbols = line.split()
            break

    print(f"Found {len(symbols)} symbols in vim dictionary", file=sys.stderr)

    # Build completion entries
    completions = []
    for name in sorted(set(symbols)):
        if not name or name.startswith('"'):
            continue
        cat = categorize(name)
        entry = {
            'label': name,
            'type': cat,
        }
        if name in DESCRIPTIONS:
            entry['info'] = DESCRIPTIONS[name]
        completions.append(entry)

    # Write output
    output_path = os.path.join(kernel_dir, 'src', 'm2Symbols.json')
    with open(output_path, 'w') as f:
        json.dump(completions, f, indent=None, separators=(',', ':'))

    print(f"Wrote {len(completions)} completion entries to {output_path}", file=sys.stderr)

    # Print stats
    cats = {}
    for c in completions:
        cats[c['type']] = cats.get(c['type'], 0) + 1
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count}", file=sys.stderr)


if __name__ == '__main__':
    main()
