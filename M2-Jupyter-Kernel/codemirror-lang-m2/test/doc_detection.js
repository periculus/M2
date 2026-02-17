// Shared file classification logic for corpus testing.
// Used by test_corpus.js and analyze_errors.js to classify files consistently.
//
// Classification hierarchy (checked in order):
// 1. 'corrupt'   — merge conflict markers (cheap insurance, zero found as of Feb 2026)
// 2. 'doc_heavy' — valid M2 code wrapping documentation content (Macaulay2Doc/, *-doc.m2)
// 3. 'raw_doc'   — pure SimpleDoc markup, not M2 expression syntax
// 4. 'code'      — normal M2 code
//
// IMPORTANT: doc_heavy (path-based) runs before raw_doc (content-based) because
// Macaulay2Doc files often start with `document { Key => }` which would trigger
// isRawDocFile's content heuristic.
//
// Only 'raw_doc' and 'corrupt' are excluded from CODE_ONLY metrics.
// 'doc_heavy' is informational only — these files stay in CODE_ONLY.
import path from 'path';

// Original raw-doc detection (kept for backward compat).
// Two detection strategies:
// 1. Filename-based: doc.m2 / *-doc.m2 starting with Node/Key (raw SimpleDoc)
// 2. Content-based: files that are purely document{} blocks (e.g. ov_language.m2)
export function isRawDocFile(code, filePath) {
  const basename = path.basename(filePath);
  const firstLines = code.substring(0, 500);
  // Filename-based: doc.m2 / *-doc.m2 with raw Node/Key markup (not wrapped in doc ///)
  const isDocName = basename === 'doc.m2' || basename.endsWith('-doc.m2');
  if (isDocName && /^\s*(Node|Key)\b/m.test(firstLines) && !/\bdoc\s*\/\/\//.test(firstLines)) {
    return true;
  }
  // Content-based: files starting with document{} blocks containing Key => (raw SimpleDoc)
  if (/^\s*document\s*\{/m.test(firstLines) && /Key\s*=>/m.test(firstLines)) {
    return true;
  }
  return false;
}

// Merge conflict marker detection.
// Checks for git conflict markers at line start: <<<<<<<, =======, >>>>>>>
// None found in corpus as of Feb 2026, but detection is cheap insurance.
function hasMergeMarkers(code) {
  return /^<{7}\s/m.test(code) && /^={7}$/m.test(code) && /^>{7}\s/m.test(code);
}

// Estimate fraction of non-blank lines inside document{} blocks.
// Uses balanced-brace heuristic (same caveat as analyze_errors.js:findDocumentBlocks).
function docBlockFraction(code) {
  const lines = code.split('\n');
  const nonBlank = lines.filter(l => l.trim().length > 0).length;
  if (nonBlank === 0) return 0;

  let inDocBlock = 0;
  let depth = 0;
  let inDoc = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inDoc && /^document\s*\{/.test(trimmed)) {
      inDoc = true;
      depth = 0;
    }
    if (inDoc) {
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (trimmed.length > 0) inDocBlock++;
      if (depth <= 0) inDoc = false;
    }
  }
  return inDocBlock / nonBlank;
}

// Full file classifier. Returns one of: 'corrupt', 'raw_doc', 'doc_heavy', 'code'.
//
// Order matters: path-based doc_heavy checks run BEFORE content-based raw_doc
// detection, because Macaulay2Doc files often start with `document { Key => }`
// which would otherwise trigger isRawDocFile's content check.
export function classifyFile(code, filePath) {
  // 1. Merge conflict markers (checked first — trumps all)
  if (hasMergeMarkers(code)) return 'corrupt';

  // 2. Doc-heavy: valid M2 code wrapping mostly documentation
  //    a) Macaulay2Doc/ package — 380 files, all proper M2 code wrapping doc content
  if (filePath.includes('/Macaulay2Doc/')) return 'doc_heavy';
  //    b) *-doc.m2 files with >50% of lines inside document{} blocks
  const basename = path.basename(filePath);
  if (basename.endsWith('-doc.m2') && docBlockFraction(code) > 0.5) return 'doc_heavy';

  // 3. Raw SimpleDoc (content-based, after path checks)
  if (isRawDocFile(code, filePath)) return 'raw_doc';

  // 4. Normal code
  return 'code';
}
