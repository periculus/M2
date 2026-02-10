#!/usr/bin/env python3
"""Generate m2Symbols.json for CodeMirror autocompletion.

Reads the M2 vim dictionary and parses M2's SimpleDoc documentation files
to produce a rich symbol database with headlines, usage patterns, input/output
types, and function options.

Data sources:
  1. M2/Macaulay2/editors/vim/m2.vim.dict (1763 symbol names)
  2. M2/Macaulay2/packages/Macaulay2Doc/**/*.m2 (function/type docs)
  3. M2/Macaulay2/packages/*.m2 (package headlines via newPackage)
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from collections import defaultdict


# ═══════════════════════════════════════════════════════════════
# Symbol Categories
# ═══════════════════════════════════════════════════════════════

KEYWORDS = {
    'if', 'then', 'else', 'when', 'do', 'while', 'for', 'from', 'to', 'in',
    'by', 'of', 'break', 'continue', 'return', 'try', 'catch', 'throw',
    'local', 'global', 'threadLocal', 'export', 'exportMutable',
    'symbol', 'new', 'use', 'load', 'needs',
    'and', 'or', 'not', 'xor',
    'true', 'false', 'null',
    'time', 'elapsedTime', 'shield', 'debug',
}

CONSTANTS = {
    'pi', 'ii', 'ee', 'oo', 'infinity',
    'InfiniteNumber', 'IndeterminateNumber',
    'EulerConstant', 'CatalanConstant', 'GoldenRatio',
    'stdio', 'stderr',
}

KNOWN_TYPES = {
    'ZZ', 'QQ', 'RR', 'CC', 'RRi', 'GF', 'Boolean', 'Nothing', 'Thing',
    'Ring', 'Ideal', 'Module', 'Matrix', 'MutableMatrix', 'Vector',
    'ChainComplex', 'ChainComplexMap', 'GradedModule', 'GradedModuleMap',
    'PolynomialRing', 'QuotientRing', 'FractionField', 'GaloisField',
    'Monoid', 'MonoidElement', 'MonomialIdeal', 'MonomialOrder',
    'BasicList', 'List', 'Sequence', 'Array', 'MutableList',
    'HashTable', 'MutableHashTable', 'OptionTable', 'Tally', 'Set', 'Dictionary',
    'Net', 'Symbol', 'Number', 'String', 'Type', 'Function',
    'RingElement', 'RingMap', 'InexactNumber', 'InexactField',
    'CoherentSheaf', 'SheafOfRings', 'SheafMap',
    'Variety', 'ProjectiveVariety', 'AffineVariety',
    'File', 'Database', 'Method', 'Command',
    'Package', 'Manipulator', 'Option', 'IndexedVariable',
    'Expression', 'Holder', 'BinaryOperation',
    'ScriptedFunctor', 'SelfInitializingType', 'WrapperType',
    'Resolution', 'GroebnerBasis', 'LocalRing', 'Elimination',
    'ProjectiveHilbertPolynomial', 'EngineRing', 'FreeModule',
    'ImmutableType', 'CacheFunction', 'CacheTable',
    'GeneralOrderedMonoid', 'OrderedMonoid', 'ProductOrder',
    'Descent', 'RingFamily', 'InexactFieldFamily',
    'ComplexField', 'RealField',
}


FALLBACK_DESCRIPTIONS = {
    # Keywords (language constructs without doc blocks)
    'if': 'conditional expression: if ... then ... else ...',
    'then': 'then-clause of an if expression',
    'else': 'else-clause of an if expression',
    'for': 'for loop: for i from a to b do ...',
    'from': 'starting value in a for loop',
    'to': 'ending value in a for loop',
    'in': 'iterate over elements: for x in L do ...',
    'by': 'step value in a for loop',
    'do': 'body of a for or while loop',
    'when': 'conditional guard in a loop',
    'while': 'while loop: while cond do ...',
    'of': 'used with new: new Type of value',
    'break': 'exit from a loop',
    'continue': 'skip to next iteration of a loop',
    'return': 'return a value from a function',
    'try': 'error handling: try expr catch var -> handler',
    'catch': 'catch clause of a try expression',
    'throw': 'throw an error',
    'and': 'logical conjunction (short-circuit)',
    'or': 'logical disjunction (short-circuit)',
    'not': 'logical negation',
    'xor': 'logical exclusive or',
    'local': 'declare a local variable',
    'global': 'declare a global variable',
    'threadLocal': 'declare a thread-local variable',
    'export': 'export a symbol from a package',
    'exportMutable': 'export a mutable symbol from a package',
    'symbol': 'refer to a symbol by name',
    'new': 'create a new object: new Type from data',
    'load': 'load an M2 file',
    'needs': 'load a file if not already loaded',
    'time': 'time the evaluation of an expression',
    'elapsedTime': 'measure elapsed wall time',
    'shield': 'protect from interrupts during evaluation',
    'debug': 'enter debugger',
    # Constants
    'pi': 'the constant pi (3.14159...)',
    'ii': 'the square root of -1',
    'ee': 'the base of natural logarithms (2.71828...)',
    'oo': 'positive infinity (shorthand)',
    'infinity': 'positive infinity',
    'stdio': 'standard input/output',
    'stderr': 'standard error output',
    # Common package/doc configuration symbols
    'Acknowledgement': 'acknowledgement section in a package',
    'AdditionalPaths': 'additional search paths for a package',
    'Authors': 'list of package authors',
    'AuxiliaryFiles': 'whether a package has auxiliary files',
    'BUTTON': 'HTML button element in documentation',
    'Body': 'body of an HTML element',
    'CacheExampleOutput': 'cache example output during package install',
    'Caveat': 'caveat section in documentation',
    'Center': 'centering in documentation',
    'Certification': 'package certification data',
    'CheckDocumentation': 'whether to check documentation during install',
    'Citation': 'citation information for a package',
    'Configuration': 'default configuration options for a package',
    'Consequences': 'consequences section in documentation',
    'Date': 'date field for a package',
    'DebuggingMode': 'whether debugging mode is active',
    'Description': 'description section in documentation',
    'Headline': 'headline section in documentation',
    'HomePage': 'home page URL for a package author',
    'Inputs': 'inputs section in documentation',
    'Keywords': 'keywords for a package',
    'OptionalComponentsPresent': 'whether optional components are available',
    'Outputs': 'outputs section in documentation',
    'PackageExports': 'exported symbols from a package',
    'PackageImports': 'imported packages',
    'Reload': 'whether to reload a package',
    'SeeAlso': 'see-also section in documentation',
    'Subnodes': 'sub-topics in documentation',
    'Version': 'version string for a package',
    # Remaining symbols without M2 help headlines
    'Base': 'base ring or base object',
    'CompleteIntersection': 'strategy for complete intersection ideals',
    'EisenbudHunekeVasconcelos': 'strategy using the Eisenbud-Huneke-Vasconcelos algorithm',
    'FlatMonoid': 'flat monoid type',
    'Format': 'output format option',
    'GTZ': 'Gianni-Trager-Zacharias primary decomposition algorithm',
    'Hermite': 'Hermite normal form strategy',
    'Homogeneous': 'strategy for homogeneous ideals',
    'Homogeneous2': 'alternate strategy for homogeneous ideals',
    'HomologicalAlgebraPackage': 'internal homological algebra package',
    'HypertextVoid': 'void hypertext element',
    'INDENT': 'indentation in documentation formatting',
    'INPUT': 'input section in documentation',
    'LinearAlgebra': 'linear algebra strategy',
    'ParallelF4': 'parallel F4 Groebner basis strategy',
    'PrimaryTag': 'primary documentation tag type',
    'RHom': 'derived Hom functor',
    'SUBSECTION': 'subsection in documentation',
    'SheafExpression': 'expression representing a sheaf',
    'ShimoyamaYokoyama': 'Shimoyama-Yokoyama primary decomposition algorithm',
    'Sort': 'sorting strategy option',
    'SortStrategy': 'strategy for sorting generators',
    'Sugarless': 'strategy without sugar optimization',
    'Toric': 'toric variety strategy',
    'Unmixed': 'strategy for unmixed ideals',
    'UseSyzygies': 'whether to use syzygies',
    'breakpoint': 'set a breakpoint for debugging',
    'cacheValue': 'cache the result of a computation',
    'complete': 'complete a chain complex or resolution',
    'copyFile': 'copy a file',
    'copyright': 'copyright notice for Macaulay2',
    'cotangentSurjection': 'cotangent surjection map',
    'decompose': 'decompose an ideal into primary components',
    'embeddedToAbstract': 'convert from embedded to abstract variety',
    'eulers': 'Euler characteristics',
    'fileExecutable': 'test whether a file is executable',
    'fileReadable': 'test whether a file is readable',
    'fileWritable': 'test whether a file is writable',
    'fpLLL': 'lattice basis reduction using fpLLL',
    'fraction': 'construct a fraction in a fraction field',
    'genera': 'compute genera of a variety',
    'genus': 'compute the genus of a variety or curve',
    'gramm': 'Gram matrix',
    'handleInterrupts': 'control interrupt handling',
    'idealSheafSequence': 'ideal sheaf exact sequence',
    'installMinprimes': 'install minimal primes package',
    'installedPackages': 'list of currently installed packages',
    'instances': 'list all instances of a type',
    'limitFiles': 'limit the number of open files',
    'limitProcesses': 'limit the number of processes',
    'loadedFiles': 'list of loaded files',
    'maxExponent': 'maximum exponent for a ring',
    'minExponent': 'minimum exponent for a ring',
    'minimize': 'minimize a free resolution',
    'moveFile': 'move or rename a file',
    'nullaryMethods': 'methods with no arguments',
    'printWidth': 'set the print width for output',
    'printingTimeLimit': 'time limit for printing output',
    'pullbackMaps': 'pullback maps in a fiber product',
    'pushoutMaps': 'pushout maps in a pushout diagram',
    'randomSubset': 'generate a random subset',
    'rootPath': 'root path of the Macaulay2 installation',
    'rootURI': 'root URI for documentation',
    'setup': 'set up Macaulay2 for first use',
    'setupEmacs': 'configure Emacs for Macaulay2',
    'sheafMap': 'construct a map of sheaves',
    'stacktrace': 'display the call stack trace',
    'stashValue': 'stash a computed value for later retrieval',
    'unbag': 'extract a value from a bag',
    'uninstallAllPackages': 'uninstall all user-installed packages',
    'yonedaSheafExtension': 'Yoneda sheaf extension',
}


def categorize(name):
    """Categorize a symbol as keyword, type, function, or constant."""
    if name in KEYWORDS:
        return 'keyword'
    if name in CONSTANTS:
        return 'constant'
    if name in KNOWN_TYPES:
        return 'type'
    if name and name[0].isupper():
        return 'type'
    return 'function'


# ═══════════════════════════════════════════════════════════════
# Brace Matching
# ═══════════════════════════════════════════════════════════════

def find_matching_brace(text, pos):
    """Find matching }, respecting strings, line comments, block comments."""
    if pos >= len(text) or text[pos] != '{':
        return None
    depth = 1
    i = pos + 1
    n = len(text)
    while i < n and depth > 0:
        c = text[i]
        if c == '"':
            # Skip string literal
            i += 1
            while i < n and text[i] != '"':
                if text[i] == '\\':
                    i += 1
                i += 1
            i += 1
            continue
        if c == '-' and i + 1 < n:
            if text[i + 1] == '-':
                # Skip line comment
                while i < n and text[i] != '\n':
                    i += 1
                continue
            if text[i + 1] == '*':
                # Skip block comment
                i += 2
                while i + 1 < n and not (text[i] == '*' and text[i + 1] == '-'):
                    i += 1
                i += 2
                continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return None


# ═══════════════════════════════════════════════════════════════
# Text Cleanup
# ═══════════════════════════════════════════════════════════════

# M2 doc formatting tags to strip
_FORMATTING_TAGS = {'TO', 'TT', 'EM', 'BOLD', 'ITALIC', 'HREF', 'HEADER1',
                    'HEADER2', 'HEADER3', 'HEADER4', 'PARA', 'UL', 'LI',
                    'PRE', 'CODE', 'TEX', 'EXAMPLE'}


def clean_doc_text(text):
    """Strip M2 formatting macros, keeping human-readable text."""
    if not text:
        return ''
    # TT "text" -> text
    text = re.sub(r'\bTT\s+"([^"]*)"', r'\1', text)
    # TO "text" -> text
    text = re.sub(r'\bTO\s+"([^"]*)"', r'\1', text)
    # TO symbol -> symbol
    text = re.sub(r'\bTO\s+(\w+)', r'\1', text)
    # TO2("sym", "display") -> display
    text = re.sub(r'\bTO2\s*\(\s*"[^"]*"\s*,\s*"([^"]*)"\s*\)', r'\1', text)
    # Remove PARA{}, PARA{...}
    text = re.sub(r'\bPARA\s*\{[^}]*\}', ' ', text)
    # Remove other formatting tags with empty braces
    text = re.sub(r'\b(?:UL|LI|EXAMPLE|PRE|CODE)\s*\{[^}]*\}', '', text)
    # Remove remaining tag words
    for tag in _FORMATTING_TAGS:
        text = re.sub(r'\b' + tag + r'\b', '', text)
    # Remove quotes used as list separators: ", "
    text = re.sub(r'"\s*,\s*"', ' ', text)
    # Remove standalone quotes
    text = text.replace('"', '')
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Truncate to reasonable length
    if len(text) > 200:
        text = text[:197] + '...'
    return text


# ═══════════════════════════════════════════════════════════════
# Document Block Extraction
# ═══════════════════════════════════════════════════════════════

def iter_document_blocks(content):
    """Yield each `document { ... }` block as a string."""
    i = 0
    while i < len(content):
        m = re.search(r'(?<![A-Za-z_])document\s*\{', content[i:])
        if not m:
            break
        brace_pos = i + m.end() - 1
        end = find_matching_brace(content, brace_pos)
        if end is None:
            i = brace_pos + 1
            continue
        yield content[brace_pos:end + 1]
        i = end + 1


def iter_doc_triple_blocks(content):
    """Yield each `doc /// ... ///` block's inner text."""
    for m in re.finditer(r'(?<![A-Za-z_])doc\s*///(.*?)///', content, re.DOTALL):
        yield m.group(1)


# ═══════════════════════════════════════════════════════════════
# Parsing document { ... } blocks
# ═══════════════════════════════════════════════════════════════

def parse_key(block):
    """Extract primary symbol name, option keys, and overloads from Key field.

    Returns: (primary_name, option_keys, overloads)
      option_keys: [(func_name, option_name), ...]
      overloads: [(func_name, [type1, type2, ...]), ...]
    """
    m = re.search(r'\bKey\s*=>\s*', block)
    if not m:
        return None, [], []

    pos = m.end()
    # Skip whitespace
    while pos < len(block) and block[pos] in ' \t\n\r':
        pos += 1

    primary = None
    option_keys = []
    overloads = []

    if pos < len(block) and block[pos] == '{':
        # Complex key: { symbol, (func, Type), [func, Opt], ... }
        end = find_matching_brace(block, pos)
        if end is None:
            return None, [], []
        key_text = block[pos + 1:end]

        # Extract [func, Option]
        for om in re.finditer(r'\[\s*(\w+)\s*,\s*(\w+)\s*\]', key_text):
            option_keys.append((om.group(1), om.group(2)))

        # Extract (func, Type, ...)
        for om in re.finditer(r'\(\s*(\w+)\s*,\s*([^)]+)\)', key_text):
            fn = om.group(1)
            types = [t.strip() for t in om.group(2).split(',')]
            overloads.append((fn, types))

        # Find primary: first bare identifier (not inside parens/brackets)
        # Remove all [...] and (...) content, strings, and 'symbol' keyword
        cleaned = re.sub(r'\[.*?\]', ' ', key_text)
        cleaned = re.sub(r'\(.*?\)', ' ', cleaned)
        cleaned = re.sub(r'"[^"]*"', ' ', cleaned)
        cleaned = re.sub(r'\bsymbol\s+', '', cleaned)
        word = re.search(r'\b([A-Za-z]\w*)\b', cleaned)
        if word:
            primary = word.group(1)

        # Fallback: use name from first overload or option
        if not primary and overloads:
            primary = overloads[0][0]
        if not primary and option_keys:
            primary = option_keys[0][0]

    elif pos < len(block) and block[pos] == '(':
        # Key => (func, Type)
        pm = re.match(r'\(\s*(\w+)\s*,\s*([^)]+)\)', block[pos:])
        if pm:
            primary = pm.group(1)
            overloads.append((primary, [t.strip() for t in pm.group(2).split(',')]))

    else:
        # Key => symbol name  or  Key => name
        sm = re.match(r'(?:symbol\s+)?(\w+)', block[pos:])
        if sm:
            primary = sm.group(1)

    return primary, option_keys, overloads


def parse_headline(block):
    """Extract Headline => "...", or fall back to first inline string."""
    m = re.search(r'\bHeadline\s*=>\s*"([^"]*)"', block)
    if m:
        return m.group(1)

    # Fallback: some doc blocks have inline text instead of Headline.
    # e.g.  document { Key => Bareiss, "description text", SeeAlso => ... }
    # Find the first quoted string after Key that isn't part of a named field.
    key_m = re.search(r'\bKey\s*=>', block)
    if not key_m:
        return None
    # Skip past the Key value (symbol name, list, or tuple)
    pos = key_m.end()
    # Skip whitespace and the key value
    if pos < len(block):
        while pos < len(block) and block[pos] in ' \t\n\r':
            pos += 1
        if pos < len(block) and block[pos] == '{':
            end = find_matching_brace(block, pos)
            if end:
                pos = end + 1
        elif pos < len(block) and block[pos] == '(':
            # Skip parenthesized expression
            depth = 1
            pos += 1
            while pos < len(block) and depth > 0:
                if block[pos] == '(':
                    depth += 1
                elif block[pos] == ')':
                    depth -= 1
                pos += 1
        else:
            # Skip bare word
            while pos < len(block) and block[pos] not in ',}\n':
                pos += 1

    # Now look for a comma followed by a quoted string (inline description)
    rest = block[pos:]
    m = re.search(r',\s*\n?\s*"([^"]{5,})"', rest)
    if m:
        desc = m.group(1).strip()
        # Truncate long inline descriptions
        if len(desc) > 120:
            desc = desc[:117] + '...'
        return desc
    # Also try TT "..." followed by text
    m = re.search(r',\s*\n?\s*TT\s+"(\w+)"', rest)
    if m:
        return None  # TT is formatting, not a description

    return None


def parse_usage(block):
    """Extract Usage => "..."."""
    m = re.search(r'\bUsage\s*=>\s*"([^"]*)"', block)
    return m.group(1) if m else None


def parse_inputs(block):
    """Parse Inputs => { ... }, returning (params, options).

    params: [{"name": str, "type": str?}, ...]
    options: [{"name": str, "type": str?, "info": str?}, ...]
    """
    m = re.search(r'\bInputs\s*=>\s*\{', block)
    if not m:
        return [], []

    brace_pos = m.end() - 1
    end = find_matching_brace(block, brace_pos)
    if end is None:
        return [], []

    text = block[brace_pos + 1:end]
    params = []
    options = []

    # Walk through looking for top-level entries (split by commas at depth 0)
    entries = split_top_level(text)
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue

        # Option with type: OptionName => Type => desc
        om = re.match(r'([A-Z]\w+)\s*=>\s*(\w+)\s*=>\s*(.*)', entry, re.DOTALL)
        if om:
            desc = extract_desc_value(om.group(3).strip())
            options.append({'name': om.group(1), 'type': om.group(2), 'info': desc})
            continue

        # Option without type: OptionName => desc
        om = re.match(r'([A-Z]\w+)\s*=>\s*(.*)', entry, re.DOTALL)
        if om:
            opt_name = om.group(1)
            # Skip M2 formatting tags mistaken as option names
            if opt_name in _FORMATTING_TAGS:
                continue
            desc = extract_desc_value(om.group(2).strip())
            options.append({'name': opt_name, 'info': desc})
            continue

        # Parameter: "name" => Type => desc
        pm = re.match(r'"(\w+)"\s*=>\s*(\w+)\s*=>\s*(.*)', entry, re.DOTALL)
        if pm:
            desc = extract_desc_value(pm.group(3).strip())
            params.append({'name': pm.group(1), 'type': pm.group(2), 'info': desc})
            continue

        # Parameter: "name" => desc_or_type
        pm = re.match(r'"(\w+)"\s*=>\s*(.*)', entry, re.DOTALL)
        if pm:
            val = pm.group(2).strip()
            # Check if it's a bare type name
            type_m = re.match(r'([A-Z]\w+)\s*$', val)
            if type_m:
                params.append({'name': pm.group(1), 'type': type_m.group(1)})
            else:
                desc = extract_desc_value(val)
                params.append({'name': pm.group(1), 'type': desc})
            continue

        # Bare "name"
        pm = re.match(r'"(\w+)"', entry)
        if pm:
            params.append({'name': pm.group(1)})
            continue

        # Bare Type (for Inputs that just list types)
        tm = re.match(r'([A-Z]\w+)\s*$', entry)
        if tm and tm.group(1) not in _FORMATTING_TAGS:
            params.append({'type': tm.group(1)})

    return params, options


def parse_outputs(block):
    """Parse Outputs => { ... }, returning [{type, info}, ...]."""
    m = re.search(r'\bOutputs\s*=>\s*\{', block)
    if not m:
        return []

    brace_pos = m.end() - 1
    end = find_matching_brace(block, brace_pos)
    if end is None:
        return []

    text = block[brace_pos + 1:end]
    outputs = []

    entries = split_top_level(text)
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue

        # Type => "desc" or Type => { ... }
        om = re.match(r'([A-Z]\w+)\s*=>\s*(.*)', entry, re.DOTALL)
        if om and om.group(1) not in _FORMATTING_TAGS:
            desc = extract_desc_value(om.group(2).strip())
            outputs.append({'type': om.group(1), 'info': desc})
            continue

        # Bare Type
        tm = re.match(r'([A-Z]\w+)\s*$', entry)
        if tm and tm.group(1) not in _FORMATTING_TAGS:
            outputs.append({'type': tm.group(1)})
            continue

        # { ... } description without type
        if entry.startswith('{'):
            end_b = find_matching_brace(entry, 0)
            if end_b:
                desc = clean_doc_text(entry[1:end_b])
                if desc:
                    outputs.append({'info': desc})

    return outputs


def split_top_level(text):
    """Split text by commas at brace depth 0, respecting strings."""
    entries = []
    depth = 0
    current = []
    in_string = False
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if in_string:
            current.append(c)
            if c == '\\' and i + 1 < n:
                current.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_string = False
            i += 1
            continue
        if c == '"':
            in_string = True
            current.append(c)
        elif c == '{':
            depth += 1
            current.append(c)
        elif c == '}':
            depth -= 1
            current.append(c)
        elif c == ',' and depth == 0:
            entries.append(''.join(current))
            current = []
        else:
            current.append(c)
        i += 1
    if current:
        entries.append(''.join(current))
    return entries


def extract_desc_value(text):
    """Extract a description from either "string" or { ... } content."""
    text = text.strip()
    if text.startswith('"'):
        # Simple string
        m = re.match(r'"([^"]*)"', text)
        return m.group(1) if m else ''
    if text.startswith('{'):
        end = find_matching_brace(text, 0)
        if end:
            return clean_doc_text(text[1:end])
    # Might be just a bare word
    return clean_doc_text(text)


# ═══════════════════════════════════════════════════════════════
# Parsing doc /// ... /// blocks
# ═══════════════════════════════════════════════════════════════

def parse_doc_triple(text):
    """Parse a doc /// ... /// block (indentation-based format)."""
    result = {
        'primary': None,
        'headline': None,
        'usage': None,
        'option_keys': [],
        'overloads': [],
        'params': [],
        'options': [],
        'outputs': [],
    }

    section = None
    section_lines = []

    def flush_section():
        nonlocal section, section_lines
        if section == 'Key':
            _parse_triple_key(section_lines, result)
        elif section == 'Headline':
            if section_lines:
                result['headline'] = ' '.join(l.strip() for l in section_lines if l.strip())
        elif section == 'Usage':
            if section_lines:
                result['usage'] = section_lines[0].strip()
        elif section == 'Inputs':
            _parse_triple_inputs(section_lines, result)
        elif section == 'Outputs':
            _parse_triple_outputs(section_lines, result)
        section = None
        section_lines = []

    sections = {'Key', 'Headline', 'Usage', 'Inputs', 'Outputs',
                'Description', 'SeeAlso', 'Caveat', 'Consequences', 'Subnodes'}

    for line in text.split('\n'):
        stripped = line.strip()
        if not stripped or stripped == 'Node':
            continue

        if stripped in sections:
            flush_section()
            section = stripped
            continue

        if section:
            section_lines.append(line)

    flush_section()
    return result


def _parse_triple_key(lines, result):
    """Parse Key section lines from doc /// format."""
    for line in lines:
        s = line.strip()
        if not s:
            continue

        # [func, Option]
        om = re.match(r'\[\s*(\w+)\s*,\s*(\w+)\s*\]', s)
        if om:
            result['option_keys'].append((om.group(1), om.group(2)))
            continue

        # (func, Type, ...)
        pm = re.match(r'\(\s*(\w+)\s*,\s*(.+?)\s*\)', s)
        if pm:
            fn = pm.group(1)
            types = [t.strip() for t in pm.group(2).split(',')]
            result['overloads'].append((fn, types))
            if result['primary'] is None:
                result['primary'] = fn
            continue

        # Bare symbol or quoted string
        wm = re.match(r'"?([A-Za-z]\w*)"?', s)
        if wm and result['primary'] is None:
            result['primary'] = wm.group(1)


def _parse_triple_inputs(lines, result):
    """Parse Inputs section lines from doc /// format."""
    for line in lines:
        s = line.strip()
        if not s:
            continue

        # OptionName => Type
        om = re.match(r'(\w+)\s*=>\s*(\w+)', s)
        if om:
            result['options'].append({'name': om.group(1), 'type': om.group(2)})
            continue

        # param:Type or param:{Type, ...}
        pm = re.match(r'(\w+)\s*:\s*\{?([^}]+)\}?', s)
        if pm:
            result['params'].append({'name': pm.group(1), 'type': pm.group(2).strip()})
            continue

        # "paramName" => ...
        sm = re.match(r'"(\w+)"', s)
        if sm:
            result['params'].append({'name': sm.group(1)})


def _parse_triple_outputs(lines, result):
    """Parse Outputs section lines from doc /// format."""
    for line in lines:
        s = line.strip()
        if not s:
            continue

        # :Type
        tm = re.match(r':(\w+)', s)
        if tm:
            result['outputs'].append({'type': tm.group(1)})
            continue

        # Type (bare uppercase)
        bm = re.match(r'([A-Z]\w+)', s)
        if bm:
            result['outputs'].append({'type': bm.group(1)})


# ═══════════════════════════════════════════════════════════════
# Package Headlines
# ═══════════════════════════════════════════════════════════════

def extract_package_headlines(packages_dir):
    """Extract newPackage("Name", Headline => "...") from top-level package files."""
    headlines = {}
    for fpath in Path(packages_dir).glob('*.m2'):
        try:
            content = fpath.read_text(errors='replace')
        except Exception:
            continue
        for m in re.finditer(
            r'newPackage\s*\(\s*"(\w+)".*?Headline\s*=>\s*"([^"]*)"',
            content, re.DOTALL
        ):
            headlines[m.group(1)] = m.group(2)
    return headlines


# ═══════════════════════════════════════════════════════════════
# M2 Help Extraction
# ═══════════════════════════════════════════════════════════════

def extract_m2_help_headlines(symbols):
    """Run M2's help command for each symbol and extract headlines.

    Returns: dict mapping symbol name -> headline string
    """
    import tempfile

    # Check if M2 is available
    try:
        subprocess.run(['M2', '--version'], capture_output=True, timeout=10)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("  M2 not found, skipping help extraction", file=sys.stderr)
        return {}

    # Build M2 script
    lines = []
    for sym in sorted(symbols):
        lines.append(
            f'try print("###" | "{sym}" | "###" | '
            f'substring(toString net help "{sym}", 0, '
            f'min(300, length toString net help "{sym}")))'
        )

    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.m2', delete=False) as f:
        f.write('\n'.join(lines))
        script_path = f.name

    try:
        result = subprocess.run(
            ['M2', '--stop', '--no-readline', '--silent', script_path],
            capture_output=True, timeout=300
        )
        stdout = result.stdout.decode('utf-8', errors='replace')
    except subprocess.TimeoutExpired:
        print("  M2 help extraction timed out", file=sys.stderr)
        return {}
    finally:
        os.unlink(script_path)

    # Parse output
    headlines = {}
    for line in stdout.split('\n'):
        m = re.match(r'###(\w+)###(.*)', line)
        if m:
            sym = m.group(1)
            text = m.group(2).strip()
            hm = re.match(r'\S+\s+--\s+(.*)', text)
            if hm:
                hl = hm.group(1).strip()
                hl = re.sub(r'\*+$', '', hl).strip()
                hl = hl.replace('\ufffd', '')
                if hl:
                    headlines[sym] = hl

    return headlines


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    kernel_dir = os.path.dirname(script_dir)
    m2_repo = os.path.join(os.path.dirname(kernel_dir), 'M2')

    # ── 1. Read vim dictionary ──
    dict_path = os.path.join(m2_repo, 'Macaulay2', 'editors', 'vim', 'm2.vim.dict')
    if not os.path.exists(dict_path):
        print(f"Error: vim dictionary not found at {dict_path}", file=sys.stderr)
        sys.exit(1)

    with open(dict_path, 'r') as f:
        dict_content = f.read()

    vim_symbols = []
    for line in dict_content.split('\n'):
        line = line.strip()
        if not line or line.startswith('"'):
            continue
        if ' ' in line and len(line) > 100:
            vim_symbols = line.split()
            break

    all_symbols = sorted(set(vim_symbols))
    symbol_set = set(all_symbols)
    print(f"Found {len(all_symbols)} symbols in vim dictionary", file=sys.stderr)

    # ── 2. Parse Macaulay2Doc ──
    doc_dir = os.path.join(m2_repo, 'Macaulay2', 'packages', 'Macaulay2Doc')
    packages_dir = os.path.join(m2_repo, 'Macaulay2', 'packages')

    # symbol_name -> accumulated doc data
    symbol_docs = {}
    # func_name -> set of option names (from Key [func, Opt] patterns)
    func_option_keys = defaultdict(set)
    # option_name -> best description found in any Inputs section
    option_info = {}

    files_parsed = 0
    blocks_parsed = 0

    for root, dirs, files in os.walk(doc_dir):
        for fname in files:
            if not fname.endswith('.m2'):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', errors='replace') as f:
                    content = f.read()
            except Exception:
                continue

            files_parsed += 1

            # Parse document { ... } blocks
            for block_text in iter_document_blocks(content):
                blocks_parsed += 1
                primary, opt_keys, overloads = parse_key(block_text)
                if not primary:
                    continue

                headline = parse_headline(block_text)
                usage = parse_usage(block_text)
                params, options = parse_inputs(block_text)
                outputs = parse_outputs(block_text)

                # Store option keys
                for fn, opt_name in opt_keys:
                    func_option_keys[fn].add(opt_name)

                # Store option descriptions
                for opt in options:
                    name = opt['name']
                    if name not in option_info or not option_info[name].get('info'):
                        option_info[name] = dict(opt)

                # Merge into symbol docs (first headline/usage wins)
                doc = symbol_docs.setdefault(primary, {})
                if headline and not doc.get('headline'):
                    doc['headline'] = headline
                if usage and not doc.get('usage'):
                    doc['usage'] = usage
                if params and not doc.get('params'):
                    doc['params'] = params
                if outputs and not doc.get('outputs'):
                    doc['outputs'] = outputs
                if options and not doc.get('options'):
                    doc['options'] = options

            # Parse doc /// ... /// blocks
            for block_text in iter_doc_triple_blocks(content):
                blocks_parsed += 1
                parsed = parse_doc_triple(block_text)
                primary = parsed['primary']
                if not primary:
                    continue

                for fn, opt_name in parsed['option_keys']:
                    func_option_keys[fn].add(opt_name)

                for opt in parsed['options']:
                    name = opt['name']
                    if name not in option_info or not option_info[name].get('info'):
                        option_info[name] = dict(opt)

                doc = symbol_docs.setdefault(primary, {})
                if parsed['headline'] and not doc.get('headline'):
                    doc['headline'] = parsed['headline']
                if parsed['usage'] and not doc.get('usage'):
                    doc['usage'] = parsed['usage']
                if parsed['params'] and not doc.get('params'):
                    doc['params'] = parsed['params']
                if parsed['outputs'] and not doc.get('outputs'):
                    doc['outputs'] = parsed['outputs']
                if parsed['options'] and not doc.get('options'):
                    doc['options'] = parsed['options']

    print(f"Parsed {files_parsed} doc files, {blocks_parsed} blocks from Macaulay2Doc",
          file=sys.stderr)

    # ── 3. Scan package files for extra headlines ──
    pkg_headlines = extract_package_headlines(packages_dir)
    for name, headline in pkg_headlines.items():
        doc = symbol_docs.setdefault(name, {})
        if not doc.get('headline'):
            doc['headline'] = headline

    # Also scan ALL package files recursively for document blocks
    # (for symbols in vim dict that aren't yet documented)
    undocumented = symbol_set - set(symbol_docs.keys())
    if undocumented:
        extra_blocks = 0
        for fpath in Path(packages_dir).rglob('*.m2'):
            # Skip Macaulay2Doc (already scanned above)
            if 'Macaulay2Doc' in fpath.parts:
                continue
            try:
                content = fpath.read_text(errors='replace')
            except Exception:
                continue

            for block_text in iter_document_blocks(content):
                primary, opt_keys, _ = parse_key(block_text)
                if not primary or primary not in undocumented:
                    continue
                headline = parse_headline(block_text)
                if headline:
                    extra_blocks += 1
                    doc = symbol_docs.setdefault(primary, {})
                    if not doc.get('headline'):
                        doc['headline'] = headline
                    usage = parse_usage(block_text)
                    if usage and not doc.get('usage'):
                        doc['usage'] = usage

            for block_text in iter_doc_triple_blocks(content):
                parsed = parse_doc_triple(block_text)
                primary = parsed['primary']
                if not primary or primary not in undocumented:
                    continue
                if parsed['headline']:
                    extra_blocks += 1
                    doc = symbol_docs.setdefault(primary, {})
                    if not doc.get('headline'):
                        doc['headline'] = parsed['headline']
                    if parsed['usage'] and not doc.get('usage'):
                        doc['usage'] = parsed['usage']

        print(f"Found {extra_blocks} extra blocks from package files", file=sys.stderr)

    # ── 4. Merge option data ──
    # Attach option lists to functions using func_option_keys
    for func_name, opt_names in func_option_keys.items():
        doc = symbol_docs.setdefault(func_name, {})
        if not doc.get('options'):
            opts = []
            for opt_name in sorted(opt_names):
                entry = {'name': opt_name}
                if opt_name in option_info:
                    info = option_info[opt_name]
                    if 'type' in info:
                        entry['type'] = info['type']
                    if 'info' in info:
                        entry['info'] = info['info']
                opts.append(entry)
            if opts:
                doc['options'] = opts

    # For option symbols in vim dict without standalone docs,
    # use their description from function Inputs
    for opt_name, info in option_info.items():
        if opt_name in symbol_set and opt_name not in symbol_docs:
            desc = info.get('info', '')
            if desc:
                symbol_docs[opt_name] = {'headline': desc}

    # ── 4b. Extract headlines from M2's help command ──
    still_undoc = symbol_set - {n for n in symbol_set if symbol_docs.get(n, {}).get('headline')}
    if still_undoc:
        m2_headlines = extract_m2_help_headlines(still_undoc)
        for name, headline in m2_headlines.items():
            if name in symbol_set:
                doc = symbol_docs.setdefault(name, {})
                if not doc.get('headline'):
                    doc['headline'] = headline
        print(f"Extracted {len(m2_headlines)} headlines from M2 help command",
              file=sys.stderr)

    # Apply fallback descriptions for keywords, constants, and other
    # well-known symbols without SimpleDoc documentation
    for name, desc in FALLBACK_DESCRIPTIONS.items():
        if name in symbol_set:
            doc = symbol_docs.setdefault(name, {})
            if not doc.get('headline'):
                doc['headline'] = desc

    # ── 5. Build output ──
    completions = []
    documented = 0
    with_info = 0

    for name in all_symbols:
        if not name or name.startswith('"'):
            continue

        cat = categorize(name)
        entry = {'label': name, 'type': cat}

        doc = symbol_docs.get(name, {})

        if doc.get('headline'):
            entry['info'] = doc['headline']
            documented += 1
        if doc.get('usage'):
            entry['detail'] = doc['usage']
        if doc.get('options'):
            entry['options'] = doc['options']
        if doc.get('params'):
            entry['inputs'] = doc['params']
        if doc.get('outputs'):
            entry['outputs'] = doc['outputs']

        completions.append(entry)

    # Write
    output_path = os.path.join(kernel_dir, 'src', 'm2Symbols.json')
    with open(output_path, 'w') as f:
        json.dump(completions, f, indent=None, separators=(',', ':'))

    file_size = os.path.getsize(output_path)
    print(f"\nWrote {len(completions)} entries to {output_path} ({file_size // 1024} KB)",
          file=sys.stderr)
    print(f"  Documented (with headline): {documented}/{len(completions)} "
          f"({100 * documented // len(completions)}%)", file=sys.stderr)

    # Stats
    cats = defaultdict(int)
    for c in completions:
        cats[c['type']] += 1
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count}", file=sys.stderr)

    with_opts = sum(1 for c in completions if 'options' in c)
    with_usage = sum(1 for c in completions if 'detail' in c)
    with_inputs = sum(1 for c in completions if 'inputs' in c)
    with_outputs = sum(1 for c in completions if 'outputs' in c)
    print(f"  With options: {with_opts}", file=sys.stderr)
    print(f"  With usage: {with_usage}", file=sys.stderr)
    print(f"  With inputs: {with_inputs}", file=sys.stderr)
    print(f"  With outputs: {with_outputs}", file=sys.stderr)

    # Show undocumented symbols
    still_undoc = [name for name in all_symbols
                   if name and not name.startswith('"')
                   and not symbol_docs.get(name, {}).get('headline')]
    if still_undoc:
        print(f"\n  Undocumented ({len(still_undoc)}):", file=sys.stderr)
        # Show first 20
        for name in still_undoc[:20]:
            print(f"    {name}", file=sys.stderr)
        if len(still_undoc) > 20:
            print(f"    ... and {len(still_undoc) - 20} more", file=sys.stderr)


if __name__ == '__main__':
    main()
