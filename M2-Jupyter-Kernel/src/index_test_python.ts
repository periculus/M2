import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { python } from '@codemirror/lang-python';

// Import CSS for syntax highlighting
import '../style/index.css';

/**
 * Test plugin that registers Python highlighting for Macaulay2 kernel
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Test: Python highlighting for Macaulay2',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('TEST: Registering Python highlighting for Macaulay2...');
    
    try {
      // Register Python highlighting for macaulay2 language
      registry.addLanguage({
        name: 'macaulay2',
        displayName: 'Macaulay2 (Python Test)',
        mime: 'text/x-macaulay2',
        extensions: ['.m2'],
        support: python()
      });
      
      console.log('TEST: Python highlighting registered for macaulay2');
    } catch (error) {
      console.error('TEST: Failed to register language:', error);
    }
  }
};

export default plugin;