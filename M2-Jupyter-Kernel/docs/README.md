# M2 JupyterLab Extension — Developer Documentation

These documents are the **single source of truth** for the M2 JupyterLab extension's
grammar, highlighting, code intelligence, symbol pipeline, and build workflow.

| Document | Content | Owner |
|----------|---------|-------|
| [grammar.md](grammar.md) | Lezer grammar architecture, juxtaposition, validation | Grammar pipeline |
| [highlighting.md](highlighting.md) | CSS cascade solution, color map, tag architecture | Extension build |
| [code-intelligence.md](code-intelligence.md) | Hover, completion, folding, indentation | Extension build |
| [symbol-pipeline.md](symbol-pipeline.md) | generate_symbols.py pipeline, JSON schema | Documentation pipeline |
| [extension-workflow.md](extension-workflow.md) | Build/deploy commands, version matrix, update triggers | All pipelines |

## Governance

- Each fact lives in ONE canonical file (listed above)
- `CLAUDE.md` and `MEMORY.md` may reference these docs but must not duplicate content
- When updating M2, JupyterLab, or CodeMirror versions, update `extension-workflow.md` first
- All docs carry a `Last verified:` date + version tuple at the top
- All Python commands in docs use `python3` (not `python`) — see [extension-workflow.md](extension-workflow.md) for venv setup
