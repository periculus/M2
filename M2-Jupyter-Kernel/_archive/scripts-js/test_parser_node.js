#!/usr/bin/env node

// Test M2 parser directly in Node.js
import { parser } from './src/parser/parser.js';
import { highlightTree } from '@lezer/highlight';
import { tags } from '@lezer/highlight';

// Test cases
const testCases = [
    {
        name: "Basic Keywords and Types",
        code: `-- Test keywords (should be BLUE)
if true then print "hello"
for i in {1,2,3} do print i

-- Test types (should be TEAL)
R = QQ[x,y,z]
I : Ideal

-- Test functions (should be PURPLE)
matrix {{1,2},{3,4}}
ideal(x^2, y^2)

-- Test strings (should be RED)
s = "This is a string"`
    },
    {
        name: "Real M2 Code",
        code: `-- from A01.m2
assert = x -> if not x then error "assertion failed "

-- test {}
assert( class {1,2,3} === List )
assert( # {1,2,3} === 3 )`
    }
];

// Token type to color mapping
const tokenColors = {
    'keyword': '\x1b[34m',     // Blue
    'typeName': '\x1b[36m',    // Cyan
    'function': '\x1b[35m',    // Magenta
    'string': '\x1b[31m',      // Red
    'comment': '\x1b[32m',     // Green
    'number': '\x1b[33m',      // Yellow
    'variableName': '\x1b[0m', // Default
    'operator': '\x1b[0m',     // Default
    'bool': '\x1b[34m',        // Blue
    'null': '\x1b[90m'         // Gray
};

const reset = '\x1b[0m';

console.log('=== M2 Parser Direct Test ===\n');

// Test each case
testCases.forEach(test => {
    console.log(`\n--- ${test.name} ---`);
    console.log('Input code:');
    console.log(test.code);
    console.log('\nParsing...');
    
    try {
        // Parse the code
        const tree = parser.parse(test.code);
        console.log(`Parse tree type: ${tree.type.name}`);
        console.log(`Tree length: ${tree.length}`);
        
        // Walk the tree and collect tokens
        console.log('\nTokens found:');
        let cursor = tree.cursor();
        let tokenCount = 0;
        
        do {
            const node = cursor.node;
            if (node.name && node.name !== "Program" && node.name !== "⚠") {
                const text = test.code.slice(node.from, node.to);
                tokenCount++;
                
                // Get the tag type from the node
                let tagType = 'unknown';
                if (cursor.type.prop) {
                    // Try to get highlight info
                    const highlight = cursor.type.prop(tags);
                    if (highlight) {
                        tagType = highlight.name || 'unknown';
                    }
                }
                
                console.log(`  ${node.name} [${node.from}-${node.to}]: "${text}" (tag: ${tagType})`);
                
                if (tokenCount > 20) {
                    console.log('  ... (truncated)');
                    break;
                }
            }
        } while (cursor.next());
        
        // Try to highlight the code
        console.log('\nHighlighted output:');
        const highlights = [];
        highlightTree(tree, tags.styleTags, (from, to, tag) => {
            highlights.push({ from, to, tag: tag.name || 'unknown' });
        });
        
        // Apply highlights
        let result = '';
        let lastPos = 0;
        highlights.forEach(h => {
            // Add unhighlighted text
            if (lastPos < h.from) {
                result += test.code.slice(lastPos, h.from);
            }
            // Add highlighted text
            const color = tokenColors[h.tag] || '\x1b[0m';
            result += color + test.code.slice(h.from, h.to) + reset;
            lastPos = h.to;
        });
        // Add remaining text
        if (lastPos < test.code.length) {
            result += test.code.slice(lastPos);
        }
        
        console.log(result);
        
    } catch (error) {
        console.error(`Error parsing: ${error.message}`);
        console.error(error.stack);
    }
});

console.log('\n=== Test Complete ===');

// Also test the spec_identifier mapping
console.log('\nChecking keyword mappings from parser:');
const spec_identifier = {
    if:6, then:6, else:6, when:6, do:6, while:6, for:6, from:6, to:6, in:6, 
    break:6, continue:6, return:6, try:6, catch:6, throw:6, local:6, global:6, 
    export:6, exportMutable:6, protect:6, private:6, package:6, use:6, and:6, 
    or:6, not:6, xor:6, new:6, method:6, ZZ:10, QQ:10, RR:10, CC:10, Ring:10, 
    Ideal:10, Module:10, Matrix:10, ChainComplex:10, PolynomialRing:10, 
    QuotientRing:10, List:10, Array:10, HashTable:10, String:10, Symbol:10, 
    Boolean:10, Thing:10, Nothing:10, MutableList:10, MutableHashTable:10, 
    gb:14, res:14, ideal:14, matrix:14, ring:14, map:14, ker:14, coker:14, 
    image:14, decompose:14, primaryDecomposition:14, saturate:14, quotient:14, 
    hilbertFunction:14, hilbertPolynomial:14, hilbertSeries:14, betti:14, 
    regularity:14, codim:14, dim:14, degree:14, genus:14, source:14, target:14, 
    transpose:14, det:14, rank:14, trace:14, factor:14, gcd:14, lcm:14, mod:14, 
    divmod:14, toString:14, print:14, error:14, assert:14, time:14, 
    elapsedTime:14, true:18, false:18, null:22
};

console.log('Keywords (value 6):', Object.keys(spec_identifier).filter(k => spec_identifier[k] === 6));
console.log('Types (value 10):', Object.keys(spec_identifier).filter(k => spec_identifier[k] === 10));
console.log('Functions (value 14):', Object.keys(spec_identifier).filter(k => spec_identifier[k] === 14));