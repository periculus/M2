// Simple test of the new parser
import { parser } from './lib/parser/parser.js';
import { styleTags, tags as t } from '@lezer/highlight';

const testCode = 'if QQ then gb else ideal';

// Parse the code
const tree = parser.parse(testCode);

console.log('Testing new parser...');
console.log('Code:', testCode);
console.log('Tree:', tree.toString());

// Walk the tree to see node types
tree.iterate({
  enter: (node) => {
    const text = testCode.slice(node.from, node.to);
    console.log(`"${text}" -> ${node.type.name} (id: ${node.type.id})`);
  }
});

console.log('\nExpected results:');
console.log('- "if" should be Keyword (id: 3)');
console.log('- "QQ" should be Type (id: 5)'); 
console.log('- "then" should be Keyword (id: 3)');
console.log('- "gb" should be Function (id: 7)');
console.log('- "else" should be Keyword (id: 3)');
console.log('- "ideal" should be Function (id: 7)');