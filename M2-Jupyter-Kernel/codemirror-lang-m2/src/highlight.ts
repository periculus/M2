import { tags as t } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/highlight";
import type { Extension } from "@codemirror/state";

// Hardened highlight style with inline colors to prevent theme interference
export const m2HighlightStyle: Extension = HighlightStyle.define([
  { tag: t.keyword,         color: "#0000ff",      fontWeight: "bold" },    // Blue
  { tag: t.controlKeyword,  color: "#0000ff",      fontWeight: "bold" },    // Blue
  { tag: t.operatorKeyword, color: "#0000ff",      fontWeight: "bold" },    // Blue
  { tag: t.typeName,        color: "#008080",      fontWeight: "500" },     // Teal
  { tag: t.function(t.name),color: "#800080" },                             // Purple
  { tag: t.constant(t.name),color: "#ff1493" },                             // Deep Pink
  { tag: t.bool,            color: "#ff1493" },                             // Deep Pink
  { tag: t.null,            color: "#ff1493" },                             // Deep Pink
  { tag: t.variableName,    color: "#000000" },                             // Black
  { tag: t.number,          color: "#ff8c00" },                             // Dark Orange
  { tag: t.string,          color: "#008000" },                             // Green
  { tag: t.docString,       color: "#008000",      fontStyle: "italic" },   // Green Italic
  { tag: t.lineComment,     color: "#808080",      fontStyle: "italic" },   // Gray
  { tag: t.blockComment,    color: "#808080",      fontStyle: "italic" },   // Gray
  { tag: t.operator,        color: "#000080" },                             // Navy
  { tag: t.punctuation,     color: "#000000" },                             // Black
  { tag: t.paren,           color: "#000000" },                             // Black
  { tag: t.squareBracket,   color: "#000000" },                             // Black
  { tag: t.brace,           color: "#000000" },                             // Black
  { tag: t.separator,       color: "#000000" }                              // Black
]);
