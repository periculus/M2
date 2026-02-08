# M2 Syntax Highlighting Implementation Plan

Based on the architectural analysis, here's a concrete implementation plan to achieve robust M2 syntax highlighting in JupyterLab.

## Phase 1: Immediate Fixes (1-2 days)

### A. Hardened Styling via CM6 Inline Decorations

**File**: `codemirror-lang-m2/src/highlight.ts`

```typescript
import {HighlightStyle} from "@codemirror/language"
import {tags as t} from "@lezer/highlight"

export const m2HighlightStyle = HighlightStyle.define([
  // Hardcoded colors - no CSS variables
  { tag: t.keyword,           color: "#0000FF", fontWeight: "bold" },
  { tag: t.typeName,          color: "#008080", fontWeight: "500" },
  { tag: t.function(t.name),  color: "#800080" },
  { tag: t.variableName,      color: "#000000" },
  { tag: t.string,            color: "#008000" },
  { tag: t.number,            color: "#FF8C00" },
  { tag: t.bool,              color: "#FF1493" },
  { tag: t.null,              color: "#FF1493" },
  { tag: t.lineComment,       color: "#808080", fontStyle: "italic" },
  { tag: t.blockComment,      color: "#808080", fontStyle: "italic" },
  { tag: t.operator,          color: "#000080" },
  { tag: t.punctuation,       color: "#000000" },
  { tag: t.paren,             color: "#000000" },
  { tag: t.bracket,           color: "#000000" },
  { tag: t.brace,             color: "#000000" }
])
```

**Benefits**: 
- No theme interference
- Consistent colors across all JupyterLab themes
- Immediate visual improvement

## Phase 2: Grammar Enhancement (2-3 days)

### B. Grammar & Token Classification

**File**: `codemirror-lang-m2/src/m2.grammar`

```lezer
@top Program { statement* }

@precedence {
  call,
  member,
  unary,
  binary,
  assign
}

statement {
  Expression |
  Assignment |
  IfStatement |
  ForStatement |
  WhileStatement |
  FunctionDef
}

// Enhanced expression parsing
Expression {
  Identifier |
  FunctionCall |
  MemberAccess |
  BinaryOp |
  UnaryOp |
  Literal
}

// Better identifier recognition
Identifier {
  Word ~id
}

FunctionCall {
  Identifier !call "(" ArgList? ")"
}

MemberAccess {
  Expression !member ("." | "_") Identifier
}

// M2-specific operators
BinaryOp {
  Expression !binary (
    ArithOp { "+" | "-" | "*" | "/" | "^" | "//" | "%" } |
    CompareOp { "==" | "!=" | "<" | ">" | "<=" | ">=" | "===" } |
    LogicOp { "and" | "or" | "xor" } |
    SpecialOp { "=>" | "|>" | ".." | "@@" }
  ) Expression
}

// Enhanced literals
Literal {
  Number |
  String |
  Boolean { @specialize<Word, "true" | "false"> } |
  Null { @specialize<Word, "null"> } |
  Symbol { ":" Word }
}

// Token definitions with proper precedence
@tokens {
  Word { $[a-zA-Z_] $[a-zA-Z0-9_']* }
  Number { 
    $[0-9]+ ("." $[0-9]+)? ([eE] [+-]? $[0-9]+)? |
    "0x" $[0-9a-fA-F]+ |
    "0b" $[01]+
  }
  String { 
    '"' (![\\\n"] | "\\" _)* '"' |
    "///" (![/] | "/" ![/])* "///"
  }
  LineComment { "--" ![\n]* }
  BlockComment { "-*" ![*] (_* ![*])* "*-" }
  space { $[ \t\n\r]+ }
  
  @precedence { Number, Word }
  @precedence { LineComment, BlockComment, "-" }
}

// Specialized tokens for common M2 constructs
@external specialize {Word} specializeWord from "./tokens" {
  // Keywords
  if, then, else, when, do, while, for, from, to, in,
  break, continue, return, try, catch, throw,
  local, global, export, exportMutable, protect, private,
  
  // Types
  ZZ, QQ, RR, CC, Ring, Ideal, Module, Matrix,
  ChainComplex, PolynomialRing, QuotientRing,
  List, Array, HashTable, String, Symbol, Boolean,
  
  // Common functions
  gb, res, ideal, matrix, ring, map, ker, coker,
  image, decompose, primaryDecomposition, saturate,
  
  // Constants
  true, false, null, infinity, pi, ii
}
```

### C. Post-Processing for User Variables

**File**: `codemirror-lang-m2/src/highlight.ts` (addition)

```typescript
import {syntaxTree} from "@codemirror/language"
import {EditorView} from "@codemirror/view"

export function m2VariableHighlighter(view: EditorView) {
  const decorations = []
  const userVars = new Set<string>()
  
  // First pass: collect assignments
  syntaxTree(view.state).iterate({
    enter(node) {
      if (node.name === "Assignment") {
        const varNode = node.node.firstChild
        if (varNode && varNode.name === "Identifier") {
          const varName = view.state.doc.sliceString(varNode.from, varNode.to)
          userVars.add(varName)
        }
      }
    }
  })
  
  // Second pass: highlight user variables
  syntaxTree(view.state).iterate({
    enter(node) {
      if (node.name === "Identifier") {
        const name = view.state.doc.sliceString(node.from, node.to)
        if (userVars.has(name)) {
          decorations.push(
            Decoration.mark({
              class: "cm-userVariable",
              inclusive: true
            }).range(node.from, node.to)
          )
        }
      }
    }
  })
  
  return Decoration.set(decorations)
}
```

## Phase 3: Output Cell Highlighting (3-4 days)

### D. Notebook Output Renderer

**File**: `jupyterlab-m2/src/outputRenderer.ts`

```typescript
import {IRenderMime} from '@jupyterlab/rendermime-interfaces'
import {Widget} from '@lumino/widgets'
import {EditorView, basicSetup} from '@codemirror/basic-setup'
import {m2} from '@codemirror/lang-m2'

export class M2OutputRenderer extends Widget implements IRenderMime.IRenderer {
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data['text/plain'] as string
    
    // Create a read-only CodeMirror instance
    const view = new EditorView({
      doc: data,
      extensions: [
        basicSetup,
        m2(),
        EditorView.editable.of(false),
        EditorView.theme({
          '.cm-content': { padding: '4px 8px' },
          '.cm-editor': { fontSize: '13px' }
        })
      ],
      parent: this.node
    })
    
    return Promise.resolve()
  }
}

// Register the renderer
export const m2OutputRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ['text/x-macaulay2-output'],
  createRenderer: options => new M2OutputRenderer()
}
```

## Phase 4: Build Process Optimization (1-2 days)

### E. Unified Build with Rollup

**File**: `codemirror-lang-m2/rollup.config.js`

```javascript
import {lezer} from "@lezer/generator/rollup"
import typescript from '@rollup/plugin-typescript'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'

export default {
  input: 'src/index.ts',
  external: id => /^@(codemirror|lezer)\//.test(id),
  plugins: [
    lezer(),
    typescript(),
    nodeResolve(),
    postcss({
      inject: true,  // Inject styles directly into JS
      minimize: true
    })
  ],
  output: [
    {
      format: 'es',
      file: 'dist/index.es.js',
      externalLiveBindings: false
    },
    {
      format: 'cjs',
      file: 'dist/index.cjs',
      externalLiveBindings: false
    }
  ]
}
```

**Package.json scripts**:
```json
{
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w",
    "prepare": "npm run build",
    "test": "jest"
  }
}
```

## Phase 5: Testing Infrastructure (2-3 days)

### F. Automated Testing

**File**: `codemirror-lang-m2/test/highlighting.test.ts`

```typescript
import {EditorState} from '@codemirror/state'
import {syntaxTree} from '@codemirror/language'
import {m2} from '../src'

describe('M2 syntax highlighting', () => {
  function getTokens(code: string) {
    const state = EditorState.create({
      doc: code,
      extensions: [m2()]
    })
    
    const tokens = []
    syntaxTree(state).iterate({
      enter(node) {
        tokens.push({
          name: node.name,
          text: state.doc.sliceString(node.from, node.to)
        })
      }
    })
    return tokens
  }
  
  test('keywords are recognized', () => {
    const tokens = getTokens('if x then y else z')
    expect(tokens).toContainEqual({name: 'Keyword', text: 'if'})
    expect(tokens).toContainEqual({name: 'Keyword', text: 'then'})
    expect(tokens).toContainEqual({name: 'Keyword', text: 'else'})
  })
  
  test('types are recognized', () => {
    const tokens = getTokens('R = QQ[x,y,z]')
    expect(tokens).toContainEqual({name: 'Type', text: 'QQ'})
  })
  
  test('functions are recognized', () => {
    const tokens = getTokens('I = ideal(x^2, y^2)')
    expect(tokens).toContainEqual({name: 'Function', text: 'ideal'})
  })
})
```

**File**: `jupyterlab-m2/test/notebook.spec.ts` (Playwright)

```typescript
import {test, expect} from '@playwright/test'

test('M2 syntax highlighting in notebook', async ({page}) => {
  await page.goto('http://localhost:8888/lab')
  
  // Create new notebook
  await page.click('text=File')
  await page.click('text=New')
  await page.click('text=Notebook')
  await page.click('text=Macaulay2')
  
  // Type M2 code
  const cell = page.locator('.jp-CodeCell .cm-content').first()
  await cell.type('R = QQ[x,y,z]\nI = ideal(x^2, y^2)')
  
  // Check highlighting
  await expect(page.locator('.cm-keyword')).toHaveCSS('color', 'rgb(0, 0, 255)')
  await expect(page.locator('.cm-typeName')).toHaveCSS('color', 'rgb(0, 128, 128)')
  await expect(page.locator('.cm-function')).toHaveCSS('color', 'rgb(128, 0, 128)')
  
  // Take screenshot for visual regression
  await page.screenshot({path: 'test-results/m2-highlighting.png'})
})
```

## Implementation Timeline

1. **Week 1**: 
   - Implement hardened styling (Phase 1)
   - Start grammar enhancement (Phase 2)

2. **Week 2**:
   - Complete grammar and post-processing
   - Begin output cell highlighting (Phase 3)

3. **Week 3**:
   - Complete output rendering
   - Optimize build process (Phase 4)

4. **Week 4**:
   - Implement comprehensive testing (Phase 5)
   - Integration testing and bug fixes

## Success Metrics

- [ ] All M2 tokens have distinct, theme-independent colors
- [ ] User-defined variables are recognized and styled
- [ ] Output cells show syntax highlighting
- [ ] Build time < 5 seconds for incremental changes
- [ ] 100% test coverage for token recognition
- [ ] Zero regressions in CI/CD pipeline

## Maintenance Plan

1. **Documentation**: Comprehensive API docs for extension developers
2. **Version Strategy**: Semantic versioning with clear breaking change notes
3. **Community**: Regular releases synchronized with JupyterLab updates
4. **Performance**: Monitor and optimize parser performance for large files