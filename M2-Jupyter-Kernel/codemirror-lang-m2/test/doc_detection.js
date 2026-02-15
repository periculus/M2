// Shared raw-doc-file detection logic.
// Used by test_corpus.js and analyze_errors.js to classify files consistently.
//
// Two detection strategies:
// 1. Filename-based: doc.m2 / *-doc.m2 starting with Node/Key (raw SimpleDoc)
// 2. Content-based: files that are purely document{} blocks (e.g. ov_language.m2)
import path from 'path';

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
