# Why Python Syntax Highlighting Works but M2 Doesn't

## The Key Discovery

Python and M2 both use the same approach:
1. Parser includes `propSources` with style tags
2. Style tags map node names to highlight tags
3. JupyterLab theme applies CSS to those tags

**BUT** - JupyterLab's theme defines:
- `--jp-mirror-editor-keyword-color: #008000` (GREEN)

## Why We See Green

Both Python AND M2 keywords are green! Test it:
1. Create a Python cell
2. Type `if`, `for`, `while`
3. They're GREEN too!

The difference is that Python users expect green keywords (it's traditional for Python), but M2 users expect blue.

## The Real Solution

We have three options:

### Option 1: Override Theme Variables (Best)
```javascript
// In extension activation
document.documentElement.style.setProperty('--jp-mirror-editor-keyword-color', '#0000ff');
```

### Option 2: CSS Override (Current Workaround)
```css
.cm-keyword { color: #0000ff !important; }
```

### Option 3: Custom Theme
Create an M2-specific JupyterLab theme that sets the correct colors.

## Why HighlightStyle Doesn't Work

When we add `HighlightStyle.define()`, we're trying to override the theme system. But:
1. JupyterLab themes load after extensions
2. Theme CSS has `!important` flags
3. CSS cascade rules mean theme wins

## The Correct Implementation

```typescript
// Don't use HighlightStyle
export function m2() {
  return new LanguageSupport(M2Language);
  // Let the parser's propSources handle highlighting
}
```

Then either:
1. Accept green keywords (like Python)
2. Override the CSS variable
3. Inject override CSS

Python "works" because Python users are OK with green keywords. M2 doesn't "work" because M2 users expect blue keywords, but both are actually using the same (correct) implementation!