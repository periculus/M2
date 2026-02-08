// M2 Language support with hardened styling
import {LRLanguage, LanguageSupport} from "@codemirror/language"
import {parser} from "./parser/parser"
import {m2HighlightStyle} from "./highlight_hardened"

// Configure the M2 language with hardened highlighting
export const M2Language = LRLanguage.define({
  parser: parser.configure({
    props: [
      // Additional parser properties can go here
    ]
  }),
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    // Add autocomplete data
    autocomplete: [
      // Keywords
      {label: "if", type: "keyword"},
      {label: "then", type: "keyword"},
      {label: "else", type: "keyword"},
      {label: "for", type: "keyword"},
      {label: "while", type: "keyword"},
      {label: "do", type: "keyword"},
      {label: "return", type: "keyword"},
      {label: "break", type: "keyword"},
      {label: "continue", type: "keyword"},
      
      // Types
      {label: "Ring", type: "type"},
      {label: "Ideal", type: "type"},
      {label: "Matrix", type: "type"},
      {label: "Module", type: "type"},
      {label: "ZZ", type: "type"},
      {label: "QQ", type: "type"},
      {label: "RR", type: "type"},
      {label: "CC", type: "type"},
      
      // Functions
      {label: "gb", type: "function", info: "Compute Gröbner basis"},
      {label: "ideal", type: "function", info: "Create an ideal"},
      {label: "matrix", type: "function", info: "Create a matrix"},
      {label: "res", type: "function", info: "Compute free resolution"},
      {label: "ring", type: "function", info: "Create a ring"},
      {label: "decompose", type: "function", info: "Primary decomposition"},
    ]
  }
})

// Export the language support with hardened highlighting
export function m2() {
  return new LanguageSupport(M2Language, [
    m2HighlightStyle
  ])
}