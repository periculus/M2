# M2 Syntax Highlighting Architecture
Last verified: 2026-02-10 | M2 1.25.06 | JupyterLab 4.4.5 | Node 25.1.0 | Lezer 1.4.x
Source of truth for: CSS cascade solution, color mapping, tag architecture

## The Problem: JupyterLab Theme Wins

JupyterLab ships `jupyterHighlightStyle` which maps Lezer tags to CSS variables:
- `t.keyword` → `--jp-mirror-editor-keyword-color` (green by default!)
- `t.number` → `--jp-mirror-editor-number-color`
- `t.string` → `--jp-mirror-editor-string-color`
- etc.

A custom `HighlightStyle` in the extension LOSES to JupyterLab's theme due to CSS cascade order. This means even if you define `t.keyword → blue`, JupyterLab's green wins.

## The Two-Layer Solution

### Layer 1: CSS Variable Overrides (`src/index.ts`)

Override JupyterLab's CSS variables scoped to M2 editors:
```typescript
// index.ts adds a <style> tag:
.cm-editor[data-language="macaulay2"] {
  --jp-mirror-editor-keyword-color: #0000ff;
  --jp-mirror-editor-atom-color: #ff1493;
  --jp-mirror-editor-number-color: #ff8c00;
  --jp-mirror-editor-comment-color: #808080;
  --jp-mirror-editor-string-color: #008000;
  --jp-mirror-editor-operator-color: #000080;
}
```

The `data-language="macaulay2"` attribute is set by `m2Language.ts` via `EditorView.editorAttributes`.

### Layer 2: Custom HighlightStyle (`src/m2Language.ts`)

For tags that JupyterLab's theme does NOT handle (no CSS variable):
```typescript
const m2ExtraHighlights = HighlightStyle.define([
  { tag: t.typeName,                 color: "#008080", fontWeight: "500" },
  { tag: t.function(t.variableName), color: "#800080" },
  { tag: t.constant(t.variableName), color: "#ff1493" },
  { tag: t.docString,               color: "#008000", fontStyle: "italic" },
]);
```

These win because JupyterLab has no competing rule for these tags.

## Complete Color Map

| Token | Lezer Tag | Color | Hex | Set In |
|-------|-----------|-------|-----|--------|
| Keywords (`if`, `for`, `while`) | `t.controlKeyword` | Blue | #0000ff | CSS var override |
| Operator keywords (`and`, `or`, `not`) | `t.operatorKeyword` | Blue | #0000ff | CSS var override |
| Types (`ZZ`, `Ring`, `Ideal`) | `t.typeName` | Teal | #008080 | HighlightStyle |
| Builtins (`gb`, `ideal`, `res`) | `t.function(t.variableName)` | Purple | #800080 | HighlightStyle |
| Constants (`infinity`, `pi`) | `t.constant(t.variableName)` | Deep pink | #ff1493 | HighlightStyle |
| Booleans (`true`, `false`) | `t.atom` | Deep pink | #ff1493 | CSS var override |
| Null (`null`) | `t.atom` | Deep pink | #ff1493 | CSS var override |
| Numbers (`42`, `3.14`) | `t.number` | Dark orange | #ff8c00 | CSS var override |
| Strings (`"hello"`) | `t.string` | Green | #008000 | CSS var override |
| Doc strings (`/// ... ///`) | `t.docString` | Green italic | #008000 | HighlightStyle |
| Comments (`--`, `-* *-`) | `t.lineComment`/`t.blockComment` | Gray | #808080 | CSS var override |
| Operators (`+`, `*`, `_`) | (not tagged) | Navy | #000080 | CSS var override |
| Identifiers | `t.variableName` | Black | #000000 | Default |

## Known Issue: `t.bool` → `t.atom`

JupyterLab maps `t.bool` to `--jp-mirror-editor-keyword-color` (blue). We want booleans pink, not blue. Solution: map `Boolean` → `t.atom` in `highlight.js`. JupyterLab maps `t.atom` to `--jp-mirror-editor-atom-color` which we override to pink.

## Tag Mapping (`codemirror-lang-m2/src/highlight.js`)

```javascript
// Control flow and scope keywords → t.controlKeyword
"if then else when do while for from to by in try catch new of"
"return break continue throw"
"load needs use export symbol global local threadLocal"
"time elapsedTime shield debug"

// Logical operators → t.operatorKeyword
"and or not xor"

// Token types → lezer tags
Type → t.typeName
Builtin → t.function(t.variableName)
Constant → t.constant(t.variableName)
Boolean → t.atom          // NOT t.bool (see known issue above)
Null → t.atom
Identifier → t.variableName
Number → t.number
String → t.string
TripleString → t.docString
LineComment → t.lineComment
BlockComment → t.blockComment
"( )" → t.paren
"[ ]" → t.squareBracket
"{ }" → t.brace
";" → t.separator
```

## How to Change a Color

1. Identify the tag from the table above
2. If "Set In" is **CSS var override**: edit `src/index.ts`, change the hex value
3. If "Set In" is **HighlightStyle**: edit `src/m2Language.ts`, change the color in `m2ExtraHighlights`
4. Rebuild: `npx tsc --sourceMap && jupyter labextension build --development True .`
5. Deploy and restart JupyterLab

## How to Add a New Token Type

1. **Grammar**: Add the new node type to `m2.grammar` (e.g., `Decorator { ... }`)
2. **Highlight mapping**: Add to `codemirror-lang-m2/src/highlight.js`: `Decorator: t.meta`
3. **Decide layer**: Does JupyterLab have a CSS variable for this tag?
   - Yes → override the CSS variable in `index.ts`
   - No → add a rule to `m2ExtraHighlights` in `m2Language.ts`
4. **CSS**: If the tooltip or editor needs styling, add to `style/index.css`
5. Rebuild grammar, copy files, build extension, deploy

## Files Involved

| File | Role |
|------|------|
| `codemirror-lang-m2/src/highlight.js` | Grammar node → Lezer tag mapping |
| `src/index.ts` | CSS variable overrides (Layer 1) |
| `src/m2Language.ts` | Custom HighlightStyle (Layer 2) |
| `style/index.css` | Tooltip CSS + legacy `.cm-*` class overrides |

## Smoke Test Checklist

After any color or highlighting change, visually verify in JupyterLab:
- [ ] `if`/`for`/`while` → blue (#0000ff)
- [ ] `ZZ`/`Ring`/`Ideal` → teal (#008080)
- [ ] `gb`/`ideal`/`res` → purple (#800080)
- [ ] `infinity`/`pi` → pink (#ff1493)
- [ ] `true`/`false` → pink (#ff1493)
- [ ] `42`/`3.14` → orange (#ff8c00)
- [ ] `"hello"` → green (#008000)
- [ ] `-- comment` → gray (#808080)
