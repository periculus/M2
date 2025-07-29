import { ExternalTokenizer } from "@lezer/lr";

// M2 language data - keywords, types, functions, constants
export const m2Keywords = [
  "if", "then", "else", "when", "do", "while", "for", "from", "to", "in",
  "break", "continue", "return", "try", "catch", "throw", "local", "global",
  "export", "exportMutable", "protect", "private", "package", "use",
  "and", "or", "not", "xor", "true", "false", "null", "nil",
  "new", "method"
];

export const m2Types = [
  "Type", "BasicList", "List", "Sequence", "Array", "MutableList",
  "HashTable", "MutableHashTable", "OptionTable", "Tally", "Set", "Dictionary",
  "String", "Net", "Symbol", "Keyword", "Boolean",
  "Number", "ZZ", "QQ", "RR", "CC", "InexactNumber",
  "Ring", "RingElement", "Ideal", "Module", "Matrix", "MutableMatrix",
  "ChainComplex", "ChainComplexMap", "GradedModule", "GradedModuleMap",
  "PolynomialRing", "QuotientRing", "FractionField", "GaloisField",
  "Monoid", "MonoidElement", "MonomialIdeal", "MonomialOrder",
  "CoherentSheaf", "SheafMap", "Variety", "ProjectiveVariety", "AffineVariety"
];

export const m2Functions = [
  "gb", "res", "ideal", "matrix", "ring", "map", "ker", "coker", "image",
  "decompose", "primaryDecomposition", "radicalDecomposition", 
  "minimalPrimes", "associatedPrimes", "saturate", "quotient",
  "hilbertFunction", "hilbertPolynomial", "hilbertSeries",
  "betti", "regularity", "codim", "dim", "degree", "genus",
  "homology", "cohomology", "Hom", "Ext", "Tor",
  "basis", "gens", "mingens", "trim", "prune", "minimalPresentation",
  "transpose", "dual", "rank", "det", "determinant", "trace",
  "eigenvalues", "eigenvectors", "characteristicPolynomial",
  "factor", "gcd", "lcm", "isPrime", "random", "randomMutableMatrix",
  "sin", "cos", "tan", "exp", "log", "sqrt", "abs"
];

export const m2Constants = [
  "pi", "ii", "ee", "infinity", "InfiniteNumber", "IndeterminateNumber",
  "EulerConstant", "CatalanConstant", "GoldenRatio"
];