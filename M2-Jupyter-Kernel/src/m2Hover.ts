// @ts-ignore
import { hoverTooltip, Tooltip } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
// @ts-ignore
import m2Symbols from './m2Symbols.json';

interface M2Symbol {
  label: string;
  type: string;
  info?: string;
}

// Build a lookup map for O(1) access
const symbolMap: Record<string, M2Symbol> = {};
for (const sym of m2Symbols as M2Symbol[]) {
  symbolMap[sym.label] = sym;
}

// Map category to display label
const typeLabels: Record<string, string> = {
  keyword: 'keyword',
  type: 'type',
  function: 'function',
  constant: 'constant'
};

export const m2HoverTooltip = hoverTooltip(
  (view, pos): Tooltip | null => {
    const tree = syntaxTree(view.state);
    const node = tree.resolveInner(pos, 1);

    // Only show tooltips for identifier-like nodes
    const nodeType = node.type.name;
    if (
      nodeType !== 'Identifier' &&
      nodeType !== 'Type' &&
      nodeType !== 'Builtin' &&
      nodeType !== 'Constant' &&
      nodeType !== 'Boolean'
    ) {
      return null;
    }

    const word = view.state.doc.sliceString(node.from, node.to);
    const sym = symbolMap[word];
    if (!sym) {
      return null;
    }

    return {
      pos: node.from,
      end: node.to,
      above: true,
      create() {
        const dom = document.createElement('div');
        dom.className = 'm2-hover-tooltip';

        const header = document.createElement('div');
        header.className = 'm2-hover-header';

        const name = document.createElement('b');
        name.textContent = sym.label;
        header.appendChild(name);

        const badge = document.createElement('span');
        badge.className = 'm2-hover-badge m2-hover-badge-' + sym.type;
        badge.textContent = typeLabels[sym.type] || sym.type;
        header.appendChild(badge);

        dom.appendChild(header);

        if (sym.info) {
          const info = document.createElement('div');
          info.className = 'm2-hover-info';
          info.textContent = sym.info;
          dom.appendChild(info);
        }

        return { dom };
      }
    };
  }
);
