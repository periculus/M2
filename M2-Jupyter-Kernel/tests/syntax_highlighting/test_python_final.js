const { chromium } = require('playwright');
const fs = require('fs');

async function testPythonHighlighting() {
    console.log('Testing Python highlighting for M2 kernel...');
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture all console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (text.includes('PYTHON TEST') || text.includes('macaulay2') || text.includes('highlighting')) {
            console.log('🔍 Extension:', text);
        }
    });
    
    try {
        console.log('Opening JupyterLab...');
        await page.goto('http://localhost:8888/lab?token=881762bda8d9e5ac6d1237c323620f045aba3924df94c076');
        await page.waitForTimeout(3000);
        
        // Create new notebook with M2 kernel
        console.log('Creating M2 notebook...');
        const launcherCard = page.locator('.jp-LauncherCard').filter({ hasText: 'Macaulay2' }).first();
        await launcherCard.click();
        await page.waitForTimeout(2000);
        
        // Wait for kernel
        console.log('Waiting for kernel...');
        await page.waitForSelector('.jp-Notebook-cell', { timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Type Python code
        console.log('Typing Python test code...');
        const cellInput = page.locator('.jp-Cell-inputArea .cm-content').first();
        await cellInput.click();
        
        const testCode = `# Test Python highlighting
if True:
    print("Hello")
    for i in range(10):
        pass
        
def my_function():
    return None
    
class MyClass:
    def __init__(self):
        self.value = 42`;
        
        await cellInput.type(testCode);
        await page.waitForTimeout(2000);
        
        // Take screenshot
        console.log('Taking screenshot...');
        await page.screenshot({ 
            path: 'screenshots/python_final_test.png',
            fullPage: false 
        });
        
        // Check what classes are applied
        const appliedClasses = await cellInput.evaluate(el => {
            const spans = el.querySelectorAll('span[class*="cm-"]');
            const results = {};
            const seen = new Set();
            
            spans.forEach(span => {
                const text = span.textContent.trim();
                const classes = Array.from(span.classList)
                    .filter(c => c.startsWith('cm-'))
                    .join(', ');
                
                if (text && classes && !seen.has(text)) {
                    results[text] = classes;
                    seen.add(text);
                }
            });
            
            return results;
        });
        
        console.log('\n✅ Applied CSS classes:');
        console.log(JSON.stringify(appliedClasses, null, 2));
        
        // Check if Python keywords are highlighted
        const hasKeywordHighlighting = Object.entries(appliedClasses).some(
            ([text, classes]) => ['if', 'def', 'class', 'return'].includes(text) && classes.includes('keyword')
        );
        
        console.log('\n🎯 Python keyword highlighting:', hasKeywordHighlighting ? '✅ WORKING!' : '❌ NOT WORKING');
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'Python highlighting for M2 kernel (clean build)',
            pythonTestFound: consoleLogs.some(log => log.includes('PYTHON TEST')),
            keywordHighlighting: hasKeywordHighlighting,
            appliedClasses: appliedClasses,
            relevantLogs: consoleLogs.filter(log => 
                log.includes('PYTHON') || 
                log.includes('macaulay2') || 
                log.includes('CodeMirror')
            )
        };
        
        fs.writeFileSync('logs/python_final_report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Report saved to logs/python_final_report.json');
        
        console.log('\n🔍 Keeping browser open for 20 seconds...');
        await page.waitForTimeout(20000);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'screenshots/error_python_final.png' });
    } finally {
        await browser.close();
    }
}

testPythonHighlighting();