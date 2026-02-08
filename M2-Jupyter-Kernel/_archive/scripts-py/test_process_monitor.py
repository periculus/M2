#!/usr/bin/env python3
"""Test the process monitoring and smart timeout functionality."""

import os
import sys
import time
import subprocess
import psutil

# Add kernel to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_process_monitor():
    """Test the process monitor with a long-running M2 computation."""
    print("Testing Process Monitor and Smart Timeout")
    print("=" * 50)
    
    # Import kernel
    from m2_kernel.kernel import M2Kernel
    
    # Create kernel instance
    kernel = M2Kernel()
    
    # Test 1: Check process monitor initialization
    print("\n1. Testing process monitor initialization...")
    if hasattr(kernel, 'process_monitor'):
        print("✓ Process monitor initialized")
        if kernel.process_monitor.monitoring:
            print("✓ Process monitor is active")
        else:
            print("✗ Process monitor not active")
    else:
        print("✗ Process monitor not found")
        
    # Test 2: Get initial stats
    print("\n2. Getting initial M2 process stats...")
    if hasattr(kernel, 'process_monitor'):
        stats = kernel.process_monitor.get_current_stats()
        if stats:
            print(f"✓ M2 Process Stats:")
            print(f"  - CPU: {stats['total_cpu']:.1f}%")
            print(f"  - Memory: {stats['total_memory_mb']:.0f} MB")
            print(f"  - Threads: {stats['num_threads']}")
            print(f"  - Processes: {stats['num_processes']}")
        else:
            print("✗ No stats available")
            
    # Test 3: Run a computation and monitor CPU
    print("\n3. Running computation to test CPU monitoring...")
    code = """
    -- Compute something CPU intensive
    R = QQ[x,y,z];
    I = ideal(x^2 + y^2 + z^2 - 1, x*y*z - 1);
    for i from 1 to 5 do (
        print("Iteration " | toString(i));
        gb I;
    )
    """
    
    # Execute and monitor
    print("Starting computation...")
    result = kernel.do_execute(code, silent=False)
    
    # Check stats after computation
    if hasattr(kernel, 'process_monitor'):
        stats = kernel.process_monitor.get_current_stats()
        if stats:
            print(f"\nPost-computation stats:")
            print(f"  - CPU: {stats['total_cpu']:.1f}%")
            print(f"  - Memory: {stats['total_memory_mb']:.0f} MB")
            
    # Test 4: Test %status magic
    print("\n4. Testing %status magic command...")
    result = kernel.do_execute("%status", silent=False)
    if result.get('status') == 'ok':
        print("✓ %status magic works")
    else:
        print("✗ %status magic failed")
        
    # Test 5: Test smart timeout with active computation
    print("\n5. Testing smart timeout with active computation...")
    print("Setting short timeout and running intensive computation...")
    
    # Set short timeout
    kernel.do_execute("%timeout=3", silent=False)
    
    # Run intensive computation that would normally timeout
    code = """
    -- This should take more than 3 seconds
    R = QQ[x,y,z,w];
    I = ideal(random(3,R), random(3,R), random(3,R));
    for i from 1 to 10 do (
        if i % 2 == 0 then print("Still computing... iteration " | toString(i));
        gb I;
    )
    print "Computation completed!"
    """
    
    start_time = time.time()
    result = kernel.do_execute(code, silent=False)
    elapsed = time.time() - start_time
    
    print(f"\nComputation took {elapsed:.1f} seconds")
    if elapsed > 3:
        print("✓ Smart timeout allowed computation to continue beyond initial timeout")
    else:
        print("✗ Computation finished too quickly to test timeout extension")
        
    if 'Timeout extended' in str(result):
        print("✓ Timeout extension message detected")
        
    print("\n" + "=" * 50)
    print("Test completed!")
    

def test_status_widget():
    """Test the status widget functionality."""
    print("\n\nTesting Status Widget")
    print("=" * 50)
    
    from m2_kernel.kernel import M2Kernel
    kernel = M2Kernel()
    
    # Test enabling status widget
    print("1. Testing %status on...")
    result = kernel.do_execute("%status on", silent=False)
    if result.get('status') == 'ok':
        print("✓ Status widget enabled")
    else:
        print("✗ Failed to enable status widget")
        
    # Run computation to see widget update
    print("\n2. Running computation to trigger widget updates...")
    code = """
    R = QQ[a,b,c,d,e];
    I = ideal(a^3-b, b^3-c, c^3-d, d^3-e, e^3-a);
    gb I;
    """
    kernel.do_execute(code, silent=False)
    
    # Test disabling
    print("\n3. Testing %status off...")
    result = kernel.do_execute("%status off", silent=False)
    if result.get('status') == 'ok':
        print("✓ Status widget disabled")
    else:
        print("✗ Failed to disable status widget")
        

if __name__ == '__main__':
    try:
        test_process_monitor()
        test_status_widget()
    except Exception as e:
        print(f"\nError during test: {e}")
        import traceback
        traceback.print_exc()