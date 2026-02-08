// Test script to check what's happening with highlighting
// Run this in the browser console when viewing an M2 notebook

// Check if our extension loaded
console.log("=== M2 Extension Debug ===");

// Check for CodeMirror 6
const cm6 = document.querySelector('.cm-editor');
if (cm6) {
    console.log("✓ CodeMirror 6 editor found");
    
    // Check for syntax highlighting spans
    const spans = cm6.querySelectorAll('span[class*="cm-"]');
    const classes = new Set();
    spans.forEach(span => {
        const classList = Array.from(span.classList).filter(c => c.startsWith('cm-'));
        classList.forEach(c => classes.add(c));
    });
    
    console.log("CSS classes found:", Array.from(classes).sort());
    
    // Check specific tokens
    const codeContent = cm6.textContent;
    console.log("Code content:", codeContent);
    
    // Look for specific highlighting
    const keywords = cm6.querySelectorAll('.cm-keyword');
    const variableNames = cm6.querySelectorAll('.cm-variableName');
    const types = cm6.querySelectorAll('.cm-typeName');
    
    console.log(`Found: ${keywords.length} keywords, ${variableNames.length} variables, ${types.length} types`);
    
    // Sample some tokens
    if (variableNames.length > 0) {
        console.log("Sample variableName:", variableNames[0].textContent, "->", variableNames[0].className);
    }
} else {
    console.log("✗ No CodeMirror 6 editor found");
}

// Check for our language
if (window.jupyterapp) {
    const langs = window.jupyterapp.serviceManager.contents.model?.kernel?.language;
    console.log("Kernel language info:", langs);
}