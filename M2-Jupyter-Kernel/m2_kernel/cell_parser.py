"""
Formal parser for M2 Jupyter cells with magic command support.

Implements the formal grammar specification for parsing cells containing
M2 code with optional magic commands, handling multiline statements via
delimiter balancing.
"""

import re
from typing import List, Dict, Tuple, Optional, NamedTuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


class DelimiterBalance(NamedTuple):
    """Track delimiter counts for balancing."""
    parens: int = 0      # ()
    braces: int = 0      # {}
    brackets: int = 0    # []
    
    def is_balanced(self) -> bool:
        """Check if all delimiters are balanced."""
        return self.parens == 0 and self.braces == 0 and self.brackets == 0
    
    def update(self, other: 'DelimiterBalance') -> 'DelimiterBalance':
        """Add another balance to this one."""
        return DelimiterBalance(
            self.parens + other.parens,
            self.braces + other.braces,
            self.brackets + other.brackets
        )


@dataclass
class Statement:
    """Represents a parsed M2 statement."""
    code: str
    line_magic: Optional[Tuple[str, Optional[str]]] = None  # (name, arg)
    start_line: int = 0
    end_line: int = 0


@dataclass
class ParsedCell:
    """Result of parsing a cell."""
    cell_magic: Optional[Tuple[str, Optional[str]]] = None  # (name, arg)
    statements: List[Statement] = None
    
    def __post_init__(self):
        if self.statements is None:
            self.statements = []


class M2CellParser:
    """
    Parser for M2 Jupyter cells following formal grammar:
    
    <cell>          ::= [ <cell_magic> ] <line>*
    <cell_magic>    ::= "%%" <MAGIC_NAME> [ " " <ARG> ] EOL
    <statement>     ::= <statement_start> <statement_cont>*
    <statement_start> ::= [ <line_magic> ] <CODE_TEXT> EOL
    <line_magic>     ::= "%" <MAGIC_NAME> [ " " <ARG> ]
    """
    
    # Regex patterns
    MAGIC_NAME_PATTERN = r'[A-Za-z_][A-Za-z0-9_]*'
    CELL_MAGIC_PATTERN = rf'^%%({MAGIC_NAME_PATTERN})(?:\s+(.*))?$'
    LINE_MAGIC_PATTERN = rf'^%({MAGIC_NAME_PATTERN})(?:\s+(.*))?'
    
    def __init__(self):
        pass  # State is tracked per parsing operation
    
    def parse_cell(self, cell_content: str) -> ParsedCell:
        """
        Parse a cell into magic commands and M2 statements.
        
        Args:
            cell_content: The full cell content
            
        Returns:
            ParsedCell with parsed structure
        """
        lines = cell_content.split('\n')
        result = ParsedCell()
        
        # Step 1: Extract cell magic from first non-empty line
        first_nonempty_idx = self._find_first_nonempty(lines)
        if first_nonempty_idx >= 0:
            line = lines[first_nonempty_idx].strip()
            if line.startswith('%%'):
                result.cell_magic = self._parse_cell_magic(line)
                # Remove the cell magic line
                lines = lines[:first_nonempty_idx] + lines[first_nonempty_idx + 1:]
        
        # Step 2: Parse remaining lines into statements
        result.statements = self._parse_statements(lines)
        
        return result
    
    def _find_first_nonempty(self, lines: List[str]) -> int:
        """Find index of first non-empty, non-comment line."""
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('--'):
                return i
        return -1
    
    def _parse_cell_magic(self, line: str) -> Optional[Tuple[str, Optional[str]]]:
        """Parse cell magic command."""
        match = re.match(self.CELL_MAGIC_PATTERN, line.strip())
        if match:
            name = match.group(1)
            arg = match.group(2).strip() if match.group(2) else None
            return (name, arg)
        return None
    
    def _parse_line_magic(self, line: str) -> Tuple[Optional[Tuple[str, Optional[str]]], str]:
        """
        Parse line magic and return remaining code.
        
        Returns:
            (magic_tuple, remaining_code)
        """
        match = re.match(self.LINE_MAGIC_PATTERN, line)
        if match:
            name = match.group(1)
            # For line magic, everything after the name is the argument
            arg_and_code = line[match.end(1):].strip()
            
            # If it's a known magic that takes arguments, parse them
            if name in ['timeout', 'pi', 'debug', 'logging', 'latex', 'def', 'where', 'status']:
                # Split on first space or =
                parts = re.split(r'[\s=]', arg_and_code, 1)
                if len(parts) > 1:
                    arg = parts[0]
                    remaining = parts[1].strip()
                else:
                    arg = arg_and_code
                    remaining = ''
            else:
                # Unknown magic - treat everything as code
                arg = None
                remaining = arg_and_code
            
            return ((name, arg), remaining)
        return (None, line)
    
    def _is_empty(self, line: str) -> bool:
        """Check if line is empty."""
        return line.strip() == ''
    
    def _is_comment(self, line: str) -> bool:
        """Check if line is a comment."""
        return line.strip().startswith('--')
    
    def _parse_statements(self, lines: List[str]) -> List[Statement]:
        """Parse lines into M2 statements."""
        statements = []
        i = 0
        
        while i < len(lines):
            # Skip empty/comment lines outside statements
            if self._is_empty(lines[i]) or self._is_comment(lines[i]):
                i += 1
                continue
            
            # Start new statement
            statement = self._parse_single_statement(lines, i)
            if statement:
                statements.append(statement)
                i = statement.end_line + 1
            else:
                i += 1
        
        return statements
    
    def _parse_single_statement(self, lines: List[str], start_idx: int) -> Optional[Statement]:
        """Parse a single statement starting at start_idx."""
        if start_idx >= len(lines):
            return None
        
        # Check for line magic at start
        line_magic, first_line_code = self._parse_line_magic(lines[start_idx])
        
        # If line magic is present, it only affects code on the same line
        if line_magic:
            magic_name, magic_arg = line_magic
            # Special handling for magics that are complete statements by themselves
            if magic_name in ['def', 'where', 'help', 'info', 'status']:
                # These are complete statements even without code
                # Reconstruct the full magic command
                full_magic = f'%{magic_name}'
                if magic_arg:
                    full_magic += f' {magic_arg}'
                return Statement(
                    code=full_magic,
                    line_magic=None,  # Don't separate it, treat as code
                    start_line=start_idx,
                    end_line=start_idx
                )
            elif first_line_code:
                # Line magic with code - create single-line statement only
                return Statement(
                    code=first_line_code,
                    line_magic=line_magic,
                    start_line=start_idx,
                    end_line=start_idx
                )
            else:
                # Other magic-only lines - not a statement
                return None
        
        # No line magic - proceed with normal multiline parsing
        statement_lines = []
        if first_line_code:
            statement_lines.append(first_line_code)
        
        # Track delimiter balance and state across lines
        balance, state = self._count_delimiters(first_line_code)
        current_idx = start_idx + 1
        
        # Continue accumulating lines until balanced or new magic
        while current_idx < len(lines):
            line = lines[current_idx]
            
            # Check if current statement is complete
            if (balance.is_balanced() and 
                not state.get('in_string') and 
                not state.get('in_triple_string') and 
                not state.get('in_block_comment') and
                statement_lines and
                not self.needs_continuation('\n'.join(statement_lines))):
                break
            
            # Stop if we hit a new magic command
            if line.strip().startswith('%'):
                break
            
            # Skip empty/comment lines within statement
            if self._is_empty(line) or self._is_comment(line):
                current_idx += 1
                continue
            
            # Add line to statement
            statement_lines.append(line.rstrip())
            line_balance, state = self._count_delimiters(line, state)
            balance = balance.update(line_balance)
            current_idx += 1
        
        # Create statement if we have code
        if statement_lines:
            return Statement(
                code='\n'.join(statement_lines),
                line_magic=line_magic,
                start_line=start_idx,
                end_line=current_idx - 1
            )
        
        return None
    
    def _count_delimiters(self, text: str, initial_state=None) -> Tuple[DelimiterBalance, dict]:
        """
        Count delimiter balance in text, handling strings and comments.
        
        Returns:
            (balance, final_state) where final_state tracks string/comment state
        """
        parens = 0
        braces = 0
        brackets = 0
        
        # Initialize state
        state = initial_state or {
            'in_string': False,
            'in_triple_string': False,
            'in_block_comment': False,
            'string_char': None
        }
        
        i = 0
        while i < len(text):
            char = text[i]
            
            # Handle triple-slash strings
            if (i <= len(text) - 3 and text[i:i+3] == '///' and 
                not state['in_string'] and not state['in_block_comment']):
                if state['in_triple_string']:
                    state['in_triple_string'] = False
                    i += 3
                    continue
                else:
                    state['in_triple_string'] = True
                    i += 3
                    continue
            
            # Skip if in triple string
            if state['in_triple_string']:
                i += 1
                continue
            
            # Handle regular strings
            if char in ['"', "'"] and not state['in_block_comment']:
                if not state['in_string']:
                    state['in_string'] = True
                    state['string_char'] = char
                elif char == state['string_char'] and (i == 0 or text[i-1] != '\\'):
                    state['in_string'] = False
                    state['string_char'] = None
                i += 1
                continue
            
            # Skip if in string
            if state['in_string']:
                i += 1
                continue
            
            # Handle block comments
            if i <= len(text) - 2 and text[i:i+2] == '-*':
                state['in_block_comment'] = True
                i += 2
                continue
            elif i <= len(text) - 2 and text[i:i+2] == '*-' and state['in_block_comment']:
                state['in_block_comment'] = False
                i += 2
                continue
            
            # Skip if in block comment
            if state['in_block_comment']:
                i += 1
                continue
            
            # Handle line comments
            if i <= len(text) - 2 and text[i:i+2] == '--':
                # Rest of line is comment
                break
            
            # Count delimiters
            if char == '(':
                parens += 1
            elif char == ')':
                parens -= 1
            elif char == '{':
                braces += 1
            elif char == '}':
                braces -= 1
            elif char == '[':
                brackets += 1
            elif char == ']':
                brackets -= 1
            
            i += 1
        
        return DelimiterBalance(parens, braces, brackets), state
    
    def needs_continuation(self, code: str) -> bool:
        """
        Check if code needs continuation based on M2 syntax rules.
        """
        # First check delimiter balance
        balance, state = self._count_delimiters(code)
        if not balance.is_balanced():
            return True
        
        # Check if we're inside a string or comment
        if (state.get('in_string') or 
            state.get('in_triple_string') or 
            state.get('in_block_comment')):
            return True
        
        # Check for hanging operators and keywords
        code = code.strip()
        
        # Hanging operators
        if re.search(r'[+\-*/^%=<>!&|]\s*$', code):
            return True
        
        # Incomplete control structures
        incomplete_patterns = [
            r'\bif\b.*\bthen\s*$',        # if...then without body
            r'\bthen\s*$',                # hanging then
            r'\belse\s*$',                # hanging else  
            r'\bdo\s*$',                  # hanging do
            r'\bwhile\b(?!.*\bdo\b)',     # while without do
            r'\bfor\b(?!.*\bdo\b)',       # for without do
            r'=>\s*$',                    # hanging arrow
            r',\s*$',                     # hanging comma
        ]
        
        for pattern in incomplete_patterns:
            if re.search(pattern, code, re.IGNORECASE | re.MULTILINE):
                return True
        
        return False