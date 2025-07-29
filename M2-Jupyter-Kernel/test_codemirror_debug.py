#!/usr/bin/env python3
"""
Debug script to check CodeMirror language registration
"""

import subprocess
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Start JupyterLab
proc = subprocess.Popen(
    ['./venv/bin/jupyter', 'lab', '--no-browser', '--port=8899'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for startup
time.sleep(5)

# Get server info
result = subprocess.run(['jupyter', 'server', 'list', '--json'], 
                       capture_output=True, text=True)
servers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
server = next((s for s in servers if s['port'] == 8899), None)

if not server:
    print("Server not found")
    proc.terminate()
    exit(1)

token = server['token']
url = f"http://localhost:8899/lab?token={token}"

print(f"Server running at: {url}")
print("\nTo debug manually:")
print("1. Open the URL in a browser")
print("2. Create a new notebook with M2 kernel")
print("3. Open browser console (F12)")
print("4. Type: ")
print("   JupyterLab.serviceManager.contents")
print("   jupyterlab.extensions")
print("5. Look for @m2-jupyter/jupyterlab-m2-codemirror")
print("\nAlso check:")
print("- Type some M2 code and inspect the DOM")
print("- Look for cm-keyword, cm-type, cm-function classes")

# Keep server running for manual testing
print("\nPress Ctrl+C to stop the server...")
try:
    proc.wait()
except KeyboardInterrupt:
    proc.terminate()
    print("\nServer stopped")