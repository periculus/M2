"use strict";
(self["webpackChunkjupyterlab_m2"] = self["webpackChunkjupyterlab_m2"] || []).push([["codemirror-lang-m2_dist_index_js-webpack_sharing_consume_default_codemirror_state-webpack_sha-50fce1"],{

/***/ "../codemirror-lang-m2/dist/highlight.js":
/*!***********************************************!*\
  !*** ../codemirror-lang-m2/dist/highlight.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m2HighlightStyle: () => (/* binding */ m2HighlightStyle)
/* harmony export */ });
/* harmony import */ var _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lezer/highlight */ "webpack/sharing/consume/default/@lezer/highlight");
/* harmony import */ var _lezer_highlight__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _codemirror_highlight__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @codemirror/highlight */ "../codemirror-lang-m2/node_modules/@codemirror/highlight/dist/index.js");
/* harmony import */ var _tokens__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./tokens */ "../codemirror-lang-m2/dist/tokens.js");



// Create a map for quick lookups
const keywordSet = new Set(_tokens__WEBPACK_IMPORTED_MODULE_2__.m2Keywords);
const typeSet = new Set(_tokens__WEBPACK_IMPORTED_MODULE_2__.m2Types);
const functionSet = new Set(_tokens__WEBPACK_IMPORTED_MODULE_2__.m2Functions);
const constantSet = new Set(_tokens__WEBPACK_IMPORTED_MODULE_2__.m2Constants);
const m2HighlightStyle = _codemirror_highlight__WEBPACK_IMPORTED_MODULE_1__.HighlightStyle.define([
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.keyword, color: "var(--jp-mirror-editor-keyword-color)", fontWeight: "bold" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.typeName, color: "var(--jp-mirror-editor-type-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.function(_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.name), color: "var(--jp-mirror-editor-function-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.constant(_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.name), color: "var(--jp-mirror-editor-constant-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.variableName, color: "var(--jp-mirror-editor-def-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.number, color: "var(--jp-mirror-editor-number-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.string, color: "var(--jp-mirror-editor-string-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.lineComment, color: "var(--jp-mirror-editor-comment-color)", fontStyle: "italic" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.blockComment, color: "var(--jp-mirror-editor-comment-color)", fontStyle: "italic" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.operator, color: "var(--jp-mirror-editor-operator-color)" },
    { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.punctuation, color: "var(--jp-mirror-editor-delimiter-color)" }
]);
// No dynamic classification; rely on static Keyword, Type, Function, Constant, Word nodes


/***/ }),

/***/ "../codemirror-lang-m2/dist/index.js":
/*!*******************************************!*\
  !*** ../codemirror-lang-m2/dist/index.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m2: () => (/* binding */ m2),
/* harmony export */   m2Constants: () => (/* reexport safe */ _tokens__WEBPACK_IMPORTED_MODULE_4__.m2Constants),
/* harmony export */   m2Functions: () => (/* reexport safe */ _tokens__WEBPACK_IMPORTED_MODULE_4__.m2Functions),
/* harmony export */   m2Keywords: () => (/* reexport safe */ _tokens__WEBPACK_IMPORTED_MODULE_4__.m2Keywords),
/* harmony export */   m2Language: () => (/* binding */ m2Language),
/* harmony export */   m2Types: () => (/* reexport safe */ _tokens__WEBPACK_IMPORTED_MODULE_4__.m2Types),
/* harmony export */   parser: () => (/* reexport safe */ _parser__WEBPACK_IMPORTED_MODULE_0__.parser)
/* harmony export */ });
/* harmony import */ var _parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parser */ "../codemirror-lang-m2/dist/parser.js");
/* harmony import */ var _codemirror_language__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @codemirror/language */ "webpack/sharing/consume/default/@codemirror/language");
/* harmony import */ var _codemirror_language__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_codemirror_language__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _highlight__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./highlight */ "../codemirror-lang-m2/dist/highlight.js");
/* harmony import */ var _codemirror_autocomplete__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @codemirror/autocomplete */ "../codemirror-lang-m2/node_modules/@codemirror/autocomplete/dist/index.js");
/* harmony import */ var _tokens__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./tokens */ "../codemirror-lang-m2/dist/tokens.js");





// Configure the parser with indentation and folding
const m2Language = _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LRLanguage.define({
    parser: _parser__WEBPACK_IMPORTED_MODULE_0__.parser.configure({
        props: [
            _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.indentNodeProp.add({
                IfStatement: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "else" }),
                WhileStatement: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "do" }),
                ForStatement: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "do" }),
                TryStatement: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "catch" }),
                FunctionDef: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: ")" }),
                List: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "}" }),
                Array: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "]" }),
                HashTable: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_1__.delimitedIndent)({ closing: "}" })
            }),
            _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.foldNodeProp.add({
                List: _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.foldInside,
                Array: _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.foldInside,
                HashTable: _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.foldInside,
                Comment: () => null
            }),
            // Remove static styleTags; HighlightStyle extension applies colors
            // m2HighlightStyle
        ]
    }),
    languageData: {
        commentTokens: { line: "--", block: { open: "-*", close: "*-" } },
        closeBrackets: { brackets: ["(", "[", "{", '"', "///"] },
        autocomplete: (0,_codemirror_autocomplete__WEBPACK_IMPORTED_MODULE_3__.completeFromList)([
            ..._tokens__WEBPACK_IMPORTED_MODULE_4__.m2Keywords.map(kw => ({ label: kw, type: "keyword" })),
            ..._tokens__WEBPACK_IMPORTED_MODULE_4__.m2Types.map(t => ({ label: t, type: "type" })),
            ..._tokens__WEBPACK_IMPORTED_MODULE_4__.m2Functions.map(f => ({ label: f, type: "function" })),
            ..._tokens__WEBPACK_IMPORTED_MODULE_4__.m2Constants.map(c => ({ label: c, type: "constant" }))
        ])
    }
});
// Main language support function
function m2() {
    // Return language support including HighlightStyle for inline syntax colors
    return new _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LanguageSupport(m2Language, [_highlight__WEBPACK_IMPORTED_MODULE_2__.m2HighlightStyle]);
}
// Export specific features for external use




/***/ }),

/***/ "../codemirror-lang-m2/dist/parser.js":
/*!********************************************!*\
  !*** ../codemirror-lang-m2/dist/parser.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parser: () => (/* binding */ parser)
/* harmony export */ });
/* harmony import */ var _lezer_lr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lezer/lr */ "../codemirror-lang-m2/node_modules/@lezer/lr/dist/index.js");
// This file was generated by lezer-generator. You probably shouldn't edit it.

const parser = _lezer_lr__WEBPACK_IMPORTED_MODULE_0__.LRParser.deserialize({
  version: 14,
  states: "nQVQPOOOOQO'#Ci'#CiOOQO'#Ce'#CeQVQPOOOOQO-E6c-E6c",
  stateData: "s~O[OS~OQPORPOSPOTPOUPOVPOWPO~OTUVU~",
  goto: "i^PPPPPPPPP_PPPeQRORSRTQOR",
  nodeNames: "⚠ Program Word Number String LineComment BlockComment Operator Delimiter",
  maxTerm: 13,
  skippedNodes: [0],
  repeatNodeCount: 1,
  tokenData: ")z~RvX^#ipq#iqr$^rs$ist$duv$dxy&Vyz&Vz{&[{|&d|}&V}!O&l!O!P(W!P!Q(^!Q![(f![!])P!]!^&V!^!_)X!_!`)X!`!a)X!a!b$d!c!})a!}#O&V#P#Q&V#Q#R$d#R#S$d#T#o)a#o#p&V#p#q)r#q#r&V#y#z#i$f$g#i#BY#BZ#i$IS$I_#i$I|$JO#i$JT$JU#i$KV$KW#i&FU&FV#i~#nY[~X^#ipq#i#y#z#i$f$g#i#BY#BZ#i$IS$I_#i$I|$JO#i$JT$JU#i$KV$KW#i&FU&FV#i~$aP!_!`$d~$iOV~~$lVOr$irs%Rs#O$i#O#P%W#P;'S$i;'S;=`&P<%lO$i~%WOS~~%ZRO;'S$i;'S;=`%d;=`O$i~%gWOr$irs%Rs#O$i#O#P%W#P;'S$i;'S;=`&P;=`<%l$i<%lO$i~&SP;=`<%l$i~&[OW~~&aPV~z{$d~&iPV~{|$d~&qRV~z{&z}!O'o!`!a$d~&}TOz&zz{'^{;'S&z;'S;=`'i<%lO&z~'aP}!O'd~'iOU~~'lP;=`<%l&z~'tST~OY'oZ;'S'o;'S;=`(Q<%lO'o~(TP;=`<%l'o~(ZP!O!P$d~(cPV~!P!Q$d~(kQR~!O!P(q!Q![(f~(tP!Q![(w~(|PR~!Q![(w~)UPW~!_!`$d~)^PV~!_!`$d~)fSQ~!Q![)a!c!})a#R#S)a#T#o)a~)wPV~#p#q$d",
  tokenizers: [0],
  topRules: {"Program":[0,1]},
  tokenPrec: 30
})


/***/ }),

/***/ "../codemirror-lang-m2/dist/tokens.js":
/*!********************************************!*\
  !*** ../codemirror-lang-m2/dist/tokens.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m2Constants: () => (/* binding */ m2Constants),
/* harmony export */   m2Functions: () => (/* binding */ m2Functions),
/* harmony export */   m2Keywords: () => (/* binding */ m2Keywords),
/* harmony export */   m2Types: () => (/* binding */ m2Types)
/* harmony export */ });
// M2 language data - keywords, types, functions, constants
const m2Keywords = [
    "if", "then", "else", "when", "do", "while", "for", "from", "to", "in",
    "break", "continue", "return", "try", "catch", "throw", "local", "global",
    "export", "exportMutable", "protect", "private", "package", "use",
    "and", "or", "not", "xor", "true", "false", "null", "nil",
    "new", "method"
];
const m2Types = [
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
const m2Functions = [
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
const m2Constants = [
    "pi", "ii", "ee", "infinity", "InfiniteNumber", "IndeterminateNumber",
    "EulerConstant", "CatalanConstant", "GoldenRatio"
];


/***/ })

}]);
//# sourceMappingURL=codemirror-lang-m2_dist_index_js-webpack_sharing_consume_default_codemirror_state-webpack_sha-50fce1.1ae536a162cb50e9c5c4.js.map