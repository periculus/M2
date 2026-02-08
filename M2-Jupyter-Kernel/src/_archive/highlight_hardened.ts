// Hardened M2 syntax highlighting with inline styles
// This prevents theme interference by using direct colors instead of CSS variables

import {HighlightStyle} from "@codemirror/language"
import {tags as t} from "@lezer/highlight"

// Define hardcoded colors that won't be affected by JupyterLab themes
export const m2HighlightStyle = HighlightStyle.define([
  // Keywords - always blue
  { tag: t.keyword,           color: "#0000ff", fontWeight: "bold" },
  { tag: t.controlKeyword,    color: "#0000ff", fontWeight: "bold" },
  { tag: t.operatorKeyword,   color: "#0000ff", fontWeight: "bold" },
  { tag: t.definitionKeyword, color: "#0000ff", fontWeight: "bold" },
  { tag: t.modifier,          color: "#0000ff", fontWeight: "bold" },
  
  // Types - always teal
  { tag: t.typeName,          color: "#008080", fontWeight: "500" },
  { tag: t.standard(t.typeName), color: "#008080", fontWeight: "500" },
  { tag: t.definition(t.typeName), color: "#008080", fontWeight: "500" },
  
  // Functions - always purple
  { tag: t.function(t.variableName), color: "#800080" },
  { tag: t.function(t.propertyName), color: "#800080" },
  { tag: t.method(t.variableName),   color: "#800080" },
  
  // Variables - black (default color)
  { tag: t.variableName,      color: "#000000" },
  { tag: t.propertyName,      color: "#000000" },
  { tag: t.definition(t.variableName), color: "#000000", textDecoration: "underline" },
  { tag: t.local(t.variableName), color: "#000000" },
  
  // Literals
  { tag: t.string,            color: "#008000" },
  { tag: t.docString,         color: "#008000", fontStyle: "italic" },
  { tag: t.character,         color: "#008000" },
  { tag: t.number,            color: "#ff8c00" },
  { tag: t.integer,           color: "#ff8c00" },
  { tag: t.float,             color: "#ff8c00" },
  { tag: t.bool,              color: "#ff1493" },
  { tag: t.null,              color: "#ff1493" },
  { tag: t.regexp,            color: "#ff6b6b" },
  { tag: t.escape,            color: "#ff6b6b", fontWeight: "bold" },
  
  // Comments - always gray italic
  { tag: t.comment,           color: "#808080", fontStyle: "italic" },
  { tag: t.lineComment,       color: "#808080", fontStyle: "italic" },
  { tag: t.blockComment,      color: "#808080", fontStyle: "italic" },
  { tag: t.docComment,        color: "#808080", fontStyle: "italic" },
  
  // Operators and punctuation
  { tag: t.operator,          color: "#000080" },
  { tag: t.arithmeticOperator, color: "#000080" },
  { tag: t.compareOperator,   color: "#000080" },
  { tag: t.logicOperator,     color: "#000080" },
  { tag: t.bitwiseOperator,   color: "#000080" },
  { tag: t.updateOperator,    color: "#000080" },
  { tag: t.definitionOperator, color: "#000080", fontWeight: "bold" },
  { tag: t.punctuation,       color: "#000000" },
  { tag: t.separator,         color: "#000000" },
  { tag: t.bracket,           color: "#000000" },
  { tag: t.paren,             color: "#000000" },
  { tag: t.brace,             color: "#000000" },
  { tag: t.derefOperator,     color: "#000080" },
  
  // Special M2 constructs
  { tag: t.special(t.variableName), color: "#8b008b" }, // Special variables
  { tag: t.atom,              color: "#2aa198" }, // Atoms/symbols
  { tag: t.meta,              color: "#7f7f7f" }, // Meta information
  { tag: t.link,              color: "#0066cc", textDecoration: "underline" },
  { tag: t.heading,           color: "#000000", fontWeight: "bold", fontSize: "1.1em" },
  { tag: t.emphasis,          fontStyle: "italic" },
  { tag: t.strong,            fontWeight: "bold" },
  
  // Errors and invalid
  { tag: t.invalid,           color: "#ff0000", textDecoration: "wavy underline" }
])

// Also export individual color constants for reuse
export const M2_COLORS = {
  keyword: "#0000ff",
  type: "#008080",
  function: "#800080",
  variable: "#000000",
  string: "#008000",
  number: "#ff8c00",
  boolean: "#ff1493",
  null: "#ff1493",
  comment: "#808080",
  operator: "#000080",
  punctuation: "#000000",
  special: "#8b008b",
  atom: "#2aa198",
  error: "#ff0000"
}

// Export style tags mapping for the parser
export const m2StyleTags = {
  // Map parser node names to highlight tags
  "Keyword": t.keyword,
  "Type": t.typeName,
  "Function": t.function(t.variableName),
  "Boolean": t.bool,
  "Null": t.null,
  "Number": t.number,
  "String": t.string,
  "LineComment": t.lineComment,
  "BlockComment": t.blockComment,
  "Operator": t.operator,
  "Delimiter": t.punctuation,
  "Identifier": t.variableName,
  
  // Enhanced mappings for better grammar
  "AssignmentExpr": t.definitionOperator,
  "CallExpr": t.function(t.variableName),
  "MemberExpr": t.propertyName,
  "Symbol": t.atom,
  "IfStatement": t.controlKeyword,
  "ForStatement": t.controlKeyword,
  "WhileStatement": t.controlKeyword,
  "ReturnStatement": t.controlKeyword,
  
  // Special M2 constructs
  "RingDecl": t.definition(t.typeName),
  "IdealDecl": t.definition(t.typeName),
  "MatrixDecl": t.definition(t.typeName),
  "ListLiteral": t.special(t.variableName),
  "ArrayLiteral": t.special(t.variableName),
  "HashTableLiteral": t.special(t.variableName)
}