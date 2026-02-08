import {parser} from "../src/parser.js";
import fs from "fs";
import path from "path";

const M2_ROOT = path.resolve("../../M2/Macaulay2");
const DIRS = [
  path.join(M2_ROOT, "m2"),
  path.join(M2_ROOT, "tests/normal"),
  path.join(M2_ROOT, "packages"),
];

function collectFiles() {
  const files = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".m2")) files.push(path.join(dir, entry));
    }
  }
  return files;
}

function findTripleStringRegions(source) {
  const regions = [];
  const regex = /\/\/\//g;
  const matches = [];
  let m;
  while ((m = regex.exec(source)) !== null) matches.push(m.index);
  for (let i = 0; i < matches.length - 1; i += 2) {
    regions.push({ start: matches[i], end: matches[i + 1] + 3 });
  }
  return regions;
}

function isInTripleString(pos, regions) {
  for (const r of regions) {
    if (pos >= r.start && pos < r.end) return true;
  }
  return false;
}

function isInLineComment(pos, source) {
  let lineStart = pos;
  while (lineStart > 0 && source[lineStart - 1] !== "\n") lineStart--;
  const lineBeforePos = source.substring(lineStart, pos);
  const dashIdx = lineBeforePos.indexOf("--");
  if (dashIdx >= 0) {
    let inStr = false;
    for (let i = 0; i < dashIdx; i++) {
      if (lineBeforePos[i] === '"') inStr = !inStr;
    }
    if (!inStr) return true;
  }
  return false;
}

function getContext(source, from, to) {
  const contextLen = 30;
  const beforeStart = Math.max(0, from - contextLen);
  const afterEnd = Math.min(source.length, to + contextLen);
  var before = source.substring(beforeStart, from)
    .replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");
  var errorPart = source.substring(from, to)
    .replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");
  var after = source.substring(to, afterEnd)
    .replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");
  if (beforeStart > 0) before = "..." + before;
  if (afterEnd < source.length) after = after + "...";
  return before + " >>>" + errorPart + "<<< " + after;
}

function categorize(errorText, pos, source, tripleRegions) {
  const trimmed = errorText.trim();
  
  if (isInTripleString(pos, tripleRegions)) return "DOC_TRIPLE_STRING";
  if (isInLineComment(pos, source)) return "IN_COMMENT";
  
  if (trimmed === "") {
    const after10 = source.substring(pos, Math.min(source.length, pos + 10)).trim();
    const before10 = source.substring(Math.max(0, pos - 10), pos).trim();
    
    if (after10.startsWith("=")) return "EMPTY_before_equals";
    if (after10.startsWith(")")) return "EMPTY_before_close_paren";
    if (after10.startsWith("}")) return "EMPTY_before_close_brace";
    if (after10.startsWith("]")) return "EMPTY_before_close_bracket";
    if (after10.startsWith(",")) return "EMPTY_before_comma";
    if (after10.startsWith(";")) return "EMPTY_before_semicolon";
    if (/^(if|for|while|then|else|do|new|try|catch|when|return|break)\b/.test(after10)) return "EMPTY_before_keyword";
    if (before10.endsWith(",")) return "EMPTY_after_comma";
    if (before10.endsWith("(")) return "EMPTY_after_open_paren";
    if (before10.endsWith("{")) return "EMPTY_after_open_brace";
    return "EMPTY_other";
  }
  
  if (trimmed === "$") return "DOLLAR_SIGN";
  
  if (trimmed.includes('"')) {
    if (errorText.includes("\n") && errorText.length > 50) return "STRING_multiline_long";
    if (errorText.includes("\n")) return "STRING_multiline_short";
    if (errorText.length > 20) return "STRING_long_content";
    return "STRING_short";
  }
  
  if (/^\.[0-9]/.test(trimmed)) return "NUMBER_leading_dot";
  if (trimmed === ".") return "DOT_operator";
  
  if (trimmed === ",") return "COMMA";
  if (trimmed === ";") return "SEMICOLON";
  
  if (trimmed === ")") return "CLOSE_PAREN";
  if (trimmed === "(") return "OPEN_PAREN";
  if (trimmed === "}") return "CLOSE_BRACE";
  if (trimmed === "{") return "OPEN_BRACE";
  if (trimmed === "]") return "CLOSE_BRACKET";
  if (trimmed === "[") return "OPEN_BRACKET";
  
  const keywords = ["for","if","then","else","and","or","not","do","while","when",
    "in","of","to","from","by","new","try","catch","symbol","return","break",
    "continue","true","false","null","is","list","apply","scan","select",
    "any","all","print","error","use","load","input","needs","export","local"];
  if (keywords.includes(trimmed)) return "KEYWORD_" + trimmed;
  
  if (/^[+\-*\/^~<>=!@#%&|]+$/.test(trimmed)) return "OPERATOR_" + trimmed;
  
  if (/^[a-zA-Z][a-zA-Z0-9']*$/.test(trimmed)) {
    var label = trimmed.length > 12 ? trimmed.substring(0, 12) + "..." : trimmed;
    return "IDENT_" + label;
  }
  
  if (/^[0-9]/.test(trimmed)) return "NUMBER_literal";
  
  if (trimmed.length > 30) return "LONG_ERROR";
  
  return "MISC_" + trimmed.substring(0, 15);
}

const files = collectFiles();
console.log("Found " + files.length + " files\n");

const cats = {};
let totalErr = 0;
let totalNodes = 0;

for (const filePath of files) {
  let source;
  try { source = fs.readFileSync(filePath, "utf-8"); } catch(e) { continue; }
  const tripleRegions = findTripleStringRegions(source);
  let tree;
  try { tree = parser.parse(source); } catch(e) { continue; }
  
  const relPath = path.relative(M2_ROOT, filePath);
  const cursor = tree.cursor();
  do {
    totalNodes++;
    if (cursor.type.isError) {
      totalErr++;
      const errorText = source.substring(cursor.from, cursor.to);
      const cat = categorize(errorText, cursor.from, source, tripleRegions);
      if (!cats[cat]) cats[cat] = { count: 0, examples: [] };
      cats[cat].count++;
      if (cats[cat].examples.length < 5) {
        cats[cat].examples.push({
          ctx: getContext(source, cursor.from, cursor.to),
          file: relPath + ":" + cursor.from,
        });
      }
    }
  } while (cursor.next());
}

console.log("Total: " + totalErr + " errors / " + totalNodes + " nodes (" + (totalErr/totalNodes*100).toFixed(4) + "%)\n");

// Super-categories
const superCats = {};
const sorted = Object.entries(cats).sort(function(a,b) { return b[1].count - a[1].count; });

for (const entry of sorted) {
  const cat = entry[0];
  const data = entry[1];
  var superKey;
  if (cat.startsWith("DOC_") || cat === "IN_COMMENT") superKey = "IN_DOCS_OR_COMMENTS";
  else if (cat.startsWith("EMPTY_")) superKey = "EMPTY_ERROR_NODES";
  else if (cat.startsWith("STRING_")) superKey = "STRING_PARSING";
  else if (cat.startsWith("KEYWORD_")) superKey = "KEYWORD_ERRORS";
  else if (cat.startsWith("NUMBER")) superKey = "NUMBER_PARSING";
  else if (cat === "DOT_operator") superKey = "DOT_OPERATOR";
  else if (cat === "DOLLAR_SIGN") superKey = "DOLLAR_SIGN";
  else if (cat === "COMMA" || cat === "SEMICOLON") superKey = "SEPARATORS";
  else if (cat.startsWith("CLOSE_") || cat.startsWith("OPEN_")) superKey = "BRACKET_ERRORS";
  else if (cat.startsWith("OPERATOR_")) superKey = "OPERATOR_ERRORS";
  else if (cat.startsWith("IDENT_")) superKey = "IDENTIFIER_ERRORS";
  else superKey = "MISCELLANEOUS";
  
  if (!superCats[superKey]) superCats[superKey] = 0;
  superCats[superKey] += data.count;
}

console.log("========== SUPER-CATEGORY SUMMARY ==========");
const sortedSuper = Object.entries(superCats).sort(function(a,b) { return b[1] - a[1]; });
for (const entry of sortedSuper) {
  console.log("  " + entry[0].padEnd(30) + String(entry[1]).padStart(6) + "  (" + (entry[1]/totalErr*100).toFixed(1) + "%)");
}
console.log();

console.log("========== DETAILED BREAKDOWN (count >= 5) ==========");
for (const entry of sorted) {
  const cat = entry[0];
  const data = entry[1];
  if (data.count < 5) continue;
  console.log("\n--- " + cat + " (" + data.count + " errors, " + (data.count/totalErr*100).toFixed(2) + "%) ---");
  for (const ex of data.examples.slice(0, 3)) {
    console.log("  " + ex.file);
    console.log("    " + ex.ctx);
  }
}

console.log("\n========== ALL CATEGORIES (full count list) ==========");
for (const entry of sorted) {
  console.log("  " + entry[0].padEnd(45) + String(entry[1].count).padStart(6));
}
