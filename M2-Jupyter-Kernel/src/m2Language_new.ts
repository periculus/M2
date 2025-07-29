// @ts-ignore
import { parser } from './parser/parser';
import { LanguageSupport, LRLanguage } from '@codemirror/language';

// Define the M2 language with the parser that has highlighting built-in
const M2Language = LRLanguage.define({
  parser: parser,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

// Export the language support function
export function m2() {
  return new LanguageSupport(M2Language);
}