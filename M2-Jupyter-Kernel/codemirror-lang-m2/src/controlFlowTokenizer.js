// External tokenizer for M2 control-flow clause keywords (then, else, catch).
// These are emitted as distinct tokens (ThenKw, ElseKw, CatchKw) only when the
// parser state can use them, preventing JuxtapositionExpr from consuming them
// as Identifiers. The starter keywords (if, try) remain as ckw (@extend) so
// they can still be used as identifiers in method installations.
import {ExternalTokenizer} from "@lezer/lr"
import {IfKw, ThenKw, ElseKw, TryKw, CatchKw} from "./parser.terms.js"

// Conservative: includes chars that could continue an identifier-like word.
// M2 identifiers are [a-zA-Z'][a-zA-Z0-9']*, but we also block _ and $ to
// avoid matching partial words in unusual contexts.
function isIdentChar(ch) {
  return (
    (ch >= 48 && ch <= 57) ||   // 0-9
    (ch >= 65 && ch <= 90) ||   // A-Z
    (ch >= 97 && ch <= 122) ||  // a-z
    ch === 39 ||                // '
    ch === 36 ||                // $
    ch > 127                    // unicode letters
  )
}

function matchWord(input, word) {
  for (let i = 0; i < word.length; i++) {
    if (input.peek(i) !== word.charCodeAt(i)) return false
  }
  // Ensure the word ends here (not a prefix of a longer identifier)
  return !isIdentChar(input.peek(word.length))
}

function emitIfShiftable(input, stack, word, term) {
  if (!matchWord(input, word)) return false
  if (!stack.canShift(term)) return false
  input.acceptToken(term, word.length)
  return true
}

export const controlFlowKw = new ExternalTokenizer((input, stack) => {
  // Clause keywords first (highest disambiguation value)
  if (emitIfShiftable(input, stack, "then", ThenKw)) return
  if (emitIfShiftable(input, stack, "else", ElseKw)) return
  if (emitIfShiftable(input, stack, "catch", CatchKw)) return
  // Starter keywords
  if (emitIfShiftable(input, stack, "if", IfKw)) return
  if (emitIfShiftable(input, stack, "try", TryKw)) return
})
