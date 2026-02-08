// Quick fix - paste this in browser console if colors are still green
const style = document.createElement('style');
style.textContent = `
.cm-editor .cm-keyword, .cm-editor [class*="ͼ"][class*="s"] {
  color: #0000ff !important;
  font-weight: bold !important;
}`;
document.head.appendChild(style);
console.log("Applied blue keyword fix!");
