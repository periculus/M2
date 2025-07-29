const { chromium } = require('playwright');

async function testExtensionLoad() {
    console.log('Testing extension loading...');
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true  // Open developer tools
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture ALL console messages
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (text.includes('PYTHON') || text.includes('M2') || text.includes('macaulay') || text.includes('CodeMirror')) {
            console.log('📍', text);
        }
    });
    
    try {
        console.log('Opening JupyterLab...');
        await page.goto('http://localhost:8888/lab?token=4d1348d2fcb1154e807e426257bd73b931ba6843e42b7dfc');
        
        // Wait for page to load
        await page.waitForTimeout(5000);
        
        // Check for our extension in the console
        console.log('\nChecking for extension...');
        const result = await page.evaluate(() => {
            // Check various places where our extension might be
            const checks = {
                hasTestFunction: typeof window.testPythonHighlight !== 'undefined',
                jupyterLabVersion: window.jupyterlab ? window.jupyterlab.version : 'not found',
                extensions: []
            };
            
            // Try to find loaded extensions
            if (window.jupyterlab) {
                try {
                    const app = window.jupyterlab;
                    if (app.shell && app.shell.widgets) {
                        checks.widgetCount = app.shell.widgets('main').length;
                    }
                } catch (e) {
                    checks.error = e.toString();
                }
            }
            
            return checks;
        });
        
        console.log('\nExtension check result:');
        console.log(JSON.stringify(result, null, 2));
        
        // Print all console logs that might be relevant
        console.log('\n\nRelevant console logs:');
        consoleLogs.forEach(log => {
            if (log.toLowerCase().includes('extension') || 
                log.toLowerCase().includes('codemirror') ||
                log.toLowerCase().includes('m2') ||
                log.toLowerCase().includes('python')) {
                console.log('  -', log);
            }
        });
        
        console.log('\n\nKeeping browser open with DevTools. Press Ctrl+C to exit...');
        await page.waitForTimeout(60000); // Keep open for 1 minute
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testExtensionLoad();