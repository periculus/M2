#!/usr/bin/env node

// Test the new parser with M2 code
import { parser } from './lib/parser/parser.js';

const testCode = `-- Test M2 syntax highlighting
-- Keywords
if true then
    print "hello"
else
    for i from 1 to 10 do
        print i

-- Types
R = QQ[x,y,z]
S = ZZ/101
T = RR
U = CC
V = Ring

-- Functions
I = ideal(x^2, y^2)
G = gb I
H = res I
M = matrix {{1,2},{3,4}}`;

console.log('=== PARSER ROUNDTRIP TEST ===');
console.log('Code to parse:');
console.log(testCode);
console.log('\n=== PARSER RESULTS ===');

try {
    // Parse the code
    const tree = parser.parse(testCode);
    
    console.log('Parse tree structure:');
    console.log(tree.toString());
    
    console.log('\n=== NODE ANALYSIS ===');
    
    // Track what we find
    const nodeStats = {};
    const keywordNodes = [];
    const typeNodes = [];
    const functionNodes = [];
    
    // Walk the tree
    tree.iterate({
        enter: (node) => {
            const text = testCode.slice(node.from, node.to).trim();
            const nodeType = node.type.name;
            const nodeId = node.type.id;
            
            // Count node types
            nodeStats[nodeType] = (nodeStats[nodeType] || 0) + 1;
            
            // Collect specific nodes
            if (nodeType === 'Keyword' && text) {
                keywordNodes.push(text);
            } else if (nodeType === 'Type' && text) {
                typeNodes.push(text);
            } else if (nodeType === 'Function' && text) {
                functionNodes.push(text);
            }
            
            // Only log non-empty, interesting tokens
            if (text && nodeType !== 'Program' && text.length > 0) {
                console.log(`"${text}" → ${nodeType} (id: ${nodeId})`);
            }
        }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log('Node type counts:', nodeStats);
    console.log('Keywords found:', keywordNodes);
    console.log('Types found:', typeNodes);
    console.log('Functions found:', functionNodes);
    
    console.log('\n=== EXPECTATIONS ===');
    console.log('Should find:');
    console.log('- Keywords: if, then, else, for, from, to, do');
    console.log('- Types: QQ, ZZ, RR, CC, Ring');
    console.log('- Functions: ideal, gb, res, matrix');
    
    console.log('\n=== RESULT ===');
    if (keywordNodes.length > 0) {
        console.log('✅ Keywords detected:', keywordNodes.length);
    } else {
        console.log('❌ NO keywords detected!');
    }
    
    if (typeNodes.length > 0) {
        console.log('✅ Types detected:', typeNodes.length);
    } else {
        console.log('❌ NO types detected!');
    }
    
    if (functionNodes.length > 0) {
        console.log('✅ Functions detected:', functionNodes.length);
    } else {
        console.log('❌ NO functions detected!');
    }
    
} catch (error) {
    console.error('❌ Parser error:', error);
    console.error('Stack:', error.stack);
}