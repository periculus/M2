// @ts-ignore
import { parser } from './parser/parser';
import {
  LanguageSupport,
  LRLanguage,
  syntaxHighlighting,
  HighlightStyle,
  syntaxTree,
  foldNodeProp,
  indentNodeProp,
  continuedIndent
} from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { completeFromList } from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
// @ts-ignore
import m2Symbols from './m2Symbols.json';
import { m2HoverTooltip } from './m2Hover';

// Build lookup for functions that have options
interface M2OptionEntry {
  name: string;
  type?: string;
  info?: string;
}
interface M2SymEntry {
  label: string;
  type: string;
  options?: M2OptionEntry[];
}
const symbolsWithOptions: Record<string, M2SymEntry> = {};
for (const sym of m2Symbols as M2SymEntry[]) {
  if (sym.options && sym.options.length > 0) {
    symbolsWithOptions[sym.label] = sym;
  }
}

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
      CallExpr(node: any) {
        const firstChild = node.firstChild;
        if (!firstChild) return null;
        if (node.to - firstChild.to > 40) {
          return { from: firstChild.to + 1, to: node.to - 1 };
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

// Base completion source using all symbols
const baseCompletion = completeFromList(m2Symbols);

// Context-aware completion for function options inside CallExpr
function m2OptionCompletion(context: CompletionContext): CompletionResult | null {
  const tree = syntaxTree(context.state);
  let node: any = tree.resolveInner(context.pos, -1);

  // Walk up to find enclosing CallExpr
  while (node) {
    if (node.type.name === 'CallExpr') {
      const funcNode = node.firstChild;
      if (!funcNode) break;

      // Only offer options when cursor is past the opening delimiter
      if (context.pos <= funcNode.to) break;

      // Extract function name (only simple identifiers)
      const funcName = context.state.doc.sliceString(funcNode.from, funcNode.to);
      const funcSym = symbolsWithOptions[funcName];
      if (!funcSym || !funcSym.options) break;

      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      // Need either a partial word or explicit trigger
      if (word.from === word.to && !context.explicit) return null;

      return {
        from: word.from,
        options: funcSym.options.map(opt => ({
          label: opt.name,
          apply: opt.name + ' => ',
          type: 'property' as const,
          info: opt.info,
          detail: opt.type || 'option',
          boost: 10,
        })),
        validFor: /^\w*$/,
      };
    }
    node = node.parent;
  }

  return null;
}

const M2Language = LRLanguage.define({
  parser: parserWithProps,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    autocomplete: baseCompletion
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
    M2Language.data.of({ autocomplete: m2OptionCompletion }),
  ]);
}
