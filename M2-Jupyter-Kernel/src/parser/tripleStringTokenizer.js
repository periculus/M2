// External tokenizer for M2 TripleString (/// ... ///).
//
// Mirrors M2's getstringslashes (lex.d:108-149) exactly:
//   1. Require opening /// at positions 0,1,2
//   2. Loop: read one char ch
//      - if EOF before close => no token (unterminated)
//      - if ch == '/', run 4-slash escape loop (consume in pairs while 4 slashes visible)
//      - then close check: if next 2 chars are '/', close token and accept
//   3. No heuristics, no special divider handling, no EOF-accept.
//
// Parity behavior (consequence of the escape loop):
//   Opening position (N total slashes): even N self-closes, odd N stays open
//   Mid-body slash run: even count => content (no close), odd count => close
//   Close position: 2k+3 total slashes close with k trailing output slashes
//
// This replaces the built-in DFA regex rule which used longest-match semantics
// that diverged from M2's greedy left-to-right scanning behavior.
import {ExternalTokenizer} from "@lezer/lr"
import {TripleString} from "./parser.terms.js"

// contextual:true prevents token-cache reuse across parse states,
// which is required because canShift() results depend on parser state.
export const tripleStringTokenizer = new ExternalTokenizer((input, stack) => {
  if (!stack.canShift(TripleString)) return
  // Require opening ///
  if (input.next !== 47 || input.peek(1) !== 47 || input.peek(2) !== 47) return

  let i = 3  // cursor past opening ///
  for (;;) {
    const ch = input.peek(i)
    if (ch < 0) return  // EOF/error before close => unterminated, no token
    i += 1  // consumed ch

    if (ch === 47) {  // '/'
      // Escape loop: while ch + next 3 = 4 slashes visible, consume 2
      // Mirrors lex.d:131-138: while ch=='/' && peek(0,1,2)==='///' do getc;getc
      while (input.peek(i) === 47 && input.peek(i + 1) === 47 && input.peek(i + 2) === 47) {
        i += 2
      }
      // Close check: if next 2 chars are '/', accept token
      // Mirrors lex.d:139-141: if ch=='/' && peek(0,1)=='//' then break
      if (input.peek(i) === 47 && input.peek(i + 1) === 47) {
        input.acceptToken(TripleString, i + 2)
        return
      }
    }
  }
}, {contextual: true})
