// @ts-ignore
import { parser } from './parser/parser';
import { LanguageSupport, LRLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const M2Language = LRLanguage.define({
  parser: parser,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

// Mark M2 editors so CSS variable overrides can target them
const m2EditorAttrs = EditorView.editorAttributes.of({
  "data-language": "macaulay2"
});

// HighlightStyle for tags that JupyterLab's theme does NOT handle.
// JupyterLab handles keyword, comment, string, number, operator, bool via CSS variables
// (we override those in index.ts). But typeName, function(variableName),
// constant(variableName), and docString have no JupyterLab rule.
const m2ExtraHighlights = HighlightStyle.define([
  { tag: t.typeName,                 color: "#008080", fontWeight: "500" },
  { tag: t.function(t.variableName), color: "#800080" },
  { tag: t.constant(t.variableName), color: "#ff1493" },
  { tag: t.docString,               color: "#008000", fontStyle: "italic" },
]);

export function m2() {
  return new LanguageSupport(M2Language, [
    m2EditorAttrs,
    syntaxHighlighting(m2ExtraHighlights),
  ]);
}
