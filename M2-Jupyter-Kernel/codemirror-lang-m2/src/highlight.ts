import { tags as t } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/highlight";
import type { Extension } from "@codemirror/state";
import { m2Keywords, m2Types, m2Functions, m2Constants } from "./tokens";

// Create a map for quick lookups
const keywordSet = new Set(m2Keywords);
const typeSet = new Set(m2Types);
const functionSet = new Set(m2Functions);
const constantSet = new Set(m2Constants);

export const m2HighlightStyle: Extension = HighlightStyle.define([
  { tag: t.keyword,         color: "var(--jp-mirror-editor-keyword-color)",      fontWeight: "bold" },
  { tag: t.typeName,        color: "var(--jp-mirror-editor-type-color)" },
  { tag: t.function(t.name),color: "var(--jp-mirror-editor-function-color)" },
  { tag: t.constant(t.name),color: "var(--jp-mirror-editor-constant-color)" },
  { tag: t.variableName,    color: "var(--jp-mirror-editor-def-color)" },
  { tag: t.number,          color: "var(--jp-mirror-editor-number-color)" },
  { tag: t.string,          color: "var(--jp-mirror-editor-string-color)" },
  { tag: t.lineComment,     color: "var(--jp-mirror-editor-comment-color)",  fontStyle: "italic" },
  { tag: t.blockComment,    color: "var(--jp-mirror-editor-comment-color)",  fontStyle: "italic" },
  { tag: t.operator,        color: "var(--jp-mirror-editor-operator-color)" },
  { tag: t.punctuation,     color: "var(--jp-mirror-editor-delimiter-color)" }
]);

// No dynamic classification; rely on static Keyword, Type, Function, Constant, Word nodes