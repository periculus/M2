import {styleTags, tags as t} from "@lezer/highlight"

export const m2Highlighting = styleTags({
  // Control flow keywords — external tokens + ckw keywords
  "IfKw ThenKw ElseKw TryKw CatchKw": t.controlKeyword,
  "when do while for from to by in new of": t.controlKeyword,
  "return break continue throw": t.controlKeyword,

  // Keyword-like constructs that take arguments
  "load needs use export symbol global local threadLocal": t.controlKeyword,
  "time elapsedTime shield debug": t.controlKeyword,

  // Logical operator keywords
  "and or not xor": t.operatorKeyword,

  // Types (from @specialize)
  Type: t.typeName,

  // Built-in functions (from @specialize)
  Builtin: t.function(t.variableName),

  // Constants (from @specialize)
  Constant: t.constant(t.variableName),

  // Boolean and Null literals (use t.atom — JupyterLab maps t.bool to keyword color)
  Boolean: t.atom,
  "true false": t.atom,
  Null: t.atom,
  "null": t.atom,

  // Operator used as symbol argument (e.g., symbol *, global ==)
  OperatorSymbol: t.operator,

  // Identifiers and basic tokens
  Identifier: t.variableName,
  Number: t.number,
  LeadingDotNumber: t.number,
  String: t.string,
  TripleString: t.docString,
  LineComment: t.lineComment,
  BlockComment: t.blockComment,

  // Punctuation
  "( )": t.paren,
  "[ ]": t.squareBracket,
  "{ }": t.brace,
  "<| |>": t.angleBracket,
  ";": t.separator,
})
