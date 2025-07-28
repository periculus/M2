import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

/**
 * Initialization data for the @m2-jupyter/jupyterlab-m2-codemirror extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('JupyterLab M2 CodeMirror extension activated!');
    
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

export default plugin;