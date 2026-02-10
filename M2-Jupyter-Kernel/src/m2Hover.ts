// @ts-ignore
import { hoverTooltip, Tooltip } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
// @ts-ignore
import m2Symbols from './m2Symbols.json';

interface M2Option {
  name: string;
  type?: string;
  info?: string;
}

interface M2Param {
  name?: string;
  type?: string;
  info?: string;
}

interface M2Output {
  type?: string;
  info?: string;
}

interface M2Symbol {
  label: string;
  type: string;
  info?: string;
  detail?: string;
  options?: M2Option[];
  inputs?: M2Param[];
  outputs?: M2Output[];
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

        // ── Header: name + badge ──
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

        // ── Headline ──
        if (sym.info) {
          const info = document.createElement('div');
          info.className = 'm2-hover-info';
          info.textContent = sym.info;
          dom.appendChild(info);
        }

        // ── Usage ──
        if (sym.detail) {
          const usage = document.createElement('div');
          usage.className = 'm2-hover-usage';
          usage.textContent = sym.detail;
          dom.appendChild(usage);
        }

        // ── Inputs ──
        if (sym.inputs && sym.inputs.length > 0) {
          const section = document.createElement('div');
          section.className = 'm2-hover-section';
          const label = document.createElement('span');
          label.className = 'm2-hover-section-label';
          label.textContent = 'Input: ';
          section.appendChild(label);

          const parts: string[] = [];
          for (const inp of sym.inputs) {
            if (inp.name && inp.type) {
              parts.push(inp.name + ' \u2014 ' + inp.type);
            } else if (inp.name) {
              parts.push(inp.name);
            } else if (inp.type) {
              parts.push(inp.type);
            }
          }
          section.appendChild(document.createTextNode(parts.join(', ')));
          dom.appendChild(section);
        }

        // ── Outputs ──
        if (sym.outputs && sym.outputs.length > 0) {
          const section = document.createElement('div');
          section.className = 'm2-hover-section';
          const label = document.createElement('span');
          label.className = 'm2-hover-section-label';
          label.textContent = 'Output: ';
          section.appendChild(label);

          const parts: string[] = [];
          for (const out of sym.outputs) {
            if (out.type && out.info) {
              parts.push(out.type + ' \u2014 ' + out.info);
            } else if (out.type) {
              parts.push(out.type);
            } else if (out.info) {
              parts.push(out.info);
            }
          }
          section.appendChild(document.createTextNode(parts.join(', ')));
          dom.appendChild(section);
        }

        // ── Options ──
        if (sym.options && sym.options.length > 0) {
          const section = document.createElement('div');
          section.className = 'm2-hover-section';
          const label = document.createElement('span');
          label.className = 'm2-hover-section-label';
          label.textContent = 'Options: ';
          section.appendChild(label);

          const names = sym.options.map(o => o.name);
          // Show up to 8 options, truncate with "..."
          const display = names.length > 8
            ? names.slice(0, 8).join(', ') + ', \u2026'
            : names.join(', ');
          section.appendChild(document.createTextNode(display));
          dom.appendChild(section);
        }

        return { dom };
      }
    };
  }
);
