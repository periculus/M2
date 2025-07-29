"use strict";
(self["webpackChunk_m2_jupyter_jupyterlab_m2_codemirror"] = self["webpackChunk_m2_jupyter_jupyterlab_m2_codemirror"] || []).push([["lib_index_js"],{

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_codemirror__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/codemirror */ "webpack/sharing/consume/default/@jupyterlab/codemirror");
/* harmony import */ var _jupyterlab_codemirror__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_codemirror__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _codemirror_lang_python__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @codemirror/lang-python */ "webpack/sharing/consume/default/@codemirror/lang-python/@codemirror/lang-python");
/* harmony import */ var _codemirror_lang_python__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_codemirror_lang_python__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _style_index_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../style/index.css */ "./style/index.css");

// import { LanguageSupport } from '@codemirror/language';

// Import CSS for syntax highlighting  

/**
 * Test: Use Python highlighting for Macaulay2 to verify the mechanism works
 */
const plugin = {
    id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
    description: 'Test Python highlighting for Macaulay2',
    autoStart: true,
    requires: [_jupyterlab_codemirror__WEBPACK_IMPORTED_MODULE_0__.IEditorLanguageRegistry],
    activate: (app, registry) => {
        console.log('=== PYTHON TEST FOR M2 ===');
        try {
            // First, log what we're doing
            console.log('Attempting to override macaulay2 with Python highlighting...');
            // Register Python highlighting for macaulay2
            const spec = {
                name: 'macaulay2',
                displayName: 'Macaulay2 (Python Test)',
                mime: ['text/x-macaulay2', 'text/macaulay2', 'application/x-macaulay2'],
                extensions: ['.m2'],
                support: (0,_codemirror_lang_python__WEBPACK_IMPORTED_MODULE_1__.python)()
            };
            registry.addLanguage(spec);
            console.log('Python highlighting registered for macaulay2');
            // Also try to override by mime type
            registry.addLanguage({
                name: 'text/x-macaulay2',
                mime: ['text/x-macaulay2'],
                support: (0,_codemirror_lang_python__WEBPACK_IMPORTED_MODULE_1__.python)()
            });
            console.log('Also registered for mime type text/x-macaulay2');
            // Verify
            const check = registry.findBest('macaulay2');
            console.log('Verification:', check);
            // Add helper to check in console
            window.testPythonHighlight = () => {
                console.log('Testing Python highlight...');
                // Force refresh of editors
                document.querySelectorAll('.cm-content').forEach((el) => {
                    console.log('Editor language:', el.getAttribute('data-language'));
                    // Try to force Python
                    el.setAttribute('data-language', 'python');
                });
            };
            console.log('Test function available: window.testPythonHighlight()');
        }
        catch (error) {
            console.error('Python test failed:', error);
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ })

}]);
//# sourceMappingURL=lib_index_js.4dc429f9ec65c740e5af.js.map