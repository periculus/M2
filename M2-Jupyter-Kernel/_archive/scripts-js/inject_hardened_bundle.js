// Inject hardened colors directly into the running JupyterLab
// Run this in the browser console after JupyterLab starts

console.log("=== Injecting Hardened M2 Colors ===");

// Override the m2 language support to include hardened colors
if (window.require) {
  try {
    // Get the CodeMirror modules
    const cm = require('@jupyterlab/codemirror');
    const highlight = require('@lezer/highlight');
    const language = require('@codemirror/language');
    
    if (cm && highlight && language) {
      console.log("Found CodeMirror modules");
      
      // Define hardened highlight style
      const m2HighlightStyle = language.HighlightStyle.define([
        { tag: highlight.tags.keyword, color: "#0000ff", fontWeight: "bold" },
        { tag: highlight.tags.typeName, color: "#008080", fontWeight: "500" },
        { tag: highlight.tags.function(highlight.tags.variableName), color: "#800080" },
        { tag: highlight.tags.bool, color: "#ff1493" },
        { tag: highlight.tags.null, color: "#ff1493" },
        { tag: highlight.tags.variableName, color: "#000000" },
        { tag: highlight.tags.number, color: "#ff8c00" },
        { tag: highlight.tags.string, color: "#008000" },
        { tag: highlight.tags.lineComment, color: "#808080", fontStyle: "italic" },
        { tag: highlight.tags.blockComment, color: "#808080", fontStyle: "italic" },
        { tag: highlight.tags.operator, color: "#000080" },
        { tag: highlight.tags.punctuation, color: "#000000" }
      ]);
      
      console.log("Created hardened highlight style");
      
      // Apply to all CodeMirror editors
      document.querySelectorAll('.cm-editor').forEach(editor => {
        if (editor._cmView) {
          editor._cmView.dispatch({
            effects: language.StateEffect.appendConfig.of(m2HighlightStyle)
          });
          console.log("Applied hardened style to editor");
        }
      });
      
      // Also patch any new editors
      const observer = new MutationObserver(() => {
        document.querySelectorAll('.cm-editor').forEach(editor => {
          if (editor._cmView && !editor._hardenedColors) {
            editor._cmView.dispatch({
              effects: language.StateEffect.appendConfig.of(m2HighlightStyle)
            });
            editor._hardenedColors = true;
          }
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      console.log("Set up observer for new editors");
      
    } else {
      console.error("Could not find required modules");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

// Alternative: Direct CSS injection
const style = document.createElement('style');
style.textContent = `
/* Force M2 colors */
.cm-editor .ͼs, .cm-editor .cm-keyword {
  color: #0000ff !important;
  font-weight: bold !important;
}
.cm-editor .cm-typeName {
  color: #008080 !important;
  font-weight: 500 !important;
}
.cm-editor .cm-function, .cm-editor .cm-variableName.cm-function {
  color: #800080 !important;
}
.cm-editor .cm-bool, .cm-editor .cm-null {
  color: #ff1493 !important;
}
.cm-editor .cm-number {
  color: #ff8c00 !important;
}
.cm-editor .cm-string {
  color: #008000 !important;
}
.cm-editor .cm-comment, .cm-editor .cm-lineComment, .cm-editor .cm-blockComment {
  color: #808080 !important;
  font-style: italic !important;
}
.cm-editor .cm-operator {
  color: #000080 !important;
}
`;
document.head.appendChild(style);

console.log("Injected hardened CSS as fallback");
console.log("Keywords should now be BLUE, not green!");