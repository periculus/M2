const { parser } = require('./lib/parser/parser.js');

// Test the parser directly
const code = `-- Keywords should be blue
if true then print "hello"

-- Types should be teal  
R = QQ[x,y,z]
T = Ring

-- Functions should be purple
I = ideal(x^2)
G = gb I`;

console.log('Testing parser...');
const tree = parser.parse(code);

// Walk the tree and find nodes
let cursor = tree.cursor();
const nodes = [];

do {
  const node = {
    name: cursor.name,
    from: cursor.from,
    to: cursor.to,
    text: code.substring(cursor.from, cursor.to)
  };
  
  if (node.name === 'Keyword' || node.name === 'Type' || node.name === 'Function') {
    nodes.push(node);
  }
} while (cursor.next());

console.log('\nFound nodes:');
nodes.forEach(node => {
  console.log(`${node.name}: "${node.text}" at ${node.from}-${node.to}`);
});

console.log('\nParser node types:');
console.log('Keyword:', parser.nodeSet.types.find(t => t.name === 'Keyword')?.id);
console.log('Type:', parser.nodeSet.types.find(t => t.name === 'Type')?.id);
console.log('Function:', parser.nodeSet.types.find(t => t.name === 'Function')?.id);