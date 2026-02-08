import { ExternalTokenizer } from "@lezer/lr"
import { Jux } from "./parser.terms.js"

// Zero-width tokenizer for juxtaposition (space application).
// In M2, `f x` means `f(x)` — function application by adjacency.
// This tokenizer emits a zero-width Jux token between two adjacent
// expressions that have no operator between them.
export const juxtaposition = new ExternalTokenizer((input, stack) => {
  // Check if the next character could start an expression
  let ch = input.next
  if (ch === -1) return // end of input

  // Expression starters: letters (identifiers), digits (numbers),
  // quotes (strings), opening parens/brackets/braces, minus/plus (prefix ops),
  // hash (prefix #), triple-slash (///), dot (.5 numbers)
  if ((ch >= 65 && ch <= 90) ||   // A-Z
      (ch >= 97 && ch <= 122) ||  // a-z
      (ch >= 48 && ch <= 57) ||   // 0-9
      ch === 34 ||                // "
      ch === 40 ||                // (
      ch === 123 ||               // {
      ch === 91 ||                // [
      ch === 46) {                // . (for .5 style numbers)
    input.acceptToken(Jux)
  }
})
