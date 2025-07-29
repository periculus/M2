#!/usr/bin/env python3

"""
Simple timing test for M2 process to identify latency sources.
"""

import subprocess
import time
import os
import sys
import threading
from queue import Queue, Empty

def test_direct_m2_timing():
    """Test M2 process directly to measure base latency."""
    print("Direct M2 Process Timing Test")
    print("=" * 50)
    
    # Start M2 process
    cmd = ["M2", "--webapp", "--no-prompts", "--no-randomize", "--no-readline", "--no-tty"]
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=0  # Unbuffered
    )
    
    # Let M2 initialize
    time.sleep(0.5)
    
    # Test cases
    test_commands = [
        "2+2",
        "x = 5", 
        "matrix{{1,2},{3,4}}",
        "1+1",
        "3*3",
    ]
    
    print(f"{'Command':<20} {'Send->Recv (ms)':<15} {'Total (ms)':<15}")
    print("-" * 50)
    
    for cmd in test_commands:
        # Time the full round trip
        total_start = time.perf_counter()
        
        # Send command with markers
        marker = f"-- MARKER_{int(time.time()*1000)}"
        process.stdin.write(marker + "\n")
        process.stdin.write(cmd + "\n")
        process.stdin.write(marker + "_END\n")
        process.stdin.flush()
        
        # Time from send to first output
        send_time = time.perf_counter()
        
        # Read output until we see the end marker
        output_lines = []
        found_start = False
        while True:
            line = process.stdout.readline()
            if marker in line and not found_start:
                found_start = True
                continue
            elif marker + "_END" in line:
                break
            elif found_start:
                if not output_lines:  # First line of actual output
                    recv_time = time.perf_counter()
                output_lines.append(line)
        
        total_end = time.perf_counter()
        
        send_recv_ms = (recv_time - send_time) * 1000
        total_ms = (total_end - total_start) * 1000
        
        print(f"{cmd:<20} {send_recv_ms:>12.1f} ms  {total_ms:>12.1f} ms")
    
    process.terminate()


def test_kernel_component_timing():
    """Test individual kernel components to find bottlenecks."""
    print("\n\nKernel Component Timing Test")
    print("=" * 50)
    
    # Add parent directory to path
    sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')
    
    from m2_kernel.m2_process import M2Process
    from m2_kernel.cell_parser import M2CellParser
    
    # Test 1: Cell parser performance
    print("\n1. Cell Parser Performance:")
    parser = M2CellParser()
    
    test_cells = [
        "2+2",
        "matrix{{1,2},{3,4}}",
        "-- comment\nx = 5\ny = 10",
        "%pi 2\ngb ideal(x^2, y^2)",
        "for i from 1 to 10 do print i",
    ]
    
    for cell in test_cells:
        start = time.perf_counter()
        result = parser.parse_cell(cell)
        elapsed = (time.perf_counter() - start) * 1000
        print(f"  Parse '{cell[:20]}...': {elapsed:.2f} ms")
    
    # Test 2: M2Process initialization
    print("\n2. M2Process Initialization:")
    start = time.perf_counter()
    m2 = M2Process()
    init_time = (time.perf_counter() - start) * 1000
    print(f"  M2Process init: {init_time:.1f} ms")
    
    # Test 3: Command execution overhead
    print("\n3. Command Execution Overhead:")
    
    # Warm up
    m2.execute("1+1")
    
    # Test execution
    commands = ["2+2", "x=5", "matrix{{1,2},{3,4}}"]
    for cmd in commands:
        # Time just the execute call
        start = time.perf_counter()
        result = m2.execute(cmd)
        elapsed = (time.perf_counter() - start) * 1000
        
        # Break down the result
        success = result.get('success', False)
        has_output = bool(result.get('text', '').strip())
        
        print(f"  Execute '{cmd}': {elapsed:.1f} ms (success={success}, output={has_output})")
    
    # Test 4: Threading overhead
    print("\n4. Queue/Threading Overhead:")
    
    # Test queue operations
    q = Queue()
    iterations = 1000
    
    start = time.perf_counter()
    for i in range(iterations):
        q.put(("test", f"line {i}"))
    for i in range(iterations):
        q.get()
    queue_time = (time.perf_counter() - start) * 1000 / iterations
    
    print(f"  Queue put/get per operation: {queue_time:.3f} ms")


def test_execution_boundaries():
    """Test execution boundary detection performance."""
    print("\n\nExecution Boundary Timing")
    print("=" * 50)
    
    # Test the regex patterns used in filtering
    import re
    
    test_lines = [
        "normal output line",
        "-- comment line", 
        "\x1d\x154:0\x12gbTrace = 2",
        "\x14\x13\x0ei3\x12 : \x1c\x155:0\x12gb ideal(x^2-y, y^2-z)",
        "o1 = | 1 2 |",
        "     | 3 4 |",
    ]
    
    # Patterns from the kernel
    patterns = [
        (r'^[\x00-\x1f]*\d+:\d+', "Position marker"),
        (r'^[\x00-\x1f]*i\d+[\x00-\x1f]*\s*:', "Input prompt"),
        (r'^\s*--', "Comment line"),
    ]
    
    print("Pattern matching performance (1000 iterations):")
    for pattern, name in patterns:
        regex = re.compile(pattern)
        total_time = 0
        matches = 0
        
        for _ in range(1000):
            for line in test_lines:
                start = time.perf_counter()
                if regex.match(line):
                    matches += 1
                total_time += time.perf_counter() - start
        
        avg_time_us = (total_time / (1000 * len(test_lines))) * 1_000_000
        print(f"  {name:<20}: {avg_time_us:.2f} µs per match")


if __name__ == "__main__":
    test_direct_m2_timing()
    test_kernel_component_timing()
    test_execution_boundaries()