import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
// import { LanguageSupport } from '@codemirror/language';
import { python } from '@codemirror/lang-python';

// Import CSS for syntax highlighting  
import '../style/index.css';

/**
 * Test: Use Python highlighting for Macaulay2 to verify the mechanism works
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Test Python highlighting for Macaulay2',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('=== PYTHON TEST FOR M2 ===');
    
    try {
      // First, log what we're doing
      console.log('Attempting to override macaulay2 with Python highlighting...');
      
      // Register Python highlighting for macaulay2
      const spec = {
        name: 'macaulay2',
        displayName: 'Macaulay2 (Python Test)',
        mime: ['text/x-macaulay2', 'text/macaulay2', 'application/x-macaulay2'],
        extensions: ['.m2'],
        support: python()
      };
      
      registry.addLanguage(spec);
      console.log('Python highlighting registered for macaulay2');
      
      // Also try to override by mime type
      registry.addLanguage({
        name: 'text/x-macaulay2', 
        mime: ['text/x-macaulay2'],
        support: python()
      });
      
      console.log('Also registered for mime type text/x-macaulay2');
      
      // Verify
      const check = registry.findBest('macaulay2');
      console.log('Verification:', check);
      
      // Add helper to check in console
      (window as any).testPythonHighlight = () => {
        console.log('Testing Python highlight...');
        // Force refresh of editors
        document.querySelectorAll('.cm-content').forEach((el: any) => {
          console.log('Editor language:', el.getAttribute('data-language'));
          // Try to force Python
          el.setAttribute('data-language', 'python');
        });
      };
      
      console.log('Test function available: window.testPythonHighlight()');
      
    } catch (error) {
      console.error('Python test failed:', error);
    }
  }
};

export default plugin;