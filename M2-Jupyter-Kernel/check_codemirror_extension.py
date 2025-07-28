#!/usr/bin/env python3

import subprocess
import time
import json
import os
import sys

# First check if extension is listed
print("Checking installed extensions...")
result = subprocess.run(['jupyter', 'labextension', 'list'], 
                       capture_output=True, text=True)
print(result.stdout)

# Look for our extension
if '@m2-jupyter/jupyterlab-m2-codemirror' in result.stdout:
    print("✓ M2 CodeMirror extension is installed")
else:
    print("✗ M2 CodeMirror extension NOT found")
    
# Check if the extension files exist
ext_path = subprocess.run(['jupyter', '--data-dir'], 
                         capture_output=True, text=True).stdout.strip()
labext_path = os.path.join(os.path.dirname(ext_path), 'share/jupyter/labextensions/@m2-jupyter/jupyterlab-m2-codemirror')

if os.path.exists(labext_path):
    print(f"\n✓ Extension files found at: {labext_path}")
    # Check for key files
    pkg_json = os.path.join(labext_path, 'package.json')
    if os.path.exists(pkg_json):
        with open(pkg_json) as f:
            pkg = json.load(f)
            print(f"  Version: {pkg.get('version', 'Unknown')}")
            print(f"  Name: {pkg.get('name', 'Unknown')}")
else:
    print(f"\n✗ Extension files NOT found at expected path: {labext_path}")

# Check parser files
parser_files = [
    'lib/parser/parser.js',
    'lib/m2Language.js',
    'lib/index.js'
]

print("\nChecking built files...")
for file in parser_files:
    full_path = os.path.join(os.getcwd(), file)
    if os.path.exists(full_path):
        print(f"  ✓ {file}")
        # Check if it contains our token definitions
        if file == 'lib/parser/parser.js':
            with open(full_path) as f:
                content = f.read()
                if '"Keyword"' in content:
                    print("    - Contains Keyword token")
                if '"Type"' in content:
                    print("    - Contains Type token")
                if '"Function"' in content:
                    print("    - Contains Function token")
    else:
        print(f"  ✗ {file} NOT FOUND")

# Create a test script to check live highlighting
test_script = """
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# This would require selenium and a webdriver to actually test
# For now, we'll just create the notebook
"""

# Create test notebook with M2 code
notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["# M2 Syntax Highlighting Test"]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [
                "-- Keywords should be highlighted\n",
                "if true then\n",
                "    print \"Keywords: if, then, for, while\"\n",
                "else\n",
                "    for i from 1 to 10 do\n",
                "        print i\n",
                "end"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [
                "-- Types should be highlighted\n",
                "R = QQ[x,y,z]  -- QQ is a type\n",
                "S = ZZ/101     -- ZZ is a type\n",
                "T = RR         -- RR is a type\n",
                "U = CC         -- CC is a type"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [
                "-- Functions should be highlighted\n",
                "I = ideal(x^2, y^2)     -- ideal is a function\n",
                "G = gb I                -- gb is a function\n",
                "H = res I               -- res is a function\n",
                "M = matrix {{1,2},{3,4}} -- matrix is a function"
            ]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "M2",
            "language": "macaulay2",
            "name": "macaulay2"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

with open('test_m2_highlighting.ipynb', 'w') as f:
    json.dump(notebook, f, indent=2)
    
print("\nCreated test_m2_highlighting.ipynb")
print("\nTo test live highlighting:")
print("1. Run: jupyter lab test_m2_highlighting.ipynb")
print("2. Check if keywords (if, then, for), types (QQ, ZZ), and functions (ideal, gb) are colored")
print("3. Keywords should be purple, types should be colored, functions should be blue")