#!/usr/bin/env python3
"""Check if JupyterLab recognizes M2 language support."""

import requests
import json

# Get the JupyterLab API endpoint
base_url = "http://localhost:8888"
token = "cffbd61647f516df8983f732623c0a2c1d2c43ed46349fd4"

# Try to get kernelspecs
try:
    response = requests.get(f"{base_url}/api/kernelspecs?token={token}")
    if response.status_code == 200:
        kernelspecs = response.json()
        print("Available kernelspecs:")
        for name, spec in kernelspecs.get('kernelspecs', {}).items():
            print(f"  - {name}: {spec.get('spec', {}).get('display_name', 'Unknown')}")
            lang_info = spec.get('spec', {}).get('language_info', {})
            if lang_info:
                print(f"    Language: {lang_info.get('name', 'Unknown')}")
                print(f"    MIME type: {lang_info.get('mimetype', 'Unknown')}")
                cm_mode = lang_info.get('codemirror_mode', {})
                if isinstance(cm_mode, dict):
                    print(f"    CodeMirror mode: {cm_mode.get('name', 'Unknown')}")
                print()
    else:
        print(f"Failed to get kernelspecs: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
    print("Make sure JupyterLab is running on http://localhost:8888")