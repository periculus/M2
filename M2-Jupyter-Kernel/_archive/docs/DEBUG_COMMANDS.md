# Debug Commands for Browser Console

Open the browser developer console (F12) and try these commands:

## 1. Check if the extension module is loaded
```javascript
// Look for our extension in loaded modules
Object.keys(window).filter(k => k.includes('m2') || k.includes('macaulay'))
```

## 2. Check CodeMirror state in a cell
```javascript
// First, click on a code cell, then run:
const cell = document.querySelector('.jp-CodeCell.jp-mod-selected');
if (cell) {
    const cm = cell.querySelector('.cm-editor');
    console.log('CodeMirror element:', cm);
    
    // Check for syntax classes
    const keywords = cell.querySelectorAll('.cm-keyword');
    console.log('Keywords found:', keywords.length);
    
    const types = cell.querySelectorAll('.cm-typeName');
    console.log('Types found:', types.length);
}
```

## 3. Check the cell's language
```javascript
// Click on a cell with M2 code, then:
const notebook = document.querySelector('.jp-Notebook');
const activeCell = notebook?.querySelector('.jp-Cell.jp-mod-selected');
if (activeCell) {
    console.log('Cell element:', activeCell);
    console.log('Cell attributes:', activeCell.attributes);
}
```

## 4. Manually check if styles are applied
```javascript
// Look for our custom styles
const styles = Array.from(document.styleSheets);
styles.forEach(sheet => {
    try {
        const rules = Array.from(sheet.cssRules || []);
        const m2Rules = rules.filter(rule => 
            rule.cssText && rule.cssText.includes('cm-keyword')
        );
        if (m2Rules.length > 0) {
            console.log('Found M2 styles:', m2Rules);
        }
    } catch (e) {}
});
```

## 5. Force refresh the editor
After typing some M2 code in a cell, try:
1. Press Escape to exit edit mode
2. Press Enter to re-enter edit mode
3. Check if highlighting appears

## 6. Check webpack modules (advanced)
```javascript
// If webpack expose is available
if (window.__webpack_require__) {
    console.log('Webpack modules available');
    // Try to find our module
    const moduleIds = Object.keys(__webpack_require__.m);
    const m2Modules = moduleIds.filter(id => {
        const mod = __webpack_require__.m[id];
        return mod && mod.toString().includes('macaulay2');
    });
    console.log('M2 related modules:', m2Modules);
}
```