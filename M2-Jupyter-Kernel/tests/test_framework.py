#!/usr/bin/env python3

"""
Comprehensive testing framework for M2 Jupyter kernel.
Tests kernel functionality without running Jupyter.
"""

import sys
import json
import time
import traceback
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

sys.path.insert(0, '/Users/sverrir/Documents/GitHub/M2/M2-Jupyter-Kernel')

from m2_kernel.m2_process import M2Process


@dataclass
class TestCase:
    """Represents a single test case."""
    name: str
    code: str
    expected_output: str = None
    expected_in_output: List[str] = None
    expected_not_in_output: List[str] = None
    expected_error: bool = False
    expected_html: bool = True
    expected_latex: bool = True
    timeout: float = 30.0


class M2KernelTester:
    """Test framework for M2 kernel."""
    
    def __init__(self):
        self.m2_process = None
        self.results = []
        
    def setup(self):
        """Initialize M2 process."""
        print("Setting up M2 process...")
        self.m2_process = M2Process()
        # Warm up
        self.m2_process.execute("1+1")
        
    def teardown(self):
        """Clean up."""
        if self.m2_process:
            self.m2_process.shutdown()
    
    def run_test(self, test: TestCase) -> Tuple[bool, str, float]:
        """
        Run a single test case.
        Returns: (passed, message, execution_time)
        """
        start_time = time.perf_counter()
        
        try:
            result = self.m2_process.execute(test.code, timeout=test.timeout)
            execution_time = time.perf_counter() - start_time
            
            # Check success/error
            if test.expected_error:
                if result['success']:
                    return False, "Expected error but execution succeeded", execution_time
            else:
                if not result['success']:
                    return False, f"Execution failed: {result.get('error', 'Unknown error')}", execution_time
            
            # Check exact output
            if test.expected_output is not None:
                actual = result.get('text', '').strip()
                if actual != test.expected_output:
                    return False, f"Output mismatch.\nExpected: {repr(test.expected_output)}\nActual: {repr(actual)}", execution_time
            
            # Check partial matches
            output_text = result.get('text', '')
            if test.expected_in_output:
                for expected in test.expected_in_output:
                    if expected not in output_text:
                        return False, f"Expected '{expected}' in output but not found", execution_time
            
            if test.expected_not_in_output:
                for not_expected in test.expected_not_in_output:
                    if not_expected in output_text:
                        return False, f"Found '{not_expected}' in output but should not be present", execution_time
            
            # Check HTML/LaTeX presence
            if test.expected_html and not result.get('html'):
                return False, "Expected HTML output but none found", execution_time
            if test.expected_latex and not result.get('latex'):
                return False, "Expected LaTeX output but none found", execution_time
            
            return True, "Passed", execution_time
            
        except Exception as e:
            return False, f"Exception: {str(e)}\n{traceback.format_exc()}", time.perf_counter() - start_time
    
    def run_all_tests(self, test_cases: List[TestCase]):
        """Run all test cases and report results."""
        print(f"\nRunning {len(test_cases)} tests...")
        print("=" * 70)
        
        passed = 0
        failed = 0
        total_time = 0
        
        for test in test_cases:
            success, message, exec_time = self.run_test(test)
            total_time += exec_time
            
            if success:
                passed += 1
                status = "✓ PASS"
                print(f"{status} [{exec_time*1000:>6.1f}ms] {test.name}")
            else:
                failed += 1
                status = "✗ FAIL"
                print(f"{status} [{exec_time*1000:>6.1f}ms] {test.name}")
                print(f"        {message}")
            
            self.results.append({
                'test': test,
                'passed': success,
                'message': message,
                'time': exec_time
            })
        
        print("=" * 70)
        print(f"Results: {passed} passed, {failed} failed")
        print(f"Total execution time: {total_time:.2f}s")
        print(f"Average time per test: {total_time/len(test_cases)*1000:.1f}ms")
        
        return passed == len(test_cases)


def get_basic_tests() -> List[TestCase]:
    """Get basic functionality tests."""
    return [
        TestCase(
            name="Simple arithmetic",
            code="2+2",
            expected_in_output=["4"]
        ),
        TestCase(
            name="Variable assignment",
            code="x = 42",
            expected_in_output=["42"]
        ),
        TestCase(
            name="Matrix creation",
            code="matrix{{1,2},{3,4}}",
            expected_in_output=["1", "2", "3", "4"],
            expected_latex=True
        ),
        TestCase(
            name="Comment only",
            code="-- This is just a comment",
            expected_output="",
            expected_html=False,
            expected_latex=False
        ),
        TestCase(
            name="Semicolon suppression",
            code="100+100;",
            expected_output="",
            expected_html=False,
            expected_latex=False
        ),
        TestCase(
            name="Multiple statements",
            code="a = 10\nb = 20\na + b",
            expected_in_output=["30"]
        ),
        TestCase(
            name="Error handling",
            code="undefined_variable",
            expected_error=True
        ),
        TestCase(
            name="Ring creation",
            code="R = ZZ[x,y,z]",
            expected_in_output=["R", "PolynomialRing"]
        ),
        TestCase(
            name="Ideal creation",
            code="R = ZZ[x,y]; I = ideal(x^2, y^2)",
            expected_in_output=["ideal", "x^2", "y^2"]
        ),
    ]


def get_magic_tests() -> List[TestCase]:
    """Get magic command tests."""
    return [
        TestCase(
            name="LaTeX toggle off",
            code="%latex off",
            expected_in_output=["LaTeX output disabled"]
        ),
        TestCase(
            name="LaTeX toggle on",
            code="%latex on",
            expected_in_output=["LaTeX output enabled"]
        ),
        TestCase(
            name="Progress indicator line magic",
            code="%pi\n1+1",
            expected_in_output=["2"]
        ),
        TestCase(
            name="Progress with level",
            code="%pi 2\n1+1", 
            expected_in_output=["2"]
        ),
        TestCase(
            name="Logging toggle",
            code="%logging off",
            expected_in_output=["Process logging disabled"]
        ),
    ]


def get_performance_tests() -> List[TestCase]:
    """Get performance-sensitive tests."""
    return [
        TestCase(
            name="Quick arithmetic",
            code="1+1",
            timeout=1.0  # Should complete in < 50ms now
        ),
        TestCase(
            name="Quick assignment",
            code="q = 123",
            timeout=1.0
        ),
        TestCase(
            name="Quick matrix",
            code="matrix{{1,2}}",
            timeout=1.0
        ),
    ]


def main():
    """Run all tests."""
    tester = M2KernelTester()
    
    try:
        tester.setup()
        
        # Run different test suites
        test_suites = [
            ("Basic Functionality", get_basic_tests()),
            ("Magic Commands", get_magic_tests()),
            ("Performance", get_performance_tests()),
        ]
        
        all_passed = True
        
        for suite_name, tests in test_suites:
            print(f"\n\n{suite_name} Tests")
            suite_passed = tester.run_all_tests(tests)
            all_passed = all_passed and suite_passed
        
        # Performance summary
        print("\n\nPerformance Summary")
        print("=" * 50)
        perf_results = [(r['test'].name, r['time']*1000) for r in tester.results 
                       if 'Quick' in r['test'].name]
        
        if perf_results:
            for name, time_ms in perf_results:
                print(f"{name:<20} {time_ms:>8.1f} ms")
            
            avg_time = sum(t for _, t in perf_results) / len(perf_results)
            print(f"\nAverage quick command: {avg_time:.1f} ms")
            
            if avg_time > 50:
                print("⚠️  Performance issue: Commands taking > 50ms")
            else:
                print("✓ Performance good: Commands < 50ms")
        
        return 0 if all_passed else 1
        
    finally:
        tester.teardown()


if __name__ == "__main__":
    sys.exit(main())