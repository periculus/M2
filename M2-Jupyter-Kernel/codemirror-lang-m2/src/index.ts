import { parser } from "./parser";
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, delimitedIndent } from "@codemirror/language";
import { m2HighlightStyle } from "./highlight";
import { completeFromList } from "@codemirror/autocomplete";
import { m2Keywords, m2Types, m2Functions, m2Constants } from "./tokens";

// Configure the parser with indentation and folding
export const m2Language = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        IfStatement: delimitedIndent({ closing: "else" }),
        WhileStatement: delimitedIndent({ closing: "do" }),
        ForStatement: delimitedIndent({ closing: "do" }),
        TryStatement: delimitedIndent({ closing: "catch" }),
        FunctionDef: delimitedIndent({ closing: ")" }),
        List: delimitedIndent({ closing: "}" }),
        Array: delimitedIndent({ closing: "]" }),
        HashTable: delimitedIndent({ closing: "}" })
      }),
      foldNodeProp.add({
        List: foldInside,
        Array: foldInside,
        HashTable: foldInside,
        Comment: () => null
      }),
      // Remove static styleTags; HighlightStyle extension applies colors
      // m2HighlightStyle
    ]
  }),
  languageData: {
    commentTokens: { line: "--", block: { open: "-*", close: "*-" } },
    closeBrackets: { brackets: ["(", "[", "{", '"', "///"] },
    autocomplete: completeFromList([
      ...m2Keywords.map(kw => ({ label: kw, type: "keyword" })),
      ...m2Types.map(t => ({ label: t, type: "type" })),
      ...m2Functions.map(f => ({ label: f, type: "function" })),
      ...m2Constants.map(c => ({ label: c, type: "constant" }))
    ])
  }
});

// Main language support function
export function m2() {
  // Return language support including HighlightStyle for inline syntax colors
  return new LanguageSupport(m2Language, [m2HighlightStyle]);
}

// Export specific features for external use
export { m2Keywords, m2Types, m2Functions, m2Constants } from "./tokens";
export { parser } from "./parser";