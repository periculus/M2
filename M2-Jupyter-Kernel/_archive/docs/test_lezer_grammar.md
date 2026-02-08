# Lezer Grammar Testing and Validation

## About Lezer

Lezer is a parser generator that creates **incremental GLR (Generalized LR) parsers**. Key characteristics:

1. **Parser Type**: GLR (Generalized LR)
   - Can handle ambiguous grammars
   - Uses graph-structured stack for multiple parse paths
   - Resolves ambiguities with precedence declarations

2. **Incremental Parsing**
   - Optimized for editor use cases
   - Can reparse only changed portions
   - Maintains parse tree across edits

3. **Grammar Format**
   - Similar to EBNF (Extended Backus-Naur Form)
   - Supports precedence and associativity
   - External tokenizers for complex lexing

## Testing M2 Grammar

### 1. Install Lezer CLI Tools

```bash
npm install -g @lezer/generator
npm install -g @lezer/lr
```

### 2. Validate Grammar Syntax

```bash
# Basic validation
lezer-generator src/parser/m2.grammar --help

# Generate parser and check for conflicts
lezer-generator src/parser/m2.grammar -o test-parser.js
```

### 3. Analyze Grammar Conflicts

Create a test file `check_grammar.js`:

```javascript
const {buildParser} = require("@lezer/generator");
const fs = require("fs");

const grammar = fs.readFileSync("src/parser/m2.grammar", "utf8");

try {
  const parser = buildParser(grammar, {
    warn: (msg, pos) => {
      console.warn(`Warning at ${pos}: ${msg}`);
    },
    strict: true
  });
  
  console.log("Grammar is valid!");
  console.log("Parser info:", {
    version: parser.version,
    states: parser.states?.length,
    nodeTypes: parser.nodeSet?.types.map(t => t.name)
  });
} catch (e) {
  console.error("Grammar error:", e.message);
}
```

### 4. Common Grammar Issues

#### Current M2 Grammar Limitations:

1. **Too Simple Structure**: Everything is just a flat list of tokens
   ```
   statement {
     Keyword | Type | Function | ...
   }
   ```

2. **No Expression Parsing**: Can't distinguish between:
   - Function calls: `ideal(x,y)`
   - Assignments: `R = QQ[x,y]`
   - Binary operations: `x + y`

3. **@specialize Overuse**: Only recognizes predefined tokens

#### Enhanced Grammar Benefits:

1. **Proper Expression Hierarchy**:
   ```
   expression {
     AssignmentExpr |
     BinaryExpr |
     CallExpr |
     ...
   }
   ```

2. **Precedence Handling**:
   ```
   @precedence {
     exp @right,    // x^y^z = x^(y^z)
     times @left,   // x*y*z = (x*y)*z
     plus @left,    // x+y+z = (x+y)+z
   }
   ```

3. **Context-Aware Parsing**:
   - Variables in assignments get marked
   - Function calls are distinguished from variables
   - Operators have proper precedence

## Grammar Validation Commands

```bash
# 1. Check if grammar compiles
lezer-generator enhanced_m2.grammar --test

# 2. Generate and inspect parser
lezer-generator enhanced_m2.grammar -o parser.js
cat parser.js | grep -A5 "nodeNames"

# 3. Test with sample code
node -e "
const {parser} = require('./parser.js');
const tree = parser.parse('R = QQ[x,y,z]');
console.log(tree.toString());
"

# 4. Check for shift/reduce conflicts
lezer-generator enhanced_m2.grammar --verbose 2>&1 | grep -i conflict
```

## LR Parser Theory

Lezer generates **GLR parsers**, which are:

1. **LR (Left-to-right, Rightmost derivation)**
   - Reads input left-to-right
   - Builds rightmost derivation in reverse
   - More powerful than LL parsers

2. **Generalized (GLR)**
   - Handles ambiguous grammars
   - Maintains multiple parse stacks
   - Uses precedence to resolve conflicts

3. **Advantages for M2**
   - Can handle complex operator precedence
   - Supports ambiguous syntax (resolved by precedence)
   - Incremental parsing for live editing

## Testing the Enhanced Grammar

```bash
# Create test script
cat > test_m2_parser.js << 'EOF'
const {buildParser} = require("@lezer/generator");
const fs = require("fs");

const grammarFile = process.argv[2] || "enhanced_m2.grammar";
const grammar = fs.readFileSync(grammarFile, "utf8");

console.log(`Testing ${grammarFile}...`);

const parser = buildParser(grammar, {
  warn: console.warn,
  moduleStyle: "cjs"
});

const testCases = [
  "R = QQ[x,y,z]",
  "ideal(x^2, y^2)",
  "if x > 0 then print(y) else z",
  "for i from 1 to 10 do print(i)",
  "f(x) + g(y) * h(z)",
  "M_1 + M_2",
  "x^2 + y^2 == z^2"
];

testCases.forEach(code => {
  try {
    const tree = parser.parse(code);
    console.log(`✅ "${code}"`);
    console.log(`   Tree: ${tree.toString()}`);
  } catch (e) {
    console.log(`❌ "${code}" - ${e.message}`);
  }
});
EOF

node test_m2_parser.js
```

## Next Steps

1. **Implement Enhanced Grammar**
   - Replace simple token list with expression hierarchy
   - Add precedence rules for operators
   - Support complex M2 constructs

2. **Create Token Specializer**
   - Implement `./tokens.js` for external specialization
   - Track user-defined variables dynamically
   - Handle context-sensitive tokens

3. **Test Coverage**
   - Unit tests for each grammar production
   - Integration tests with real M2 code
   - Performance benchmarks for large files

4. **Integration**
   - Update highlight.js to use new node types
   - Map enhanced nodes to appropriate styles
   - Test in JupyterLab environment