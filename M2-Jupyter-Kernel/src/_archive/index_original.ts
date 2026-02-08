import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

// Import CSS for syntax highlighting
import '../style/index.css';

/**
 * Initialization data for the @m2-jupyter/jupyterlab-m2-codemirror extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('=== M2 CodeMirror Extension Activating ===');
    console.log('JupyterLab version:', app.version);
    
    try {
      // Log existing languages
      console.log('Checking for existing macaulay2 language...');
      try {
        const existing = registry.findBest('macaulay2');
        console.log('Found existing:', existing);
      } catch (e) {
        console.log('No existing macaulay2 language found');
      }
      
      // Register the M2 language with multiple approaches
      console.log('Registering M2 language...');
      
      const langSpec = {
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: ['text/x-macaulay2', 'text/macaulay2'],
        extensions: ['.m2'],
        filename: /\.m2$/i,
        support: m2()
      };
      
      registry.addLanguage(langSpec);
      console.log('M2 language registered with spec:', langSpec);
      
      // Verify registration
      const check = registry.findBest('macaulay2');
      console.log('Verification - language found:', check);
      
      // Add debug helper
      (window as any).debugM2Highlighting = () => {
        console.log('=== M2 Highlighting Debug ===');
        const editors = document.querySelectorAll('.cm-content');
        editors.forEach((ed, i) => {
          console.log(`Editor ${i}: data-language="${ed.getAttribute('data-language')}"`);
        });
        console.log('Registry:', registry);
      };
      console.log('Debug function available: window.debugM2Highlighting()');
      
    } catch (error) {
      console.error('Failed to register M2 language:', error);
      console.error('Stack:', (error as any).stack);
    }
  }
};

export default plugin;