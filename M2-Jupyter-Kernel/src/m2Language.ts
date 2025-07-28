// @ts-ignore
import { parser } from './parser/parser';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';

// Define the M2 language with the parser
const M2Language = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        // Map our parser tokens to highlight tags
        Keyword: t.keyword,
        Type: t.typeName,
        Function: t.function(t.variableName),
        Boolean: t.bool,
        Null: t.null,
        Identifier: t.variableName,
        Number: t.number,
        String: t.string,
        LineComment: t.lineComment,
        BlockComment: t.blockComment,
        Operator: t.operator,
        Delimiter: t.punctuation,
      })
    ]
  }),
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

// Export the language support function
export function m2() {
  return new LanguageSupport(M2Language);
}