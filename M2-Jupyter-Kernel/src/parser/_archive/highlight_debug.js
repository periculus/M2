import {styleTags, tags as t} from "@lezer/highlight"

// Debug version - highlight everything as keywords to test the mechanism
export const m2Highlighting = styleTags({
  // Test: make EVERYTHING a keyword to see if highlighting works at all
  "Program": t.keyword,
  "Keyword": t.keyword, 
  "Type": t.keyword,
  "Function": t.keyword,
  "Boolean": t.keyword,
  "Null": t.keyword,
  "identifier": t.keyword,
  "Number": t.keyword,
  "String": t.keyword,
  "LineComment": t.lineComment, // Keep comments as comments
  "BlockComment": t.blockComment,
  "Operator": t.keyword,
  "Delimiter": t.keyword
})