import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import type { Extension } from "@codemirror/state";

// M2 highlight style with proper colors
// Uses Prec.highest to override JupyterLab's default theme
const m2Colors = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword],  color: "#0000ff",  fontWeight: "bold" },
  { tag: t.operatorKeyword,              color: "#0000ff",  fontWeight: "bold" },
  { tag: t.typeName,                     color: "#008080",  fontWeight: "500" },
  { tag: t.function(t.variableName),     color: "#800080" },
  { tag: t.constant(t.variableName),     color: "#ff1493" },
  { tag: t.bool,                         color: "#ff1493" },
  { tag: t.null,                         color: "#ff1493" },
  { tag: t.variableName,                 color: "#000000" },
  { tag: t.number,                       color: "#ff8c00" },
  { tag: t.string,                       color: "#008000" },
  { tag: t.docString,                    color: "#008000",  fontStyle: "italic" },
  { tag: t.lineComment,                  color: "#808080",  fontStyle: "italic" },
  { tag: t.blockComment,                 color: "#808080",  fontStyle: "italic" },
  { tag: t.operator,                     color: "#000080" },
  { tag: t.paren,                        color: "#000000" },
  { tag: t.squareBracket,               color: "#000000" },
  { tag: t.brace,                        color: "#000000" },
  { tag: t.separator,                    color: "#000000" },
]);

export const m2HighlightStyle: Extension = Prec.highest(syntaxHighlighting(m2Colors));
