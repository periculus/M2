// CodeMirror mode for Macaulay2
define(['codemirror/lib/codemirror'], function(CodeMirror) {
    "use strict";

    CodeMirror.defineMode("macaulay2", function() {
        // M2 Keywords
        var keywords = [
            "and", "break", "catch", "continue", "do", "else", "elseif", "export",
            "exportMutable", "exportFrom", "for", "from", "global", "if", "in",
            "is", "local", "new", "not", "null", "of", "or", "protect", "return",
            "shield", "SPACE", "step", "symbol", "then", "threadLocal", "throw",
            "time", "timing", "to", "try", "when", "while", "xor"
        ];
        
        // M2 Built-in types
        var builtinTypes = [
            "Boolean", "List", "Sequence", "Array", "MutableList", "String",
            "Function", "Thing", "Nothing", "ZZ", "QQ", "RR", "CC", "InfiniteNumber",
            "RingElement", "Number", "Matrix", "MutableMatrix", "Ideal", "Module",
            "Ring", "Symbol", "HashTable", "MutableHashTable", "Option", "OptionTable",
            "Package", "Net", "File", "Dictionary", "GlobalDictionary"
        ];
        
        // M2 Built-in functions (a subset of common ones)
        var builtinFunctions = [
            "about", "abs", "acos", "addCancelTask", "addDependencyTask", "addEndFunction",
            "addHook", "addStartFunction", "addStartTask", "alarm", "all", "ambient",
            "ancestor", "ancestors", "ann", "annihilator", "any", "append",
            "applicationDirectory", "apply", "applyKeys", "applyPairs", "applyValues",
            "apropos", "ascii", "asin", "assert", "assign", "associatedGradedRing",
            "associatedPrimes", "atan", "atan2", "atEndOfFile", "autoload", "baseFilename",
            "baseName", "baseRing", "basis", "beginDocumentation", "benchmark", "binomial",
            "borel", "cacheValue", "cancelTask", "canonicalBundle", "ceiling",
            "centerString", "char", "characters", "charAnalyzer", "check", "checkDegrees",
            "chi", "class", "clean", "clearEcho", "clearOutput", "close", "closeIn",
            "closeOut", "code", "codim", "coefficient", "coefficientRing", "coefficients",
            "cohomology", "coimage", "coker", "cokernel", "collectGarbage", "columnAdd",
            "columnMult", "columnPermute", "columnRankProfile", "columnSwap", "columnate",
            "columns", "combine", "commandInterpreter", "commonRing", "commonest",
            "comodule", "compareExchange", "complement", "complete", "components",
            "compose", "compositions", "compress", "concatenate", "conductor", "cone",
            "conjugate", "connectionCount", "constParser", "content", "contract",
            "conwayPolynomial", "copy", "copyDirectory", "copyFile", "cos", "cosh",
            "cotangentSheaf", "cover", "coverMap", "cpuTime", "createTask", "csc",
            "csch", "currentColumnNumber", "currentDirectory", "currentFileName",
            "currentFileDirectory", "currentLineNumber", "currentPackage", "currentPosition",
            "currentRowNumber", "currentString", "currentTime", "deadParser", "debug",
            "debugError", "decompose", "deepSplice", "default", "degree", "degreeGroup",
            "degreeLength", "degrees", "degreesMonoid", "degreesRing", "delete",
            "demark", "denominator", "depth", "describe", "det", "determinant",
            "diagonalMatrix", "diameter", "dictionary", "diff", "difference",
            "dim", "directSum", "disassemble", "discriminant", "dismiss", "distinguished",
            "divideByVariable", "doc", "document", "drop", "dual", "eagonNorthcott",
            "echoOff", "echoOn", "eigenvalues", "eigenvectors", "eint", "elements",
            "eliminate", "End", "endl", "endPackage", "engineDebugLevel", "entries",
            "environment", "erase", "erf", "erfc", "error", "errorDepth", "euler",
            "eulers", "evaluate", "even", "examples", "exchange", "exec", "exp",
            "expectedReesIdeal", "expm1", "exponents", "exportFrom",
            "exportMutable", "expression", "extend", "exteriorPower", "factor",
            "Fano", "fileExecutable", "fileExists", "fileLength", "fileMode", "fileReadable",
            "fileTime", "fileWritable", "fillMatrix", "findFiles", "findHeft", "findProgram",
            "findSynonyms", "first", "firstkey", "fittingIdeal", "flagLookup", "flatten",
            "flattenRing", "flip", "floor", "flush", "fold", "forceGB", "fork",
            "format", "formation", "frac", "fraction", "frames", "fromDividedPowers",
            "fromDual", "functionBody", "futureParser", "gb", "gbRemove", "gbSnapshot",
            "gcd", "gcdCoefficients", "gcdLLL", "genera", "generateAssertions", "generator",
            "generators", "genericMatrix", "genericSkewMatrix", "genericSymmetricMatrix",
            "gens", "genus", "get", "getc", "getChangeMatrix", "getenv", "getGlobalSymbol",
            "getNetFile", "getNonUnit", "getParsing", "getSymbol", "getWWW", "GF",
            "globalAssign", "globalAssignFunction", "globalAssignment", "globalReleaseFunction",
            "gradedModule", "gradedModuleMap", "gramm", "graphIdeal", "graphRing",
            "Grassmannian", "groebnerBasis", "groupID", "hash", "hashTable", "heft",
            "height", "hermite", "hilbertFunction", "hilbertPolynomial", "hilbertSeries",
            "hold", "Hom", "homogenize", "homology", "homomorphism", "hooks", "horizontalJoin",
            "html", "httpHeaders", "hypertext", "icFracP", "icFractions", "icMap",
            "icPIdeal", "ideal", "idealizer", "identity", "image", "imaginaryPart",
            "importFrom", "independentSets", "index", "indices", "inducedMap", "inducesWellDefinedMap",
            "info", "input", "insert", "installAssignmentMethod", "installHilbertFunction",
            "installMethod", "installMinprimes", "installPackage", "instance", "instances",
            "integralClosure", "integrate", "intersect", "intersectInP", "intersection",
            "interval", "inverse", "inverseErf", "inversePermutation", "inverseRegularizedBeta",
            "inverseRegularizedGamma", "inverseSystem", "irreducibleCharacteristicSeries",
            "irreducibleDecomposition", "isANumber", "isAffineRing", "isBorel", "isCanceled",
            "isCommutative", "isConstant", "isDirectSum", "isDirectory", "isEmpty",
            "isField", "isFinite", "isFinitePrimeField", "isFreeModule", "isGlobalSymbol",
            "isHomogeneous", "isIdeal", "isInfinite", "isInjective", "isInputFile",
            "isIsomorphic", "isIsomorphism", "isLiftable", "isLinearType", "isListener",
            "isLLL", "isMember", "isModule", "isMonomialIdeal", "isNormal", "isOpen",
            "isOutputFile", "isPolynomialRing", "isPrimary", "isPrime", "isPrimitive",
            "isProjective", "isPseudoprime", "isQuotientModule", "isQuotientOf", "isQuotientRing",
            "isReady", "isReal", "isReduction", "isRegularFile", "isRing", "isSkewCommutative",
            "isSmooth", "isSorted", "isSquareFree", "isStandardGradedPolynomialRing",
            "isSubmodule", "isSubquotient", "isSubset", "isSupportedInZeroLocus", "isSurjective",
            "isTable", "isUnit", "isVeryAmple", "isWellDefined", "iterator", "jacobian",
            "jacobianDual", "join", "ker", "kernel", "kernelLLL", "kernelOfLocalization",
            "keys", "kill", "koszul", "last", "lcm", "leadCoefficient", "leadComponent",
            "leadMonomial", "leadTerm", "left", "length", "letterParser", "liftable",
            "lift", "limitFiles", "limitProcesses", "lines", "linkFile", "listForm",
            "listSymbols", "LLL", "lngamma", "load", "loadPackage", "localDictionaries",
            "localize", "locate", "log", "log1p", "lookup", "lookupCount", "LUdecomposition",
            "M2CODE", "makeDirectory", "makeDocumentTag", "makePackageIndex", "makeS2",
            "map", "markedGB", "match", "mathML", "matrix", "max", "maxAllowableThreads",
            "maxExponent", "maxPosition", "member", "memoize", "memoizeClear", "memoizeValues",
            "merge", "mergePairs", "method", "methodOptions", "methods", "midpoint",
            "min", "minExponent", "mingens", "mingle", "minimalBetti", "minimalPresentation",
            "minimalPresentationMap", "minimalPresentationMapInv", "minimalPrimes",
            "minimalReduction", "minimize", "minimizeFilename", "minors", "minPosition",
            "minPres", "minprimes", "minus", "mkdir", "mod", "module", "modulo",
            "monoid", "monomialCurveIdeal", "monomialIdeal", "monomials", "monomialSubideal",
            "moveFile", "multidegree", "multidoc", "multigraded", "multiplicity",
            "mutable", "mutableIdentity", "mutableMatrix", "nanosleep", "needs", "needsPackage",
            "net", "netList", "newClass", "newCoordinateSystem", "newNetFile", "newPackage",
            "newRing", "next", "nextkey", "nextPrime", "nextPowerOfTwo", "NNParser",
            "nonspaceAnalyzer", "norm", "normalCone", "notImplemented", "nullhomotopy",
            "nullParser", "nullSpace", "number", "numcols", "numColumns", "numerator",
            "numeric", "numericInterval", "numgens", "numRows", "numrows", "odd",
            "oeis", "ofClass", "on", "openDatabase", "openDatabaseOut", "openFiles",
            "openIn", "openInOut", "openListener", "openOut", "openOutAppend", "optionalSignParser",
            "options", "optP", "orbits", "order", "orderedMonoidRing", "orphanedPackages",
            "override", "pack", "package", "packageTemplate", "pad", "pager", "pairs",
            "parent", "part", "partition", "partitions", "parts", "path", "pdim",
            "peek", "permanents", "permutations", "permute", "pfaffians", "pivots",
            "plus", "poincare", "poincareN", "polarize", "poly", "position", "positions",
            "power", "powermod", "precision", "preimage", "prepend", "presentation",
            "presentationComplex", "pretty", "primaryComponent", "primaryDecomposition",
            "print", "printerr", "printString", "printWidth", "processID", "product",
            "profile", "Proj", "projectiveHilbertPolynomial", "promote",
            "prune", "pseudocode", "pseudoRemainder", "pushForward", "pushout", "QQParser",
            "QRDecomposition", "quotient", "quotientRemainder", "radical", "radicalContainment",
            "radius", "random", "randomKRationalPoint", "randomMutableMatrix", "rank",
            "read", "readDirectory", "readlink", "readPackage", "realPart", "realpath",
            "recursionLimit", "reduce", "reducedRowEchelonForm", "reduceHilbert", "reesAlgebra",
            "reesAlgebraIdeal", "reesIdeal", "regex", "regexQuote", "registerFinalizer",
            "regularity", "regularizedBeta", "regularizedGamma", "relations", "relativizeFilename",
            "remainder", "remove", "removeDirectory", "removeFile", "removeLowestDimension",
            "reorganize", "replace", "replaceRing", "res", "reshape", "resolution",
            "resolutionInDegree", "restart", "resultant", "reverse", "reverseCompletePermutation",
            "right", "ring", "ringFromFractions", "roots", "rotate", "round", "rowAdd",
            "rowMult", "rowPermute", "rowRankProfile", "rowSwap", "rsort", "run",
            "runEndFunctions", "runHooks", "runLengthEncode", "runStartFunctions",
            "same", "saturate", "scan", "scanKeys", "scanLines", "scanPairs", "scanValues",
            "schedule", "schreyerOrder", "Schubert", "searchPath", "sec", "sech",
            "seeParsing", "select", "selectInSubring", "selectKeys", "selectPairs",
            "selectValues", "selectVariables", "separate", "separateRegexp", "sequence",
            "serialNumber", "set", "setEcho", "setGroupID", "setIOExclusive", "setIOSynchronized",
            "setIOUnSynchronized", "setRandomSeed", "setup", "setupEmacs", "setupLift",
            "setupPromote", "sheaf", "sheafHom", "sheafMap", "show", "showHtml", "showTex",
            "simpleDocFrob", "simplifyFractions", "sin", "singularLocus", "sinh",
            "size", "size2", "sleep", "smithNormalForm", "solve", "someTerms", "sort",
            "sortColumns", "source", "span", "Spec", "specialFiber", "specialFiberIdeal",
            "splice", "splitWWW", "sqrt", "stack", "stacksProject", "standardForm",
            "standardPairs", "stashValue", "status", "store", "style", "sub", "sublists",
            "submatrix", "submatrixByDegrees", "submodule", "subquotient", "subsets",
            "substitute", "substring", "subtable", "sum", "super", "support", "SVD",
            "switch", "sylvesterMatrix", "symbolBody", "symlinkDirectory", "symlinkFile",
            "symmetricAlgebra", "symmetricAlgebraIdeal", "symmetricKernel", "symmetricPower",
            "synonyms", "SYNOPSIS", "syz", "syzygyScheme", "table", "take", "tally",
            "tan", "tangentCone", "tangentSheaf", "tanh", "target", "taskResult",
            "temporaryFileName", "tensor", "tensorAssociativity", "terminalParser",
            "terms", "TEST", "testExample", "testHunekeQuestion", "tests", "tex", "texMath",
            "threadLocal", "times", "toAbsolutePath",
            "toCC", "toDividedPowers", "toDual", "toExternalString", "toField", "toList",
            "top", "topCoefficients", "topComponents", "topLevelMode", "toRR", "toRRi",
            "toSequence", "toString", "trace", "transpose", "trim", "truncate", "truncateOutput",
            "tutorial", "typicalValues", "ultimate", "unbag", "uncurry", "undocumented",
            "uniform", "uninstallAllPackages", "uninstallPackage", "union", "unique",
            "uniquePermutations", "unsequence", "unstack", "use", "userSymbols", "utf8",
            "utf8check", "utf8substring", "validate", "value", "values", "variety",
            "vars", "vector", "versalEmbedding", "wait", "warning", "wedgeProduct",
            "weightRange", "whichGm", "width", "wikipedia", "wrap",
            "youngest", "zero", "zeta", "ZZParser"
        ];
        
        function wordRegexp(words) {
            return new RegExp("^(?:" + words.join("|") + ")$");
        }
        
        var keywordRegex = wordRegexp(keywords);
        var builtinTypeRegex = wordRegexp(builtinTypes);
        var builtinFunctionRegex = wordRegexp(builtinFunctions);
        
        function tokenBase(stream, state) {
            var ch = stream.next();
            
            // Comments
            if (ch == "-" && stream.eat("-")) {
                stream.skipToEnd();
                return "comment";
            }
            
            // Multi-line comments
            if (ch == "-" && stream.eat("*")) {
                state.tokenize = tokenComment;
                return tokenComment(stream, state);
            }
            
            // Strings
            if (ch == '"') {
                state.tokenize = tokenString(ch);
                return state.tokenize(stream, state);
            }
            
            // Numbers
            if (/\d/.test(ch)) {
                stream.eatWhile(/[\d\.eE+-]/);
                return "number";
            }
            
            // Symbols
            if (ch == "'" && stream.match(/[a-zA-Z_]\w*/)) {
                return "atom";
            }
            
            // Operators
            if (/[+\-*\/%^<>=!&|]/.test(ch)) {
                stream.eatWhile(/[+\-*\/%^<>=!&|]/);
                return "operator";
            }
            
            // Brackets, parentheses, etc.
            if (/[\(\)\[\]\{\},;:]/.test(ch)) {
                return "punctuation";
            }
            
            // Identifiers
            if (/[a-zA-Z_]/.test(ch)) {
                stream.eatWhile(/\w/);
                var word = stream.current();
                
                if (keywordRegex.test(word)) {
                    return "keyword";
                } else if (builtinTypeRegex.test(word)) {
                    return "type";
                } else if (builtinFunctionRegex.test(word)) {
                    return "builtin";
                } else {
                    return "variable";
                }
            }
            
            // Skip whitespace
            stream.eatWhile(/\s/);
            return null;
        }
        
        function tokenComment(stream, state) {
            var maybeEnd = false, ch;
            while (ch = stream.next()) {
                if (ch == "*" && maybeEnd) {
                    state.tokenize = tokenBase;
                    break;
                }
                maybeEnd = (ch == "-");
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
        
        return {
            startState: function() {
                return {
                    tokenize: tokenBase
                };
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
    
    return CodeMirror;
});