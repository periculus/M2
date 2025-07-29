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
            path: 'python_test_screenshot.png',
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
        
        // Check console for extension logs
        const logs = await page.evaluate(() => {
            return window.testPythonHighlight ? window.testPythonHighlight() : 'No test function found';
        });
        
        console.log('Extension test result:', logs);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'error_python_test.png' });
    } finally {
        await browser.close();
    }
}

testPythonHighlighting();