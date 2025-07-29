import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from '@codemirror/lang-m2';
// Load compiled CSS for M2 syntax highlighting
import '../style/index.js';

/**
 * The M2 language extension for JupyterLab
 */
const m2Plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-m2:plugin',
  description: 'Macaulay2 language support for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('JupyterLab M2 extension is activated!');
    
    // Register the M2 language with CodeMirror
    registry.addLanguage({
      name: 'macaulay2',
      mime: 'text/x-macaulay2',
      extensions: ['.m2'],
      support: m2()
    });
    
    // Also register common aliases
    registry.addLanguage({
      name: 'm2',
      mime: 'text/x-m2',
      extensions: ['.m2'],
      support: m2()
    });
    
    console.log('M2 language registered with CodeMirror');
  }
};

export default m2Plugin;