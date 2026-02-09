// @ts-ignore
import { parser } from './parser/parser';
import {
  LanguageSupport,
  LRLanguage,
  syntaxHighlighting,
  HighlightStyle,
  foldNodeProp,
  indentNodeProp,
  continuedIndent
} from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { completeFromList } from '@codemirror/autocomplete';
// @ts-ignore
import m2Symbols from './m2Symbols.json';
import { m2HoverTooltip } from './m2Hover';

const parserWithProps = parser.configure({
  props: [
    foldNodeProp.add({
      ParenExpr(node: any) {
        if (node.to - node.from > 40) {
          return { from: node.from + 1, to: node.to - 1 };
        }
        return null;
      },
      ListExpr(node: any) {
        if (node.to - node.from > 40) {
          return { from: node.from + 1, to: node.to - 1 };
        }
        return null;
      },
      ArrayExpr(node: any) {
        if (node.to - node.from > 40) {
          return { from: node.from + 1, to: node.to - 1 };
        }
        return null;
      },
      BlockComment(node: any) {
        return { from: node.from + 2, to: node.to - 2 };
      }
    }),
    indentNodeProp.add({
      ParenExpr: continuedIndent(),
      ListExpr: continuedIndent(),
      ArrayExpr: continuedIndent(),
      IfExpr: continuedIndent(),
      ForExpr: continuedIndent(),
      WhileExpr: continuedIndent()
    })
  ]
});

const M2Language = LRLanguage.define({
  parser: parserWithProps,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    autocomplete: completeFromList(m2Symbols)
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
    m2HoverTooltip,
  ]);
}
