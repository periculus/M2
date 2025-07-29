/**
 * DOM Inspector for CodeMirror 6 in JupyterLab
 * This script can be injected into the page to debug highlighting
 */

window.M2DebugHighlighting = {
  // Track all CodeMirror instances
  editors: new WeakMap(),
  
  // Initialize debugging
  init() {
    console.log('🔍 M2 Syntax Highlighting Debugger Initialized');
    
    // Monitor for new editors
    this.observeEditors();
    
    // Add debugging commands
    this.addDebugCommands();
    
    // Track style changes
    this.trackStyleChanges();
  },
  
  // Find all CodeMirror editors on the page
  findEditors() {
    const editors = [];
    document.querySelectorAll('.cm-editor').forEach(element => {
      const view = element.cmView;
      if (view) {
        editors.push({
          element,
          view,
          state: view.state,
          language: view.state.facet(view.state.facet.language)
        });
      }
    });
    return editors;
  },
  
  // Observe DOM for new editors
  observeEditors() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.querySelector('.cm-editor')) {
            console.log('📝 New CodeMirror editor detected');
            setTimeout(() => this.analyzeEditor(node.querySelector('.cm-editor')), 100);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  },
  
  // Analyze a specific editor
  analyzeEditor(editorElement) {
    const view = editorElement.cmView;
    if (!view) {
      console.warn('❌ No CodeMirror view found on element');
      return;
    }
    
    console.log('📊 Analyzing editor:', {
      language: this.getLanguageName(view),
      content: view.state.doc.toString(),
      facets: this.getFacets(view)
    });
    
    // Analyze syntax tree
    this.analyzeSyntaxTree(view);
    
    // Check highlighting
    this.checkHighlighting(editorElement);
  },
  
  // Get language name from view
  getLanguageName(view) {
    try {
      const language = view.state.facet(view.state.facet.language);
      return language?.name || 'unknown';
    } catch (e) {
      return 'error: ' + e.message;
    }
  },
  
  // Get all facets from view
  getFacets(view) {
    const facets = {};
    try {
      // Common facets to check
      const facetNames = ['language', 'theme', 'styleModule'];
      facetNames.forEach(name => {
        if (view.state.facet[name]) {
          facets[name] = view.state.facet(view.state.facet[name]);
        }
      });
    } catch (e) {
      facets.error = e.message;
    }
    return facets;
  },
  
  // Analyze syntax tree
  analyzeSyntaxTree(view) {
    console.log('🌳 Syntax Tree Analysis:');
    
    const tree = view.state.tree;
    if (!tree) {
      console.warn('❌ No syntax tree found');
      return;
    }
    
    const tokens = [];
    const code = view.state.doc.toString();
    
    tree.iterate({
      enter(node) {
        const text = code.slice(node.from, node.to);
        if (text.trim()) {
          tokens.push({
            type: node.name,
            text: text,
            from: node.from,
            to: node.to
          });
        }
      }
    });
    
    // Group by type
    const grouped = {};
    tokens.forEach(token => {
      if (!grouped[token.type]) grouped[token.type] = [];
      grouped[token.type].push(token.text);
    });
    
    console.table(grouped);
    return tokens;
  },
  
  // Check what highlighting is applied
  checkHighlighting(editorElement) {
    console.log('🎨 Highlighting Analysis:');
    
    const highlights = [];
    const spans = editorElement.querySelectorAll('.cm-line span[class*="cm-"]');
    
    spans.forEach(span => {
      const classes = Array.from(span.classList).filter(c => c.startsWith('cm-'));
      const styles = window.getComputedStyle(span);
      
      highlights.push({
        text: span.textContent,
        classes: classes.join(' '),
        color: styles.color,
        background: styles.backgroundColor,
        font: `${styles.fontWeight} ${styles.fontStyle}`
      });
    });
    
    console.table(highlights);
    
    // Check for missing highlights
    const problems = highlights.filter(h => 
      h.classes === 'cm-line' || 
      h.color === 'rgb(0, 0, 0)' || 
      h.color === 'inherit'
    );
    
    if (problems.length > 0) {
      console.warn('⚠️ Potential highlighting issues:', problems);
    }
    
    return highlights;
  },
  
  // Track style changes
  trackStyleChanges() {
    const styleObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          console.log('🎨 Style changed on:', mutation.target);
        }
      });
    });
    
    // Observe style changes on CodeMirror elements
    document.querySelectorAll('.cm-editor').forEach(el => {
      styleObserver.observe(el, { 
        attributes: true, 
        attributeFilter: ['style', 'class'],
        subtree: true 
      });
    });
  },
  
  // Debug commands
  addDebugCommands() {
    // Command: Analyze all editors
    window.debugM2 = () => {
      console.log('🔍 Debugging M2 Syntax Highlighting...');
      
      const editors = this.findEditors();
      console.log(`Found ${editors.length} editor(s)`);
      
      editors.forEach((editor, i) => {
        console.log(`\n📝 Editor ${i + 1}:`);
        this.analyzeEditor(editor.element);
      });
    };
    
    // Command: Check CSS
    window.debugM2CSS = () => {
      console.log('🎨 Checking CSS...');
      
      // Find all stylesheets
      const stylesheets = Array.from(document.styleSheets);
      const m2Styles = [];
      
      stylesheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule.selectorText && rule.selectorText.includes('cm-')) {
              m2Styles.push({
                selector: rule.selectorText,
                styles: rule.style.cssText
              });
            }
          });
        } catch (e) {
          // Cross-origin stylesheets
        }
      });
      
      console.table(m2Styles);
      
      // Check specific classes
      const testClasses = ['.cm-keyword', '.cm-typeName', '.cm-function'];
      testClasses.forEach(cls => {
        const element = document.querySelector(cls);
        if (element) {
          const styles = window.getComputedStyle(element);
          console.log(`${cls}:`, {
            color: styles.color,
            fontWeight: styles.fontWeight
          });
        } else {
          console.warn(`${cls}: No elements found`);
        }
      });
    };
    
    // Command: Force refresh
    window.debugM2Refresh = () => {
      console.log('🔄 Forcing editor refresh...');
      const editors = this.findEditors();
      editors.forEach(editor => {
        editor.view.dispatch({});
      });
    };
    
    console.log('💡 Debug commands available:');
    console.log('  - debugM2(): Analyze all editors');
    console.log('  - debugM2CSS(): Check CSS rules');
    console.log('  - debugM2Refresh(): Force refresh editors');
  }
};

// Auto-initialize when loaded
M2DebugHighlighting.init();