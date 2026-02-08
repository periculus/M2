// Inject CSS fix for M2 syntax highlighting
// Run this in the browser console to override theme colors

console.log("=== Injecting M2 CSS color fixes ===");

// Create style element
const style = document.createElement('style');
style.textContent = `
/* Force M2 syntax highlighting colors */
.cm-keyword, .ͼs {
  color: #0000ff !important;
  font-weight: bold !important;
}

.cm-typeName, .ͼ11 {
  color: #008080 !important;
  font-weight: 500 !important;
}

.cm-functionName,
.cm-variableName.cm-function,
.ͼ1s {
  color: #800080 !important;
}

/* Comments should stay as they are */
.cm-comment, .cm-lineComment, .ͼ11 {
  color: #808080 !important;
  font-style: italic !important;
}

/* Additional M2-specific highlighting */
.cm-m2-keyword {
  color: #0000ff !important;
  font-weight: bold !important;
}

.cm-m2-type {
  color: #008080 !important;
}

.cm-m2-function {
  color: #800080 !important;
}
`;

// Add to head
document.head.appendChild(style);

console.log("CSS injected! Keywords should now be blue.");

// Test the result
setTimeout(() => {
  const keywords = document.querySelectorAll('.ͼs');
  if (keywords.length > 0) {
    const computed = window.getComputedStyle(keywords[0]);
    console.log(`First keyword color: ${computed.color}`);
    console.log(`Expected: rgb(0, 0, 255) (blue)`);
  }
}, 100);