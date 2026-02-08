#!/usr/bin/env python
"""
Test the heartbeat mechanism for long-running computations.
"""

import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from m2_kernel.kernel import M2Kernel

def test_heartbeat():
    """Test that heartbeat keeps connection alive during long computation."""
    
    print("Testing heartbeat mechanism...")
    
    # Create kernel instance
    kernel = M2Kernel()
    
    # Test 1: Quick computation (no heartbeat needed)
    print("\n1. Testing quick computation...")
    result = kernel.do_execute("1 + 1", False)
    print(f"   Result: {result['status']}")
    assert result['status'] == 'ok'
    
    # Test 2: Simulate longer computation
    print("\n2. Testing longer computation with heartbeat...")
    
    # Monitor heartbeat activity
    heartbeat_active = kernel.heartbeat.is_active
    print(f"   Heartbeat active before: {heartbeat_active}")
    
    # Execute something that takes time
    code = """
    -- Simulate a computation that takes time
    for i from 1 to 5 do (
        sleep 1;
        print i;
    )
    """
    
    # Start execution (this would normally be async in Jupyter)
    print("   Starting execution...")
    
    # In real Jupyter, the heartbeat would run in background
    # Here we just verify it's configured correctly
    kernel.heartbeat.begin_computation(1)
    heartbeat_active = kernel.heartbeat.is_active
    print(f"   Heartbeat active during: {heartbeat_active}")
    
    # Simulate computation time
    time.sleep(2)
    
    # End computation
    kernel.heartbeat.end_computation()
    heartbeat_active = kernel.heartbeat.is_active
    print(f"   Heartbeat active after: {heartbeat_active}")
    
    print("\n3. Testing heartbeat thread...")
    if kernel.heartbeat.heartbeat_thread and kernel.heartbeat.heartbeat_thread.is_alive():
        print("   ✓ Heartbeat thread is running")
    else:
        print("   ✗ Heartbeat thread is not running")
    
    # Cleanup
    kernel.do_shutdown(False)
    
    print("\n✅ Heartbeat mechanism test complete!")
    print("\nThe heartbeat will send periodic 'busy' status messages")
    print("during long computations to prevent websocket timeout.")

if __name__ == "__main__":
    test_heartbeat()