# CodeMirror 6 + JupyterLab 4: Lessons Learned

## Key Discoveries from Research

### 1. Professional Language Implementation Pattern

After studying CodeMirror's Python and JavaScript implementations, the correct pattern is:

```javascript
// In grammar file (m2.grammar)
@external propSource m2Highlighting from "./highlight.js"

// In highlight.js
import {styleTags, tags as t} from "@lezer/highlight"
export const m2Highlighting = styleTags({
  "if then else": t.controlKeyword,
  "Type": t.typeName,
  // etc...
})
```

**NOT** inline styleTags in the language definition.

### 2. CSS Import is Critical

The CSS file MUST be imported in the extension entry point:
```typescript
// In src/index.ts
import '../style/index.css';
```

Without this, no styles will be loaded regardless of how correct they are.

### 3. JupyterLab Uses CSS Variables

JupyterLab doesn't use hardcoded colors. It uses CSS variables for theming:
- `var(--jp-mirror-editor-keyword-color)` for keywords
- `var(--jp-mirror-editor-def-color)` for types/definitions
- `var(--jp-mirror-editor-builtin-color)` for built-in functions
- etc.

This allows themes to control colors consistently.

### 4. Parser Node Structure

Our `@specialize` approach creates nested nodes:
- Parent: `Keyword` (id=2)
- Child: `Keyword` (id=3) with actual text

The styleTags must handle both levels:
```javascript
"Keyword/Keyword": t.keyword,
"Keyword": t.keyword,
```

### 5. JupyterLab 4 Architecture

- Uses CodeMirror 6 (not 5)
- Language registration via `IEditorLanguageRegistry`
- Extensions are federated modules
- Default webpack configuration handles CSS via package.json `"style"` field

## What Didn't Work

1. **Inline styleTags** - This approach is deprecated
2. **Direct color CSS** - Must use JupyterLab CSS variables
3. **Complex ViewPlugins** - Unnecessary for basic highlighting
4. **Manual theme creation** - JupyterLab provides the theme

## Final Working Architecture

1. **Grammar** → Defines syntax with `@external propSource`
2. **Highlight** → Maps tokens to semantic tags
3. **Language** → Simple wrapper around parser
4. **Extension** → Registers language with JupyterLab
5. **CSS** → Uses JupyterLab variables for consistent theming

## Testing Checklist

- [ ] Parser generates correct nodes (`node test_parser_minimal.js`)
- [ ] Extension loads without errors (check console)
- [ ] CSS is imported and loaded (check Network tab)
- [ ] Token classes appear in DOM (inspect elements)
- [ ] Colors match JupyterLab theme