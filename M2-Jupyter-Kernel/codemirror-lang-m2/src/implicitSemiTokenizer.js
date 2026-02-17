// Implicit statement separation for M2.
// Follows the JavaScript Lezer ASI pattern (ContextTracker + ExternalTokenizer).
//
// ImplicitSemi is a zero-width fallback token emitted at newline boundaries.
// It acts as a statement separator where the grammar expects semi { ";" | ImplicitSemi }.
//
// The ContextTracker sets stack.context = true when a newline was seen between
// the previous real token and the current position.
import {ExternalTokenizer, ContextTracker} from "@lezer/lr"
import {ImplicitSemi, spaces, newline,
        LineComment, BlockComment} from "./parser.terms.js"

// Tracks whether a newline was seen since the last real token.
// The shift() callback fires for EVERY token the parser processes, including
// skip tokens (spaces, newlines, comments).
//
// When a newline token is seen, context becomes true.
// When spaces or comments are seen, context is preserved (newline flag persists).
// When any real token (including ImplicitSemi) is seen, context resets to false.
// This reset is critical: it prevents ImplicitSemi from being emitted repeatedly
// in semi* (after one ImplicitSemi, context resets to false, stopping the loop).
export const trackNewline = new ContextTracker({
  start: false,
  shift(context, term) {
    return term == LineComment || term == BlockComment || term == spaces
      ? context       // preserve flag through whitespace/comments
      : term == newline  // true on newline, false on any real token
  },
  strict: false
})

// Emits ImplicitSemi (zero-width) when ALL three conditions hold:
//   1. stack.context is true (newline was seen between previous real token and here)
//   2. No built-in token is usable by the parser (fallback mode)
//   3. The parser state actually expects ImplicitSemi (canShift guard)
//
// The canShift guard is critical: fallback fires at ALL positions where no token
// is usable, including error recovery positions. Without canShift, ImplicitSemi
// would be injected during error recovery, changing recovery behavior and causing
// +2400 cascading errors. With canShift: -84 net improvement over baseline.
//
// Only used in Program (top-level), NOT in Body (parenthesized expressions).
// Adding semi to Body causes +2700 regression because the parser always expects
// semi after expressions in Body, so canShift returns true too often inside parens.
//
// contextual:true prevents caching (result depends on context).
// fallback:true means this tokenizer only fires when built-in tokens aren't usable.
// NOT emitted at EOF: the grammar naturally terminates without trailing semi.
export const implicitSemicolon = new ExternalTokenizer((input, stack) => {
  if (input.next < 0) return  // EOF — don't emit (prevents infinite loop in semi*)
  if (stack.context && stack.canShift(ImplicitSemi)) {
    // Newline was seen AND parser expects semi — emit ImplicitSemi
    input.acceptToken(ImplicitSemi)
  }
}, {contextual: true, fallback: true})
