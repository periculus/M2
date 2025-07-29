#!/usr/bin/env python3

"""
Profile the M2Process execute method to find the 300ms latency source.
"""

import sys
import time
import cProfile
import pstats
from io import StringIO

sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')

from m2_kernel.m2_process import M2Process

def detailed_execute_timing():
    """Instrument the execute method to find where time is spent."""
    
    print("Detailed Execute Method Timing")
    print("=" * 50)
    
    # Monkey patch M2Process to add timing
    original_execute = M2Process._execute_with_timeout
    
    timing_data = {}
    
    def timed_execute_with_timeout(self, code, timeout, execution_id):
        start = time.perf_counter()
        
        # Time queue clearing
        clear_start = time.perf_counter()
        self._clear_output_queues()
        timing_data['queue_clear'] = (time.perf_counter() - clear_start) * 1000
        
        # Time marker sending
        marker_start = time.perf_counter()
        marker = f"-- EXECUTION_START_{execution_id}"
        end_marker = f"-- EXECUTION_END_{execution_id}"
        self._send_raw(marker)
        self._send_raw(code)
        self._send_raw(end_marker)
        timing_data['marker_send'] = (time.perf_counter() - marker_start) * 1000
        
        # Time the collection loop
        collect_start = time.perf_counter()
        output_lines = []
        error_lines = []
        found_start = False
        found_end = False
        
        loop_iterations = 0
        queue_waits = 0
        
        while time.perf_counter() - collect_start < timeout and not found_end:
            loop_iterations += 1
            
            # Check stdout
            try:
                queue_wait_start = time.perf_counter()
                source, line = self.output_queue.get(timeout=0.1)
                queue_waits += 1
                
                if marker in line:
                    found_start = True
                    timing_data['time_to_start_marker'] = (time.perf_counter() - collect_start) * 1000
                    continue
                elif end_marker in line:
                    found_end = True
                    timing_data['time_to_end_marker'] = (time.perf_counter() - collect_start) * 1000
                    break
                elif found_start:
                    output_lines.append(line.rstrip())
            except:
                pass
                
            # Check stderr
            try:
                source, line = self.error_queue.get(timeout=0.1)
                if found_start and not found_end:
                    error_lines.append(line.rstrip())
            except:
                pass
        
        timing_data['collection_loop'] = (time.perf_counter() - collect_start) * 1000
        timing_data['loop_iterations'] = loop_iterations
        timing_data['queue_waits'] = queue_waits
        
        # Process results
        process_start = time.perf_counter()
        output_text = '\n'.join(output_lines).strip()
        error_text = '\n'.join(error_lines).strip()
        
        result = {
            'text': output_text,
            'error': error_text,
            'success': not error_text
        }
        timing_data['result_processing'] = (time.perf_counter() - process_start) * 1000
        
        timing_data['total'] = (time.perf_counter() - start) * 1000
        
        return result
    
    # Apply patch
    M2Process._execute_with_timeout = timed_execute_with_timeout
    
    try:
        # Create process and execute
        m2 = M2Process()
        m2.execute("1+1")  # Warm up
        
        # Test execution
        print("\nTesting execution of '2+2':")
        result = m2.execute("2+2")
        
        # Show timing breakdown
        print("\nTiming Breakdown:")
        print(f"  Queue clearing:        {timing_data.get('queue_clear', 0):.1f} ms")
        print(f"  Marker sending:        {timing_data.get('marker_send', 0):.1f} ms")
        print(f"  Time to start marker:  {timing_data.get('time_to_start_marker', 0):.1f} ms")
        print(f"  Time to end marker:    {timing_data.get('time_to_end_marker', 0):.1f} ms")
        print(f"  Collection loop total: {timing_data.get('collection_loop', 0):.1f} ms")
        print(f"  Loop iterations:       {timing_data.get('loop_iterations', 0)}")
        print(f"  Queue wait calls:      {timing_data.get('queue_waits', 0)}")
        print(f"  Result processing:     {timing_data.get('result_processing', 0):.1f} ms")
        print(f"  TOTAL:                 {timing_data.get('total', 0):.1f} ms")
        
        # Check queue timeout issue
        print("\n\nQueue Timeout Analysis:")
        print("The collection loop uses queue.get(timeout=0.1)")
        print("This means each empty queue check waits 100ms!")
        print(f"With {timing_data.get('loop_iterations', 0)} iterations, that's potential for {timing_data.get('loop_iterations', 0) * 100}ms delay")
        
    finally:
        # Restore original
        M2Process._execute_with_timeout = original_execute


def test_queue_timeout_fix():
    """Test with reduced queue timeout."""
    print("\n\nTesting with Reduced Queue Timeout")
    print("=" * 50)
    
    from m2_kernel.m2_process import M2Process
    
    # Create a modified execute method with shorter timeout
    def execute_with_short_timeout(self, code, timeout=None):
        """Execute with 1ms queue timeout instead of 100ms."""
        with self._lock:
            effective_timeout = timeout or self.current_timeout
            
            if code.strip().startswith('%'):
                return self._handle_magic_command(code.strip())
            
            if not self.process or self.process.poll() is not None:
                self.start_process()
            
            self._execution_counter += 1
            execution_id = self._execution_counter
            
            # Clear queues
            self._clear_output_queues()
            
            # Send with markers
            marker = f"-- EXECUTION_START_{execution_id}"
            end_marker = f"-- EXECUTION_END_{execution_id}"
            self._send_raw(marker)
            self._send_raw(code)
            self._send_raw(end_marker)
            
            # Collect with SHORT timeout
            start_time = time.time()
            output_lines = []
            found_start = False
            found_end = False
            
            while time.time() - start_time < effective_timeout and not found_end:
                try:
                    # Use 1ms timeout instead of 100ms!
                    source, line = self.output_queue.get(timeout=0.001)
                    if marker in line:
                        found_start = True
                        continue
                    elif end_marker in line:
                        found_end = True
                        break
                    elif found_start:
                        output_lines.append(line.rstrip())
                except:
                    pass
            
            return {
                'text': '\n'.join(output_lines).strip(),
                'error': '',
                'success': True
            }
    
    # Test with modified method
    m2 = M2Process()
    
    # Replace method temporarily
    original = m2.execute
    m2.execute = lambda code, timeout=None: execute_with_short_timeout(m2, code, timeout)
    
    try:
        # Warm up
        m2.execute("1+1")
        
        # Time several executions
        commands = ["2+2", "x=5", "matrix{{1,2},{3,4}}"]
        print(f"{'Command':<20} {'Time (ms)':<15}")
        print("-" * 35)
        
        for cmd in commands:
            start = time.perf_counter()
            result = m2.execute(cmd)
            elapsed = (time.perf_counter() - start) * 1000
            print(f"{cmd:<20} {elapsed:>10.1f} ms")
            
    finally:
        m2.execute = original


if __name__ == "__main__":
    detailed_execute_timing()
    test_queue_timeout_fix()