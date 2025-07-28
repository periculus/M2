# Plan for Macaulay2 CodeMirror 6 Language Extension

## Overview
To achieve proper M2 syntax highlighting in JupyterLab (like Macaulay2Web), we need to create a CodeMirror 6 language package using the Lezer parser system.

## Phase 1: Setup Development Environment

### 1.1 Clone CodeMirror Language Template
```bash
git clone https://github.com/codemirror/lang-example.git codemirror-lang-macaulay2
cd codemirror-lang-macaulay2
```

### 1.2 Rename from EXAMPLE to macaulay2
- Run `git grep EXAMPLE` and replace all instances
- Update package.json with proper metadata

### 1.3 Install Dependencies
```bash
npm install
npm install -D @lezer/generator
```

## Phase 2: Convert Prism Grammar to Lezer

### 2.1 Create Lezer Grammar File
Create `src/syntax.grammar` based on Macaulay2Web's Prism patterns:

```lezer
@top Program { expression* }

@skip { space | Comment }

expression {
  Keyword |
  Function |
  Type |
  Constant |
  String |
  Number |
  Identifier |
  Operator
}

// Keywords from Macaulay2Web
Keyword {
  "and" | "break" | "catch" | "continue" | "do" | "else" | "elseif" |
  "export" | "for" | "from" | "global" | "if" | "in" | "is" | "local" |
  "new" | "not" | "null" | "of" | "or" | "return" | "shield" | "then" |
  "throw" | "time" | "timing" | "to" | "try" | "when" | "while" | "xor"
}

// Types (capitalized identifiers)
Type { @specialize<Identifier, 
  "Ring" | "Ideal" | "Matrix" | "Module" | "QQ" | "ZZ" | "RR" | "CC" |
  "Boolean" | "List" | "HashTable" | "Function" | "String" | "Number"
>}

// Built-in functions
Function { @specialize<Identifier,
  "ring" | "ideal" | "matrix" | "gb" | "res" | "ker" | "coker" |
  "image" | "rank" | "degree" | "hilbertSeries"
>}

// Constants
Constant {
  "true" | "false" | "infinity" | "nil"
}

// Comments
Comment {
  LineComment | BlockComment
}

LineComment { "--" ![\n]* }
BlockComment { "-*" ![*]* "*" ("*" | ![*-] ![*]*)* "-" }

// Strings
String {
  '"' (!["\\] | "\\" _)* '"' |
  "///" (!"/" | "/" !"/" | "//" !"/")* "///"
}

// Numbers
Number {
  @digit+ ("." @digit+)? |
  "." @digit+
}

// Identifiers
Identifier { @letter (@letter | @digit | "_" | "'")* }

// Operators
Operator {
  "+" | "-" | "*" | "/" | "^" | "=" | "==" | "!=" | 
  "<" | ">" | "<=" | ">=" | "=>" | ":=" | ".." | 
  "@@" | "@" | "#" | "%" | "&" | "|" | "!" | "?"
}

@tokens {
  space { @whitespace+ }
  @digit { "0".."9" }
  @letter { "a".."z" | "A".."Z" | "_" }
}
```

### 2.2 Create Highlighting Rules
In `src/index.ts`:

```typescript
import {parser} from "./syntax.grammar"
import {LRLanguage, LanguageSupport, syntaxHighlighting} from "@codemirror/language"
import {styleTags, tags as t} from "@lezer/highlight"

export const macaulay2Language = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Keyword: t.keyword,
        Function: t.function(t.variableName),
        Type: t.typeName,
        Constant: t.constant(t.variableName),
        String: t.string,
        Number: t.number,
        LineComment: t.lineComment,
        BlockComment: t.blockComment,
        Identifier: t.variableName,
        Operator: t.operator,
        "( )": t.paren,
        "{ }": t.brace,
        "[ ]": t.squareBracket
      })
    ]
  }),
  languageData: {
    commentTokens: {line: "--", block: {open: "-*", close: "*-"}},
    closeBrackets: {brackets: ["(", "[", "{", '"']},
  }
})

export function macaulay2() {
  return new LanguageSupport(macaulay2Language)
}
```

## Phase 3: Test and Build

### 3.1 Create Test Cases
In `test/cases.txt`:
```
# Comments
-- This is a line comment
==> LineComment

-* This is a
   block comment *-
==> BlockComment

# Keywords
if x > 0 then print "positive"
==> Keyword Identifier Operator Number Keyword Function String

# Types and Functions
R = QQ[x,y,z]
I = ideal(x^2, y^2)
gb I
==> Identifier Operator Type ... Function
```

### 3.2 Build and Test
```bash
npm run prepare  # Build the parser
npm test        # Run tests
```

## Phase 4: Create JupyterLab Extension

### 4.1 Create Extension Structure
```bash
cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts
# Name: jupyterlab-macaulay2-syntax
```

### 4.2 Add Language Registration
In `src/index.ts`:

```typescript
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { macaulay2 } from 'codemirror-lang-macaulay2';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-macaulay2-syntax:plugin',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    registry.addLanguage({
      name: 'macaulay2',
      mime: 'text/x-macaulay2',
      extensions: ['m2'],
      support: macaulay2()
    });
  }
};

export default plugin;
```

## Phase 5: Integration and Publishing

### 5.1 Publish Language Package
```bash
cd codemirror-lang-macaulay2
npm publish
```

### 5.2 Build and Install Extension
```bash
cd jupyterlab-macaulay2-syntax
pip install -e .
jupyter labextension develop . --overwrite
```

## Phase 6: Update Kernel Configuration

Update the kernel.json to ensure it uses the correct mime type:
```json
{
  "language_info": {
    "name": "macaulay2",
    "mimetype": "text/x-macaulay2",
    "file_extension": ".m2",
    "codemirror_mode": "macaulay2"
  }
}
```

## Estimated Timeline
- Phase 1-2: 2-3 days (grammar conversion)
- Phase 3: 1 day (testing)
- Phase 4-5: 2-3 days (extension creation)
- Phase 6: 1 day (integration)

Total: ~1 week of focused development

## Alternative: Minimal Working Solution
If full implementation is too complex, consider:
1. Using an existing similar language (Haskell/ML style)
2. Creating a simplified grammar with just keywords/comments
3. Contributing to an existing math-focused language extension

## Resources
- [CodeMirror Language Example](https://github.com/codemirror/lang-example)
- [Lezer System Guide](https://lezer.codemirror.net/docs/guide/)
- [JupyterLab Extension Tutorial](https://jupyterlab.readthedocs.io/en/stable/extension/extension_tutorial.html)
- [Macaulay2Web Prism Grammar](https://github.com/pzinn/Macaulay2Web/blob/master/src/client/js/prism-M2.js)