"""
Heartbeat mechanism for keeping Jupyter connections alive during long computations.

This prevents websocket timeouts when M2 computations take longer than 30 seconds.
"""

import threading
import time
import logging
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class HeartbeatThread(threading.Thread):
    """
    A thread that sends periodic heartbeat messages to keep the connection alive.
    """
    
    def __init__(self, kernel, interval: float = 10.0):
        """
        Initialize heartbeat thread.
        
        Args:
            kernel: The kernel instance that can send messages
            interval: Heartbeat interval in seconds (default: 10)
        """
        super().__init__(daemon=True, name="M2-Heartbeat")
        self.kernel = kernel
        self.interval = interval
        self._stop_event = threading.Event()
        self._active = False
        self._execution_count = 0
        
    def start_heartbeat(self, execution_count: int = 0):
        """Start sending heartbeats for a computation."""
        self._active = True
        self._execution_count = execution_count
        logger.debug(f"Starting heartbeat for execution {execution_count}")
        
    def stop_heartbeat(self):
        """Stop sending heartbeats."""
        self._active = False
        logger.debug("Stopping heartbeat")
        
    def shutdown(self):
        """Shutdown the heartbeat thread."""
        self._stop_event.set()
        self.join(timeout=1.0)
        
    def run(self):
        """Main heartbeat loop."""
        logger.info("Heartbeat thread started")
        
        while not self._stop_event.is_set():
            if self._active:
                try:
                    # Send a heartbeat message
                    self._send_heartbeat()
                except Exception as e:
                    logger.error(f"Error sending heartbeat: {e}")
            
            # Wait for interval or until stopped
            self._stop_event.wait(self.interval)
        
        logger.info("Heartbeat thread stopped")
    
    def _send_heartbeat(self):
        """Send a heartbeat message to keep the connection alive."""
        try:
            # Send a status message on the IOPub channel
            # This keeps the websocket connection active
            self.kernel.send_response(
                self.kernel.iopub_socket,
                'status',
                {
                    'execution_state': 'busy',
                    'execution_count': self._execution_count
                }
            )
            logger.debug(f"Heartbeat sent for execution {self._execution_count}")
            
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")


class KernelHeartbeat:
    """
    Manager for kernel heartbeat functionality.
    """
    
    def __init__(self, kernel):
        """
        Initialize heartbeat manager.
        
        Args:
            kernel: The kernel instance
        """
        self.kernel = kernel
        self.heartbeat_thread = None
        self._computation_active = False
        
    def start(self):
        """Start the heartbeat thread."""
        if self.heartbeat_thread is None:
            self.heartbeat_thread = HeartbeatThread(self.kernel)
            self.heartbeat_thread.start()
            logger.info("Heartbeat manager started")
    
    def stop(self):
        """Stop the heartbeat thread."""
        if self.heartbeat_thread:
            self.heartbeat_thread.shutdown()
            self.heartbeat_thread = None
            logger.info("Heartbeat manager stopped")
    
    def begin_computation(self, execution_count: int = 0):
        """
        Begin heartbeat for a long computation.
        
        Args:
            execution_count: The execution count for this computation
        """
        if self.heartbeat_thread:
            self._computation_active = True
            self.heartbeat_thread.start_heartbeat(execution_count)
    
    def end_computation(self):
        """End heartbeat for computation."""
        if self.heartbeat_thread:
            self._computation_active = False
            self.heartbeat_thread.stop_heartbeat()
    
    @property
    def is_active(self) -> bool:
        """Check if heartbeat is currently active."""
        return self._computation_active