# CodeMirror M2 Language Package

This package provides Macaulay2 language support for CodeMirror 6.

## Features

- Syntax highlighting for M2 code
- Auto-indentation
- Code folding
- Bracket matching
- Basic autocomplete for keywords, types, functions, and constants

## Installation

```bash
npm install @codemirror/lang-m2
```

## Usage

```javascript
import { EditorView, basicSetup } from "@codemirror/basic-setup";
import { m2 } from "@codemirror/lang-m2";

const editor = new EditorView({
  extensions: [basicSetup, m2()],
  parent: document.body
});
```

## Development

To build the package:

```bash
npm install
npm run build
```

To run tests:

```bash
npm test
```

## License

MIT