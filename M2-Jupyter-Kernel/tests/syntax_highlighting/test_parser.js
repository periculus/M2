#!/usr/bin/env node
/**
 * Parser Unit Tests
 * Verify the parser correctly identifies M2 language tokens
 */

const { readFileSync } = require('fs');
const path = require('path');
const chalk = require('chalk');

// Load the parser from the built library
const parserPath = path.join(__dirname, '../../lib/parser/parser.js');
console.log(chalk.gray(`Loading parser from: ${parserPath}`));

let parser;
try {
  const parserModule = require(parserPath);
  parser = parserModule.parser;
} catch (error) {
  console.error(chalk.red('Failed to load parser:'), error.message);
  console.error(chalk.yellow('Make sure to build the extension first:'));
  console.error(chalk.gray('  cd ../.. && npm run build:lib'));
  process.exit(1);
}

// Test cases with expected tokens
const testCases = [
  {
    name: "Keywords",
    code: "if true then print else return",
    expected: {
      keywords: ["if", "then", "else", "return"],
      booleans: ["true"],
      functions: ["print"]
    }
  },
  {
    name: "Types",
    code: "R = QQ[x,y,z]; S = Ring",
    expected: {
      types: ["QQ", "Ring"],
      identifiers: ["R", "S", "x", "y", "z"]
    }
  },
  {
    name: "Functions",
    code: "I = ideal(x^2); G = gb I; M = matrix {{1,2},{3,4}}",
    expected: {
      functions: ["ideal", "gb", "matrix"],
      identifiers: ["I", "G", "M", "x"]
    }
  },
  {
    name: "Mixed tokens",
    code: "if QQ then gb ideal(x) else matrix {{0}}",
    expected: {
      keywords: ["if", "then", "else"],
      types: ["QQ"],
      functions: ["gb", "ideal", "matrix"],
      identifiers: ["x"],
      numbers: ["0"]
    }
  }
];

// Token type mapping
const TOKEN_TYPES = {
  'Keyword': 'keywords',
  'Type': 'types',
  'Function': 'functions',
  'Boolean': 'booleans',
  'identifier': 'identifiers',
  'Number': 'numbers',
  'String': 'strings',
  'LineComment': 'comments'
};

function parseAndAnalyze(code) {
  const tree = parser.parse(code);
  const tokens = {
    keywords: [],
    types: [],
    functions: [],
    booleans: [],
    identifiers: [],
    numbers: [],
    strings: [],
    comments: []
  };
  
  let cursor = tree.cursor();
  
  do {
    const nodeType = cursor.name;
    const text = code.substring(cursor.from, cursor.to);
    
    // Skip whitespace and structural nodes
    if (text.trim() && TOKEN_TYPES[nodeType]) {
      tokens[TOKEN_TYPES[nodeType]].push(text);
    }
    
    // For nested nodes, check the parent
    if (cursor.firstChild()) {
      const childType = cursor.name;
      const childText = code.substring(cursor.from, cursor.to);
      if (childText.trim() && TOKEN_TYPES[childType]) {
        tokens[TOKEN_TYPES[childType]].push(childText);
      }
      cursor.parent();
    }
  } while (cursor.next());
  
  return tokens;
}

function runTests() {
  console.log(chalk.bold.blue('🧪 M2 Parser Unit Tests\n'));
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(testCase => {
    console.log(chalk.yellow(`Testing: ${testCase.name}`));
    console.log(chalk.gray(`Code: ${testCase.code}`));
    
    const result = parseAndAnalyze(testCase.code);
    let testPassed = true;
    
    // Check each expected category
    Object.entries(testCase.expected).forEach(([category, expectedTokens]) => {
      const actualTokens = [...new Set(result[category])]; // Remove duplicates
      const missing = expectedTokens.filter(t => !actualTokens.includes(t));
      const extra = actualTokens.filter(t => !expectedTokens.includes(t));
      
      if (missing.length > 0 || extra.length > 0) {
        testPassed = false;
        console.log(chalk.red(`  ❌ ${category}:`));
        if (missing.length > 0) {
          console.log(chalk.red(`     Missing: ${missing.join(', ')}`));
        }
        if (extra.length > 0) {
          console.log(chalk.red(`     Extra: ${extra.join(', ')}`));
        }
      } else {
        console.log(chalk.green(`  ✓ ${category}: ${actualTokens.join(', ')}`));
      }
    });
    
    if (testPassed) {
      passed++;
      console.log(chalk.green('  ✅ PASSED\n'));
    } else {
      failed++;
      console.log(chalk.red('  ❌ FAILED\n'));
    }
  });
  
  // Summary
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(chalk.green(`  Passed: ${passed}`));
  console.log(chalk.red(`  Failed: ${failed}`));
  console.log(chalk.blue(`  Total: ${testCases.length}`));
  
  // Detailed parser info
  console.log(chalk.bold('\n🔍 Parser Node Types:'));
  const nodeTypes = parser.nodeSet.types.filter(t => t.name && t.id > 0);
  nodeTypes.forEach(type => {
    console.log(`  ${type.name} (id=${type.id})`);
  });
  
  return failed === 0;
}

// Run tests
try {
  const success = runTests();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error(chalk.red('Test execution failed:'), error);
  process.exit(1);
}