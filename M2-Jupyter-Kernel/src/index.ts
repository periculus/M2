import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

// Import CSS for syntax highlighting  
import '../style/index.css';

/**
 * M2 syntax highlighting extension for JupyterLab
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('M2 CodeMirror extension activating...');
    
    try {
      // Register M2 language support
      const spec = {
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: ['text/x-macaulay2', 'text/macaulay2'],
        extensions: ['.m2'],
        support: m2()
      };
      
      registry.addLanguage(spec);
      console.log('M2 language registered successfully with fixed parser');
      
      // Verify registration
      const check = registry.findBest('macaulay2');
      if (check) {
        console.log('Verified: M2 language is registered');
      }
      
    } catch (error) {
      console.error('Failed to register M2 language:', error);
    }
  }
};

export default plugin;