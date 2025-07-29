// Check DOM structure in JupyterLab
function checkDOM() {
    console.log("=== DOM Structure Check ===");
    
    // Find CodeMirror editors
    const editors = document.querySelectorAll('.cm-editor');
    console.log(`Found ${editors.length} CodeMirror editors`);
    
    // Check parent structure
    if (editors.length > 0) {
        const editor = editors[0];
        let parent = editor;
        const parents = [];
        for (let i = 0; i < 5 && parent; i++) {
            parent = parent.parentElement;
            if (parent) {
                parents.push({
                    tag: parent.tagName,
                    classes: Array.from(parent.classList),
                    id: parent.id || 'none'
                });
            }
        }
        console.log('Parent structure:', parents);
    }
    
    // Check for jp-CodeMirrorEditor
    const jpEditors = document.querySelectorAll('.jp-CodeMirrorEditor');
    console.log(`Found ${jpEditors.length} elements with .jp-CodeMirrorEditor`);
    
    // Check for CodeMirror 6 structure
    const cm6 = document.querySelectorAll('.cm-editor .cm-content');
    console.log(`Found ${cm6.length} CodeMirror 6 content areas`);
    
    // Look for any keyword spans
    const allSpans = Array.from(document.querySelectorAll('.cm-content span'));
    const keywordLike = allSpans.filter(span => {
        const text = span.textContent.trim();
        return ['if', 'then', 'else', 'return', 'true', 'false'].includes(text);
    });
    
    console.log(`Found ${keywordLike.length} potential keyword spans:`);
    keywordLike.forEach(span => {
        console.log(`  "${span.textContent}": classes = [${Array.from(span.classList).join(', ')}]`);
    });
    
    return {
        editors: editors.length,
        jpEditors: jpEditors.length,
        cm6Content: cm6.length,
        keywordSpans: keywordLike.length
    };
}

checkDOM();