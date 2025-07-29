#!/usr/bin/env node
/**
 * Browser Automation Tests for M2 Syntax Highlighting
 * Uses Playwright to test highlighting in real JupyterLab
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const JUPYTER_URL = 'http://localhost:8888';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const LOGS_DIR = path.join(__dirname, 'logs');

// Test code snippets
const TEST_CODE = {
  keywords: 'if true then print "hello" else return null',
  types: 'R = QQ[x,y,z]; T = Ring; M = Matrix',
  functions: 'I = ideal(x^2); G = gb I; res(I, LengthLimit => 5)',
  mixed: 'if QQ then gb ideal(x) else matrix {{1,2},{3,4}}'
};

async function setupBrowser() {
  const isDebug = process.argv.includes('--debug');
  console.log(chalk.blue('🌐 Launching browser...'));
  const browser = await chromium.launch({
    headless: !isDebug, // Headless unless in debug mode
    devtools: isDebug
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('.css') || request.url().includes('.js')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    }
  });
  
  return { browser, page, consoleLogs, networkRequests };
}

async function navigateToJupyterLab(page, token = null) {
  console.log(chalk.blue('📋 Navigating to JupyterLab...'));
  
  try {
    // If we have a token, append it to the URL
    const url = token ? `${JUPYTER_URL}/lab?token=${token}` : JUPYTER_URL;
    console.log(chalk.gray(`Navigating to: ${url}`));
    
    // Navigate with less strict waiting
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if we're on a login/token page
    const hasTokenInput = await page.locator('input[type="password"], input[name="password"], input[placeholder*="token"]').count();
    if (hasTokenInput > 0 && token) {
      console.log(chalk.yellow('Token authentication required, entering token...'));
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="token"]', token);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Wait a bit for initial load
    await page.waitForTimeout(3000);
    
    // Wait for JupyterLab to load - try multiple selectors
    try {
      await page.waitForSelector('.jp-Launcher, .jp-NotebookPanel, #jp-main-dock-panel', { timeout: 20000 });
      console.log(chalk.green('✓ JupyterLab loaded'));
    } catch (e) {
      // Take a screenshot to see what's happening
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'navigation_timeout.png') });
      console.log(chalk.yellow('Timeout waiting for JupyterLab UI, screenshot saved'));
      // Continue anyway - maybe it's partially loaded
    }
  } catch (error) {
    console.error(chalk.red('Failed to navigate to JupyterLab:'), error.message);
    console.log(chalk.yellow('Make sure JupyterLab is running on http://localhost:8888'));
    console.log(chalk.yellow('If token authentication is enabled, the token will be extracted from server output'));
    throw error;
  }
}

async function createM2Notebook(page) {
  console.log(chalk.blue('📓 Creating M2 notebook...'));
  
  try {
    // Check if we're already in a notebook
    const notebookPanel = await page.locator('.jp-NotebookPanel').count();
    if (notebookPanel > 0) {
      console.log(chalk.gray('Already in a notebook'));
      
      // Check if it's an M2 notebook by looking at the kernel name
      const kernelSelector = page.locator('.jp-NotebookPanel.jp-mod-current .jp-Toolbar-kernelName').first();
      const kernelName = await kernelSelector.textContent().catch(() => '');
      console.log(chalk.gray(`Current kernel: "${kernelName}"`));
      
      // Also check aria-label if text content is empty
      const ariaLabel = await kernelSelector.getAttribute('aria-label').catch(() => '');
      const isM2Kernel = (kernelName && kernelName.toLowerCase().includes('macaulay')) || 
                         (ariaLabel && ariaLabel.toLowerCase().includes('macaulay'));
      
      if (!isM2Kernel && kernelName !== 'No Kernel') {
        console.log(chalk.yellow('Not an M2 notebook, need to select kernel...'));
        
        // Click on kernel selector for current notebook
        await kernelSelector.click();
        await page.waitForTimeout(500);
        
        // Look for Macaulay2 kernel in the list
        const m2KernelOption = page.locator('.jp-Dialog-content').locator('text=/Macaulay2/i');
        if (await m2KernelOption.count() > 0) {
          console.log(chalk.gray('Selecting Macaulay2 kernel...'));
          await m2KernelOption.first().click();
          await page.waitForTimeout(1000);
          
          // Click Select button if present
          const selectButton = page.locator('button:has-text("Select")');
          if (await selectButton.count() > 0) {
            await selectButton.click();
            await page.waitForTimeout(2000);
          }
        } else {
          console.log(chalk.red('Macaulay2 kernel not found in kernel list!'));
        }
      }
      
      // Ensure we have a code cell
      const codeCell = await page.locator('.jp-CodeCell').count();
      if (codeCell === 0) {
        console.log(chalk.gray('No code cell found, creating one...'));
        // Switch to code cell if in markdown
        await page.keyboard.press('Escape');
        await page.keyboard.press('y'); // Convert to code cell
        await page.waitForTimeout(500);
      }
      
      return;
    }
    
    // Try to find M2 launcher card
    const m2Launcher = page.locator('.jp-LauncherCard').filter({ hasText: /Macaulay2/i });
    if (await m2Launcher.count() > 0) {
      console.log(chalk.gray('Found Macaulay2 launcher card'));
      await m2Launcher.first().click();
    } else {
      console.log(chalk.gray('Using File menu to create notebook...'));
      // Fallback: use File menu
      await page.click('text=File');
      await page.click('text=New');
      await page.click('text=Notebook');
      
      // Wait for kernel selector dialog
      await page.waitForSelector('.jp-Dialog', { timeout: 5000 });
      
      // Look for Macaulay2 in the kernel list
      const m2Option = page.locator('.jp-Dialog').locator('text=/Macaulay2/i');
      if (await m2Option.count() > 0) {
        await m2Option.first().click();
        await page.click('button:has-text("Select")');
      } else {
        // Try dropdown if available
        const kernelSelect = page.locator('select').first();
        if (await kernelSelect.count() > 0) {
          await kernelSelect.selectOption({ label: 'Macaulay2' });
          await page.click('button:has-text("Select")');
        }
      }
    }
    
    // Wait for notebook to open
    await page.waitForSelector('.jp-CodeCell', { timeout: 10000 });
    
    // Wait for kernel to be ready
    console.log(chalk.gray('Waiting for kernel to connect...'));
    await page.waitForFunction(
      () => {
        const kernelStatus = document.querySelector('.jp-Toolbar-kernelStatus');
        return kernelStatus && !kernelStatus.textContent.includes('connecting');
      },
      { timeout: 15000 }
    );
    
    // Verify M2 kernel is active
    const finalKernelName = await page.locator('.jp-NotebookPanel.jp-mod-current .jp-Toolbar-kernelName').first().textContent();
    if (finalKernelName && finalKernelName.toLowerCase().includes('macaulay')) {
      console.log(chalk.green('✓ M2 notebook created with Macaulay2 kernel'));
    } else {
      console.log(chalk.yellow(`Warning: Kernel is "${finalKernelName}", not Macaulay2`));
    }
  } catch (error) {
    console.error(chalk.red('Failed to create M2 notebook:'), error.message);
    throw error;
  }
}

async function testSyntaxHighlighting(page, testName, code) {
  console.log(chalk.yellow(`\n🧪 Testing: ${testName}`));
  console.log(chalk.gray(`Code: ${code}`));
  
  try {
    // Make sure we're in command mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Find active code cell or create one
    let cell = await page.locator('.jp-CodeCell.jp-mod-active .cm-content').first();
    if (await cell.count() === 0) {
      // No active code cell, try to find any code cell
      const anyCodeCell = await page.locator('.jp-CodeCell .cm-content').first();
      if (await anyCodeCell.count() > 0) {
        // Click on the first code cell
        await anyCodeCell.click();
        await page.waitForTimeout(500);
        cell = await page.locator('.jp-CodeCell.jp-mod-active .cm-content').first();
      } else {
        // No code cells at all, create one
        console.log(chalk.gray('Creating code cell...'));
        await page.keyboard.press('Escape');
        await page.keyboard.press('b'); // New cell below
        await page.keyboard.press('y'); // Convert to code cell
        await page.waitForTimeout(1000);
        cell = await page.locator('.jp-CodeCell.jp-mod-active .cm-content').first();
      }
    }
    
    // Clear and type code
    await cell.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(code);
    
    // Wait a bit for highlighting to apply
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await fs.ensureDir(SCREENSHOTS_DIR);
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${testName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(chalk.gray(`  📸 Screenshot saved: ${screenshotPath}`));
    
    // Extract token information
    const tokens = await page.evaluate(() => {
      const tokens = [];
      const spans = document.querySelectorAll('.jp-mod-active .cm-line span[class*="cm-"]');
      
      spans.forEach(span => {
        const classes = Array.from(span.classList).filter(c => c.startsWith('cm-'));
        const styles = window.getComputedStyle(span);
        
        tokens.push({
          text: span.textContent,
          classes: classes,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontWeight: styles.fontWeight,
          fontStyle: styles.fontStyle
        });
      });
      
      return tokens;
    });
    
    // Analyze results
    const results = analyzeTokens(tokens, code);
    
    // Save detailed report
    await fs.ensureDir(LOGS_DIR);
    const reportPath = path.join(LOGS_DIR, `${testName}_report.json`);
    await fs.writeJSON(reportPath, {
      testName,
      code,
      tokens,
      results,
      timestamp: new Date().toISOString()
    }, { spaces: 2 });
    
    return results;
  } catch (error) {
    console.error(chalk.red(`Test ${testName} failed:`), error.message);
    return { error: error.message };
  }
}

function analyzeTokens(tokens, code) {
  const results = {
    keywords: [],
    types: [],
    functions: [],
    numbers: [],
    strings: [],
    comments: [],
    unrecognized: []
  };
  
  // Expected tokens based on our grammar
  const expectedKeywords = ['if', 'then', 'else', 'return', 'true', 'false', 'null'];
  const expectedTypes = ['QQ', 'ZZ', 'RR', 'Ring', 'Matrix', 'Ideal'];
  const expectedFunctions = ['print', 'ideal', 'gb', 'matrix', 'res'];
  
  tokens.forEach(token => {
    const text = token.text.trim();
    if (!text) return;
    
    // Check CSS classes
    const hasKeywordClass = token.classes.some(c => c.includes('keyword'));
    const hasTypeClass = token.classes.some(c => c.includes('typeName') || c.includes('type'));
    const hasFunctionClass = token.classes.some(c => c.includes('function'));
    const hasNumberClass = token.classes.some(c => c.includes('number'));
    const hasStringClass = token.classes.some(c => c.includes('string'));
    const hasCommentClass = token.classes.some(c => c.includes('comment'));
    
    // Categorize token
    if (hasKeywordClass && expectedKeywords.includes(text)) {
      results.keywords.push(token);
    } else if (hasTypeClass && expectedTypes.includes(text)) {
      results.types.push(token);
    } else if (hasFunctionClass && expectedFunctions.includes(text)) {
      results.functions.push(token);
    } else if (hasNumberClass) {
      results.numbers.push(token);
    } else if (hasStringClass) {
      results.strings.push(token);
    } else if (hasCommentClass) {
      results.comments.push(token);
    } else if (expectedKeywords.includes(text) || expectedTypes.includes(text) || expectedFunctions.includes(text)) {
      // Token should be highlighted but isn't
      results.unrecognized.push({
        ...token,
        expectedType: expectedKeywords.includes(text) ? 'keyword' : 
                     expectedTypes.includes(text) ? 'type' : 'function'
      });
    }
  });
  
  return results;
}

async function generateReport(allResults, consoleLogs, networkRequests) {
  console.log(chalk.bold.blue('\n📊 Test Report\n'));
  
  // Summary
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.entries(allResults).forEach(([testName, results]) => {
    console.log(chalk.yellow(`${testName}:`));
    
    if (results.error) {
      console.log(chalk.red(`  ✗ Error: ${results.error}`));
      totalFailed++;
      return;
    }
    
    const passed = results.keywords.length > 0 || results.types.length > 0 || results.functions.length > 0;
    const failed = results.unrecognized.length > 0;
    
    if (passed) {
      console.log(chalk.green(`  ✓ Highlighted: ${results.keywords.length} keywords, ${results.types.length} types, ${results.functions.length} functions`));
      totalPassed++;
    }
    
    if (failed) {
      console.log(chalk.red(`  ✗ Not highlighted: ${results.unrecognized.map(t => t.text).join(', ')}`));
      totalFailed++;
    }
    
    // Show token details
    if (results.unrecognized.length > 0) {
      console.log(chalk.red('  Missing highlighting for:'));
      results.unrecognized.forEach(token => {
        console.log(chalk.red(`    - "${token.text}" (expected: ${token.expectedType}, classes: ${token.classes.join(', ')})`));
      });
    }
  });
  
  // Console logs analysis
  console.log(chalk.bold.blue('\n🔍 Console Logs:'));
  const m2Logs = consoleLogs.filter(log => 
    log.text.includes('M2') || 
    log.text.includes('macaulay2') || 
    log.text.includes('language')
  );
  
  if (m2Logs.length > 0) {
    m2Logs.forEach(log => {
      const color = log.type === 'error' ? chalk.red : 
                    log.type === 'warning' ? chalk.yellow : chalk.gray;
      console.log(color(`  [${log.type}] ${log.text}`));
    });
  } else {
    console.log(chalk.gray('  No relevant logs found'));
  }
  
  // CSS loading check
  console.log(chalk.bold.blue('\n🎨 CSS Loading:'));
  const cssRequests = networkRequests.filter(r => r.url.includes('.css'));
  const m2CSS = cssRequests.filter(r => r.url.includes('m2') || r.url.includes('codemirror'));
  
  if (m2CSS.length > 0) {
    console.log(chalk.green(`  ✓ Found ${m2CSS.length} M2/CodeMirror CSS files`));
    m2CSS.forEach(req => {
      console.log(chalk.gray(`    - ${path.basename(req.url)}`));
    });
  } else {
    console.log(chalk.red('  ✗ No M2-specific CSS files loaded'));
  }
  
  // Final summary
  console.log(chalk.bold.blue('\n📈 Summary:'));
  console.log(chalk.green(`  Tests with highlighting: ${totalPassed}`));
  console.log(chalk.red(`  Tests without highlighting: ${totalFailed}`));
  
  // Save full report
  const fullReport = {
    summary: { passed: totalPassed, failed: totalFailed },
    results: allResults,
    consoleLogs: m2Logs,
    cssFiles: m2CSS,
    timestamp: new Date().toISOString()
  };
  
  await fs.ensureDir(LOGS_DIR);
  await fs.writeJSON(path.join(LOGS_DIR, 'full_report.json'), fullReport, { spaces: 2 });
  console.log(chalk.gray(`\n📄 Full report saved to ${LOGS_DIR}/full_report.json`));
}

async function main(jupyterToken = null) {
  const { browser, page, consoleLogs, networkRequests } = await setupBrowser();
  
  try {
    await navigateToJupyterLab(page, jupyterToken);
    await createM2Notebook(page);
    
    // Run tests
    const allResults = {};
    
    for (const [testName, code] of Object.entries(TEST_CODE)) {
      const results = await testSyntaxHighlighting(page, testName, code);
      allResults[testName] = results;
      
      // Create new cell for next test
      await page.keyboard.press('Escape');
      await page.keyboard.press('b'); // New cell below
    }
    
    // Generate report
    await generateReport(allResults, consoleLogs, networkRequests);
    
    // Debug mode: pause before closing
    if (process.argv.includes('--debug')) {
      console.log(chalk.yellow('\n⏸️  Debug mode: Browser will remain open. Press Ctrl+C to exit.'));
      await page.waitForTimeout(300000); // 5 minutes
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
  } finally {
    await browser.close();
  }
}

// Extract token from command line args if provided
const token = process.argv.find(arg => arg.startsWith('--token='))?.split('=')[1];

// Run tests
main(token).catch(console.error);