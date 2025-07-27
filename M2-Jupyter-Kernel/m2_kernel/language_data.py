"""
M2 Language Data Parser and Provider

This module parses M2 language data from editor files and provides
structured information for code intelligence features.
"""

import os
import re
import json
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class M2Symbol:
    """Represents an M2 symbol with its metadata."""
    name: str
    category: str  # 'keyword', 'type', 'function', 'constant', 'variable'
    documentation: Optional[str] = None
    signature: Optional[str] = None
    return_type: Optional[str] = None
    
    
class M2LanguageData:
    """
    Parses and provides M2 language data for code intelligence.
    """
    
    def __init__(self, m2_repo_path: Optional[str] = None):
        self.m2_repo_path = m2_repo_path or self._find_m2_repo()
        self.symbols: Dict[str, M2Symbol] = {}
        self.keywords: Set[str] = set()
        self.types: Set[str] = set()
        self.functions: Set[str] = set()
        self.constants: Set[str] = set()
        self._load_language_data()
        
    def _find_m2_repo(self) -> str:
        """Try to find the M2 repository path."""
        # Try relative path first
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        m2_path = os.path.join(current_dir, '..', 'M2', 'Macaulay2', 'editors')
        if os.path.exists(m2_path):
            return os.path.dirname(os.path.dirname(m2_path))
        
        # Try environment variable
        if 'M2_REPO' in os.environ:
            return os.environ['M2_REPO']
            
        # Default fallback
        return '/Users/sverrir/Documents/GitHub/M2/M2'
        
    def _load_language_data(self):
        """Load language data from M2 editor files."""
        editors_path = os.path.join(self.m2_repo_path, 'Macaulay2', 'editors')
        
        # Load from vim dictionary
        vim_dict_path = os.path.join(editors_path, 'vim', 'm2.vim.dict')
        if os.path.exists(vim_dict_path):
            self._parse_vim_dictionary(vim_dict_path)
        else:
            logger.warning(f"Vim dictionary not found at {vim_dict_path}")
            
        # Categorize symbols based on naming patterns and known types
        self._categorize_symbols()
        
    def _parse_vim_dictionary(self, filepath: str):
        """Parse the vim dictionary file to extract all symbols."""
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Skip header comments
            lines = content.split('\n')
            in_symbols = False
            
            for line in lines:
                line = line.strip()
                if not line or line.startswith('"'):
                    continue
                    
                # The last line contains all symbols space-separated
                if ' ' in line and len(line) > 100:
                    symbols = line.split()
                    for symbol in symbols:
                        if symbol and not symbol.startswith('"'):
                            self.symbols[symbol] = M2Symbol(name=symbol, category='unknown')
                            
        except Exception as e:
            logger.error(f"Error parsing vim dictionary: {e}")
            
    def _categorize_symbols(self):
        """Categorize symbols based on patterns and known classifications."""
        # Known keywords
        keyword_patterns = [
            'if', 'then', 'else', 'when', 'do', 'while', 'for', 'from', 'to', 'in',
            'break', 'continue', 'return', 'try', 'catch', 'throw', 'local', 'global',
            'export', 'exportMutable', 'protect', 'private', 'package', 'use',
            'and', 'or', 'not', 'true', 'false', 'null', 'nil'
        ]
        
        # Known types
        type_patterns = [
            'Type', 'BasicList', 'List', 'Sequence', 'Array', 'MutableList',
            'HashTable', 'MutableHashTable', 'OptionTable', 'Tally', 'Set', 'Dictionary',
            'String', 'Net', 'Symbol', 'Keyword', 'Boolean',
            'Number', 'ZZ', 'QQ', 'RR', 'CC', 'InexactNumber',
            'Ring', 'RingElement', 'Ideal', 'Module', 'Matrix', 'MutableMatrix',
            'ChainComplex', 'ChainComplexMap', 'GradedModule', 'GradedModuleMap',
            'PolynomialRing', 'QuotientRing', 'FractionField', 'GaloisField',
            'Monoid', 'MonoidElement', 'MonomialIdeal', 'MonomialOrder',
            'CoherentSheaf', 'SheafMap', 'Variety', 'ProjectiveVariety', 'AffineVariety'
        ]
        
        # Known constants  
        constant_patterns = [
            'pi', 'ii', 'ee', 'infinity', 'InfiniteNumber', 'IndeterminateNumber',
            'EulerConstant', 'CatalanConstant', 'GoldenRatio'
        ]
        
        # Categorize each symbol
        for name, symbol in self.symbols.items():
            if name in keyword_patterns:
                symbol.category = 'keyword'
                self.keywords.add(name)
            elif name in type_patterns or (name[0].isupper() and not '_' in name):
                symbol.category = 'type'
                self.types.add(name)
            elif name in constant_patterns:
                symbol.category = 'constant'
                self.constants.add(name)
            elif name[0].islower() or '_' in name:
                symbol.category = 'function'
                self.functions.add(name)
            else:
                symbol.category = 'variable'
                
        logger.info(f"Loaded {len(self.symbols)} symbols: "
                   f"{len(self.keywords)} keywords, "
                   f"{len(self.types)} types, "
                   f"{len(self.functions)} functions, "
                   f"{len(self.constants)} constants")
                   
    def get_completions(self, prefix: str) -> List[Dict[str, str]]:
        """
        Get completion suggestions for a given prefix.
        
        Returns list of dicts with 'text', 'type', and optionally 'description'.
        """
        completions = []
        prefix_lower = prefix.lower()
        
        for name, symbol in self.symbols.items():
            if name.lower().startswith(prefix_lower):
                completion = {
                    'text': name,
                    'type': symbol.category,
                }
                if symbol.documentation:
                    completion['description'] = symbol.documentation
                if symbol.signature:
                    completion['signature'] = symbol.signature
                completions.append(completion)
                
        # Sort by relevance: exact match first, then by length, then alphabetically
        completions.sort(key=lambda x: (
            x['text'].lower() != prefix_lower,
            len(x['text']),
            x['text'].lower()
        ))
        
        return completions[:50]  # Limit to 50 suggestions
        
    def get_hover_info(self, symbol_name: str) -> Optional[Dict[str, str]]:
        """Get hover information for a symbol."""
        if symbol_name in self.symbols:
            symbol = self.symbols[symbol_name]
            info = {
                'name': symbol.name,
                'type': symbol.category,
            }
            if symbol.documentation:
                info['documentation'] = symbol.documentation
            if symbol.signature:
                info['signature'] = symbol.signature
            if symbol.return_type:
                info['return_type'] = symbol.return_type
            return info
        return None
        
    def is_keyword(self, word: str) -> bool:
        """Check if a word is a keyword."""
        return word in self.keywords
        
    def is_type(self, word: str) -> bool:
        """Check if a word is a type."""
        return word in self.types
        
    def is_function(self, word: str) -> bool:
        """Check if a word is a function."""
        return word in self.functions
        
    def is_constant(self, word: str) -> bool:
        """Check if a word is a constant."""
        return word in self.constants


# Singleton instance
_language_data = None

def get_language_data() -> M2LanguageData:
    """Get the singleton language data instance."""
    global _language_data
    if _language_data is None:
        _language_data = M2LanguageData()
    return _language_data