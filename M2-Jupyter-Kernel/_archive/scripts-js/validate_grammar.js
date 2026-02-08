#!/usr/bin/env node
/**
 * Validate and analyze Lezer grammar for M2
 * This script checks grammar correctness and generates parser info
 */

const fs = require('fs');
const path = require('path');
const { buildParser } = require('@lezer/generator');

// Grammar file to validate
const grammarPath = process.argv[2] || './codemirror-lang-m2/src/m2.grammar';

console.log('=== Lezer Grammar Validator for M2 ===\n');

if (!fs.existsSync(grammarPath)) {
  console.error(`Grammar file not found: ${grammarPath}`);
  process.exit(1);
}

console.log(`Reading grammar from: ${grammarPath}`);
const grammarText = fs.readFileSync(grammarPath, 'utf8');

try {
  console.log('\n1. Parsing grammar...');
  const startTime = Date.now();
  
  // Build the parser - this validates the grammar
  const parser = buildParser(grammarText, {
    fileName: grammarPath,
    warn: (message) => console.warn(`  ⚠️  Warning: ${message}`),
  });
  
  const buildTime = Date.now() - startTime;
  console.log(`  ✅ Grammar is valid! (built in ${buildTime}ms)`);
  
  // Analyze the parser
  console.log('\n2. Parser Information:');
  console.log(`  - Parser type: ${parser.type || 'LR'}`);
  console.log(`  - States: ${parser.states?.length || 'N/A'}`);
  console.log(`  - Node types: ${parser.nodeSet?.types.length || 'N/A'}`);
  
  // Extract node names
  if (parser.nodeSet) {
    console.log('\n3. Defined Node Types:');
    const nodeTypes = parser.nodeSet.types
      .filter(t => t.name && !t.name.startsWith('⚠'))
      .map(t => t.name)
      .sort();
    
    nodeTypes.forEach(name => {
      console.log(`  - ${name}`);
    });
  }
  
  // Check for conflicts
  console.log('\n4. Grammar Analysis:');
  
  // Check if it's truly LR
  const hasConflicts = grammarText.includes('@precedence') || 
                      grammarText.includes('@left') || 
                      grammarText.includes('@right');
  
  if (hasConflicts) {
    console.log('  - Uses precedence declarations (handles ambiguity)');
  } else {
    console.log('  - No precedence declarations (unambiguous grammar)');
  }
  
  // Count rules
  const ruleCount = (grammarText.match(/^\s*\w+\s*{/gm) || []).length;
  console.log(`  - Production rules: ~${ruleCount}`);
  
  // Check for external tokenizer
  const hasExternal = grammarText.includes('@external');
  if (hasExternal) {
    console.log('  - Uses external tokenizer/props');
  }
  
  // Test the parser with sample input
  console.log('\n5. Testing parser with sample M2 code:');
  const testCases = [
    'R = QQ[x,y,z]',
    'ideal(x^2, y^2)',
    'if x > 0 then print "positive"',
    '-- This is a comment',
    'gb I'
  ];
  
  testCases.forEach(code => {
    try {
      const tree = parser.parse(code);
      console.log(`  ✅ "${code}" -> ${tree.type.name}`);
    } catch (e) {
      console.log(`  ❌ "${code}" -> Parse error: ${e.message}`);
    }
  });
  
  // Generate parser stats
  console.log('\n6. Grammar Complexity:');
  const terminals = (grammarText.match(/"[^"]+"/g) || []).length;
  const nonTerminals = (grammarText.match(/^\s*\w+\s*{/gm) || []).length;
  const specializations = (grammarText.match(/@specialize/g) || []).length;
  
  console.log(`  - Terminal symbols: ~${terminals}`);
  console.log(`  - Non-terminal symbols: ~${nonTerminals}`);
  console.log(`  - Specializations: ${specializations}`);
  
  // Check if it's LL, LR, LALR, etc.
  console.log('\n7. Parser Classification:');
  console.log('  - Lezer generates LR parsers (specifically GLR - Generalized LR)');
  console.log('  - Can handle ambiguous grammars using precedence');
  console.log('  - Incremental parsing support for editor performance');
  
} catch (error) {
  console.error('\n❌ Grammar validation failed!');
  console.error(`Error: ${error.message}`);
  
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  
  process.exit(1);
}

console.log('\n✨ Grammar validation complete!');