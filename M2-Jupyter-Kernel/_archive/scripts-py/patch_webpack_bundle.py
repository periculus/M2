#!/usr/bin/env python3
"""Patch the webpack bundle to include hardened colors"""

import re
import glob

# Find the webpack bundle
bundles = glob.glob("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static/lib_index_js.*.js")
if not bundles:
    bundles = glob.glob("@m2_jupyter/jupyterlab_m2_codemirror/labextension/static/lib_index_js.*.js")

if not bundles:
    print("ERROR: Could not find webpack bundle")
    exit(1)

bundle_path = bundles[0]
print(f"Found bundle: {bundle_path}")

# Read the bundle
with open(bundle_path, 'r') as f:
    content = f.read()

# Find the m2Language module section
m2_language_pattern = r'(/\*\*\*/ "./lib/m2Language\.js":[^}]+function m2\(\)[^}]+})'

# Check if we already have HighlightStyle
if "HighlightStyle.define" in content:
    print("Bundle already has HighlightStyle!")
    exit(0)

# The new m2Language module with hardened colors
new_m2_language = r'''/***/ "./lib/m2Language.js":
/*!***************************!*\
  !*** ./lib/m2Language.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m2: () => (/* binding */ m2)
/* harmony export */ });
/* harmony import */ var _parser_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parser/parser */ "./lib/parser/parser.js");
/* harmony import */ var _codemirror_language__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @codemirror/language */ "webpack/sharing/consume/default/@codemirror/language");
/* harmony import */ var _codemirror_language__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_codemirror_language__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @lezer/highlight */ "webpack/sharing/consume/default/@lezer/highlight");
/* harmony import */ var _lezer_highlight__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_lezer_highlight__WEBPACK_IMPORTED_MODULE_2__);

// Hardened highlight style with inline colors to prevent theme interference
const m2HighlightStyle = _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.HighlightStyle.define([
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.keyword,         color: "#0000ff",      fontWeight: "bold" },    // Blue
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.typeName,        color: "#008080",      fontWeight: "500" },     // Teal
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.function(_lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.variableName), color: "#800080" },  // Purple
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.bool,            color: "#ff1493" },                             // Deep Pink
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.null,            color: "#ff1493" },                             // Deep Pink
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.variableName,    color: "#000000" },                             // Black
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.number,          color: "#ff8c00" },                             // Dark Orange
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.string,          color: "#008000" },                             // Green
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.lineComment,     color: "#808080",      fontStyle: "italic" },   // Gray
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.blockComment,    color: "#808080",      fontStyle: "italic" },   // Gray
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.operator,        color: "#000080" },                             // Navy
  { tag: _lezer_highlight__WEBPACK_IMPORTED_MODULE_2__.tags.punctuation,     color: "#000000" }                              // Black
]);

// Define the M2 language with the parser that has highlighting built-in
const M2Language = _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LRLanguage.define({
    parser: _parser_parser__WEBPACK_IMPORTED_MODULE_0__.parser,
    languageData: {
        commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
        closeBrackets: { brackets: ['(', '[', '{', '"'] },
    }
});
// Export the language support function with hardened highlighting
function m2() {
    return new _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LanguageSupport(M2Language, m2HighlightStyle);
}'''

# Find and replace the m2Language module
if re.search(r'/\*\*\*/ "./lib/m2Language\.js":', content):
    # Find the full module definition
    start = content.find('/***/ "./lib/m2Language.js":')
    if start != -1:
        # Find the end of this module (next module starts with /***/)
        end = content.find('/***/', start + 10)
        if end == -1:
            end = len(content)
        
        # Extract the old module
        old_module = content[start:end]
        print(f"Found m2Language module ({len(old_module)} chars)")
        
        # Replace it
        content = content[:start] + new_m2_language + '\n\n' + content[end:]
        
        # Write back
        with open(bundle_path, 'w') as f:
            f.write(content)
        print(f"Patched {bundle_path} with hardened colors")
        
        # Also patch the copy in @m2_jupyter if it exists
        alt_path = bundle_path.replace("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror",
                                       "@m2_jupyter/jupyterlab_m2_codemirror/labextension")
        if alt_path != bundle_path:
            try:
                with open(alt_path, 'w') as f:
                    f.write(content)
                print(f"Also patched {alt_path}")
            except:
                pass
    else:
        print("ERROR: Could not find m2Language module in bundle")
else:
    print("ERROR: Bundle doesn't contain m2Language module")

print("\nDone! Restart JupyterLab to see blue keywords instead of green.")