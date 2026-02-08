// @ts-ignore
import { parser } from './parser/parser';
import { LanguageSupport, LRLanguage } from '@codemirror/language';

// Define the M2 language exactly like Python does
const M2Language = LRLanguage.define({
  parser: parser,
  languageData: {
    commentTokens: { line: '--', block: { open: '-*', close: '*-' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

// Export the language support WITHOUT HighlightStyle
// The parser already has highlighting via propSources
export function m2() {
  return new LanguageSupport(M2Language);
}