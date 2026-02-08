#!/usr/bin/env python3
"""
Test M2 syntax highlighting by executing a notebook and examining the output structure.
"""

import json
import subprocess
import sys
from pathlib import Path
import tempfile
import os

def execute_notebook(notebook_path):
    """Execute a notebook and return the executed notebook."""
    with tempfile.NamedTemporaryFile(suffix='.ipynb', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        # Execute the notebook
        cmd = [
            sys.executable, '-m', 'jupyter', 'nbconvert',
            '--to', 'notebook',
            '--execute',
            '--ExecutePreprocessor.timeout=60',
            '--output', tmp_path,
            notebook_path
        ]
        
        print(f"Executing notebook: {notebook_path}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error executing notebook:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return None
        
        # Read the executed notebook
        with open(tmp_path, 'r') as f:
            return json.load(f)
    
    finally:
        # Clean up
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

def analyze_cell_outputs(notebook):
    """Analyze the outputs of executed cells."""
    if not notebook:
        return
    
    print("\nAnalyzing cell outputs:")
    print("=" * 60)
    
    for i, cell in enumerate(notebook.get('cells', [])):
        if cell['cell_type'] != 'code':
            continue
            
        print(f"\nCell {i + 1}:")
        print(f"Source: {cell['source'][:50]}..." if isinstance(cell['source'], str) else cell['source'][0][:50] + "...")
        
        outputs = cell.get('outputs', [])
        for j, output in enumerate(outputs):
            print(f"\n  Output {j + 1}:")
            print(f"  Type: {output.get('output_type')}")
            
            if output['output_type'] == 'execute_result':
                data = output.get('data', {})
                print(f"  Data types: {list(data.keys())}")
                
                # Check for different output formats
                if 'text/html' in data:
                    html = data['text/html']
                    if isinstance(html, list):
                        html = ''.join(html)
                    print(f"  HTML output (first 200 chars): {html[:200]}...")
                    
                    # Look for syntax highlighting classes
                    if 'class=' in html or 'style=' in html:
                        print("  → Contains styling/class information")
                    
                    # Look for Pygments classes
                    pygments_classes = ['highlight', 'codehilite', 'syntax']
                    for cls in pygments_classes:
                        if cls in html:
                            print(f"  → Found Pygments class: {cls}")
                
                if 'text/plain' in data:
                    plain = data['text/plain']
                    if isinstance(plain, list):
                        plain = ''.join(plain)
                    print(f"  Plain text output: {plain[:100]}...")
                
                if 'application/x-macaulay2' in data:
                    print("  → Contains M2-specific MIME type")
            
            elif output['output_type'] == 'stream':
                text = output.get('text', '')
                if isinstance(text, list):
                    text = ''.join(text)
                print(f"  Stream ({output.get('name')}): {text[:100]}...")
            
            elif output['output_type'] == 'display_data':
                data = output.get('data', {})
                print(f"  Display data types: {list(data.keys())}")

def check_syntax_in_source():
    """Check if the notebook source has any syntax information."""
    print("\nChecking source cell metadata:")
    print("=" * 60)
    
    with open('test_syntax_notebook.ipynb', 'r') as f:
        notebook = json.load(f)
    
    for i, cell in enumerate(notebook.get('cells', [])):
        if cell['cell_type'] != 'code':
            continue
            
        print(f"\nCell {i + 1} metadata:")
        metadata = cell.get('metadata', {})
        print(f"  Metadata keys: {list(metadata.keys())}")
        
        # Check for any syntax-related metadata
        if 'language' in metadata:
            print(f"  Language: {metadata['language']}")
        if 'collapsed' in metadata:
            print(f"  Collapsed: {metadata['collapsed']}")

def test_direct_kernel_execution():
    """Test direct kernel execution to see output format."""
    print("\nTesting direct kernel execution:")
    print("=" * 60)
    
    try:
        from jupyter_client import KernelManager
        
        # Start M2 kernel
        km = KernelManager(kernel_name='macaulay2')
        km.start_kernel()
        kc = km.client()
        kc.start_channels()
        
        # Wait for kernel to be ready
        kc.wait_for_ready(timeout=10)
        
        # Execute some M2 code
        code = """-- Test syntax highlighting
R = QQ[x,y,z]
I = ideal(x^2, y^2)
gb I"""
        
        print(f"Executing code:\n{code}")
        
        # Execute and get result
        msg_id = kc.execute(code, store_history=True)
        
        # Collect all messages
        messages = []
        while True:
            try:
                msg = kc.get_iopub_msg(timeout=1)
                messages.append(msg)
                
                if msg['header']['msg_type'] == 'status' and msg['content']['execution_state'] == 'idle':
                    break
            except:
                break
        
        # Analyze messages
        print("\nReceived messages:")
        for msg in messages:
            msg_type = msg['header']['msg_type']
            print(f"\n  Message type: {msg_type}")
            
            if msg_type == 'execute_result':
                data = msg['content']['data']
                print(f"  Data types: {list(data.keys())}")
                
                for mime_type, content in data.items():
                    print(f"  {mime_type}: {str(content)[:200]}...")
            
            elif msg_type == 'display_data':
                data = msg['content']['data']
                print(f"  Display data types: {list(data.keys())}")
        
        # Shutdown kernel
        kc.stop_channels()
        km.shutdown_kernel()
        
    except Exception as e:
        print(f"Error testing kernel: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests."""
    print("M2 Syntax Highlighting Structure Test")
    print("=" * 60)
    
    # First check the source
    check_syntax_in_source()
    
    # Execute the notebook
    executed_notebook = execute_notebook('test_syntax_notebook.ipynb')
    
    if executed_notebook:
        # Analyze outputs
        analyze_cell_outputs(executed_notebook)
        
        # Save executed notebook for inspection
        with open('test_syntax_notebook_executed.ipynb', 'w') as f:
            json.dump(executed_notebook, f, indent=2)
        print("\nExecuted notebook saved to: test_syntax_notebook_executed.ipynb")
    
    # Test direct kernel execution
    test_direct_kernel_execution()

if __name__ == "__main__":
    main()