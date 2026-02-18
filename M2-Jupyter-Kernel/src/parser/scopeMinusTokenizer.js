// External tokenizer for `symbol -` (scope keyword + bare minus).
//
// Emits ScopeMinus (consuming the '-') when ALL conditions hold:
//   1. Current char is '-' (0x2D)
//   2. Next char is NOT '-' (would be LineComment --)
//   3. Next char is NOT '*' (would be BlockComment -*)
//   4. The parser state can shift ScopeMinus (only true inside ScopeExpr)
//
// This replaces the precedence-based `!scopeMinus "-"` approach which caused
// +163K parser table growth (+63%) because '-' participates in many contexts
// (unary, binary, ->, -=, --, -*) and the precedence marker forced state
// duplication across the entire parse table.
//
// With the external tokenizer, ScopeMinus is a distinct token from '-'.
// The parser only creates states for ScopeMinus in the ScopeExpr rule,
// avoiding the cascading state explosion.
import {ExternalTokenizer} from "@lezer/lr"
import {ScopeMinus} from "./parser.terms.js"

export const scopeMinusTokenizer = new ExternalTokenizer((input, stack) => {
  if (input.next !== 45) return  // not '-'
  const after = input.peek(1)
  if (after === 45 || after === 42) return  // -- or -* (comments)
  if (stack.canShift(ScopeMinus)) {
    input.acceptToken(ScopeMinus, 1)
  }
})
