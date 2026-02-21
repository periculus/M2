// External tokenizer for M2 control-flow keywords (if, then, else, try, catch).
// All 5 are emitted as distinct tokens (IfKw, ThenKw, ElseKw, TryKw, CatchKw)
// only when stack.canShift() says the parser state can use them. Otherwise the
// built-in tokenizer produces Identifier. This prevents JuxtapositionExpr from
// consuming these words as Identifiers inside parens/braces/brackets.
import {ExternalTokenizer} from "@lezer/lr"
import {IfKw, ThenKw, ElseKw, TryKw, CatchKw, NewFromKw, FromKw, ToKw, WhenKw, InKw, OfKw, ListKw, DoKw} from "./parser.terms.js"

// Characters that can continue an identifier-like word.
// M2 identifiers are [a-zA-Z'][a-zA-Z0-9'$]* — note _ is NOT included
// because it's the subscript operator in M2, not an identifier character.
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

// contextual:true prevents token-cache reuse across parse states,
// which is required because canShift() results depend on parser state.
export const controlFlowKw = new ExternalTokenizer((input, stack) => {
  // Clause keywords first (highest disambiguation value)
  if (emitIfShiftable(input, stack, "then", ThenKw)) return
  if (emitIfShiftable(input, stack, "else", ElseKw)) return
  if (emitIfShiftable(input, stack, "catch", CatchKw)) return
  if (emitIfShiftable(input, stack, "from", NewFromKw)) return
  if (emitIfShiftable(input, stack, "from", FromKw)) return
  if (emitIfShiftable(input, stack, "to", ToKw)) return
  if (emitIfShiftable(input, stack, "when", WhenKw)) return
  if (emitIfShiftable(input, stack, "in", InKw)) return
  if (emitIfShiftable(input, stack, "of", OfKw)) return
  // For/While clause keywords (list/do are mid-expression, like then/else)
  if (emitIfShiftable(input, stack, "list", ListKw)) return
  if (emitIfShiftable(input, stack, "do", DoKw)) return
  // Starter keywords
  if (emitIfShiftable(input, stack, "if", IfKw)) return
  if (emitIfShiftable(input, stack, "try", TryKw)) return
}, {contextual: true})
