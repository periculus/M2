// Error analysis script for M2 Lezer grammar corpus test
// Parses all .m2 files and categorizes parser errors with context

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
    if (!fs.existsSync(dir)) {
      console.error("Directory not found: " + dir);
      continue;
    }
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith(".m2")) {
        files.push(path.join(dir, entry));
      }
    }
  }
  return files;
}

function findTripleStringRegions(source) {
  const regions = [];
  const regex = /\/\/\//g;
  const matches = [];
  let m;
  while ((m = regex.exec(source)) !== null) {
    matches.push(m.index);
  }
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
      if (lineBeforePos[i] === "\"") inStr = !inStr;
    }
    if (!inStr) return true;
  }
  return false;
}

const PROSE_KEYWORDS = new Set([
  "for", "if", "then", "else", "and", "or", "not", "do", "while",
  "when", "in", "of", "to", "from", "by", "new", "try", "catch",
  "symbol", "return", "break", "continue", "true", "false", "null",
  "is", "list", "apply", "scan", "select", "any", "all", "print",
  "error", "use", "load", "input", "needs", "export",
]);

function categorizeError(errorText, pos, source, tripleRegions) {
  const trimmed = errorText.trim();

  if (isInTripleString(pos, tripleRegions)) {
    return "inside_triple_string";
  }

  if (isInLineComment(pos, source)) {
    return "inside_comment";
  }

  if (trimmed === "$") {
    return "dollar_sign";
  }

  if (trimmed.includes("\"")) {
    return "string_related";
  }

  if (PROSE_KEYWORDS.has(trimmed.toLowerCase())) {
    return "keyword_in_context";
  }

  if (trimmed === "," || trimmed === ";") {
    return "separator";
  }

  if (/^[(){}\[\]]$/.test(trimmed)) {
    return "bracket_error";
  }

  if (trimmed === ".") {
    return "dot_error";
  }

  return "other";
}

function getContext(source, from, to, contextLen) {
  contextLen = contextLen || 30;
  const beforeStart = Math.max(0, from - contextLen);
  const afterEnd = Math.min(source.length, to + contextLen);

  var before = source.substring(beforeStart, from);
  var errorPart = source.substring(from, to);
  var after = source.substring(to, afterEnd);

  before = before.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");
  errorPart = errorPart.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");
  after = after.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t");

  if (beforeStart > 0) before = "..." + before;
  if (afterEnd < source.length) after = after + "...";

  return before + "[ERROR>>> " + errorPart + " <<<ERROR]" + after;
}

const files = collectFiles();
console.log("Found " + files.length + " .m2 files to analyze\n");

const categories = {};
let totalErrors = 0;
let totalNodes = 0;
let totalBytes = 0;
let filesProcessed = 0;
let filesWithErrors = 0;
const fileErrorCounts = {};

for (const filePath of files) {
  let source;
  try {
    source = fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    continue;
  }

  totalBytes += source.length;
  filesProcessed++;

  const tripleRegions = findTripleStringRegions(source);

  let tree;
  try {
    tree = parser.parse(source);
  } catch (e) {
    console.error("Parse crashed on " + filePath + ": " + e.message);
    continue;
  }

  let fileErrors = 0;
  const relPath = path.relative(M2_ROOT, filePath);

  const cursor = tree.cursor();
  do {
    totalNodes++;
    if (cursor.type.isError) {
      totalErrors++;
      fileErrors++;

      const errorText = source.substring(cursor.from, cursor.to);
      const category = categorizeError(errorText, cursor.from, source, tripleRegions);

      if (!categories[category]) {
        categories[category] = { count: 0, examples: [] };
      }
      categories[category].count++;

      if (categories[category].examples.length < 50) {
        const context = getContext(source, cursor.from, cursor.to);
        categories[category].examples.push({
          context: context,
          errorText: errorText.substring(0, 40),
          file: relPath,
          pos: cursor.from,
        });
      }
    }
  } while (cursor.next());

  if (fileErrors > 0) {
    filesWithErrors++;
    fileErrorCounts[relPath] = fileErrors;
  }
}

console.log("================================================================================");
console.log("M2 LEZER GRAMMAR ERROR ANALYSIS");
console.log("================================================================================");
console.log("Files processed: " + filesProcessed);
console.log("Files with errors: " + filesWithErrors);
console.log("Total nodes: " + totalNodes.toLocaleString());
console.log("Total errors: " + totalErrors.toLocaleString());
console.log("Error rate: " + (totalErrors / totalNodes * 100).toFixed(4) + "%");
console.log("Total bytes parsed: " + (totalBytes / 1024 / 1024).toFixed(2) + " MB");
console.log();

const sortedCats = Object.entries(categories).sort(function(a, b) { return b[1].count - a[1].count; });

console.log("--------------------------------------------------------------------------------");
console.log("ERROR CATEGORIES SUMMARY");
console.log("--------------------------------------------------------------------------------");
for (const [cat, data] of sortedCats) {
  const pct = (data.count / totalErrors * 100).toFixed(1);
  console.log("  " + cat.padEnd(25) + " " + String(data.count).padStart(7) + " errors  (" + pct + "%)");
}
console.log();

for (const [cat, data] of sortedCats) {
  console.log("================================================================================");
  console.log("CATEGORY: " + cat + " (" + data.count + " errors, " + (data.count / totalErrors * 100).toFixed(1) + "%)");
  console.log("================================================================================");

  const examples = data.examples.slice(0, 10);
  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    console.log("  [" + (i + 1) + "] File: " + ex.file + ":" + ex.pos);
    console.log("      Error text: \"" + ex.errorText + "\"");
    console.log("      Context: " + ex.context);
    console.log();
  }
}

if (categories["other"]) {
  console.log("================================================================================");
  console.log("OTHER CATEGORY BREAKDOWN BY ERROR TEXT");
  console.log("================================================================================");

  const otherByText = {};
  for (const ex of categories["other"].examples) {
    const key = ex.errorText.substring(0, 20).trim();
    if (!otherByText[key]) otherByText[key] = { count: 0, examples: [] };
    otherByText[key].count++;
    if (otherByText[key].examples.length < 3) {
      otherByText[key].examples.push(ex);
    }
  }

  const sortedOther = Object.entries(otherByText).sort(function(a, b) { return b[1].count - a[1].count; });
  for (const [text, data] of sortedOther.slice(0, 25)) {
    console.log("  \"" + text + "\" (" + data.count + "x in sample)");
    for (const ex of data.examples) {
      console.log("    -> " + ex.file + ":" + ex.pos);
      console.log("       " + ex.context);
    }
    console.log();
  }
}

if (categories["keyword_in_context"]) {
  console.log("================================================================================");
  console.log("KEYWORD_IN_CONTEXT BREAKDOWN BY KEYWORD");
  console.log("================================================================================");

  const kwByText = {};
  for (const ex of categories["keyword_in_context"].examples) {
    const key = ex.errorText.trim();
    if (!kwByText[key]) kwByText[key] = { count: 0, examples: [] };
    kwByText[key].count++;
    if (kwByText[key].examples.length < 3) {
      kwByText[key].examples.push(ex);
    }
  }

  const sortedKw = Object.entries(kwByText).sort(function(a, b) { return b[1].count - a[1].count; });
  for (const [text, data] of sortedKw.slice(0, 20)) {
    console.log("  \"" + text + "\" (" + data.count + "x in sample)");
    for (const ex of data.examples) {
      console.log("    -> " + ex.file + ":" + ex.pos);
      console.log("       " + ex.context);
    }
    console.log();
  }
}

console.log("================================================================================");
console.log("TOP 20 FILES WITH MOST ERRORS");
console.log("================================================================================");
const sortedFiles = Object.entries(fileErrorCounts).sort(function(a, b) { return b[1] - a[1]; });
for (const [file, count] of sortedFiles.slice(0, 20)) {
  console.log("  " + String(count).padStart(6) + " errors  " + file);
}

console.log();
console.log("================================================================================");
console.log("(Analysis complete)");
