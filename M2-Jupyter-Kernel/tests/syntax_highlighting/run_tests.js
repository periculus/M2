#!/usr/bin/env node
/**
 * Comprehensive Test Runner for M2 Syntax Highlighting
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

// Get the project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const VENV_JUPYTER = path.join(PROJECT_ROOT, 'venv', 'bin', 'jupyter');

console.log('Project root:', PROJECT_ROOT);
console.log('Jupyter path:', VENV_JUPYTER);

async function checkJupyterPath() {
  if (!await fs.pathExists(VENV_JUPYTER)) {
    console.error(chalk.red(`❌ Jupyter not found at: ${VENV_JUPYTER}`));
    console.log(chalk.yellow('Please ensure you have activated the virtual environment and installed JupyterLab'));
    return false;
  }
  return true;
}

async function checkJupyterRunning() {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      http.get('http://localhost:8888/api', (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function startJupyterLab() {
  console.log(chalk.blue('🚀 Starting JupyterLab...'));
  
  // Check if jupyter exists
  if (!await checkJupyterPath()) {
    throw new Error('Jupyter not found');
  }
  
  let jupyterToken = null;
  
  const jupyter = spawn(VENV_JUPYTER, ['lab', '--no-browser', '--port=8888'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Capture output for debugging and token extraction
  jupyter.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(chalk.gray(`[Jupyter] ${output.trim()}`));
    
    // Extract token from URL
    const tokenMatch = output.match(/token=([a-f0-9]+)/);
    if (tokenMatch) {
      jupyterToken = tokenMatch[1];
      console.log(chalk.green(`✓ Extracted token: ${jupyterToken.substring(0, 8)}...`));
    }
  });
  
  jupyter.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(chalk.red(`[Jupyter Error] ${output.trim()}`));
    
    // Token might also appear in stderr
    const tokenMatch = output.match(/token=([a-f0-9]+)/);
    if (tokenMatch) {
      jupyterToken = tokenMatch[1];
      console.log(chalk.green(`✓ Extracted token: ${jupyterToken.substring(0, 8)}...`));
    }
  });
  
  jupyter.unref();
  
  // Wait for JupyterLab to start
  let attempts = 0;
  while (attempts < 30) {
    if (await checkJupyterRunning()) {
      console.log(chalk.green('✓ JupyterLab is running'));
      return { jupyter, token: jupyterToken };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('JupyterLab failed to start');
}

async function runParserTests() {
  console.log(chalk.bold.blue('\n🧪 Running Parser Tests...\n'));
  
  return new Promise((resolve) => {
    const parser = spawn('node', ['test_parser.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    parser.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runBrowserTests(token = null) {
  console.log(chalk.bold.blue('\n🌐 Running Browser Tests...\n'));
  
  const args = ['test_browser.js'];
  if (token) {
    args.push(`--token=${token}`);
    console.log(chalk.gray(`Using token: ${token.substring(0, 8)}...`));
  }
  
  return new Promise((resolve) => {
    const browser = spawn('node', args, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    browser.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function injectDebugger() {
  console.log(chalk.bold.blue('\n💉 Creating DOM Inspector Bookmarklet...\n'));
  
  const debuggerCode = await fs.readFile(path.join(__dirname, 'dom_inspector.js'), 'utf8');
  const bookmarklet = `javascript:(function(){${encodeURIComponent(debuggerCode)}})()`;
  
  console.log(chalk.yellow('📌 Bookmarklet created. To use the debugger:'));
  console.log(chalk.gray('1. Open JupyterLab in your browser'));
  console.log(chalk.gray('2. Create a bookmark with this URL:'));
  console.log(chalk.gray(bookmarklet.substring(0, 100) + '...'));
  console.log(chalk.gray('3. Click the bookmark when viewing an M2 notebook'));
  console.log(chalk.gray('4. Use debugM2(), debugM2CSS(), debugM2Refresh() in console'));
  
  await fs.writeFile(path.join(__dirname, 'debugger_bookmarklet.txt'), bookmarklet);
  console.log(chalk.gray('\n📄 Full bookmarklet saved to debugger_bookmarklet.txt'));
}

async function generateSummary() {
  console.log(chalk.bold.blue('\n📊 Generating Test Summary...\n'));
  
  const logsDir = path.join(__dirname, 'logs');
  const screenshotsDir = path.join(__dirname, 'screenshots');
  
  const reports = {
    parser: await fs.pathExists(path.join(logsDir, 'parser_results.json')),
    browser: await fs.pathExists(path.join(logsDir, 'full_report.json')),
    screenshots: await fs.readdir(screenshotsDir).catch(() => [])
  };
  
  console.log(chalk.yellow('📁 Generated Files:'));
  console.log(chalk.gray(`  - Parser test results: ${reports.parser ? '✓' : '✗'}`));
  console.log(chalk.gray(`  - Browser test results: ${reports.browser ? '✓' : '✗'}`));
  console.log(chalk.gray(`  - Screenshots: ${reports.screenshots.length} files`));
  
  if (reports.browser) {
    const report = await fs.readJSON(path.join(logsDir, 'full_report.json'));
    console.log(chalk.yellow('\n🔍 Key Findings:'));
    console.log(chalk.gray(`  - Tests passed: ${report.summary.passed}`));
    console.log(chalk.gray(`  - Tests failed: ${report.summary.failed}`));
    
    const allUnrecognized = [];
    Object.values(report.results).forEach(result => {
      if (result.unrecognized) {
        allUnrecognized.push(...result.unrecognized);
      }
    });
    
    if (allUnrecognized.length > 0) {
      console.log(chalk.red('\n⚠️  Tokens not highlighted:'));
      const unique = [...new Set(allUnrecognized.map(t => t.text))];
      unique.forEach(token => {
        console.log(chalk.red(`  - ${token}`));
      });
    }
  }
}

let jupyterProcess = null;

async function cleanup() {
  if (jupyterProcess) {
    console.log(chalk.gray('\n🛑 Stopping JupyterLab...'));
    try {
      process.kill(-jupyterProcess.pid);
    } catch (e) {
      // Process might already be dead
    }
  }
}

async function main() {
  console.log(chalk.bold.cyan('🔬 M2 Syntax Highlighting Test Suite\n'));
  
  let jupyterToken = null;
  
  try {
    // Check if JupyterLab is already running
    const isRunning = await checkJupyterRunning();
    if (!isRunning) {
      const jupyterInfo = await startJupyterLab();
      jupyterProcess = jupyterInfo.jupyter;
      jupyterToken = jupyterInfo.token;
      // Wait a bit more for full initialization
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log(chalk.green('✓ JupyterLab already running'));
      console.log(chalk.yellow('Note: Using existing JupyterLab instance, token authentication may be required'));
    }
    
    // Run tests
    const parserPassed = await runParserTests();
    const browserPassed = await runBrowserTests(jupyterToken);
    
    // Inject debugger
    await injectDebugger();
    
    // Generate summary
    await generateSummary();
    
    // Final result
    console.log(chalk.bold.cyan('\n🏁 Test Suite Complete\n'));
    
    if (parserPassed && browserPassed) {
      console.log(chalk.bold.green('✅ All tests passed!'));
    } else {
      console.log(chalk.bold.red('❌ Some tests failed'));
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray('1. Check screenshots in ./screenshots/'));
      console.log(chalk.gray('2. Review logs in ./logs/'));
      console.log(chalk.gray('3. Use the DOM inspector bookmarklet for debugging'));
      console.log(chalk.gray('4. Check browser console for errors'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Test suite failed:'), error);
  } finally {
    await cleanup();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n⚠️  Interrupted by user'));
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Run the test suite
main().catch(console.error);