"use strict";
(self["webpackChunkjupyterlab_m2"] = self["webpackChunkjupyterlab_m2"] || []).push([["lib_index_js"],{

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
/* harmony import */ var _codemirror_lang_m2__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @codemirror/lang-m2 */ "webpack/sharing/consume/default/@codemirror/lang-m2/@codemirror/lang-m2");
/* harmony import */ var _codemirror_lang_m2__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_codemirror_lang_m2__WEBPACK_IMPORTED_MODULE_1__);


/**
 * The M2 language extension for JupyterLab
 */
const m2Plugin = {
    id: 'jupyterlab-m2:plugin',
    description: 'Macaulay2 language support for JupyterLab',
    autoStart: true,
    requires: [_jupyterlab_codemirror__WEBPACK_IMPORTED_MODULE_0__.IEditorLanguageRegistry],
    activate: (app, registry) => {
        console.log('JupyterLab M2 extension is activated!');
        // Register the M2 language with CodeMirror
        registry.addLanguage({
            name: 'macaulay2',
            mime: 'text/x-macaulay2',
            extensions: ['.m2'],
            support: (0,_codemirror_lang_m2__WEBPACK_IMPORTED_MODULE_1__.m2)()
        });
        // Also register common aliases
        registry.addLanguage({
            name: 'm2',
            mime: 'text/x-m2',
            extensions: ['.m2'],
            support: (0,_codemirror_lang_m2__WEBPACK_IMPORTED_MODULE_1__.m2)()
        });
        console.log('M2 language registered with CodeMirror');
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (m2Plugin);


/***/ })

}]);
//# sourceMappingURL=lib_index_js.b7f66fc7ea24084e62f1.js.map