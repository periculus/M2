"""
Process monitoring for M2 to show CPU usage and subprocess activity.
"""

import threading
import time
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

try:
    import psutil
except ImportError:
    psutil = None
    logging.warning("psutil not installed - process monitoring disabled")

logger = logging.getLogger(__name__)


@dataclass
class ProcessStats:
    """Statistics for a process."""
    pid: int
    name: str
    cpu_percent: float
    memory_mb: float
    status: str
    num_threads: int
    
    
class M2ProcessMonitor:
    """
    Monitor M2 process activity including CPU usage and subprocesses.
    """
    
    def __init__(self, kernel):
        """Initialize process monitor."""
        self.kernel = kernel
        self.monitoring = False
        self._monitor_thread = None
        self._last_stats = None
        self._high_cpu_start = None
        self._last_update_time = 0
        
    def start_monitoring(self, m2_pid: int):
        """Start monitoring M2 process."""
        if not psutil:
            logger.warning("Process monitoring disabled - psutil not available")
            return
            
        if self.monitoring:
            return
            
        self.monitoring = True
        self.m2_pid = m2_pid
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            daemon=True,
            name="M2-ProcessMonitor"
        )
        self._monitor_thread.start()
        logger.info(f"Started monitoring M2 process {m2_pid}")
        
    def stop_monitoring(self):
        """Stop monitoring."""
        self.monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=1.0)
        logger.info("Stopped monitoring M2 process")
        
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.monitoring:
            try:
                stats = self._collect_stats()
                if stats:
                    self._process_stats(stats)
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                
            time.sleep(1.0)  # Update every second
            
    def _collect_stats(self) -> Optional[Dict]:
        """Collect process statistics."""
        if not psutil:
            return None
            
        try:
            # Get main M2 process
            m2_process = psutil.Process(self.m2_pid)
            
            # Collect stats for M2 and children
            processes = [m2_process] + m2_process.children(recursive=True)
            
            stats = {
                'timestamp': time.time(),
                'main_process': self._get_process_stats(m2_process),
                'children': [self._get_process_stats(p) for p in m2_process.children()],
                'total_cpu': sum(p.cpu_percent() for p in processes),
                'total_memory_mb': sum(p.memory_info().rss / 1024 / 1024 for p in processes),
                'num_processes': len(processes),
                'num_threads': sum(p.num_threads() for p in processes)
            }
            
            return stats
            
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return None
            
    def _get_process_stats(self, process: psutil.Process) -> ProcessStats:
        """Get stats for a single process."""
        with process.oneshot():  # Optimize multiple attribute access
            return ProcessStats(
                pid=process.pid,
                name=process.name(),
                cpu_percent=process.cpu_percent(),
                memory_mb=process.memory_info().rss / 1024 / 1024,
                status=process.status(),
                num_threads=process.num_threads()
            )
            
    def _process_stats(self, stats: Dict):
        """Process collected statistics."""
        self._last_stats = stats
        
        # Detect high CPU usage
        if stats['total_cpu'] > 80:
            if self._high_cpu_start is None:
                self._high_cpu_start = time.time()
            
            # If high CPU for extended period, suggest timeout increase
            high_cpu_duration = time.time() - self._high_cpu_start
            if high_cpu_duration > 20 and self.kernel.m2_process:
                remaining_timeout = self._get_remaining_timeout()
                if remaining_timeout and remaining_timeout < 60:
                    self._send_timeout_warning(remaining_timeout, stats['total_cpu'])
        else:
            self._high_cpu_start = None
            
        # Send periodic updates during active computation
        if self._should_send_update(stats):
            self._send_status_update(stats)
            
    def _should_send_update(self, stats: Dict) -> bool:
        """Determine if we should send a status update."""
        # Update if CPU > 10% and at least 2 seconds since last update
        current_time = time.time()
        if stats['total_cpu'] > 10 and current_time - self._last_update_time > 2:
            self._last_update_time = current_time
            return True
        return False
        
    def _get_remaining_timeout(self) -> Optional[float]:
        """Get remaining timeout for current execution."""
        # This would need to track execution start time
        # For now, return None
        return None
        
    def _send_status_update(self, stats: Dict):
        """Send process status to frontend."""
        # Format CPU bar
        cpu = stats['total_cpu']
        cpu_bar = self._format_cpu_bar(cpu)
        
        # Format message
        if stats['num_processes'] > 1:
            msg = f"M2 CPU: {cpu_bar} {cpu:.0f}% ({stats['num_processes']} processes)"
        else:
            msg = f"M2 CPU: {cpu_bar} {cpu:.0f}%"
            
        # Add memory if significant
        if stats['total_memory_mb'] > 100:
            msg += f" | Memory: {stats['total_memory_mb']:.0f} MB"
            
        # Send as display update
        self.kernel.send_response(
            self.kernel.iopub_socket,
            'display_data',
            {
                'data': {
                    'text/plain': msg,
                    'text/html': self._format_status_html(stats)
                },
                'metadata': {},
                'transient': {
                    'display_id': 'M2-process-status'
                }
            }
        )
        
    def _format_cpu_bar(self, cpu_percent: float) -> str:
        """Format CPU percentage as a text bar."""
        bar_length = 20
        filled = int(cpu_percent / 100 * bar_length)
        bar = '█' * filled + '░' * (bar_length - filled)
        return f"[{bar}]"
        
    def _format_status_html(self, stats: Dict) -> str:
        """Format status as HTML with styling."""
        cpu = stats['total_cpu']
        
        # Determine status color
        if cpu < 10:
            status = "idle"
            color = "#999"
        elif cpu < 50:
            status = "working"
            color = "#3498db"
        elif cpu < 80:
            status = "busy"  
            color = "#f39c12"
        else:
            status = "intensive"
            color = "#e74c3c"
            
        html = f"""
        <div style="
            font-family: monospace;
            padding: 5px 10px;
            background: #f8f9fa;
            border-left: 3px solid {color};
            margin: 5px 0;
            font-size: 12px;
        ">
            <span style="color: {color};">●</span> M2 Status: <strong>{status}</strong>
            | CPU: {cpu:.0f}%
            | Memory: {stats['total_memory_mb']:.0f} MB
            | Threads: {stats['num_threads']}
            {f" | Subprocesses: {stats['num_processes']-1}" if stats['num_processes'] > 1 else ""}
        </div>
        """
        
        return html
        
    def _send_timeout_warning(self, remaining: float, cpu_percent: float):
        """Send warning about potential timeout."""
        msg = (f"⚠️ M2 is using {cpu_percent:.0f}% CPU with only {remaining:.0f}s "
               f"remaining before timeout. Consider using %timeout=600 for longer computations.")
        
        self.kernel.send_response(
            self.kernel.iopub_socket,
            'stream',
            {
                'name': 'stderr',
                'text': msg + '\n'
            }
        )
        
    def get_current_stats(self) -> Optional[Dict]:
        """Get the last collected statistics."""
        return self._last_stats


def integrate_process_monitor(kernel_class):
    """Integrate process monitoring into the kernel."""
    
    # Add monitor to kernel initialization
    original_init = kernel_class.__init__
    
    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        self.process_monitor = M2ProcessMonitor(self)
        
    kernel_class.__init__ = new_init
    
    # Hook into M2 process lifecycle
    original_start = kernel_class._initialize_m2_process
    
    def new_start(self):
        original_start(self)
        if self.m2_process and self.m2_process.process:
            self.process_monitor.start_monitoring(self.m2_process.process.pid)
            
    kernel_class._initialize_m2_process = new_start
    
    # Add magic command for process stats
    def handle_stats_magic(self, code):
        """Handle %stats magic command."""
        stats = self.process_monitor.get_current_stats()
        if stats:
            return {
                'text': f"M2 Process Statistics:\n"
                       f"CPU: {stats['total_cpu']:.1f}%\n"
                       f"Memory: {stats['total_memory_mb']:.0f} MB\n"
                       f"Processes: {stats['num_processes']}\n"
                       f"Threads: {stats['num_threads']}",
                'success': True
            }
        else:
            return {
                'text': "No M2 process statistics available",
                'success': True
            }
    
    # Register the magic handler
    if hasattr(kernel_class, '_handle_stats_magic'):
        kernel_class._handle_stats_magic = handle_stats_magic