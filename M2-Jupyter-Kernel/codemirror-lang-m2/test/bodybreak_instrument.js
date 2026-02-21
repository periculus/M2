/**
 * E2 Phase A: BodyBreak instrumentation-only pass.
 *
 * Simulates where a BodyBreak tokenizer would fire inside parenthesized
 * Body expressions, WITHOUT modifying the grammar.
 *
 * Approach: text-based scanning within Body node boundaries.
 * For each newline inside a Body, check the triple-signal guard:
 *   1. Character before the newline (after skipping trailing whitespace) ended an expression
 *   2. Newline present (inherent in the scan)
 *   3. Character after the newline (after skipping whitespace/comments) starts an expression
 *
 * Usage: node test/bodybreak_instrument.js
 */
import {parser} from '../src/parser.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {classifyFile} from './doc_detection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const M2_ROOT = path.resolve(__dirname, '../../../M2/Macaulay2');

// === Character classification ===

// Characters that end an expression (last char before newline)
function isExprEndingChar(ch) {
  // Letters/digits (end of identifier, number, keyword, type)
  if (ch >= 48 && ch <= 57) return true;   // 0-9
  if (ch >= 65 && ch <= 90) return true;   // A-Z
  if (ch >= 97 && ch <= 122) return true;  // a-z
  if (ch > 127) return true;               // Unicode
  if (ch === 39) return true;   // ' (end of identifier)
  if (ch === 36) return true;   // $ (end of identifier)
  // Closing brackets
  if (ch === 41) return true;   // )
  if (ch === 125) return true;  // }
  if (ch === 93) return true;   // ]
  // Quote (end of string)
  if (ch === 34) return true;   // "
  // Postfix operators
  if (ch === 33) return true;   // !
  if (ch === 126) return true;  // ~
  if (ch === 42) return true;   // * (could be ^* or _*)
  // |> closing
  if (ch === 62) return true;   // > (could be |>)
  return false;
}

// Characters that explicitly indicate continuation (expression NOT ended)
function isContinuationChar(ch) {
  // Binary operators that can't end an expression
  if (ch === 44) return true;   // ,
  if (ch === 59) return true;   // ;
  if (ch === 61) return true;   // = (assignment, =>)
  if (ch === 43) return true;   // +
  if (ch === 45) return true;   // - (but also negation...)
  if (ch === 47) return true;   // / (but also //= etc.)
  if (ch === 37) return true;   // %
  if (ch === 38) return true;   // &
  if (ch === 124) return true;  // | (but could be |>)
  if (ch === 94) return true;   // ^
  if (ch === 58) return true;   // :
  if (ch === 64) return true;   // @
  if (ch === 40) return true;   // (
  if (ch === 123) return true;  // {
  if (ch === 91) return true;   // [
  if (ch === 60) return true;   // < (could be <|, <=, <<)
  return false;
}

// Characters that start an unambiguous expression (first char after newline+whitespace)
function isUnambiguousStarter(ch) {
  if (ch < 0) return false;
  // Letters
  if (ch >= 65 && ch <= 90) return true;   // A-Z
  if (ch >= 97 && ch <= 122) return true;  // a-z
  if (ch > 127) return true;               // Unicode
  // Digits
  if (ch >= 48 && ch <= 57) return true;   // 0-9
  // Open brackets
  if (ch === 40) return true;   // (
  if (ch === 123) return true;  // {
  if (ch === 91) return true;   // [
  // String literal
  if (ch === 34) return true;   // "
  return false;
}

// === Body node detection ===

function findBodyRanges(tree) {
  const ranges = [];
  tree.iterate({enter: n => {
    if (n.name === 'Body') {
      ranges.push({from: n.from, to: n.to});
    }
  }});
  return ranges;
}

function getFileErrors(tree) {
  let errors = 0;
  tree.iterate({enter: n => { if (n.type.isError) errors++; }});
  return errors;
}

// Skip backwards over horizontal whitespace (space, tab)
function skipBackWhitespace(code, pos) {
  while (pos > 0) {
    const ch = code.charCodeAt(pos - 1);
    if (ch === 32 || ch === 9) { pos--; continue; } // space, tab
    break;
  }
  return pos;
}

// Skip forwards over whitespace and comments. Returns position of first real char.
function skipForwardWhitespaceAndComments(code, pos, end) {
  while (pos < end) {
    const ch = code.charCodeAt(pos);
    // Horizontal whitespace
    if (ch === 32 || ch === 9 || ch === 13) { pos++; continue; }
    // Newlines (skip additional newlines)
    if (ch === 10) { pos++; continue; }
    // Line comment: --
    if (ch === 45 && pos + 1 < end && code.charCodeAt(pos + 1) === 45) {
      // Skip to end of line
      while (pos < end && code.charCodeAt(pos) !== 10) pos++;
      continue;
    }
    // Block comment: -* ... *-
    if (ch === 45 && pos + 1 < end && code.charCodeAt(pos + 1) === 42) {
      pos += 2;
      let depth = 1;
      while (pos < end && depth > 0) {
        if (code.charCodeAt(pos) === 42 && pos + 1 < end && code.charCodeAt(pos + 1) === 45) {
          depth--;
          pos += 2;
        } else if (code.charCodeAt(pos) === 45 && pos + 1 < end && code.charCodeAt(pos + 1) === 42) {
          depth++;
          pos += 2;
        } else {
          pos++;
        }
      }
      continue;
    }
    break;
  }
  return pos;
}

// Check if the character before pos (after skipping whitespace) was a -- comment end
function prevIsLineComment(code, nlPos) {
  // Look backwards from the newline position to see if there was a -- comment
  let p = nlPos - 1;
  while (p >= 0 && code.charCodeAt(p) !== 10) {
    p--;
  }
  // p is now at the previous newline or -1
  const lineContent = code.slice(p + 1, nlPos);
  return lineContent.includes('--');
}

// Find fire sites within a single Body range
function findFireSitesInBody(code, bodyFrom, bodyTo) {
  const sites = [];
  const bodyCode = code.slice(bodyFrom, bodyTo);

  // Find each newline position within the body
  for (let i = 0; i < bodyCode.length; i++) {
    if (bodyCode.charCodeAt(i) !== 10) continue; // not a newline

    const nlAbsPos = bodyFrom + i;

    // === Signal 1: Previous character ends an expression ===
    // Look backwards from newline, skip trailing whitespace
    let prevPos = skipBackWhitespace(code, nlAbsPos);
    if (prevPos <= bodyFrom) continue; // at start of body

    // Check if the previous content was a line comment
    // If so, look before the comment for the real previous token
    const lineStart = code.lastIndexOf('\n', nlAbsPos - 1) + 1;
    const lineBeforeNl = code.slice(lineStart, nlAbsPos);
    const commentIdx = lineBeforeNl.indexOf('--');
    if (commentIdx >= 0) {
      // There's a line comment on this line. Real token is before the --
      prevPos = skipBackWhitespace(code, lineStart + commentIdx);
      if (prevPos <= bodyFrom) continue;
    }

    const prevCh = code.charCodeAt(prevPos - 1);

    // Skip if previous char is a continuation character
    if (isContinuationChar(prevCh)) continue;

    // Check if previous char could end an expression
    if (!isExprEndingChar(prevCh)) continue;

    // === Signal 2: Newline (already established) ===

    // === Signal 3: Next token starts an expression ===
    // Skip forward over whitespace and comments
    const nextPos = skipForwardWhitespaceAndComments(code, nlAbsPos + 1, bodyTo);
    if (nextPos >= bodyTo) continue; // at end of body

    const nextCh = code.charCodeAt(nextPos);
    if (!isUnambiguousStarter(nextCh)) continue;

    // All three signals positive!
    const line = code.slice(0, nextPos).split('\n').length;
    const col = nextPos - code.lastIndexOf('\n', nextPos - 1) - 1;
    const prevText = code.slice(Math.max(bodyFrom, prevPos - 15), prevPos).trim();
    const nextText = code.slice(nextPos, Math.min(bodyTo, nextPos + 20)).split('\n')[0];

    sites.push({
      line,
      col,
      prevText: prevText.length > 20 ? '...' + prevText.slice(-17) : prevText,
      nextText: nextText.length > 20 ? nextText.slice(0, 20) + '...' : nextText,
      absPos: nextPos,
    });
  }

  return sites;
}

// === Corpus scanning ===

function findM2Files(dir) {
  const files = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== '_archive') {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.m2')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

// === Main ===

const allFiles = findM2Files(M2_ROOT);

// Use same file filtering as test_corpus.js
const m2Files = allFiles.filter(f => {
  const rel = path.relative(M2_ROOT, f);
  const cls = classifyFile(rel, '');
  return cls !== 'raw_doc' && cls !== 'invalid_syntax';
});

console.log(`=== BodyBreak Fire-Site Instrumentation (v2 - text-based) ===`);
console.log(`  Files to scan: ${m2Files.length}`);
console.log('');

let totalSites = 0;
let sitesInErrorFiles = 0;
let sitesInCleanFiles = 0;
let cleanFilesWithSites = new Set();
let errorFilesWithSites = new Set();
const allSites = [];

for (const filePath of m2Files) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tree = parser.parse(code);
  const errors = getFileErrors(tree);
  const bodies = findBodyRanges(tree);
  const rel = path.relative(M2_ROOT, filePath);

  for (const body of bodies) {
    const sites = findFireSitesInBody(code, body.from, body.to);
    for (const site of sites) {
      totalSites++;
      site.file = rel;
      site.fileErrors = errors;
      allSites.push(site);

      if (errors > 0) {
        sitesInErrorFiles++;
        errorFilesWithSites.add(rel);
      } else {
        sitesInCleanFiles++;
        cleanFilesWithSites.add(rel);
      }
    }
  }
}

// === Report ===

console.log(`=== BodyBreak Fire-Site Report ===`);
console.log(`  Total fire sites: ${totalSites}`);
console.log(`  In files with existing errors: ${sitesInErrorFiles} (${errorFilesWithSites.size} files)`);
console.log(`  In files with zero errors: ${sitesInCleanFiles} (${cleanFilesWithSites.size} files)`);
console.log('');

if (totalSites > 0) {
  const precision = sitesInErrorFiles / totalSites;
  console.log(`  Precision (sites in error files / total): ${(precision * 100).toFixed(1)}%`);
  console.log('');
}

// Decision gate
console.log(`=== Decision Gate ===`);
if (sitesInCleanFiles > 0) {
  console.log(`  STOP: ${sitesInCleanFiles} fire sites in ${cleanFilesWithSites.size} clean files.`);
  console.log(`  These would be potential regressions if BodyBreak emits at these positions.`);
  console.log('');
  console.log(`  Clean files with fire sites (top 20):`);
  const cleanList = [...cleanFilesWithSites].sort().slice(0, 20);
  for (const f of cleanList) {
    const fileSites = allSites.filter(s => s.file === f);
    console.log(`    ${f}: ${fileSites.length} sites`);
    // Show first 2 examples
    for (const s of fileSites.slice(0, 2)) {
      console.log(`      L${s.line}: ...${s.prevText} | ${s.nextText}`);
    }
  }
} else if (totalSites === 0) {
  console.log(`  STOP: No fire sites detected. Guards too restrictive.`);
} else {
  const precision = sitesInErrorFiles / totalSites;
  if (precision < 0.8) {
    console.log(`  STOP: Precision ${(precision * 100).toFixed(1)}% < 80%. Guards insufficient.`);
  } else {
    console.log(`  PASS: Precision ${(precision * 100).toFixed(1)}% >= 80%, 0 clean-file regressions.`);
    console.log(`  Proceed to Phase B.`);
  }
}

// Sample fire sites
console.log('');
console.log(`=== Sample Fire Sites (first 40) ===`);
for (const site of allSites.slice(0, 40)) {
  const errLabel = site.fileErrors > 0 ? `(${site.fileErrors} errors)` : '(CLEAN)';
  console.log(`  ${site.file}:${site.line} ${errLabel}`);
  console.log(`    ...${site.prevText} | ${site.nextText}`);
}

// Summary by file for error files
if (errorFilesWithSites.size > 0) {
  console.log('');
  console.log(`=== Error Files with Fire Sites (top 20 by site count) ===`);
  const byFile = {};
  for (const site of allSites.filter(s => s.fileErrors > 0)) {
    byFile[site.file] = (byFile[site.file] || 0) + 1;
  }
  const sorted = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [file, count] of sorted) {
    const fileErrors = allSites.find(s => s.file === file).fileErrors;
    console.log(`  ${count} sites | ${fileErrors} errors | ${file}`);
  }
}
