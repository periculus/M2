#!/usr/bin/env python3
"""Apply the proper fix - like Python but with CSS overrides"""

import re
import glob

# Find the webpack bundle
bundles = glob.glob("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror/static/lib_index_js.*.js")
if not bundles:
    print("ERROR: Could not find webpack bundle")
    exit(1)

bundle_path = bundles[0]
print(f"Patching bundle: {bundle_path}")

with open(bundle_path, 'r') as f:
    content = f.read()

# First, remove any HighlightStyle from m2Language
# Find the m2Language module
m2_start = content.find('/***/ "./lib/m2Language.js":')
if m2_start != -1:
    m2_end = content.find('/***/', m2_start + 10)
    if m2_end == -1:
        m2_end = len(content)
    
    # Replace with simple version (no HighlightStyle)
    simple_m2 = '''
/***/ "./lib/m2Language.js":
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

// Define the M2 language exactly like Python does
const M2Language = _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LRLanguage.define({
    parser: _parser_parser__WEBPACK_IMPORTED_MODULE_0__.parser,
    languageData: {
        commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
        closeBrackets: { brackets: ['(', '[', '{', '"'] },
    }
});
// Export the language support WITHOUT HighlightStyle
// The parser already has highlighting via propSources
function m2() {
    return new _codemirror_language__WEBPACK_IMPORTED_MODULE_1__.LanguageSupport(M2Language);
}

/***/ }),'''
    
    content = content[:m2_start] + simple_m2 + '\n' + content[m2_end:]
    print("Replaced m2Language with simple version (no HighlightStyle)")

# Now update the index.js to add CSS overrides
index_start = content.find('console.log(\'M2 language registered successfully')
if index_start != -1:
    # Find where to insert the CSS injection
    insert_point = content.find(');', index_start) + 2
    
    css_injection = '''
            // Override JupyterLab theme colors to match M2 expectations
            // This is the key difference - Python users expect green keywords,
            // but M2 users expect blue keywords
            const style = document.createElement('style');
            style.textContent = `
              /* Override JupyterLab theme colors for M2 */
              .cm-editor[data-language="macaulay2"] .cm-keyword,
              .cm-editor[data-language="macaulay2"] [class*="ͼ"][class*="s"] {
                color: #0000ff !important;
                font-weight: bold !important;
              }
              .cm-editor[data-language="macaulay2"] .cm-typeName {
                color: #008080 !important;
              }
              .cm-editor[data-language="macaulay2"] .cm-function {
                color: #800080 !important;
              }
            `;
            document.head.appendChild(style);
            console.log('M2 color overrides applied');
            console.log('Keywords will be blue (not green like Python)');'''
    
    content = content[:insert_point] + css_injection + content[insert_point:]
    print("Added CSS override injection to index.js")

# Write back
with open(bundle_path, 'w') as f:
    f.write(content)

# Also update the other copy
alt_path = bundle_path.replace("venv/share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror",
                               "@m2_jupyter/jupyterlab_m2_codemirror/labextension")
try:
    with open(alt_path, 'w') as f:
        f.write(content)
    print(f"Also updated {alt_path}")
except:
    pass

print("\nDone! This fix:")
print("1. Uses parser highlighting (like Python)")
print("2. Adds CSS overrides for M2-specific colors")
print("3. Keywords will be BLUE in M2 cells only")
print("\nRestart JupyterLab to test.")