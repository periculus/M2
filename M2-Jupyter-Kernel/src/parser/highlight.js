import {styleTags, tags as t} from "@lezer/highlight"

export const m2Highlighting = styleTags({
  // Keywords
  "if then else when do while for from to by in break continue return try catch finally new": t.controlKeyword,
  "and or not xor": t.operatorKeyword,
  "class method function symbol protect export threadVariable global local": t.definitionKeyword,
  
  // The nested structure for our specialized nodes
  "Keyword/Keyword": t.keyword,
  "Keyword": t.keyword,
  
  // Types  
  "Type/Type": t.typeName,
  "Type": t.typeName,
  "ZZ QQ RR CC Ring Ideal Matrix Module List Array String": t.typeName,
  
  // Functions
  "Function/Function": t.function(t.variableName),
  "Function": t.function(t.variableName),
  
  // Constants
  "Boolean/Boolean": t.bool,
  "Boolean": t.bool,
  "true false": t.bool,
  
  "Null/Null": t.null,
  "Null": t.null,
  "null": t.null,
  
  // Basic tokens
  identifier: t.variableName,
  VariableName: t.variableName,
  Number: t.number,
  String: t.string,
  LineComment: t.lineComment,
  BlockComment: t.blockComment,
  
  // Operators and punctuation
  Operator: t.operator,
  "= := => -> << >> ++ ** ^ .. ... | || & && == != < > <= >= + - * / // % \\\\": t.operator,
  
  Delimiter: t.punctuation,
  "( ) [ ] { } , ; :": t.punctuation,
  
  // Special
  "$ #": t.meta
})