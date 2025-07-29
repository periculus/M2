// Run this in the browser console when viewing an M2 notebook

console.log("=== M2 Syntax Highlighting Diagnostics ===");

// 1. Check if extension loaded
console.log("\n1. Extension Status:");
const logs = Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('m2'));
console.log("M2-related scripts:", logs.length);

// 2. Check CodeMirror language
console.log("\n2. CodeMirror Language Check:");
const cmEditors = document.querySelectorAll('.cm-content');
cmEditors.forEach((editor, i) => {
    const lang = editor.getAttribute('data-language');
    console.log(`Editor ${i}: data-language="${lang}"`);
});

// 3. Check for highlighting classes
console.log("\n3. Token Classes Present:");
const tokenClasses = new Set();
document.querySelectorAll('.cm-content span[class*="cm-"]').forEach(span => {
    span.classList.forEach(cls => {
        if (cls.startsWith('cm-') && cls !== 'cm-line') {
            tokenClasses.add(cls);
        }
    });
});
console.log("Active classes:", Array.from(tokenClasses).sort());

// 4. Check specific tokens
console.log("\n4. Specific Token Examples:");
const keywords = ['if', 'then', 'else', 'return', 'true', 'false'];
keywords.forEach(kw => {
    const spans = Array.from(document.querySelectorAll('.cm-content span')).filter(s => s.textContent === kw);
    if (spans.length > 0) {
        console.log(`"${kw}": classes=[${Array.from(spans[0].classList).join(', ')}]`);
    }
});

// 5. Check CSS rules
console.log("\n5. CSS Rules Check:");
const checkCSSRule = (selector) => {
    for (let sheet of document.styleSheets) {
        try {
            const rules = sheet.cssRules || sheet.rules;
            for (let rule of rules) {
                if (rule.selectorText && rule.selectorText.includes(selector)) {
                    console.log(`Found rule: ${rule.selectorText} { ${rule.style.cssText.substring(0, 50)}... }`);
                    return true;
                }
            }
        } catch (e) {
            // Cross-origin or access error
        }
    }
    return false;
};

['cm-keyword', 'cm-typeName', 'cm-functionName'].forEach(cls => {
    const found = checkCSSRule(cls);
    console.log(`CSS for .${cls}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

// 6. Try to access debug function if available
console.log("\n6. Debug Functions:");
if (window.debugM2Highlighting) {
    console.log("Running debugM2Highlighting()...");
    window.debugM2Highlighting();
} else {
    console.log("debugM2Highlighting() not available");
}

// 7. Check kernel info
console.log("\n7. Kernel Info:");
const kernelName = document.querySelector('.jp-Toolbar-kernelName')?.textContent || 'Unknown';
console.log("Active kernel:", kernelName);

console.log("\n=== End Diagnostics ===");