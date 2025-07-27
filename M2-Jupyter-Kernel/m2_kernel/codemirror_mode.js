/**
 * CodeMirror mode for Macaulay2
 * 
 * This provides syntax highlighting for M2 code in Jupyter notebooks.
 */

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("macaulay2", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  
  // Keywords
  var keywords = new RegExp("^(" + [
    "and", "break", "catch", "continue", "do", "else", "elseif", "export",
    "exportFrom", "exportMutable", "for", "from", "global", "if", "in",
    "local", "new", "not", "of", "or", "return", "shield", "SPACE", "step",
    "symbol", "then", "threadLocal", "throw", "time", "timing", "to", "try",
    "when", "while", "xor"
  ].join("|") + ")\\b");
  
  // Types
  var types = new RegExp("^(" + [
    "Ring", "Ideal", "Module", "Matrix", "MutableMatrix", "ChainComplex",
    "RingElement", "BasicList", "HashTable", "Sequence", "Array", "List",
    "MutableList", "MutableHashTable", "Option", "OptionTable", "Set",
    "String", "Net", "Boolean", "Function", "Type", "Nothing", "Thing",
    "ZZ", "QQ", "RR", "CC", "RRi", "CCi", "InfiniteNumber", "IndeterminateNumber"
  ].join("|") + ")\\b");
  
  // Built-in functions (abbreviated list)
  var builtins = new RegExp("^(" + [
    "abs", "adjoint", "all", "ann", "any", "apply", "apropos", "assert",
    "basis", "betti", "binomial", "borel", "char", "class", "codim",
    "coefficient", "coefficientRing", "coker", "cokernel", "columns",
    "complement", "components", "compress", "concatenate", "cone",
    "contract", "cover", "decompose", "degree", "degrees", "delete",
    "depth", "det", "determinant", "diff", "dim", "directSum", "drop",
    "dual", "eigenvalues", "eigenvectors", "eliminate", "entries",
    "factor", "first", "flatten", "flip", "frac", "gb", "gcd", "gens",
    "genus", "get", "GF", "gradedModule", "graphIdeal", "graphRing",
    "groebnerBasis", "hash", "height", "hilbertFunction", "hilbertPolynomial",
    "hilbertSeries", "Hom", "homogenize", "homology", "homomorphism",
    "ideal", "identity", "image", "index", "indices", "inducedMap",
    "integralClosure", "intersect", "intersection", "inverse", "jacobian",
    "join", "ker", "kernel", "keys", "koszul", "last", "lcm", "length",
    "lift", "lines", "listForm", "map", "match", "matrix", "max", "member",
    "method", "methods", "min", "mingens", "minimalPresentation", "module",
    "modulo", "monoid", "monomialIdeal", "monomials", "net", "new", "null",
    "nullhomotopy", "nullSpace", "number", "numerator", "options", "order",
    "pack", "package", "pairs", "parent", "part", "partition", "parts",
    "pdim", "peek", "permanents", "permutations", "pfaffians", "pivots",
    "plus", "poincare", "position", "positions", "power", "precision",
    "preimage", "prepend", "presentation", "primaryDecomposition", "print",
    "product", "promote", "protect", "prune", "pushForward", "pushout",
    "QR", "quotient", "radical", "random", "rank", "read", "reduce",
    "regularity", "relations", "remainder", "remove", "reorganize", "replace",
    "res", "resolution", "restart", "resultant", "reverse", "ring", "roots",
    "saturate", "scan", "select", "separate", "sequence", "set", "sheaf",
    "show", "singularLocus", "size", "solve", "sort", "source", "span",
    "Spec", "splice", "sqrt", "stack", "standardForm", "status", "sub",
    "submatrix", "submodule", "subquotient", "subsets", "substitute",
    "sum", "super", "support", "SVD", "syz", "table", "take", "tally",
    "tangentCone", "target", "tensor", "terms", "tex", "toString", "trace",
    "transpose", "trim", "truncate", "tutorial", "unique", "use", "value",
    "values", "variety", "vars", "vector", "wedgeProduct", "width", "zero"
  ].join("|") + ")\\b");
  
  // Constants
  var constants = new RegExp("^(" + [
    "true", "false", "null", "infinity", "ii", "oo", "pi", "EulerConstant",
    "newline", "endl", "version"
  ].join("|") + ")\\b");
  
  function tokenBase(stream, state) {
    // Handle whitespace
    if (stream.eatSpace()) return null;
    
    var ch = stream.peek();
    
    // Handle comments
    if (ch == '-') {
      if (stream.match(/^-\*/)) {
        state.tokenize = tokenBlockComment;
        return tokenBlockComment(stream, state);
      }
      if (stream.match(/^--/)) {
        stream.skipToEnd();
        return "comment";
      }
    }
    
    // Handle strings
    if (ch == '"') {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    
    // Handle triple-slash strings
    if (stream.match(/^\/\/\//)) {
      state.tokenize = tokenTripleSlash;
      return tokenTripleSlash(stream, state);
    }
    
    // Handle numbers
    if (stream.match(/^\d+\.?\d*([eE][+-]?\d+)?[ijp]*/)) {
      return "number";
    }
    
    // Handle operators
    if (stream.match(/^(<-|->|:=|=>|==|!=|===|=!=|<=|>=|<<|>>|\|\||&&|@@|\+\+|##|_[_#]?|\^\^)/)) {
      return "operator";
    }
    if (stream.match(/^[+\-*\/%^<>=!]/)) {
      return "operator";
    }
    
    // Handle punctuation
    if (stream.match(/^[()[\]{},;:.]/)) {
      return "punctuation";
    }
    
    // Handle identifiers
    if (stream.match(/^[a-zA-Z_]\w*/)) {
      var word = stream.current();
      if (keywords.test(word)) return "keyword";
      if (types.test(word)) return "type";
      if (builtins.test(word)) return "builtin";
      if (constants.test(word)) return "atom";
      return "variable";
    }
    
    // Handle symbols
    if (stream.match(/^'[a-zA-Z_]\w*/)) {
      return "atom";
    }
    
    // Default
    stream.next();
    return null;
  }
  
  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {
          end = true;
          break;
        }
        escaped = !escaped && next == "\\";
      }
      if (end || !escaped) state.tokenize = tokenBase;
      return "string";
    };
  }
  
  function tokenTripleSlash(stream, state) {
    var maybeEnd = false;
    while (!stream.eol()) {
      if (stream.match(/\/\/\//) && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = stream.next() == "/";
    }
    return "string";
  }
  
  function tokenBlockComment(stream, state) {
    var maybeEnd = false;
    while (true) {
      if (stream.match(/\*-/)) {
        state.tokenize = tokenBase;
        break;
      }
      if (stream.eol()) {
        break;
      }
      stream.next();
    }
    return "comment";
  }
  
  return {
    startState: function() {
      return {
        tokenize: tokenBase,
        indentDepth: 0
      };
    },
    
    token: function(stream, state) {
      if (stream.sol()) {
        state.indentDepth = stream.indentation();
      }
      return state.tokenize(stream, state);
    },
    
    indent: function(state, textAfter) {
      // Simple indentation logic
      return state.indentDepth;
    },
    
    electricChars: "dnt)",  // Characters that might affect indentation
    lineComment: "--",
    blockCommentStart: "-*",
    blockCommentEnd: "*-"
  };
});

CodeMirror.defineMIME("text/x-macaulay2", "macaulay2");

});