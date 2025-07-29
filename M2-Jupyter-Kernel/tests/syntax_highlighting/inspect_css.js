// Script to inspect CSS loading in JupyterLab
// Run this in the browser console when viewing an M2 notebook

function inspectM2CSS() {
    console.log("=== M2 CSS Inspection ===");
    
    // Check for style sheets
    const styleSheets = Array.from(document.styleSheets);
    console.log(`Found ${styleSheets.length} stylesheets`);
    
    // Look for M2-related CSS
    const m2Styles = styleSheets.filter(sheet => {
        try {
            return sheet.href && (sheet.href.includes('m2') || sheet.href.includes('codemirror'));
        } catch (e) {
            return false;
        }
    });
    
    console.log(`Found ${m2Styles.length} M2/CodeMirror related stylesheets:`, m2Styles.map(s => s.href));
    
    // Check for specific CSS rules
    const searchClasses = ['.cm-keyword', '.cm-typeName', '.cm-functionName', '.cm-variableName'];
    let foundRules = [];
    
    styleSheets.forEach(sheet => {
        try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            rules.forEach(rule => {
                if (rule.selectorText && searchClasses.some(cls => rule.selectorText.includes(cls))) {
                    foundRules.push({
                        selector: rule.selectorText,
                        style: rule.style.cssText,
                        sheet: sheet.href || 'inline'
                    });
                }
            });
        } catch (e) {
            // Cross-origin or other access issues
        }
    });
    
    console.log(`Found ${foundRules.length} relevant CSS rules:`, foundRules);
    
    // Check actual DOM elements
    const codeElements = document.querySelectorAll('.cm-content span');
    const elementClasses = new Set();
    codeElements.forEach(el => {
        el.classList.forEach(cls => {
            if (cls.startsWith('cm-')) {
                elementClasses.add(cls);
            }
        });
    });
    
    console.log('Unique CM classes in DOM:', Array.from(elementClasses));
    
    // Check for specific tokens
    const keywords = Array.from(document.querySelectorAll('.cm-keyword'));
    const types = Array.from(document.querySelectorAll('.cm-typeName'));
    const functions = Array.from(document.querySelectorAll('.cm-functionName, .cm-variableName.cm-function'));
    
    console.log(`Keywords found: ${keywords.length}`, keywords.map(el => el.textContent));
    console.log(`Types found: ${types.length}`, types.map(el => el.textContent));
    console.log(`Functions found: ${functions.length}`, functions.map(el => el.textContent));
    
    // Check computed styles
    if (keywords.length > 0) {
        const computed = window.getComputedStyle(keywords[0]);
        console.log('Keyword computed style:', {
            color: computed.color,
            fontWeight: computed.fontWeight,
            backgroundColor: computed.backgroundColor
        });
    }
    
    return {
        stylesheets: m2Styles.length,
        cssRules: foundRules.length,
        domClasses: Array.from(elementClasses),
        keywords: keywords.length,
        types: types.length,
        functions: functions.length
    };
}

// Auto-run
inspectM2CSS();