#!/usr/bin/env python
"""Verify M2 Jupyter kernel functionality"""

import subprocess
import json
import sys

def check_kernel_installed():
    """Check if kernel is installed"""
    print("1. Checking kernel installation...")
    result = subprocess.run(['jupyter', 'kernelspec', 'list', '--json'], 
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        kernelspecs = json.loads(result.stdout)
        if 'macaulay2' in kernelspecs['kernelspecs']:
            kernel_info = kernelspecs['kernelspecs']['macaulay2']
            print(f"   ✓ Kernel installed at: {kernel_info['resource_dir']}")
            return True
    
    print("   ✗ Kernel not installed")
    return False

def check_m2_binary():
    """Check if M2 binary is available"""
    print("\n2. Checking M2 binary...")
    result = subprocess.run(['which', 'M2'], capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"   ✓ M2 found at: {result.stdout.strip()}")
        
        # Check version
        version_result = subprocess.run(['M2', '--version'], 
                                      capture_output=True, text=True)
        if version_result.returncode == 0:
            print(f"   ✓ M2 version: {version_result.stdout.strip()}")
        return True
    
    print("   ✗ M2 not found in PATH")
    return False

def check_syntax_highlighting():
    """Check if syntax highlighting is configured"""
    print("\n3. Checking syntax highlighting...")
    
    result = subprocess.run(['jupyter', 'kernelspec', 'list', '--json'], 
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        kernelspecs = json.loads(result.stdout)
        if 'macaulay2' in kernelspecs['kernelspecs']:
            kernel_dir = kernelspecs['kernelspecs']['macaulay2']['resource_dir']
            
            import os
            mode_file = os.path.join(kernel_dir, 'codemirror_mode_macaulay2.js')
            if os.path.exists(mode_file):
                print(f"   ✓ CodeMirror mode file exists")
                
                # Check kernel.json has correct mode
                kernel_json = os.path.join(kernel_dir, 'kernel.json')
                with open(kernel_json) as f:
                    kernel_spec = json.load(f)
                
                if kernel_spec.get('codemirror_mode') == 'macaulay2':
                    print(f"   ✓ Kernel configured for macaulay2 mode")
                    return True
    
    print("   ✗ Syntax highlighting not properly configured")
    return False

def test_kernel_execution():
    """Test basic kernel execution"""
    print("\n4. Testing kernel execution...")
    
    try:
        from m2_kernel.m2_process import M2Process
        
        m2 = M2Process()
        
        # Test basic computation
        result = m2.execute("2+2", timeout=5.0)
        if result['success'] and '4' in result['text']:
            print("   ✓ Basic arithmetic works")
        else:
            print(f"   ✗ Basic arithmetic failed: {result}")
            return False
        
        # Test auto-completion data
        result = m2.execute('apropos "^ri"', timeout=5.0)
        if result['success']:
            print("   ✓ Apropos command works (for auto-completion)")
        else:
            print(f"   ✗ Apropos failed: {result}")
        
        m2.shutdown()
        return True
        
    except Exception as e:
        print(f"   ✗ Kernel execution error: {e}")
        return False

def main():
    """Run all checks"""
    print("M2 Jupyter Kernel Verification")
    print("=" * 40)
    
    checks = [
        check_kernel_installed(),
        check_m2_binary(),
        check_syntax_highlighting(),
        test_kernel_execution()
    ]
    
    print("\n" + "=" * 40)
    passed = sum(checks)
    total = len(checks)
    print(f"Checks passed: {passed}/{total}")
    
    if passed == total:
        print("\n✓ All checks passed! The kernel should work properly.")
        print("\nTo test in JupyterLab:")
        print("1. Run: jupyter lab")
        print("2. Create a new notebook with 'Macaulay2' kernel")
        print("3. Test auto-completion by typing 'ri' and pressing Tab")
        print("4. Check syntax highlighting for keywords like 'ring', 'ideal', etc.")
    else:
        print("\n✗ Some checks failed. Please fix the issues above.")
        
        if not checks[0]:
            print("\nTo install kernel: python -m m2_kernel.install --user")
        if not checks[1]:
            print("\nM2 needs to be installed and in PATH")
        if not checks[2]:
            print("\nRun: python setup_syntax_highlighting.py")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())