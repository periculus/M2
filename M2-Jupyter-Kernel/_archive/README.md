# Archive — M2-Jupyter-Kernel

Archived: 2026-02-22

## Contents

| Item | Original Location | Rationale |
|------|-------------------|-----------|
| `ENV_CONTRACT.md` | `M2-Jupyter-Kernel/` | Repo split environment contract — split complete |
| `editor_manifest.txt` | `M2-Jupyter-Kernel/` | Repo split file manifest for editor — split complete |
| `kernel_manifest.txt` | `M2-Jupyter-Kernel/` | Repo split file manifest for kernel — split complete |
| `kernel_pyproject.toml` | `M2-Jupyter-Kernel/` | Draft pyproject.toml for kernel split — now in `macaulay2-jupyter/pyproject.toml` |
| `experimental/` | `M2-Jupyter-Kernel/experimental/` | Help example extraction pipeline prototype — not in active use |
| `tmp-baseline-parser/` | `M2-Jupyter-Kernel/tmp-baseline-parser/` | Old parser.js snapshot for A/B comparison |
| `tmp-oldparser/` | `M2-Jupyter-Kernel/tmp-oldparser/` | Older parser.js snapshot for A/B comparison |

## Pre-existing archived material

These were already in `_archive/` before the repo split and contain older development artifacts:
- `docs/` — old documentation versions
- `logs/`, `misc/`, `sessions/` — development session logs
- `scripts-js/`, `scripts-py/`, `scripts-sh/` — one-off analysis scripts
- `test-html/`, `test-m2/`, `test-notebooks/` — ad-hoc test files

## Restore

```fish
# Restore a file
cp M2-Jupyter-Kernel/_archive/ENV_CONTRACT.md M2-Jupyter-Kernel/

# Restore a directory
cp -r M2-Jupyter-Kernel/_archive/experimental M2-Jupyter-Kernel/
```
