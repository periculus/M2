"""
Smart timeout that considers CPU activity before killing long-running computations.
"""

import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SmartTimeout:
    """
    Intelligent timeout that considers process activity.
    
    Instead of blindly killing after X seconds, this checks:
    - Is M2 using significant CPU? (actively computing)
    - Has M2 been idle for a while? (possibly stuck)
    - Should we warn before timeout?
    """
    
    def __init__(self, kernel):
        self.kernel = kernel
        self.execution_start = None
        self.timeout_seconds = None
        self.warned_at_percent = set()  # Track which warnings we've sent
        
    def start_execution(self, timeout: float):
        """Start tracking execution with given timeout."""
        self.execution_start = time.time()
        self.timeout_seconds = timeout
        self.warned_at_percent = set()
        logger.debug(f"Started execution tracking with {timeout}s timeout")
        
    def check_timeout(self) -> bool:
        """
        Check if execution should be timed out.
        
        Returns:
            True if should timeout, False otherwise
        """
        if not self.execution_start or not self.timeout_seconds:
            return False
            
        elapsed = time.time() - self.execution_start
        remaining = self.timeout_seconds - elapsed
        
        # Not yet at timeout
        if remaining > 0:
            self._check_warnings(elapsed, remaining)
            return False
            
        # Past timeout - check if M2 is actively computing
        if self._is_actively_computing():
            # Grant extension if actively working
            extension = self._grant_extension(elapsed)
            if extension:
                logger.info(f"Granting {extension}s timeout extension due to active computation")
                self.timeout_seconds += extension
                self._send_extension_notice(extension, elapsed)
                return False
                
        # Timeout reached and not actively computing
        return True
        
    def _is_actively_computing(self) -> bool:
        """Check if M2 is actively using CPU."""
        if not hasattr(self.kernel, 'process_monitor'):
            return False
            
        stats = self.kernel.process_monitor.get_current_stats()
        if not stats:
            return False
            
        # Consider active if using > 50% CPU
        return stats['total_cpu'] > 50
        
    def _grant_extension(self, elapsed: float) -> Optional[float]:
        """
        Determine if and how much extension to grant.
        
        Returns:
            Extension in seconds, or None
        """
        # Don't extend indefinitely
        if elapsed > 3600:  # 1 hour hard limit
            return None
            
        # Grant 20% more time if actively computing
        extension = self.timeout_seconds * 0.2
        
        # But at least 30 seconds
        return max(extension, 30)
        
    def _check_warnings(self, elapsed: float, remaining: float):
        """Send warnings as timeout approaches."""
        percent_complete = (elapsed / self.timeout_seconds) * 100
        
        # Warn at 75%, 90%, and 95%
        warning_thresholds = [
            (75, 60),   # Warn at 75% if > 60s remaining
            (90, 20),   # Warn at 90% if > 20s remaining  
            (95, 10),   # Warn at 95% if > 10s remaining
        ]
        
        for threshold, min_remaining in warning_thresholds:
            if (percent_complete >= threshold and 
                threshold not in self.warned_at_percent and
                remaining <= min_remaining):
                
                self.warned_at_percent.add(threshold)
                self._send_timeout_warning(remaining, percent_complete)
                
    def _send_timeout_warning(self, remaining: float, percent: float):
        """Send timeout warning to user."""
        # Check if actively computing
        cpu_info = ""
        if hasattr(self.kernel, 'process_monitor'):
            stats = self.kernel.process_monitor.get_current_stats()
            if stats and stats['total_cpu'] > 10:
                cpu_info = f" (M2 CPU: {stats['total_cpu']:.0f}%)"
                
        msg = (f"⏱️  Timeout warning: {remaining:.0f}s remaining{cpu_info}. "
               f"Use %timeout=600 for longer computations.")
        
        self.kernel.send_response(
            self.kernel.iopub_socket,
            'stream',
            {
                'name': 'stderr', 
                'text': msg + '\n'
            }
        )
        
    def _send_extension_notice(self, extension: float, elapsed: float):
        """Notify user about timeout extension."""
        msg = (f"⏰ Timeout extended by {extension:.0f}s due to active computation. "
               f"Total time: {(self.timeout_seconds):.0f}s")
        
        self.kernel.send_response(
            self.kernel.iopub_socket,
            'stream',
            {
                'name': 'stdout',
                'text': msg + '\n'
            }
        )
        
    def stop_execution(self):
        """Stop tracking execution."""
        self.execution_start = None
        self.timeout_seconds = None
        self.warned_at_percent = set()


def integrate_smart_timeout(m2process_class):
    """Integrate smart timeout into M2Process."""
    
    # Modify execute_with_timeout to use smart timeout
    original_execute = m2process_class._execute_with_timeout
    
    def new_execute_with_timeout(self, code, timeout, execution_id):
        # Initialize smart timeout if kernel reference exists
        smart_timeout = None
        if self.kernel and hasattr(self.kernel, 'process_monitor'):
            smart_timeout = SmartTimeout(self.kernel)
            smart_timeout.start_execution(timeout)
            
        # Modified timeout check
        start_time = time.time()
        
        # ... existing queue collection code ...
        
        # Replace simple timeout check with smart check
        while not found_end:
            # Original timeout check
            if smart_timeout:
                if smart_timeout.check_timeout():
                    raise M2TimeoutError(f"Execution timed out after {timeout} seconds")
            else:
                # Fallback to simple timeout
                if time.time() - start_time > timeout:
                    raise M2TimeoutError(f"Execution timed out after {timeout} seconds")
                    
            # ... rest of collection loop ...
            
        if smart_timeout:
            smart_timeout.stop_execution()
            
        # ... rest of method ...
        
    m2process_class._execute_with_timeout = new_execute_with_timeout