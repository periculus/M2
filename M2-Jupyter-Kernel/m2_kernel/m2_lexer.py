"""
Pygments lexer for Macaulay2.

This provides syntax highlighting for M2 code in Jupyter notebooks.
"""

from pygments.lexer import RegexLexer, bygroups, include, words
from pygments.token import *

try:
    from .language_data import get_language_data
    # Get dynamic language data
    _lang_data = get_language_data()
    M2_KEYWORDS = list(_lang_data.keywords)
    M2_TYPES = list(_lang_data.types)
    M2_FUNCTIONS = list(_lang_data.functions)
    M2_CONSTANTS = list(_lang_data.constants)
except:
    # Fallback to static lists if language_data not available
    # M2 language keywords
    M2_KEYWORDS = [
        'and', 'break', 'catch', 'continue', 'do', 'else', 'elseif', 'export',
        'exportFrom', 'exportMutable', 'for', 'from', 'global', 'if', 'in',
        'local', 'new', 'not', 'of', 'or', 'return', 'shield', 'SPACE', 'step',
        'symbol', 'then', 'threadLocal', 'throw', 'time', 'timing', 'to', 'try',
        'when', 'while', 'xor'
    ]
    
    # M2 types
    M2_TYPES = [
    'Ring', 'Ideal', 'Module', 'Matrix', 'MutableMatrix', 'ChainComplex',
    'RingElement', 'BasicList', 'HashTable', 'Sequence', 'Array', 'List',
    'MutableList', 'MutableHashTable', 'Option', 'OptionTable', 'Set',
    'String', 'Net', 'Boolean', 'Function', 'Type', 'Nothing', 'Thing',
    'ZZ', 'QQ', 'RR', 'CC', 'RRi', 'CCi', 'InfiniteNumber', 'IndeterminateNumber'
    ]
    
    # Common M2 functions (abbreviated)
    M2_FUNCTIONS = [
    'abs', 'adjoint', 'all', 'ann', 'any', 'apply', 'apropos', 'assert',
    'basis', 'betti', 'binomial', 'borel', 'char', 'class', 'codim',
    'coefficient', 'coefficientRing', 'coker', 'cokernel', 'columns',
    'complement', 'components', 'compress', 'concatenate', 'cone',
    'contract', 'cover', 'decompose', 'degree', 'degrees', 'delete',
    'depth', 'det', 'determinant', 'diff', 'dim', 'directSum', 'drop',
    'dual', 'eigenvalues', 'eigenvectors', 'eliminate', 'entries',
    'factor', 'first', 'flatten', 'flip', 'frac', 'gb', 'gcd', 'gens',
    'genus', 'get', 'GF', 'gradedModule', 'graphIdeal', 'graphRing',
    'groebnerBasis', 'hash', 'height', 'hilbertFunction', 'hilbertPolynomial',
    'hilbertSeries', 'Hom', 'homogenize', 'homology', 'homomorphism',
    'ideal', 'identity', 'image', 'index', 'indices', 'inducedMap',
    'installPackage', 'integralClosure', 'intersect', 'intersection',
    'inverse', 'isBorel', 'isCommutative', 'isField', 'isHomogeneous',
    'isIdeal', 'isInjective', 'isIsomorphism', 'isMember', 'isModule',
    'isMonomialIdeal', 'isNormal', 'isPolynomialRing', 'isPrime',
    'isProjective', 'isQuotientModule', 'isQuotientRing', 'isRing',
    'isSubmodule', 'isSubset', 'isSurjective', 'isUnit', 'isWellDefined',
    'jacobian', 'join', 'ker', 'kernel', 'keys', 'koszul', 'last', 'lcm',
    'leadCoefficient', 'leadMonomial', 'leadTerm', 'length', 'lift',
    'lines', 'listForm', 'LLL', 'load', 'loadPackage', 'log', 'map',
    'match', 'matrix', 'max', 'member', 'method', 'methods', 'min',
    'mingens', 'minimalPresentation', 'minimalPrimes', 'minimize',
    'minors', 'minPres', 'minprimes', 'mod', 'module', 'modulo',
    'monoid', 'monomialCurveIdeal', 'monomialIdeal', 'monomials',
    'multidegree', 'multiplicity', 'mutableMatrix', 'needs', 'needsPackage',
    'net', 'netList', 'new', 'newClass', 'newPackage', 'newRing',
    'norm', 'normalCone', 'null', 'nullhomotopy', 'nullSpace', 'number',
    'numcols', 'numerator', 'numgens', 'numrows', 'oeis', 'options',
    'order', 'pack', 'package', 'pairs', 'parent', 'part', 'partition',
    'partitions', 'parts', 'pdim', 'peek', 'permanents', 'permutations',
    'pfaffians', 'pivots', 'plus', 'poincare', 'poincareN', 'polarize',
    'poly', 'position', 'positions', 'power', 'precision', 'preimage',
    'prepend', 'presentation', 'primaryComponent', 'primaryDecomposition',
    'print', 'product', 'projectiveHilbertPolynomial', 'promote', 'protect',
    'prune', 'pseudoRemainder', 'pushForward', 'pushout', 'QR', 'quotient',
    'quotientRemainder', 'radical', 'random', 'rank', 'read', 'realPart',
    'reduce', 'reducedRowEchelonForm', 'reduceHilbert', 'regularity',
    'relations', 'remainder', 'remove', 'reorganize', 'replace', 'res',
    'reshape', 'resolution', 'restart', 'resultant', 'reverse', 'ring',
    'roots', 'rotate', 'round', 'rowAdd', 'rowMult', 'rowPermute',
    'rowSwap', 'rsort', 'run', 'saturate', 'scan', 'scanKeys', 'scanPairs',
    'schedule', 'schreyerOrder', 'searchPath', 'select', 'separate',
    'sequence', 'set', 'setRandomSeed', 'setup', 'sheaf', 'sheafHom',
    'show', 'sin', 'singularLocus', 'size', 'smithNormalForm', 'solve',
    'someTerms', 'sort', 'sortColumns', 'source', 'span', 'Spec',
    'specialFiber', 'splice', 'sqrt', 'stack', 'standardForm', 'standardPairs',
    'status', 'store', 'sub', 'sublists', 'submatrix', 'submatrixByDegrees',
    'submodule', 'subquotient', 'subsets', 'substitute', 'substring',
    'subtable', 'sum', 'super', 'support', 'SVD', 'switch', 'sylvesterMatrix',
    'symmetricAlgebra', 'symmetricKernel', 'symmetricPower', 'syz',
    'syzygyScheme', 'table', 'take', 'tally', 'tan', 'tangentCone',
    'tangentSheaf', 'target', 'tensor', 'terms', 'tex', 'texMath',
    'toCC', 'toExternalString', 'toField', 'toList', 'top', 'topCoefficients',
    'topComponents', 'toRR', 'toRRi', 'toSequence', 'toString', 'trace',
    'transpose', 'trim', 'truncate', 'truncateOutput', 'tutorial',
    'ultimate', 'unbag', 'uncurry', 'uniform', 'uninstallPackage',
    'union', 'unique', 'uniquePermutations', 'unsequence', 'unstack',
    'update', 'use', 'userSymbols', 'value', 'values', 'variety', 'vars',
    'vector', 'versalEmbedding', 'wait', 'wedgeProduct', 'weightRange',
    'width', 'wrap', 'youngest', 'zero', 'zeta'
    ]
    
    # M2 constants
    M2_CONSTANTS = [
        'true', 'false', 'null', 'infinity', 'ii', 'oo', 'pi', 'EulerConstant',
        'newline', 'endl', 'version'
    ]


class M2Lexer(RegexLexer):
    """
    Lexer for Macaulay2.
    """
    
    name = 'Macaulay2'
    aliases = ['m2', 'macaulay2']
    filenames = ['*.m2']
    mimetypes = ['text/x-macaulay2']
    
    tokens = {
        'root': [
            # Comments
            (r'-\*[\s\S]*?\*-', Comment.Multiline),
            (r'--.*?$', Comment.Single),
            
            # Strings
            (r'"(?:[^"\\]|\\.)*"', String.Double),
            (r'///(?:\/(?!\/)|(?:\/\/)+(?!\/)|[^\/])*(?:\/\/)+\/(?!\/)', String.Regex),
            
            # Keywords
            (words(M2_KEYWORDS, prefix=r'\b', suffix=r'\b'), Keyword),
            
            # Types
            (words(M2_TYPES, prefix=r'\b', suffix=r'\b'), Name.Class),
            
            # Functions
            (words(M2_FUNCTIONS, prefix=r'\b', suffix=r'\b'), Name.Function),
            
            # Constants
            (words(M2_CONSTANTS, prefix=r'\b', suffix=r'\b'), Name.Constant),
            
            # Numbers
            (r'\d+\.?\d*([eE][+-]?\d+)?', Number),
            
            # Operators
            (r'[+\-*/^%]', Operator),
            (r'[<>=!]=?', Operator),
            (r'<<|>>|<==|==>|\|\||&&|@@|\+\+|--|\.\.|#\?|#', Operator),
            (r'[~!@#$%^&*()_+=\[\]{};:\'",.<>/?\\|`-]', Operator),
            
            # Symbols and identifiers
            (r'[a-zA-Z][a-zA-Z0-9\']*', Name),
            
            # Whitespace
            (r'\s+', Text),
        ]
    }
