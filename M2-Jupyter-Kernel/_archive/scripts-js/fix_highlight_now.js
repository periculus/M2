// Quick fix to restore proper highlighting with current debug parser
// This works by using the specialized tokens that the parser recognizes

console.log("=== Applying M2 highlighting fix ===");

// First, let's check what tokens we have
const testCell = document.querySelector('.jp-CodeCell .cm-content');
if (testCell) {
    const tokens = testCell.querySelectorAll('span[class*="ͼ"]');
    const tokenClasses = new Set();
    tokens.forEach(t => {
        t.classList.forEach(c => {
            if (c.startsWith('ͼ')) tokenClasses.add(c);
        });
    });
    console.log("Token classes found:", Array.from(tokenClasses));
}

// Create style to differentiate token types based on content
const style = document.createElement('style');
style.textContent = `
/* Reset all tokens to default color first */
.cm-content span[class*="ͼ"] {
  color: var(--jp-content-font-color1) !important;
  font-weight: normal !important;
}

/* Comments stay gray */
.ͼ11 {
  color: #808080 !important;
  font-style: italic !important;
}

/* Use content-based selectors for different token types */
/* Keywords */
.cm-content span:has-text("if"),
.cm-content span:has-text("then"),
.cm-content span:has-text("else"),
.cm-content span:has-text("for"),
.cm-content span:has-text("while"),
.cm-content span:has-text("do"),
.cm-content span:has-text("return"),
.cm-content span:has-text("break"),
.cm-content span:has-text("continue") {
  color: #0000ff !important;
  font-weight: bold !important;
}

/* Types - we'll use a different approach */
/* Since everything is tagged as keyword, we'll identify types by content */
`;

// Inject a smarter approach using JavaScript
document.head.appendChild(style);

// Function to apply highlighting based on token content
function applyContentBasedHighlighting() {
    const keywords = new Set(['if', 'then', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'new', 'local', 'global']);
    const types = new Set(['Ring', 'Ideal', 'Matrix', 'Module', 'ZZ', 'QQ', 'RR', 'CC', 'List', 'HashTable']);
    const functions = new Set(['gb', 'res', 'ideal', 'matrix', 'ring', 'map', 'ker', 'coker', 'print', 'toString']);
    
    // Find all keyword-styled tokens
    document.querySelectorAll('.ͼs').forEach(span => {
        const text = span.textContent.trim();
        
        if (keywords.has(text)) {
            span.style.color = '#0000ff';
            span.style.fontWeight = 'bold';
        } else if (types.has(text)) {
            span.style.color = '#008080';
            span.style.fontWeight = '500';
        } else if (functions.has(text)) {
            span.style.color = '#800080';
            span.style.fontWeight = 'normal';
        } else {
            // Default variable color
            span.style.color = '';
            span.style.fontWeight = 'normal';
        }
    });
}

// Apply highlighting
applyContentBasedHighlighting();

// Also apply on any DOM changes
const observer = new MutationObserver(() => {
    applyContentBasedHighlighting();
});

// Observe code cells
document.querySelectorAll('.jp-CodeCell').forEach(cell => {
    observer.observe(cell, { childList: true, subtree: true });
});

console.log("Content-based highlighting applied!");

// For output cells - they don't have syntax highlighting by default in Jupyter
console.log("Note: Output cells in Jupyter don't have syntax highlighting by default");