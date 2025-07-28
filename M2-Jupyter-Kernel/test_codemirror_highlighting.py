#!/usr/bin/env python3

import subprocess
import time
import requests
import json
import os

# Start JupyterLab without browser
proc = subprocess.Popen(['jupyter', 'lab', '--no-browser', '--port=8899'], 
                       stdout=subprocess.PIPE, 
                       stderr=subprocess.PIPE)

# Wait for server to start
time.sleep(5)

# Get server info
result = subprocess.run(['jupyter', 'server', 'list', '--json'], 
                       capture_output=True, text=True)
servers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
server = next((s for s in servers if s['port'] == 8899), None)

if not server:
    print("Failed to find server")
    proc.terminate()
    exit(1)

token = server['token']
base_url = f"http://localhost:8899"

# Create headers with auth
headers = {
    'Authorization': f'token {token}',
    'Content-Type': 'application/json'
}

# Check if extension is loaded
try:
    # Get lab extensions
    response = requests.get(f"{base_url}/lab/api/extensions", headers=headers)
    extensions = response.json()
    
    print("Loaded extensions:")
    for ext_id, ext_info in extensions.items():
        if 'm2' in ext_id.lower() or 'macaulay' in ext_id.lower():
            print(f"  - {ext_id}: {ext_info.get('name', 'Unknown')}")
    
    # Check if our extension is in the list
    if '@m2-jupyter/jupyterlab-m2-codemirror' in extensions:
        print("\n✓ M2 CodeMirror extension is loaded!")
    else:
        print("\n✗ M2 CodeMirror extension NOT found")
        
except Exception as e:
    print(f"Error checking extensions: {e}")

# Create a test notebook
notebook_content = {
    "cells": [
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [
                "-- Test keywords\n",
                "if true then print \"hello\"\n",
                "for i from 1 to 5 do print i"
            ],
            "outputs": []
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "source": [
                "-- Test types and functions\n",
                "R = QQ[x,y,z]\n",
                "I = ideal(x^2, y^2)\n",
                "gb I"
            ],
            "outputs": []
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "M2",
            "language": "macaulay2",
            "name": "macaulay2"
        },
        "language_info": {
            "name": "macaulay2"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

# Save test notebook
with open('test_highlight.ipynb', 'w') as f:
    json.dump(notebook_content, f, indent=2)

print("\nCreated test_highlight.ipynb")

# Check CodeMirror modes
try:
    response = requests.get(f"{base_url}/lab/api/settings/@jupyterlab/codemirror-extension:plugin", 
                           headers=headers)
    if response.status_code == 200:
        settings = response.json()
        print("\nCodeMirror settings:")
        print(json.dumps(settings, indent=2))
except Exception as e:
    print(f"Error getting CodeMirror settings: {e}")

# Terminate server
print("\nShutting down server...")
proc.terminate()
proc.wait()