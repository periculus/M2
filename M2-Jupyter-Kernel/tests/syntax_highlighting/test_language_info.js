// Test to check what language info is being used
async function checkLanguageInfo() {
    console.log("=== Language Info Check ===");
    
    // Get all code cells
    const codeCells = document.querySelectorAll('.jp-CodeCell');
    console.log(`Found ${codeCells.length} code cells`);
    
    // Check CodeMirror instances
    const cmEditors = document.querySelectorAll('.cm-editor');
    console.log(`Found ${cmEditors.length} CodeMirror editors`);
    
    // Look for language info
    cmEditors.forEach((editor, i) => {
        console.log(`\nEditor ${i}:`);
        
        // Check for language in dataset
        console.log('  data-language:', editor.querySelector('.cm-content')?.getAttribute('data-language'));
        
        // Check for language classes
        const langClasses = Array.from(editor.classList).filter(c => c.includes('language'));
        console.log('  language classes:', langClasses);
        
        // Check parent cell metadata
        const cell = editor.closest('.jp-Cell');
        if (cell) {
            console.log('  cell classes:', Array.from(cell.classList).filter(c => c.includes('language') || c.includes('macaulay')));
        }
    });
    
    // Check if our language is registered
    if (window.jupyterapp && window.jupyterapp.serviceManager) {
        console.log('\nChecking JupyterLab services...');
        // This would need more complex inspection
    }
    
    // Check for any macaulay2 references
    const allElements = document.querySelectorAll('*');
    const m2Elements = Array.from(allElements).filter(el => {
        const text = (el.className + ' ' + el.id + ' ' + (el.getAttribute('data-language') || '')).toLowerCase();
        return text.includes('macaulay') || text.includes('m2');
    });
    
    console.log(`\nFound ${m2Elements.length} elements with macaulay2/m2 references`);
    m2Elements.forEach(el => {
        console.log(`  ${el.tagName}: class="${el.className}" data-language="${el.getAttribute('data-language')}"`);
    });
}

// Also check what syntax highlighting is active
function checkActiveHighlighting() {
    console.log("\n=== Active Highlighting Check ===");
    
    // Find highlighted tokens
    const highlightedSpans = document.querySelectorAll('.cm-content span[class*="cm-"]');
    const tokenTypes = new Map();
    
    highlightedSpans.forEach(span => {
        const classes = Array.from(span.classList).filter(c => c.startsWith('cm-'));
        const text = span.textContent;
        
        classes.forEach(cls => {
            if (!tokenTypes.has(cls)) {
                tokenTypes.set(cls, []);
            }
            if (tokenTypes.get(cls).length < 5) { // Limit examples
                tokenTypes.get(cls).push(text);
            }
        });
    });
    
    console.log('Active token types:');
    tokenTypes.forEach((examples, className) => {
        console.log(`  ${className}: ${examples.join(', ')}`);
    });
}

// Run both checks
checkLanguageInfo();
checkActiveHighlighting();