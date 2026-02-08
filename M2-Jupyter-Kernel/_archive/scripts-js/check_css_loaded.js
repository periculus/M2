// Check what CSS files are loaded
console.log("=== Checking loaded CSS files ===");

// Find all stylesheets
const stylesheets = Array.from(document.styleSheets);
console.log(`Found ${stylesheets.length} stylesheets`);

// Look for M2-related CSS
stylesheets.forEach((sheet, i) => {
    try {
        if (sheet.href && sheet.href.includes('m2')) {
            console.log(`\nStylesheet ${i}: ${sheet.href}`);
            
            // Try to look at rules
            if (sheet.cssRules) {
                for (let j = 0; j < Math.min(5, sheet.cssRules.length); j++) {
                    const rule = sheet.cssRules[j];
                    if (rule.selectorText && rule.selectorText.includes('keyword')) {
                        console.log(`  Rule: ${rule.selectorText}`);
                        console.log(`  Style: ${rule.style.cssText}`);
                    }
                }
            }
        }
    } catch (e) {
        // Cross-origin stylesheets might throw
    }
});

// Check if our static CSS is loaded
console.log("\n=== Checking for static CSS ===");
const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
links.forEach(link => {
    if (link.href.includes('m2') || link.href.includes('index.css')) {
        console.log(`Found: ${link.href}`);
    }
});

// Check inline styles
console.log("\n=== Checking for inline styles ===");
const styles = Array.from(document.querySelectorAll('style'));
styles.forEach((style, i) => {
    if (style.textContent.includes('cm-keyword') || style.textContent.includes('0000ff')) {
        console.log(`Style ${i} contains keyword styles`);
        const preview = style.textContent.substring(0, 200);
        console.log(`  Preview: ${preview}...`);
    }
});