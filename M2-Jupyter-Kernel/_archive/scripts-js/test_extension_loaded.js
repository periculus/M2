// Run this in the browser console to check if M2 extension loaded

console.log("=== Checking M2 Extension Status ===");

// Check if extension script loaded
const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
const m2Extension = scripts.find(s => s.includes('@m2-jupyter/jupyterlab-m2-codemirror'));
console.log("M2 extension script:", m2Extension ? "LOADED ✓" : "NOT FOUND ✗");

// Check for CodeMirror in a code cell
const codeCell = document.querySelector('.jp-CodeCell .cm-content');
if (codeCell) {
    console.log("Code cell found ✓");
    
    // Check for syntax classes
    const syntaxSpans = codeCell.querySelectorAll('span[class*="cm-"]');
    console.log("Syntax spans found:", syntaxSpans.length);
    
    // Check what classes are applied
    if (syntaxSpans.length > 0) {
        const classes = new Set();
        syntaxSpans.forEach(span => {
            span.classList.forEach(cls => {
                if (cls.startsWith('cm-') && cls !== 'cm-line') {
                    classes.add(cls);
                }
            });
        });
        console.log("Syntax classes:", Array.from(classes));
        
        // Show some examples
        console.log("\nFirst few tokens:");
        for (let i = 0; i < Math.min(5, syntaxSpans.length); i++) {
            const span = syntaxSpans[i];
            if (span.textContent.trim()) {
                console.log(`  "${span.textContent}" -> ${span.className}`);
            }
        }
    }
} else {
    console.log("No code cell found - create one and type some M2 code");
}

// Try to check if language is registered
console.log("\n=== Trying to find language registry ===");
// Various attempts to find the registry
const attempts = [
    () => window.jupyterlab,
    () => window.lab,
    () => window.jupyterapp,
    () => document.getElementById('main')?._jupyterlab,
    () => document.querySelector('[data-jupyterlab]')?._jupyterlab
];

for (let i = 0; i < attempts.length; i++) {
    try {
        const app = attempts[i]();
        if (app) {
            console.log(`Found app via method ${i}:`, app);
            break;
        }
    } catch (e) {}
}