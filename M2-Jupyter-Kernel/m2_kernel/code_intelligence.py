"""
Code Intelligence for M2 Jupyter Kernel

Implements autocompletion, hover documentation, and other code intelligence features.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any

from .language_data import get_language_data

logger = logging.getLogger(__name__)


class M2CodeIntelligence:
    """
    Provides code intelligence features for M2 code.
    """
    
    def __init__(self):
        self.language_data = get_language_data()
        self._context_cache = {}  # Cache for parsed context
        self._definitions = {}  # Track symbol definitions {symbol: {file, line, col, cell_id}}
        self._current_cell_id = None  # Track current cell being executed
        
    def get_completions(self, code: str, cursor_pos: int) -> Dict[str, Any]:
        """
        Get completions for the given code at cursor position.
        
        Returns Jupyter completion reply format.
        """
        # Extract the token being completed
        token_start, token_end, token_prefix = self._extract_completion_token(code, cursor_pos)
        
        # Get context-aware completions
        completions = self._get_context_aware_completions(code, cursor_pos, token_prefix)
        
        # Format for Jupyter
        matches = []
        metadata = {}
        
        for comp in completions:
            matches.append(comp['text'])
            
            # Add rich completion metadata (for Jupyter Lab)
            if 'signature' in comp or 'description' in comp:
                metadata[comp['text']] = {
                    'type': comp.get('type', 'unknown'),
                    'signature': comp.get('signature', ''),
                    'description': comp.get('description', ''),
                }
        
        return {
            'matches': matches,
            'cursor_start': token_start,
            'cursor_end': token_end,
            'metadata': metadata,
            'status': 'ok'
        }
        
    def get_inspection(self, code: str, cursor_pos: int, detail_level: int = 0) -> Dict[str, Any]:
        """
        Get inspection/hover info for symbol at cursor position.
        
        Returns Jupyter inspection reply format.
        """
        # Extract symbol at cursor
        symbol = self._extract_symbol_at_cursor(code, cursor_pos)
        
        if not symbol:
            return {'found': False, 'data': {}, 'metadata': {}, 'status': 'ok'}
            
        # Get hover info
        info = self.language_data.get_hover_info(symbol)
        
        if not info:
            return {'found': False, 'data': {}, 'metadata': {}, 'status': 'ok'}
            
        # Format response
        data = {}
        
        # Plain text representation
        text_parts = [f"**{info['name']}** ({info['type']})"]
        if 'signature' in info:
            text_parts.append(f"\nSignature: `{info['signature']}`")
        if 'documentation' in info:
            text_parts.append(f"\n\n{info['documentation']}")
            
        data['text/plain'] = '\n'.join(text_parts)
        
        # Markdown representation (for rich display)
        md_parts = [f"### {info['name']}\n*{info['type']}*"]
        if 'signature' in info:
            md_parts.append(f"\n```m2\n{info['signature']}\n```")
        if 'documentation' in info:
            md_parts.append(f"\n{info['documentation']}")
            
        data['text/markdown'] = '\n'.join(md_parts)
        
        return {
            'found': True,
            'data': data,
            'metadata': {},
            'status': 'ok'
        }
        
    def _extract_completion_token(self, code: str, cursor_pos: int) -> Tuple[int, int, str]:
        """Extract the token being completed at cursor position."""
        # Find word boundaries
        start = cursor_pos
        while start > 0 and (code[start-1].isalnum() or code[start-1] in ('_', '#')):
            start -= 1
            
        end = cursor_pos
        while end < len(code) and (code[end].isalnum() or code[end] in ('_', '#')):
            end += 1
            
        prefix = code[start:cursor_pos]
        return start, end, prefix
        
    def _extract_symbol_at_cursor(self, code: str, cursor_pos: int) -> Optional[str]:
        """Extract the symbol at cursor position."""
        # Similar to completion token but get the whole symbol
        start = cursor_pos
        while start > 0 and (code[start-1].isalnum() or code[start-1] in ('_', '#')):
            start -= 1
            
        end = cursor_pos
        while end < len(code) and (code[end].isalnum() or code[end] in ('_', '#')):
            end += 1
            
        symbol = code[start:end].strip()
        return symbol if symbol else None
        
    def _get_context_aware_completions(self, code: str, cursor_pos: int, prefix: str) -> List[Dict[str, str]]:
        """Get completions based on code context."""
        # Get basic completions
        completions = self.language_data.get_completions(prefix)
        
        # Analyze context to prioritize completions
        context = self._analyze_context(code, cursor_pos)
        
        # Filter and prioritize based on context
        if context['in_type_position']:
            # Prioritize types
            completions.sort(key=lambda x: (x['type'] != 'type', x['text']))
        elif context['after_assignment']:
            # Prioritize functions and constructors
            completions.sort(key=lambda x: (x['type'] not in ('function', 'type'), x['text']))
        elif context['in_function_call']:
            # All symbols are valid
            pass
            
        return completions
        
    def _analyze_context(self, code: str, cursor_pos: int) -> Dict[str, bool]:
        """Analyze code context at cursor position."""
        # Get line up to cursor
        line_start = code.rfind('\n', 0, cursor_pos) + 1
        line_up_to_cursor = code[line_start:cursor_pos]
        
        context = {
            'in_type_position': False,
            'after_assignment': False,
            'in_function_call': False,
            'in_comment': False,
            'in_string': False,
        }
        
        # Check if in comment
        if '--' in line_up_to_cursor:
            comment_pos = line_up_to_cursor.rfind('--')
            if comment_pos >= 0:
                context['in_comment'] = True
                return context
                
        # Check if in string
        # Simple check - count quotes
        quote_count = line_up_to_cursor.count('"')
        if quote_count % 2 == 1:
            context['in_string'] = True
            return context
            
        # Check for type position (after : or ::)
        if re.search(r':\s*$', line_up_to_cursor):
            context['in_type_position'] = True
            
        # Check for assignment
        if re.search(r'=\s*$', line_up_to_cursor) or re.search(r':=\s*$', line_up_to_cursor):
            context['after_assignment'] = True
            
        # Check if in function call
        open_parens = line_up_to_cursor.count('(') - line_up_to_cursor.count(')')
        if open_parens > 0:
            context['in_function_call'] = True
            
        return context
        
    def track_definitions(self, code: str, cell_id: Optional[str] = None, filename: Optional[str] = None):
        """
        Track symbol definitions in the given code.
        
        Args:
            code: M2 code to analyze
            cell_id: Jupyter cell ID (if applicable)
            filename: Source filename (if applicable)
        """
        self._current_cell_id = cell_id
        
        # Parse code to find definitions
        lines = code.split('\n')
        
        for line_num, line in enumerate(lines):
            # Skip comments and empty lines
            stripped = line.strip()
            if not stripped or stripped.startswith('--'):
                continue
                
            # Look for assignments (x = ...)
            assignment_match = re.match(r'^\s*([a-zA-Z_][a-zA-Z0-9_#]*)\s*=(?!=)', line)
            if assignment_match:
                symbol = assignment_match.group(1)
                col = line.find(symbol)
                self._definitions[symbol] = {
                    'file': filename or '<notebook>',
                    'line': line_num + 1,
                    'column': col,
                    'cell_id': cell_id,
                    'code': line.strip()
                }
                logger.debug(f"Tracked definition: {symbol} at line {line_num + 1}")
                
            # Look for function definitions (f(args) := ...)
            func_match = re.match(r'^\s*([a-zA-Z_][a-zA-Z0-9_#]*)\s*\([^)]*\)\s*:=', line)
            if func_match:
                symbol = func_match.group(1)
                col = line.find(symbol)
                self._definitions[symbol] = {
                    'file': filename or '<notebook>',
                    'line': line_num + 1,
                    'column': col,
                    'cell_id': cell_id,
                    'code': line.strip(),
                    'type': 'function'
                }
                logger.debug(f"Tracked function definition: {symbol} at line {line_num + 1}")
                
            # Look for method installations (installMethod("name", ...))
            method_match = re.search(r'installMethod\s*\(\s*["\']([^"\']*)["\'\']', line)
            if method_match:
                symbol = method_match.group(1)
                col = line.find(symbol)
                self._definitions[symbol] = {
                    'file': filename or '<notebook>',
                    'line': line_num + 1,
                    'column': col,
                    'cell_id': cell_id,
                    'code': line.strip(),
                    'type': 'method'
                }
                logger.debug(f"Tracked method definition: {symbol} at line {line_num + 1}")
                
    def get_definition(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get definition information for a symbol.
        
        Args:
            symbol: Symbol name to look up
            
        Returns:
            Definition info dict or None if not found
        """
        # First check tracked definitions from current session
        if symbol in self._definitions:
            return self._definitions[symbol]
            
        # Check language data for built-in symbols
        if symbol in self.language_data.symbols:
            symbol_info = self.language_data.symbols[symbol]
            return {
                'file': '<builtin>',
                'line': 0,
                'column': 0,
                'cell_id': None,
                'type': symbol_info.category,
                'builtin': True,
                'documentation': f"Built-in {symbol_info.category}: {symbol}"
            }
            
        return None
        
    def get_goto_definition_info(self, code: str, cursor_pos: int) -> Dict[str, Any]:
        """
        Get go-to-definition information for symbol at cursor.
        
        Args:
            code: Current code
            cursor_pos: Cursor position
            
        Returns:
            Jupyter-compatible response with definition location
        """
        # Extract symbol at cursor
        symbol = self._extract_symbol_at_cursor(code, cursor_pos)
        
        if not symbol:
            return {
                'found': False,
                'data': {},
                'metadata': {},
                'status': 'ok'
            }
            
        # Get definition info
        definition = self.get_definition(symbol)
        
        if not definition:
            return {
                'found': False,
                'data': {},
                'metadata': {},
                'status': 'ok'
            }
            
        # Format response
        data = {
            'text/plain': f"Definition of {symbol}:\n  File: {definition['file']}\n  Line: {definition['line']}\n  Type: {definition.get('type', 'variable')}"
        }
        
        # Add rich metadata for frontends that support it
        metadata = {
            'definition': {
                'symbol': symbol,
                'file': definition['file'],
                'line': definition['line'],
                'column': definition['column'],
                'cell_id': definition.get('cell_id'),
                'code': definition.get('code', ''),
                'type': definition.get('type', 'variable'),
                'builtin': definition.get('builtin', False)
            }
        }
        
        # Add markdown representation
        md_parts = [f"### Definition of `{symbol}`"]
        
        if definition.get('builtin'):
            md_parts.append(f"\n*Built-in {definition.get('type', 'symbol')}*")
            if 'documentation' in definition:
                md_parts.append(f"\n{definition['documentation']}")
        else:
            md_parts.append(f"\n**Location:** `{definition['file']}:{definition['line']}`")
            md_parts.append(f"\n**Type:** {definition.get('type', 'variable')}")
            if 'code' in definition and definition['code']:
                md_parts.append(f"\n\n```m2\n{definition['code']}\n```")
                
        data['text/markdown'] = '\n'.join(md_parts)
        
        return {
            'found': True,
            'data': data,
            'metadata': metadata,
            'status': 'ok'
        }


def enhance_codemirror_mode():
    """
    Generate enhanced CodeMirror mode configuration for M2.
    """
    language_data = get_language_data()
    
    # Create mode configuration
    mode_config = {
        'name': 'macaulay2',
        'keywords': list(language_data.keywords),
        'types': list(language_data.types),
        'functions': list(language_data.functions),
        'constants': list(language_data.constants),
        'operators': [
            '+', '-', '*', '/', '//', '%', '^', '**',
            '==', '!=', '===', '=!=', '<', '>', '<=', '>=',
            'and', 'or', 'not', 'xor',
            '=', ':=', '<-', '->',
            '++', '|', '||', '@@', '#', '?',
            '..', '..<', '<..', '<..<'
        ],
        'brackets': [
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
        ],
        'lineComment': '--',
        'blockCommentStart': '-*',
        'blockCommentEnd': '*-',
        'string': ['"', '///'],
    }
    
    return mode_config


def generate_jupyter_lexer():
    """
    Generate Pygments lexer configuration for Jupyter.
    """
    # This function is kept for reference but the actual lexer
    # is implemented in m2_lexer.py
    from .m2_lexer import M2Lexer
    return M2Lexer