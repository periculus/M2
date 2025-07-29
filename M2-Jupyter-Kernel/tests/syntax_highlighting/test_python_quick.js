const { chromium } = require('playwright');

async function quickTest() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newContext().then(ctx => ctx.newPage());
    
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('===') || text.includes('Python') || text.includes('M2')) {
            console.log('Console:', text);
        }
    });
    
    console.log('Opening JupyterLab...');
    await page.goto('http://localhost:8888/lab?token=8b05b87a67a09ed7153d481fa07169115f0531213ad4cbe5');
    await page.waitForTimeout(3000);
    
    // Check for our test function
    const hasTestFunction = await page.evaluate(() => {
        return typeof window.testPythonHighlight !== 'undefined';
    });
    
    console.log('Has test function:', hasTestFunction);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/quick_check.png' });
    
    console.log('Test complete. Check screenshots/quick_check.png');
    console.log('Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    
    await browser.close();
}

quickTest();