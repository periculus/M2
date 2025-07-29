"""
Tests for the Macaulay2 Jupyter kernel.
"""

import pytest
import tempfile
import time
from unittest.mock import Mock, patch

from m2_kernel.m2_process import M2Process, M2ProcessError, M2TimeoutError
from m2_kernel.kernel import M2Kernel


class TestM2Process:
    """Test M2 process management."""
    
    def test_m2_process_initialization(self):
        """Test M2 process starts correctly."""
        # This test requires M2 to be installed
        try:
            process = M2Process()
            assert process.is_alive()
            process.shutdown()
        except M2ProcessError:
            pytest.skip("M2 not available for testing")
    
    def test_simple_execution(self):
        """Test simple M2 code execution."""
        try:
            process = M2Process()
            result = process.execute("2 + 2")
            
            assert result['success']
            assert '4' in result['text']
            
            process.shutdown()
        except M2ProcessError:
            pytest.skip("M2 not available for testing")
    
    def test_timeout_handling(self):
        """Test timeout handling."""
        try:
            process = M2Process(default_timeout=1.0)
            
            # This should timeout
            result = process.execute("sleep(5)", timeout=0.5)
            assert not result['success']
            assert 'timeout' in result['error'].lower()
            
            process.shutdown()
        except M2ProcessError:
            pytest.skip("M2 not available for testing")
    
    def test_magic_commands(self):
        """Test magic command handling."""
        try:
            process = M2Process()
            
            # Test timeout magic
            result = process.execute("%timeout=60")
            assert result['success']
            assert process.current_timeout == 60.0
            
            # Test help magic
            result = process.execute("%help")
            assert result['success']
            assert 'magic' in result['text'].lower()
            
            process.shutdown()
        except M2ProcessError:
            pytest.skip("M2 not available for testing")
    
    def test_latex_output(self):
        """Test LaTeX output generation."""
        try:
            process = M2Process()
            result = process.execute("matrix{{1,2},{3,4}}")
            
            assert result['success']
            # Should have some LaTeX output
            assert result.get('latex') or result.get('texmath')
            
            process.shutdown()
        except M2ProcessError:
            pytest.skip("M2 not available for testing")


class TestM2Kernel:
    """Test the M2 Jupyter kernel."""
    
    def test_kernel_initialization(self):
        """Test kernel initializes without M2."""
        # Mock M2Process to avoid requiring M2 installation
        with patch('m2_kernel.kernel.M2Process') as mock_process:
            mock_instance = Mock()
            mock_process.return_value = mock_instance
            
            kernel = M2Kernel()
            assert kernel.m2_process is not None
    
    def test_do_execute_success(self):
        """Test successful code execution."""
        with patch('m2_kernel.kernel.M2Process') as mock_process:
            mock_instance = Mock()
            mock_instance.execute.return_value = {
                'success': True,
                'text': 'o1 = 4',
                'latex': '$4$',
                'error': ''
            }
            mock_process.return_value = mock_instance
            
            kernel = M2Kernel()
            result = kernel.do_execute('2 + 2', False)
            
            assert result['status'] == 'ok'
            assert 'execution_count' in result
    
    def test_do_execute_error(self):
        """Test error handling in execution."""
        with patch('m2_kernel.kernel.M2Process') as mock_process:
            mock_instance = Mock()
            mock_instance.execute.return_value = {
                'success': False,
                'text': '',
                'latex': '',
                'error': 'syntax error'
            }
            mock_process.return_value = mock_instance
            
            kernel = M2Kernel()
            result = kernel.do_execute('invalid syntax', False)
            
            assert result['status'] == 'error'
            assert result['ename'] == 'M2ExecutionError'
    
    def test_completion(self):
        """Test code completion."""
        with patch('m2_kernel.kernel.M2Process'):
            kernel = M2Kernel()
            result = kernel.do_complete('ri', 2)
            
            assert result['status'] == 'ok'
            assert 'ring' in result['matches']
    
    def test_is_complete(self):
        """Test code completeness checking."""
        with patch('m2_kernel.kernel.M2Process'):
            kernel = M2Kernel()
            
            # Complete code
            result = kernel.do_is_complete('2 + 2')
            assert result['status'] == 'complete'
            
            # Incomplete code
            result = kernel.do_is_complete('matrix{{1,2')
            assert result['status'] == 'incomplete'


if __name__ == '__main__':
    pytest.main([__file__])