import {styleTags, tags as t} from "@lezer/highlight"

export const m2Highlighting = styleTags({
  // Map node names to style tags
  // Based on nodeNames from parser.js:
  // "⚠ Program Keyword Keyword Type Type Function Function Boolean Boolean Null Null Number String LineComment BlockComment Operator Delimiter"
  
  // Keywords (node index 2-3)
  "Keyword": t.keyword,
  
  // Types (node index 4-5)  
  "Type": t.typeName,
  
  // Functions (node index 6-7)
  "Function": t.function(t.variableName),
  
  // Booleans (node index 8-9)
  "Boolean": t.bool,
  
  // Null (node index 10-11)
  "Null": t.null,
  
  // Basic tokens
  "identifier": t.variableName,
  "Number": t.number,
  "String": t.string,
  "LineComment": t.lineComment,
  "BlockComment": t.blockComment,
  "Operator": t.operator,
  "Delimiter": t.punctuation
})