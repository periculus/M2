"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var codemirror_1 = require("@jupyterlab/codemirror");
var m2Language_1 = require("./m2Language");
/**
 * M2 syntax highlighting extension for JupyterLab
 * This version works like Python - using the parser's built-in highlighting
 * but overrides the theme colors to match M2 expectations
 */
var plugin = {
    id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
    description: 'Macaulay2 syntax highlighting for JupyterLab',
    autoStart: true,
    requires: [codemirror_1.IEditorLanguageRegistry],
    activate: function (app, registry) {
        console.log('M2 CodeMirror extension activating...');
        // Register M2 language support
        var spec = {
            name: 'macaulay2',
            displayName: 'Macaulay2',
            mime: ['text/x-macaulay2', 'text/macaulay2'],
            extensions: ['.m2'],
            support: (0, m2Language_1.m2)()
        };
        registry.addLanguage(spec);
        console.log('M2 language registered successfully');
        // Override JupyterLab theme colors to match M2 expectations
        // This is the key difference - Python users expect green keywords,
        // but M2 users expect blue keywords
        var style = document.createElement('style');
        style.textContent = "\n      /* Override JupyterLab theme colors for M2 */\n      .cm-editor[data-language=\"macaulay2\"] .cm-keyword,\n      .cm-editor[data-language=\"macaulay2\"] .\u037Cs {\n        color: #0000ff !important;\n        font-weight: bold !important;\n      }\n      .cm-editor[data-language=\"macaulay2\"] .cm-typeName {\n        color: #008080 !important;\n      }\n      .cm-editor[data-language=\"macaulay2\"] .cm-function {\n        color: #800080 !important;\n      }\n    ";
        document.head.appendChild(style);
        console.log('M2 color overrides applied');
        console.log('Keywords will be blue (not green like Python)');
    }
};
exports.default = plugin;
