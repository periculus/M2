#!/usr/bin/env python3
"""Simple test to verify M2 syntax highlighting is working"""

import subprocess
import time
import sys
from playwright.sync_api import sync_playwright

def test_m2_highlighting():
    # Start JupyterLab
    print("Starting JupyterLab...")
    jupyter_process = subprocess.Popen([
        sys.executable, '-m', 'jupyter', 'lab', '--no-browser',
        '--NotebookApp.token=test123'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait for server to start
    time.sleep(5)
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Navigate to JupyterLab
            print("Opening JupyterLab...")
            page.goto('http://localhost:8888/lab?token=test123')
            page.wait_for_load_state('networkidle')
            
            # Create new notebook with M2 kernel
            print("Creating M2 notebook...")
            
            # Click on launcher if needed
            if page.locator('.jp-Launcher').count() > 0:
                m2_kernel = page.locator('.jp-LauncherCard[data-category="Notebook"][title*="M2"]').first()
                if m2_kernel.count() > 0:
                    m2_kernel.click()
                    page.wait_for_timeout(2000)
            
            # Type some M2 code
            print("Typing M2 code...")
            cell = page.locator('.jp-Cell-inputArea .cm-content').first()
            cell.click()
            cell.type('-- This is a comment\nif true then print "Hello"\nR = QQ[x,y,z]\nI = ideal(x^2, y^2)\nG = gb I')
            
            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path='m2_highlight_test.png', full_page=True)
            
            # Check for syntax highlighting classes
            print("\nChecking for syntax highlighting...")
            
            # Wait a bit for highlighting to apply
            page.wait_for_timeout(1000)
            
            # Get all highlighted elements
            highlights = page.locator('.cm-line span[class*="cm-"]').all()
            
            found_classes = set()
            for element in highlights:
                classes = element.get_attribute('class')
                if classes:
                    found_classes.update(c for c in classes.split() if c.startswith('cm-'))
            
            print(f"Found CSS classes: {sorted(found_classes)}")
            
            # Check for specific highlighting
            expected_highlights = {
                'cm-comment': 'Comments',
                'cm-keyword': 'Keywords (if, then)',
                'cm-bool': 'Booleans (true)',
                'cm-typeName': 'Types (QQ)',
                'cm-function': 'Functions (print, ideal, gb)',
                'cm-string': 'Strings'
            }
            
            for css_class, description in expected_highlights.items():
                if css_class in found_classes:
                    print(f"✓ {description} highlighted")
                else:
                    print(f"✗ {description} NOT highlighted")
            
            browser.close()
            
    finally:
        # Stop JupyterLab
        jupyter_process.terminate()
        jupyter_process.wait()
        print("\nTest complete. Check m2_highlight_test.png for visual confirmation.")

if __name__ == '__main__':
    test_m2_highlighting()