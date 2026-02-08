#!/usr/bin/env python3

"""
Comprehensive tests that reproduce the EXACT issues from test_fixed_issues.ipynb.
These tests simulate the complete round-trip: kernel -> M2Process -> webapp parser -> kernel output.
"""

import sys
import logging
sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')

from m2_kernel.kernel import M2Kernel
from m2_kernel.m2_process import M2Process

class TestableM2Kernel(M2Kernel):
    """M2Kernel that captures output instead of sending to Jupyter."""
    
    def __init__(self):
        super().__init__()
        self.captured_outputs = []
        self.captured_errors = []
        
    def send_response(self, socket, msg_type, content):
        """Capture output instead of sending to Jupyter."""
        self.captured_outputs.append({
            'msg_type': msg_type,
            'content': content
        })
        
    def _send_error(self, error_message):
        """Capture errors."""
        self.captured_errors.append(error_message)
        
    def get_last_output_data(self):
        """Get the data from the last output."""
        if not self.captured_outputs:
            return None
        last_output = self.captured_outputs[-1]
        if 'data' in last_output['content']:
            return last_output['content']['data']
        return None

def test_exact_notebook_test2():
    """Test EXACT reproduction of notebook Test 2: gb J should show GroebnerBasis output."""
    print("=== EXACT NOTEBOOK TEST 2 REPRODUCTION ===")
    
    kernel = TestableM2Kernel()
    
    try:
        # Initialize exactly like the notebook
        kernel._initialize_m2_process()
        
        # Test 1 setup (exactly like notebook)
        result1 = kernel.do_execute("T = QQ[a,b,c,d,e]", False)
        result2 = kernel.do_execute("J = ideal(a^4, a^3*b, a^2*b^2, a*b^3, b^4, a^3*c, a^2*b*c, a*b^2*c, b^3*c, a^2*c^2, a*b*c^2, b^2*c^2, a*c^3, b*c^3, c^4)", False)
        
        # Clear captured outputs to focus on Test 2
        kernel.captured_outputs = []
        
        # Test 2: The exact failing case
        result3 = kernel.do_execute("gbTrace = 2; gb J", False)
        
        print(f"Execution status: {result3.get('status')}")
        print(f"Number of outputs captured: {len(kernel.captured_outputs)}")
        
        # Check what was actually sent to Jupyter
        output_data = kernel.get_last_output_data()
        if output_data:
            print(f"\\nOutput data keys: {list(output_data.keys())}")
            
            # Check text/plain content
            text_plain = output_data.get('text/plain', '')
            print(f"\\ntext/plain contains GroebnerBasis: {'GroebnerBasis' in text_plain}")
            print(f"text/plain content: {repr(text_plain[:200])}...")
            
            # Check text/html content  
            text_html = output_data.get('text/html', '')
            print(f"\\ntext/html contains GroebnerBasis: {'GroebnerBasis' in text_html}")
            print(f"text/html contains raw HTML tokens: {'<samp class=\"token class-name\">' in text_html}")
            print(f"text/html content: {repr(text_html[:200])}...")
            
            # Check for &amp; corruption
            if '&amp;' in text_html:
                print(f"\\n❌ FOUND &amp; corruption in HTML!")
                
            # THE CRITICAL TEST: Is there actual GroebnerBasis content in the output?
            has_groebner_output = False
            if 'GroebnerBasis' in text_plain or 'GroebnerBasis' in text_html:
                has_groebner_output = True
            
            print(f"\\n🎯 CRITICAL: GroebnerBasis output present: {has_groebner_output}")
            
            if not has_groebner_output:
                print("❌ REPRODUCTION SUCCESSFUL: Missing GroebnerBasis output (15th time)")
                return False
            else:
                print("✓ GroebnerBasis output found")
                return True
        else:
            print("❌ No output data captured!")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if hasattr(kernel, 'm2_process') and kernel.m2_process and hasattr(kernel.m2_process, 'process') and kernel.m2_process.process:
            kernel.m2_process.process.terminate()

def test_exact_notebook_test3_echoes():
    """Test EXACT reproduction of notebook Test 3: %pi magic should not produce input echoes."""
    print("\\n=== EXACT NOTEBOOK TEST 3 ECHO REPRODUCTION ===")
    
    kernel = TestableM2Kernel()
    
    try:
        kernel._initialize_m2_process()
        
        # Setup like notebook
        kernel.do_execute("T = QQ[a,b,c,d,e]", False)
        kernel.do_execute("J = ideal(a^4, a^3*b, a^2*b^2, a*b^3, b^4)", False)
        
        # Clear outputs
        kernel.captured_outputs = []
        
        # Test 3: The magic command that produces echoes
        result = kernel.do_execute("%pi 2 gb J", False)
        
        print(f"Execution status: {result.get('status')}")
        
        # Check all captured outputs for echoes
        echo_found = False
        for i, output in enumerate(kernel.captured_outputs):
            content = output.get('content', {})
            data = content.get('data', {})
            
            text_plain = data.get('text/plain', '')
            text_html = data.get('text/html', '')
            
            # Check for input echoes (the exact patterns from notebook)
            echo_patterns = [
                'gbTrace = 2;',
                'i7 :',
                'i8 :',
                '17:0',
                '18:0',
                '19:0'
            ]
            
            for pattern in echo_patterns:
                if pattern in text_plain or pattern in text_html:
                    print(f"❌ FOUND INPUT ECHO in output {i}: '{pattern}'")
                    echo_found = True
        
        print(f"\\n🎯 CRITICAL: Input echoes found: {echo_found}")
        
        if echo_found:
            print("❌ REPRODUCTION SUCCESSFUL: Input echoes present")
            return False
        else:
            print("✓ No input echoes found")
            return True
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False
    finally:
        if hasattr(kernel, 'm2_process') and kernel.m2_process and hasattr(kernel.m2_process, 'process') and kernel.m2_process.process:
            kernel.m2_process.process.terminate()

def test_exact_notebook_test5_comment_echo():
    """Test EXACT reproduction of notebook Test 5: Comment echoes in other output."""
    print("\\n=== EXACT NOTEBOOK TEST 5 COMMENT ECHO REPRODUCTION ===")
    
    kernel = TestableM2Kernel()
    
    try:
        kernel._initialize_m2_process()
        
        # Clear outputs
        kernel.captured_outputs = []
        
        # Test 5: The exact sequence that produces comment echoes
        result = kernel.do_execute("%latex off", False)
        
        print(f"Execution status: {result.get('status')}")
        
        # Check for comment echoes in any output
        comment_echo_found = False
        for i, output in enumerate(kernel.captured_outputs):
            content = output.get('content', {})
            data = content.get('data', {})
            
            text_plain = data.get('text/plain', '')
            text_html = data.get('text/html', '')
            
            # Check for the specific comment echo from notebook
            if 'Test 5: LaTeX toggle' in text_plain or 'Test 5: LaTeX toggle' in text_html:
                print(f"❌ FOUND COMMENT ECHO in output {i}")
                comment_echo_found = True
        
        print(f"\\n🎯 CRITICAL: Comment echo found: {comment_echo_found}")
        
        if comment_echo_found:
            print("❌ REPRODUCTION SUCCESSFUL: Comment echo present")
            return False
        else:
            print("✓ No comment echo found")
            return True
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False
    finally:
        if hasattr(kernel, 'm2_process') and kernel.m2_process and hasattr(kernel.m2_process, 'process') and kernel.m2_process.process:
            kernel.m2_process.process.terminate()

def test_raw_webapp_structure():
    """Test the raw M2 webapp output structure to understand what we're actually parsing."""
    print("\\n=== RAW M2 WEBAPP STRUCTURE ANALYSIS ===")
    
    process = M2Process()
    
    try:
        process.start_process()
        
        # Create a GroebnerBasis and examine the RAW output structure
        process.execute("R = QQ[x,y]")
        process.execute("I = ideal(x^2, y^2)")
        
        result = process.execute("gb I")
        
        print(f"Raw webapp output length: {len(result['text'])}")
        print(f"Raw webapp output: {repr(result['text'])}")
        
        # Parse the webapp segments manually to see the structure
        segments = process._parse_webapp_segments(result['text'])
        
        print(f"\\nNumber of segments: {len(segments)}")
        for i, segment in enumerate(segments):
            print(f"Segment {i}:")
            print(f"  Tag: {segment['tag']}")
            print(f"  Control char: {repr(segment['control_char'])}")
            print(f"  Content: {repr(segment['content'][:100])}{'...' if len(segment['content']) > 100 else ''}")
        
        # Test the webapp parser output
        parsed = process._parse_webapp_output(result['text'])
        print(f"\\nWebapp parser results:")
        print(f"  HTML: {repr(parsed.get('html', '')[:200])}...")
        print(f"  LaTeX: {repr(parsed.get('latex', ''))}")
        print(f"  Output var: {repr(parsed.get('output_var', ''))}")
        print(f"  Other output: {repr(parsed.get('other_output', ''))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Structure analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if hasattr(process, 'process') and process.process:
            process.process.terminate()

def main():
    """Run all comprehensive tests to reproduce exact notebook issues."""
    print("COMPREHENSIVE TESTS TO REPRODUCE EXACT NOTEBOOK ISSUES")
    print("=" * 70)
    
    # Enable debug logging to see what's happening
    logging.basicConfig(level=logging.INFO)
    
    tests = [
        ("Raw Webapp Structure", test_raw_webapp_structure),
        ("Test 2 - Missing GroebnerBasis Output", test_exact_notebook_test2), 
        ("Test 3 - Input Echo Pollution", test_exact_notebook_test3_echoes),
        ("Test 5 - Comment Echo", test_exact_notebook_test5_comment_echo),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\\n{'='*50}")
        print(f"RUNNING: {test_name}")
        print('='*50)
        
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} CRASHED: {e}")
            results.append((test_name, False))
    
    print(f"\\n{'='*70}")
    print("FINAL RESULTS")
    print('='*70)
    
    for test_name, success in results:
        status = "✓ PASS" if success else "❌ FAIL" 
        print(f"{status} {test_name}")
    
    failed_count = sum(1 for _, success in results if not success)
    print(f"\\nFailed tests: {failed_count}/{len(results)}")
    
    if failed_count > 0:
        print("\\n🎯 THESE FAILURES REPRODUCE THE EXACT NOTEBOOK ISSUES")
        print("Now we need to fix the webapp parser structure handling!")
    
    return failed_count == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)