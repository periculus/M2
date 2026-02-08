import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { m2 } from './m2Language';

/**
 * M2 syntax highlighting extension for JupyterLab
 * This version works like Python - using the parser's built-in highlighting
 * but overrides the theme colors to match M2 expectations
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, registry: IEditorLanguageRegistry) => {
    console.log('M2 CodeMirror extension activating...');
    
    // Register M2 language support
    const spec = {
      name: 'macaulay2',
      displayName: 'Macaulay2',
      mime: ['text/x-macaulay2', 'text/macaulay2'],
      extensions: ['.m2'],
      support: m2()
    };
    
    registry.addLanguage(spec);
    console.log('M2 language registered successfully');
    
    // Override JupyterLab theme colors to match M2 expectations
    // This is the key difference - Python users expect green keywords,
    // but M2 users expect blue keywords
    const style = document.createElement('style');
    style.textContent = `
      /* Override JupyterLab theme colors for M2 */
      .cm-editor[data-language="macaulay2"] .cm-keyword,
      .cm-editor[data-language="macaulay2"] .cm-controlKeyword,
      .cm-editor[data-language="macaulay2"] .cm-operatorKeyword {
        color: #0000ff !important;
        font-weight: bold !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-typeName {
        color: #008080 !important;
        font-weight: 500 !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-function {
        color: #800080 !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-bool,
      .cm-editor[data-language="macaulay2"] .cm-null,
      .cm-editor[data-language="macaulay2"] .cm-constant {
        color: #ff1493 !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-number {
        color: #ff8c00 !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-string,
      .cm-editor[data-language="macaulay2"] .cm-docString {
        color: #008000 !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-lineComment,
      .cm-editor[data-language="macaulay2"] .cm-blockComment {
        color: #808080 !important;
        font-style: italic !important;
      }
      .cm-editor[data-language="macaulay2"] .cm-operator {
        color: #000080 !important;
      }
    `;
    document.head.appendChild(style);

    console.log('M2 color overrides applied');
  }
};

export default plugin;