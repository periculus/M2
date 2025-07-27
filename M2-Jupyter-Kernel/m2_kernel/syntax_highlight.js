/*
 * Macaulay2 syntax highlighting for CodeMirror
 * Adapted from M2's Prism.js definition
 */

define(function(require, exports, module) {
    "use strict";
    
    var CodeMirror = require('codemirror/lib/codemirror');
    
    // M2 language keywords
    var keywords = [
        'and', 'break', 'catch', 'continue', 'do', 'else', 'elseif', 'export',
        'exportFrom', 'exportMutable', 'for', 'from', 'global', 'if', 'in',
        'local', 'new', 'not', 'of', 'or', 'return', 'shield', 'SPACE', 'step',
        'symbol', 'then', 'threadLocal', 'throw', 'time', 'timing', 'to', 'try',
        'when', 'while', 'xor'
    ];
    
    // M2 types
    var types = [
        'Ring', 'Ideal', 'Module', 'Matrix', 'MutableMatrix', 'ChainComplex',
        'RingElement', 'BasicList', 'HashTable', 'Sequence', 'Array', 'List',
        'MutableList', 'MutableHashTable', 'Option', 'OptionTable', 'Set',
        'String', 'Net', 'Boolean', 'Function', 'Type', 'Nothing', 'Thing',
        'ZZ', 'QQ', 'RR', 'CC', 'RRi', 'CCi', 'InfiniteNumber', 'IndeterminateNumber'
    ];
    
    // Common M2 functions (abbreviated list)
    var builtins = [
        'abs', 'acos', 'adjoint', 'all', 'and', 'ann', 'any', 'apply',
        'apropos', 'assert', 'basis', 'betti', 'binomial', 'borel',
        'char', 'class', 'codim', 'coefficient', 'coefficientRing',
        'coker', 'cokernel', 'columnate', 'columns', 'complement',
        'components', 'compress', 'concatenate', 'cone', 'content',
        'contract', 'cover', 'decompose', 'degree', 'degrees', 'delete',
        'depth', 'det', 'determinant', 'diff', 'dim', 'directSum',
        'drop', 'dual', 'eigenvalues', 'eigenvectors', 'eliminate',
        'entries', 'exp', 'factor', 'first', 'flatten', 'flip', 'frac',
        'gb', 'gcd', 'generators', 'gens', 'genus', 'get', 'getc',
        'GF', 'global', 'gradedModule', 'graphIdeal', 'graphRing',
        'groebnerBasis', 'hash', 'height', 'hilbertFunction',
        'hilbertPolynomial', 'hilbertSeries', 'Hom', 'homogenize',
        'homology', 'homomorphism', 'ideal', 'identity', 'image',
        'index', 'indices', 'inducedMap', 'info', 'input', 'insert',
        'installPackage', 'integralClosure', 'intersect', 'intersection',
        'inverse', 'isBorel', 'isCommutative', 'isConstant', 'isEmpty',
        'isField', 'isFinite', 'isHomogeneous', 'isIdeal', 'isInjective',
        'isIsomorphism', 'isLinearType', 'isMember', 'isModule',
        'isMonomialIdeal', 'isNormal', 'isPolynomialRing', 'isPrime',
        'isPrimitive', 'isProjective', 'isQuotientModule', 'isQuotientRing',
        'isRing', 'isSkewCommutative', 'isSmooth', 'isSquareFree',
        'isSubmodule', 'isSubset', 'isSurjective', 'isUnit', 'isWellDefined',
        'jacobian', 'join', 'ker', 'kernel', 'keys', 'koszul', 'last',
        'lcm', 'leadCoefficient', 'leadMonomial', 'leadTerm', 'length',
        'lift', 'liftable', 'lines', 'listForm', 'LLL', 'load',
        'loadPackage', 'log', 'map', 'match', 'matrix', 'max', 'member',
        'method', 'methods', 'min', 'mingens', 'minimalPresentation',
        'minimalPrimes', 'minimize', 'minors', 'minPres', 'minprimes',
        'mod', 'module', 'modulo', 'monoid', 'monomialCurveIdeal',
        'monomialIdeal', 'monomials', 'multidegree', 'multiplicity',
        'mutableMatrix', 'needs', 'needsPackage', 'net', 'netList',
        'new', 'newClass', 'newPackage', 'newRing', 'next', 'norm',
        'normalCone', 'not', 'null', 'nullhomotopy', 'nullSpace',
        'number', 'numcols', 'numerator', 'numgens', 'numrows',
        'odd', 'oeis', 'options', 'or', 'order', 'pack', 'package',
        'pairs', 'parent', 'part', 'partition', 'partitions', 'parts',
        'pdim', 'peek', 'permanents', 'permutations', 'pfaffians',
        'pivots', 'plus', 'poincare', 'poincareN', 'polarize',
        'poly', 'position', 'positions', 'power', 'precision',
        'preimage', 'prepend', 'presentation', 'primaryComponent',
        'primaryDecomposition', 'print', 'product', 'projectiveHilbertPolynomial',
        'promote', 'protect', 'prune', 'pseudoRemainder', 'pushForward',
        'pushout', 'QQParser', 'QR', 'quotient', 'quotientRemainder',
        'radical', 'random', 'randomMutableMatrix', 'rank', 'read',
        'realPart', 'reduce', 'reducedRowEchelonForm', 'reduceHilbert',
        'reductionNumber', 'reesAlgebra', 'reesIdeal', 'regularity',
        'relations', 'remainder', 'remove', 'reorganize', 'replace',
        'res', 'reshape', 'resolution', 'restart', 'resultant',
        'return', 'reverse', 'ring', 'roots', 'rotate', 'round',
        'rowAdd', 'rowMult', 'rowPermute', 'rowSwap', 'rsort',
        'run', 'same', 'saturate', 'scan', 'scanKeys', 'scanPairs',
        'schedule', 'schreyerOrder', 'searchPath', 'select', 'separate',
        'sequence', 'set', 'setRandomSeed', 'setup', 'setupEmacs',
        'sheaf', 'sheafHom', 'show', 'sin', 'singularLocus', 'size',
        'size2', 'smithNormalForm', 'solve', 'someTerms', 'sort',
        'sortColumns', 'source', 'span', 'Spec', 'specialFiber',
        'splice', 'sqrt', 'stack', 'standardForm', 'standardPairs',
        'status', 'store', 'style', 'sub', 'sublists', 'submatrix',
        'submatrixByDegrees', 'submodule', 'subquotient', 'subsets',
        'substitute', 'substring', 'subtable', 'sum', 'super',
        'support', 'SVD', 'switch', 'sylvesterMatrix', 'symbol',
        'symmetricAlgebra', 'symmetricKernel', 'symmetricPower',
        'synonym', 'syz', 'syzygyScheme', 'table', 'take', 'tally',
        'tan', 'tangentCone', 'tangentSheaf', 'target', 'tensor',
        'terms', 'TEST', 'tex', 'texMath', 'then', 'time', 'times',
        'timing', 'to', 'toCC', 'toExternalString', 'toField',
        'toList', 'top', 'topCoefficients', 'topComponents', 'toRR',
        'toRRi', 'toSequence', 'toString', 'trace', 'transpose',
        'trim', 'truncate', 'truncateOutput', 'try', 'tutorial',
        'ultimate', 'unbag', 'uncurry', 'uniform', 'uninstallPackage',
        'union', 'unique', 'uniquePermutations', 'unsequence',
        'unstack', 'update', 'use', 'userSymbols', 'value', 'values',
        'variety', 'vars', 'vector', 'versalEmbedding', 'wait',
        'wedgeProduct', 'weightRange', 'when', 'while', 'width',
        'wrap', 'xor', 'youngest', 'zero', 'zeta', 'ZZParser'
    ];
    
    // M2 constants
    var constants = [
        'true', 'false', 'null', 'infinity', 'ii', 'oo', 'pi', 'EulerConstant'
    ];
    
    // Create keyword regex patterns
    var keywordRegex = new RegExp('\\b(' + keywords.join('|') + ')\\b');
    var typeRegex = new RegExp('\\b(' + types.join('|') + ')\\b');
    var builtinRegex = new RegExp('\\b(' + builtins.join('|') + ')\\b');
    var constantRegex = new RegExp('\\b(' + constants.join('|') + ')\\b');
    
    CodeMirror.defineMode("macaulay2", function(config, parserConfig) {
        
        function tokenBase(stream, state) {
            var ch = stream.next();
            
            // Handle comments
            if (ch == "-") {
                if (stream.eat("*")) {
                    state.tokenize = tokenComment;
                    return tokenComment(stream, state);
                }
                if (stream.eat("-")) {
                    stream.skipToEnd();
                    return "comment";
                }
            }
            
            // Handle strings
            if (ch == '"') {
                state.tokenize = tokenString('"');
                return state.tokenize(stream, state);
            }
            
            // Handle triple-slash strings
            if (ch == "/" && stream.match("//")) {
                state.tokenize = tokenTripleSlash;
                return tokenTripleSlash(stream, state);
            }
            
            // Handle numbers
            if (/\d/.test(ch)) {
                stream.match(/^\d*\.?\d*([eE][+-]?\d+)?/);
                return "number";
            }
            
            // Handle operators
            if (/[+\-*\/^%<>=!]/.test(ch)) {
                stream.match(/^(<<|>>|<==|==>|\|\||&&|@@|\+\+|--|\.\.|\#\?|\#|[<>=!]=?)?/);
                return "operator";
            }
            
            // Handle punctuation
            if (/[~!@#$%^&*()_+=\[\]{};:\'",.<>/?\\|`-]/.test(ch)) {
                return "punctuation";
            }
            
            // Handle identifiers
            if (/[a-zA-Z]/.test(ch)) {
                stream.match(/^[a-zA-Z0-9']*/);
                var word = stream.current();
                
                if (keywordRegex.test(word)) return "keyword";
                if (typeRegex.test(word)) return "type";
                if (builtinRegex.test(word)) return "builtin";
                if (constantRegex.test(word)) return "atom";
                
                return "variable";
            }
            
            // Skip whitespace
            if (/\s/.test(ch)) {
                stream.eatSpace();
                return null;
            }
            
            return null;
        }
        
        function tokenComment(stream, state) {
            var maybeEnd = false, ch;
            while (ch = stream.next()) {
                if (ch == "*" && maybeEnd) {
                    if (stream.eat("-")) {
                        state.tokenize = tokenBase;
                        break;
                    }
                }
                maybeEnd = (ch == "*");
            }
            return "comment";
        }
        
        function tokenString(quote) {
            return function(stream, state) {
                var escaped = false, ch;
                while ((ch = stream.next()) != null) {
                    if (ch == quote && !escaped) {
                        state.tokenize = tokenBase;
                        break;
                    }
                    escaped = !escaped && ch == "\\";
                }
                return "string";
            };
        }
        
        function tokenTripleSlash(stream, state) {
            var slashCount = 2; // We already matched ///
            while (stream.peek() == "/") {
                stream.next();
                slashCount++;
            }
            
            // Now read content until we find matching slashes
            var ch;
            while (ch = stream.next()) {
                if (ch == "/" && stream.match(new RegExp("/{" + (slashCount-1) + "}(?!/)"))) {
                    state.tokenize = tokenBase;
                    return "string";
                }
            }
            return "string";
        }
        
        return {
            startState: function() {
                return {tokenize: tokenBase};
            },
            
            token: function(stream, state) {
                if (stream.eatSpace()) return null;
                return state.tokenize(stream, state);
            },
            
            lineComment: "--",
            blockCommentStart: "-*",
            blockCommentEnd: "*-"
        };
    });
    
    CodeMirror.defineMIME("text/x-macaulay2", "macaulay2");
});