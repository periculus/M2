const { parser } = require('./lib/parser/parser.js');

// Test code with all token types
const code = `if true then print "hello"`;

console.log('Testing exact node names...');
const tree = parser.parse(code);

// Walk the tree and log ALL nodes
let cursor = tree.cursor();
const allNodes = [];

do {
  const node = {
    name: cursor.name,
    from: cursor.from,
    to: cursor.to,
    text: code.substring(cursor.from, cursor.to),
    type: cursor.type.name,
    id: cursor.type.id
  };
  allNodes.push(node);
} while (cursor.next());

console.log('\nAll nodes in tree:');
allNodes.forEach(node => {
  console.log(`${node.name} (id=${node.id}): "${node.text}"`);
});

// Check parent-child relationships
cursor = tree.cursor();
console.log('\nParent-child relationships:');
do {
  if (cursor.firstChild()) {
    console.log(`${cursor.name} has child ${cursor.type.name}`);
    cursor.parent();
  }
} while (cursor.next());