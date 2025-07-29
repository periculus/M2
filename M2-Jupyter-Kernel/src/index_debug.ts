import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

// Import CSS for syntax highlighting
import '../style/index.css';

/**
 * Debug version with extensive logging
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab (DEBUG)',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('=== M2 CodeMirror DEBUG ===');
    console.log('Registry:', registry);
    
    // Check what languages are already registered
    console.log('Checking existing languages...');
    try {
      // Try to find existing macaulay2 registration
      const existing = registry.findBest('macaulay2');
      console.log('Existing macaulay2 registration:', existing);
    } catch (e) {
      console.log('No existing macaulay2 registration');
    }
    
    try {
      // Try multiple registration approaches
      console.log('Registering M2 language...');
      
      // Method 1: Register with exact kernel name
      registry.addLanguage({
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: ['text/x-macaulay2'],
        extensions: ['.m2'],
        filename: /\.m2$/i,
        support: m2()
      });
      
      console.log('M2 language registered successfully');
      
      // Check if it was registered
      const check = registry.findBest('macaulay2');
      console.log('Verification - found language:', check);
      
      // Also try to register for the mime type
      registry.addLanguage({
        name: 'text/x-macaulay2',
        displayName: 'Macaulay2 (MIME)',
        mime: ['text/x-macaulay2'],
        support: m2()
      });
      
      // Log all registered languages
      console.log('All languages:', registry);
      
    } catch (error) {
      console.error('Failed to register M2 language:', error);
      console.error('Error details:', (error as any).stack);
    }
    
    // Add a global function for debugging
    (window as any).debugM2Language = () => {
      console.log('=== M2 Language Debug Info ===');
      console.log('Registry:', registry);
      
      // Check CodeMirror instances
      const editors = document.querySelectorAll('.cm-editor');
      editors.forEach((editor, i) => {
        console.log(`Editor ${i}:`, editor);
        const content = editor.querySelector('.cm-content');
        if (content) {
          console.log('  data-language:', content.getAttribute('data-language'));
        }
      });
    };
    
    console.log('Debug function available: window.debugM2Language()');
  }
};

export default plugin;