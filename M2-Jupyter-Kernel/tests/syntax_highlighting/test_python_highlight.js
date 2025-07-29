const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPythonHighlighting() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log('Browser console:', msg.text());
    });
    
    try {
        console.log('Opening JupyterLab...');
        await page.goto('http://localhost:8888/lab?token=1c28938d3cfe9d28ab8bcbd420d5b218f0eecacbb5092b9b');
        await page.waitForTimeout(3000);
        
        // Create new notebook with M2 kernel
        console.log('Creating new notebook...');
        const launcherCard = page.locator('.jp-LauncherCard').filter({ hasText: 'Macaulay2' }).first();
        await launcherCard.click();
        await page.waitForTimeout(2000);
        
        // Wait for kernel to be ready
        console.log('Waiting for kernel...');
        await page.waitForSelector('.jp-Notebook-cell', { timeout: 10000 });
        
        // Type Python code
        console.log('Typing Python test code...');
        const cellInput = page.locator('.jp-Cell-inputArea .cm-content').first();
        await cellInput.click();
        
        const testCode = `# Python syntax test
if True:
    print("Hello")
else:
    pass

def my_function():
    return None

class MyClass:
    pass`;
        
        await cellInput.type(testCode);
        await page.waitForTimeout(1000);
        
        // Take screenshot
        console.log('Taking screenshot...');
        await page.screenshot({ 
            path: 'screenshots/python_test_result.png',
            fullPage: false 
        });
        
        // Check what classes are applied
        const classes = await cellInput.evaluate(el => {
            const spans = el.querySelectorAll('span[class*="cm-"]');
            const classMap = {};
            spans.forEach(span => {
                const text = span.textContent;
                const classList = Array.from(span.classList);
                if (text && classList.length > 0) {
                    classMap[text] = classList.filter(c => c.startsWith('cm-')).join(', ');
                }
            });
            return classMap;
        });
        
        console.log('Applied classes:', JSON.stringify(classes, null, 2));
        
        // Check if our extension loaded
        const extensionLogs = await page.evaluate(() => {
            // Look for our console logs
            const logs = [];
            if (window.console && window.console.log.toString().includes('PYTHON TEST')) {
                logs.push('Found PYTHON TEST log marker');
            }
            return logs;
        });
        
        console.log('Extension check:', extensionLogs);
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'Python syntax for M2 kernel',
            classes: classes,
            extensionFound: extensionLogs.length > 0
        };
        
        fs.writeFileSync('logs/python_test_report.json', JSON.stringify(report, null, 2));
        console.log('Report saved to logs/python_test_report.json');
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'screenshots/error_python_test.png' });
    } finally {
        await browser.close();
    }
}

testPythonHighlighting();