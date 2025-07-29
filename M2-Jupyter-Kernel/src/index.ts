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
    console.log('M2 CodeMirror extension is being activated...');
    
    try {
      // Register the M2 language
      registry.addLanguage({
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: 'text/x-macaulay2',
        extensions: ['.m2'],
        support: m2()
      });
      
      console.log('M2 language registered successfully');
    } catch (error) {
      console.error('Failed to register M2 language:', error);
    }
  }
};

export default plugin;