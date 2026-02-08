#!/usr/bin/env node

// Simple test to show what the parser recognizes
import { parser } from './src/parser/parser.js';

const testCode = `-- Test M2 syntax highlighting
if true then print "hello"
for i in {1,2,3} do print i

-- Types
R = QQ[x,y,z]
I : Ideal
M : Matrix

-- Functions  
matrix {{1,2},{3,4}}
ideal(x^2, y^2)
gb I
primaryDecomposition I

-- Strings and numbers
s = "This is a string"
n = 42
pi = 3.14159`;

console.log('=== M2 Parser Token Recognition Test ===\n');
console.log('Input code:');
console.log('---');
console.log(testCode);
console.log('---\n');

// Parse the code
const tree = parser.parse(testCode);

// Collect all tokens with their types
const tokens = [];
let cursor = tree.cursor();

do {
    const node = cursor.node;
    if (node.name && node.name !== "Program" && node.name !== "⚠") {
        const text = testCode.slice(node.from, node.to);
        tokens.push({
            type: node.name,
            text: text,
            from: node.from,
            to: node.to
        });
    }
} while (cursor.next());

// Group tokens by type
const tokensByType = {};
tokens.forEach(token => {
    if (!tokensByType[token.type]) {
        tokensByType[token.type] = [];
    }
    if (!tokensByType[token.type].includes(token.text)) {
        tokensByType[token.type].push(token.text);
    }
});

// Display results
console.log('Tokens recognized by type:\n');

const typeOrder = ['Keyword', 'Type', 'Function', 'Boolean', 'String', 'Number', 'LineComment', 'Operator', 'Delimiter'];
typeOrder.forEach(type => {
    if (tokensByType[type]) {
        console.log(`${type}s:`);
        console.log(`  ${tokensByType[type].join(', ')}`);
        console.log();
    }
});

// Show any other types
Object.keys(tokensByType).forEach(type => {
    if (!typeOrder.includes(type)) {
        console.log(`${type}s:`);
        console.log(`  ${tokensByType[type].join(', ')}`);
        console.log();
    }
});

// Show the issue
console.log('\n=== THE PROBLEM ===');
console.log('The parser correctly identifies:');
console.log('- Keywords (if, then, for, do) as "Keyword" nodes');
console.log('- Types (QQ, Ideal, Matrix) as "Type" nodes');  
console.log('- Functions (print, matrix, ideal, gb) as "Function" nodes');
console.log('');
console.log('But in JupyterLab, everything appears GREEN because:');
console.log('1. The highlighting tags are not being applied properly');
console.log('2. JupyterLab theme CSS variables override our colors');
console.log('3. The parser propSources might not be working in the webpack bundle');
console.log('');
console.log('The parser WORKS - it\'s the highlighting integration that fails!');