# Jupyter Syntax Highlighting Architecture

## 1. Server-side (Pygments)
- Python-based lexer (m2_lexer.py)
- Used for:
  - Static rendering (saved notebooks)
  - nbconvert exports
  - Initial display

## 2. Client-side (CodeMirror)
- JavaScript-based mode
- Used for:
  - Live editing
  - Immediate feedback as you type
  - Interactive features

## The Problem
When you type in a cell, CodeMirror (JavaScript) is doing the highlighting, NOT Pygments (Python).
If CodeMirror doesn't know about Macaulay2, it can't highlight it\!
