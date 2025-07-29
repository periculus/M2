#!/usr/bin/env python3

"""
Direct kernel testing framework for M2 Jupyter kernel.
Tests kernel functionality without running Jupyter.
"""

import sys
import json
import time
import uuid
from typing import Dict, Any, List
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')

from m2_kernel.kernel import M2Kernel

class KernelDirectTester:
    """Test M2 kernel directly without Jupyter."""
    
    def __init__(self):
        self.kernel = M2Kernel()
        # Initialize kernel info with the expected structure
        self.kernel.kernel_info = {
            'protocol_version': '5.3',
            'implementation': 'm2_kernel',
            'implementation_version': '1.0.0',
            'language_info': {
                'name': 'Macaulay2',
                'version': '1.25',
                'mimetype': 'text/x-macaulay2',
                'file_extension': '.m2',
            },
            'banner': 'Macaulay2 Kernel'
        }
        self.execution_count = 0
        
    def execute_code(self, code: str, silent: bool = False) -> Dict[str, Any]:
        """Execute code and return kernel response."""
        self.execution_count += 1
        
        # Simulate Jupyter's execute_request
        request = {
            'code': code,
            'silent': silent,
            'store_history': not silent,
            'user_expressions': {},
            'allow_stdin': False
        }
        
        # Time the execution
        start_time = time.perf_counter()
        
        # Mock the required kernel attributes
        self.kernel.execution_count = self.execution_count
        
        # Mock send_response method to capture output
        outputs = []
        def mock_send_response(stream, msg_type, content):
            outputs.append({
                'msg_type': msg_type,
                'content': content,
                'time': time.perf_counter() - start_time
            })
        
        # Replace send_response temporarily
        original_send = self.kernel.send_response
        self.kernel.send_response = mock_send_response
        self.kernel.iopub_socket = None  # Mock socket
        
        try:
            # Execute the code
            reply = self.kernel.do_execute(
                code=code,
                silent=silent,
                store_history=not silent,
                user_expressions={},
                allow_stdin=False
            )
            
            end_time = time.perf_counter()
            
            return {
                'reply': reply,
                'outputs': outputs,
                'execution_time': end_time - start_time,
                'execution_count': self.execution_count
            }
            
        finally:
            # Restore original method
            self.kernel.send_response = original_send
    
    def format_output(self, result: Dict[str, Any]) -> str:
        """Format kernel output for display."""
        lines = []
        lines.append(f"Execution #{result['execution_count']} - Time: {result['execution_time']*1000:.1f}ms")
        lines.append("-" * 50)
        
        # Show reply status
        reply = result['reply']
        lines.append(f"Status: {reply['status']}")
        
        if reply['status'] == 'error':
            lines.append(f"Error: {reply['ename']}: {reply['evalue']}")
            
        # Show outputs
        for output in result['outputs']:
            msg_type = output['msg_type']
            content = output['content']
            time_ms = output['time'] * 1000
            
            if msg_type == 'display_data':
                lines.append(f"\n[{time_ms:.1f}ms] Display Data:")
                if 'text/plain' in content['data']:
                    lines.append(content['data']['text/plain'])
                if 'text/html' in content['data']:
                    lines.append("(HTML output present)")
                    
            elif msg_type == 'stream':
                lines.append(f"\n[{time_ms:.1f}ms] Stream ({content['name']}):")
                lines.append(content['text'])
                
            elif msg_type == 'error':
                lines.append(f"\n[{time_ms:.1f}ms] Error:")
                lines.append(f"{content['ename']}: {content['evalue']}")
                
        return '\n'.join(lines)


def run_performance_tests():
    """Run performance tests to identify latency sources."""
    print("M2 Kernel Performance Analysis")
    print("=" * 60)
    
    tester = KernelDirectTester()
    
    # Test cases with expected instant responses
    test_cases = [
        ("Simple arithmetic", "2+2"),
        ("Variable assignment", "x = 5"),
        ("Matrix creation", "matrix{{1,2},{3,4}}"),
        ("Ring creation", "R = ZZ[x,y]"),
        ("Ideal creation", "I = ideal(x^2, y^2)"),
        ("Multiple statements", "a = 1; b = 2; a + b"),
        ("Magic command", "%latex off"),
        ("Comment only", "-- This is a comment"),
        ("Empty input", ""),
    ]
    
    # Warm up the kernel
    print("\nWarming up kernel...")
    tester.execute_code("1+1", silent=True)
    
    print("\nRunning performance tests:")
    print(f"{'Test':<25} {'Time (ms)':<12} {'Status':<10}")
    print("-" * 50)
    
    times = []
    for test_name, code in test_cases:
        result = tester.execute_code(code)
        time_ms = result['execution_time'] * 1000
        status = result['reply']['status']
        times.append(time_ms)
        
        print(f"{test_name:<25} {time_ms:>8.1f} ms  {status:<10}")
    
    # Statistics
    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    print("\nStatistics:")
    print(f"Average time: {avg_time:.1f} ms")
    print(f"Min time: {min_time:.1f} ms")
    print(f"Max time: {max_time:.1f} ms")
    
    # Detailed timing breakdown for a simple command
    print("\n\nDetailed timing breakdown for '2+2':")
    print("-" * 50)
    
    # Profile with more detail
    import cProfile
    import pstats
    from io import StringIO
    
    pr = cProfile.Profile()
    pr.enable()
    
    result = tester.execute_code("2+2")
    
    pr.disable()
    
    # Print execution details
    print(tester.format_output(result))
    
    # Show profiling results
    print("\nTop 10 time-consuming functions:")
    s = StringIO()
    ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
    ps.print_stats(10)
    print(s.getvalue())


def run_functionality_tests():
    """Run functionality tests for various kernel features."""
    print("\n\nFunctionality Tests")
    print("=" * 60)
    
    tester = KernelDirectTester()
    
    test_cases = [
        ("LaTeX output", "matrix{{1,2},{3,4}}"),
        ("Magic command - latex off", "%latex off\nmatrix{{5,6},{7,8}}"),
        ("Progress indicator", "%pi 2\ngb ideal(x^2-y, y^2-z)"),
        ("Semicolon suppression", "100+100;"),
        ("Multiple commands", "a = 10\nb = 20\na + b"),
        ("Error handling", "undefined_variable"),
    ]
    
    for test_name, code in test_cases:
        print(f"\n\nTest: {test_name}")
        print("-" * 40)
        print(f"Code: {repr(code)}")
        
        result = tester.execute_code(code)
        print(tester.format_output(result))


if __name__ == "__main__":
    run_performance_tests()
    run_functionality_tests()