#!/usr/bin/env python3
"""Demonstrate smart timeout preventing premature termination of active computations."""

import os
import sys
import time

# Add kernel to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

def demo_smart_timeout():
    print("Smart Timeout Demonstration")
    print("=" * 60)
    print("This demo shows how the smart timeout prevents killing active computations")
    print()
    
    # Create kernel
    kernel = M2Kernel()
    
    # Set a very short timeout
    print("1. Setting timeout to 2 seconds...")
    result = kernel.do_execute("%timeout=2", silent=False)
    print("   Done.")
    
    # Run a computation that takes longer than 2 seconds
    print("\n2. Running computation that normally takes 3-5 seconds...")
    print("   (Watch for timeout extension messages)")
    
    code = """
    -- CPU-intensive computation
    R = QQ[x,y,z,w,v];
    I = ideal(
        x^3 + y^3 + z^3,
        x*y*z - w^2,
        y^2*z - v*w,
        z^2*w - x*v,
        w^2*v - y*z
    );
    
    print "Starting Groebner basis computation...";
    startTime = cpuTime();
    
    -- This should trigger smart timeout extension
    G = gb I;
    
    elapsed = cpuTime() - startTime;
    print("Computation took " | toString(elapsed) | " seconds");
    
    -- Show result
    gens G
    """
    
    start = time.time()
    result = kernel.do_execute(code, silent=False)
    elapsed = time.time() - start
    
    print(f"\n3. Execution completed in {elapsed:.1f} seconds")
    
    if elapsed > 2:
        print("   ✓ Smart timeout successfully extended execution beyond 2s limit!")
    else:
        print("   ✗ Computation was too fast to test timeout extension")
        
    if 'extended' in str(result).lower():
        print("   ✓ Timeout extension message was displayed")
        
    print("\n" + "=" * 60)
    print("Smart timeout prevents killing computations that are actively using CPU.")
    print("This ensures long-running Groebner basis computations complete successfully.")
    

if __name__ == '__main__':
    demo_smart_timeout()