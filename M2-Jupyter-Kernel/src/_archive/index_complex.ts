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
    console.log('⚡️ M2 plugin activating at', new Date().toISOString());
    console.log('JupyterLab M2 CodeMirror extension activated!');
    
    try {
      // Create language support
      const languageSupport = m2();
      console.log('Created language support:', languageSupport);
      
      // Log the structure of the support object
      console.log('Language support structure:', {
        'has language': !!languageSupport.language,
        'has support': !!languageSupport.support,
        'language name': languageSupport.language?.name
      });
      
      // Register the M2 language with CodeMirror
      const spec = {
        name: 'macaulay2',
        displayName: 'Macaulay2',
        mime: 'text/x-macaulay2',
        extensions: ['.m2'],
        support: languageSupport
      };
      
      console.log('About to register language with spec:', spec);
      registry.addLanguage(spec);
      console.log('Language registered successfully');
      
      // Also register for common variations
      const variations = [
        { name: 'm2', mime: 'text/x-m2' },
        { name: 'Macaulay2', mime: 'text/x-macaulay2' },
        { name: 'M2', mime: 'text/x-m2' }
      ];
      
      for (const variant of variations) {
        registry.addLanguage({
          name: variant.name,
          displayName: 'Macaulay2',
          mime: variant.mime,
          extensions: ['.m2'],
          support: languageSupport
        });
        console.log(`Registered variant: ${variant.name} with mime ${variant.mime}`);
      }
      
      // Log registered languages to help debug
      console.log('All M2 language variants registered');
      
      // Verify registration and check for cells
      setTimeout(() => {
        const langs = registry.getLanguages();
        console.log('All registered languages:', langs.map(l => ({ name: l.name, mime: l.mime })));
        
        const m2Lang = langs.find(l => l.name === 'macaulay2');
        if (m2Lang) {
          console.log('Verified: macaulay2 language is registered', m2Lang);
          
          // Force refresh of all editors to pick up the new language
          console.log('🔄 Checking for refresh capability...');
          try {
            // Check if refreshAll exists (might not be in type definitions)
            const reg = registry as any;
            if (reg.refreshAll && typeof reg.refreshAll === 'function') {
              reg.refreshAll();
              console.log('✅ Editors refreshed');
            } else {
              console.log('⚠️ refreshAll method not available on registry');
            }
          } catch (e) {
            console.error('Error refreshing editors:', e);
          }
          
          // Check if any cells are using M2
          const notebooks = app.shell.widgets('main');
          console.log('Checking for M2 cells in open notebooks...');
          for (const widget of notebooks) {
            if (widget && 'content' in widget && widget.content) {
              console.log('Found notebook widget:', widget.id);
            }
          }
        } else {
          console.error('ERROR: macaulay2 language not found after registration!');
        }
      }, 500);
      
    } catch (error) {
      console.error('Error during M2 language registration:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
};

export default plugin;