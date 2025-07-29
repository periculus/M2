const { chromium } = require('playwright');
const fs = require('fs');

async function testPythonHighlighting() {
    console.log('Starting Python highlighting test...');
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('PYTHON TEST') || text.includes('macaulay2')) {
            console.log('🔍 Extension log:', text);
        }
    });
    
    try {
        console.log('Opening JupyterLab...');
        await page.goto('http://localhost:8888/lab?token=4d1348d2fcb1154e807e426257bd73b931ba6843e42b7dfc');
        await page.waitForTimeout(3000);
        
        // Check console for our extension
        const extensionLoaded = await page.evaluate(() => {
            return window.testPythonHighlight ? 'Extension loaded!' : 'Extension NOT found';
        });
        console.log('Extension status:', extensionLoaded);
        
        // Open the manual test notebook
        console.log('Opening test notebook...');
        await page.click('text=manual_python_test.ipynb');
        await page.waitForTimeout(2000);
        
        // Take screenshot
        console.log('Taking screenshot...');
        await page.screenshot({ 
            path: 'screenshots/python_highlighting_test.png',
            fullPage: false 
        });
        
        // Check classes in the first cell
        const classes = await page.evaluate(() => {
            const firstCell = document.querySelector('.jp-Cell-inputArea .cm-content');
            if (!firstCell) return 'No cell found';
            
            const spans = firstCell.querySelectorAll('span[class*="cm-"]');
            const results = {};
            spans.forEach(span => {
                const text = span.textContent;
                const classList = Array.from(span.classList).filter(c => c.startsWith('cm-'));
                if (text && classList.length > 0) {
                    results[text] = classList.join(', ');
                }
            });
            return results;
        });
        
        console.log('\nApplied classes:');
        console.log(JSON.stringify(classes, null, 2));
        
        // Save report
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'Python highlighting for M2 kernel',
            extensionStatus: extensionLoaded,
            appliedClasses: classes
        };
        
        fs.writeFileSync('logs/python_simple_test.json', JSON.stringify(report, null, 2));
        console.log('\nReport saved to logs/python_simple_test.json');
        
        // Keep browser open for manual inspection
        console.log('\nBrowser will remain open for 10 seconds for inspection...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'screenshots/error_python_simple.png' });
    } finally {
        await browser.close();
    }
}

testPythonHighlighting();