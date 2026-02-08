// M2 CodeMirror extension with hardened styling for JupyterLab
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  IEditorLanguageRegistry
} from '@jupyterlab/codemirror';

import { m2 } from './m2Language_hardened';

/**
 * M2 syntax highlighting extension with hardened inline styles
 * This version uses direct color values instead of CSS variables
 * to prevent theme interference
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@m2-jupyter/jupyterlab-m2-codemirror:plugin',
  description: 'Macaulay2 syntax highlighting with hardened styling for JupyterLab',
  autoStart: true,
  requires: [IEditorLanguageRegistry],
  activate: (
    app: JupyterFrontEnd,
    registry: IEditorLanguageRegistry
  ) => {
    console.log('M2 CodeMirror extension (hardened) activating...');
    
    try {
      // Register M2 language with multiple MIME types
      const m2Spec = {
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: [
          'text/x-macaulay2',
          'text/macaulay2',
          'application/x-macaulay2'
        ],
        extensions: ['.m2', '.M2'],
        // Use the hardened language support
        support: m2()
      };
      
      registry.addLanguage(m2Spec);
      console.log('M2 language registered with hardened styling');
      
      // Verify registration
      const check = registry.findBest('macaulay2');
      if (check) {
        console.log('✓ M2 language verified');
        console.log('✓ Using hardened inline styles (theme-independent)');
      }
      
      // Log color scheme for debugging
      console.log('M2 Color Scheme:');
      console.log('  Keywords: #0000ff (blue)');
      console.log('  Types: #008080 (teal)');
      console.log('  Functions: #800080 (purple)');
      console.log('  Strings: #008000 (green)');
      console.log('  Numbers: #ff8c00 (orange)');
      console.log('  Comments: #808080 (gray)');
      
    } catch (error) {
      console.error('Failed to register M2 language:', error);
    }
  }
};

export default plugin;