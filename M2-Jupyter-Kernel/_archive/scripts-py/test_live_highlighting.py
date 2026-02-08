#!/usr/bin/env python3

import subprocess
import time
import json
import requests
import os

# Create test notebook with keyword/type/function examples
notebook = {
    "cells": [
        {
            "cell_type": "code", 
            "source": [
                "-- Keywords test\n",
                "if true then print \"hello\"\n",
                "for i from 1 to 5 do print i"
            ],
            "metadata": {}
        },
        {
            "cell_type": "code",
            "source": [
                "-- Types test\n", 
                "R = QQ[x,y,z]\n",
                "S = ZZ/101\n",
                "T = Ring"
            ],
            "metadata": {}
        },
        {
            "cell_type": "code",
            "source": [
                "-- Functions test\n",
                "I = ideal(x^2, y^2)\n", 
                "G = gb I\n",
                "M = matrix {{1,2},{3,4}}"
            ],
            "metadata": {}
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

with open('test_highlighting.ipynb', 'w') as f:
    json.dump(notebook, f, indent=2)

print("Created test_highlighting.ipynb")

# Start JupyterLab without browser
proc = subprocess.Popen(
    ['jupyter', 'lab', '--no-browser', '--port=8899', 'test_highlighting.ipynb'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for server
time.sleep(5)

# Get server info
result = subprocess.run(['jupyter', 'server', 'list', '--json'], 
                       capture_output=True, text=True)
servers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
server = next((s for s in servers if s['port'] == 8899), None)

if server:
    token = server['token']
    base_url = f"http://localhost:8899"
    headers = {'Authorization': f'token {token}'}
    
    # Export notebook as HTML
    response = requests.get(
        f"{base_url}/api/contents/test_highlighting.ipynb",
        headers=headers
    )
    
    if response.status_code == 200:
        notebook_data = response.json()
        
        # Convert to HTML via nbconvert API
        nbconvert_response = requests.post(
            f"{base_url}/api/nbconvert/html/test_highlighting.ipynb",
            headers=headers
        )
        
        if nbconvert_response.status_code == 200:
            with open('test_highlighting_export.html', 'w') as f:
                f.write(nbconvert_response.text)
            print("Exported to test_highlighting_export.html")
        else:
            print(f"Export failed: {nbconvert_response.status_code}")
    else:
        print(f"Failed to get notebook: {response.status_code}")

# Terminate
proc.terminate()
proc.wait()

# Check the HTML export for highlighting
print("\nChecking HTML export for syntax highlighting...")
with open('test_highlighting_export.html', 'r') as f:
    html = f.read()
    
    # Look for keyword highlighting
    if 'class="k"' in html or 'class="kw"' in html:
        print("✓ Keywords appear to be highlighted")
    else:
        print("✗ Keywords NOT highlighted")
        
    # Look for type highlighting  
    if 'class="kt"' in html or 'class="nb"' in html:
        print("✓ Types appear to be highlighted")
    else:
        print("✗ Types NOT highlighted")
        
    # Look for function highlighting
    if 'class="nf"' in html or 'class="nb"' in html:
        print("✓ Functions appear to be highlighted")
    else:
        print("✗ Functions NOT highlighted")
        
    # Extract some example lines
    print("\nExample lines from export:")
    lines = html.split('\n')
    for i, line in enumerate(lines):
        if 'if true then' in line:
            print(f"  Keywords: {line.strip()}")
        elif 'QQ[x,y,z]' in line:
            print(f"  Types: {line.strip()}")
        elif 'ideal(' in line:
            print(f"  Functions: {line.strip()}")