"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.m2 = void 0;
// @ts-ignore
var parser_1 = require("./parser/parser");
var language_1 = require("@codemirror/language");
// Define the M2 language exactly like Python does
var M2Language = language_1.LRLanguage.define({
    parser: parser_1.parser,
    languageData: {
        commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
        closeBrackets: { brackets: ['(', '[', '{', '"'] },
    }
});
// Export the language support WITHOUT HighlightStyle
// The parser already has highlighting via propSources
function m2() {
    return new language_1.LanguageSupport(M2Language);
}
exports.m2 = m2;
