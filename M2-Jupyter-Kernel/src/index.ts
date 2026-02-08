import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('M2 CodeMirror extension activating...');

    registry.addLanguage({
      name: 'macaulay2',
      displayName: 'Macaulay2',
      mime: ['text/x-macaulay2', 'text/macaulay2'],
      extensions: ['.m2'],
      support: m2()
    });

    // Override JupyterLab's CSS variables for M2 editors.
    // m2Language.ts adds data-language="macaulay2" to .cm-editor via EditorView.editorAttributes.
    // JupyterLab's jupyterHighlightStyle maps tags to CSS variables (e.g. --jp-mirror-editor-keyword-color).
    // We override those variables scoped to M2 editors so the correct M2 colors are used.
    const style = document.createElement('style');
    style.textContent = `
      .cm-editor[data-language="macaulay2"] {
        --jp-mirror-editor-keyword-color: #0000ff;
        --jp-mirror-editor-atom-color: #ff1493;
        --jp-mirror-editor-number-color: #ff8c00;
        --jp-mirror-editor-comment-color: #808080;
        --jp-mirror-editor-string-color: #008000;
        --jp-mirror-editor-operator-color: #000080;
      }
    `;
    document.head.appendChild(style);

    console.log('M2 language registered with CSS variable overrides');
  }
};

export default plugin;
