"""
Progress tracking for M2 computations.

Provides real-time feedback for long-running M2 operations.
"""

import re
import time
import threading
from typing import Optional, Dict, Callable
import logging

logger = logging.getLogger(__name__)


class M2ProgressTracker:
    """Track progress of M2 computations with real-time updates."""
    
    def __init__(self, send_update_callback: Callable):
        """
        Initialize progress tracker.
        
        Args:
            send_update_callback: Function to send progress updates to frontend
        """
        self.send_update = send_update_callback
        self.active = False
        self.start_time = 0
        self.last_update = 0
        self.operation_type = ""
        self.progress_patterns = self._setup_progress_patterns()
        
    def _setup_progress_patterns(self) -> Dict[str, Dict]:
        """Setup regex patterns to detect progress in M2 output."""
        
        return {
            'groebner_basis': {
                'triggers': [r'gb\s*[\(\s]', r'gb\s+\w', r'GroebnerBasis', r'groebnerBasis'],
                'patterns': [
                    # M2 gbTrace output patterns
                    r'pairs? remaining: (\d+)',
                    r'pairs? processed: (\d+)', 
                    r'(\d+) pairs? remaining',
                    r'(\d+) pairs? processed',
                    r'reducing (\d+) elements?',
                    r'degree (\d+)',
                    r'S-pairs?: (\d+)',
                    r'gb.*?(\d+) generators?',
                    r'-- (\d+) pairs',
                    r'-- degree (\d+)',  
                    r'-- reduction (\d+)',
                    r'-- S-pairs: (\d+)',
                    r'-- (\d+)/?(\d+) pairs'
                ],
                'description': 'Computing Gröbner basis'
            },
            'resolution': {
                'triggers': [r'res\s*[\(\s]', r'res\s+\w', r'resolution', r'Resolution'],
                'patterns': [
                    # M2 resTrace output patterns
                    r'computing level (\d+)',
                    r'rank (\d+)',
                    r'syzygy level (\d+)',
                    r'Betti.*?(\d+)',
                    r'-- computing syzygy (\d+)',
                    r'-- rank so far = (\d+)',
                    r'-- degree (\d+)',
                    r'-- level (\d+)',
                    r'computing Betti number \((\d+),(\d+)\)'
                ],
                'description': 'Computing resolution'
            },
            'factorization': {
                'triggers': [r'factor\s*\(', r'factorize'],
                'patterns': [
                    r'-- trying (\d+)',
                    r'-- polynomial (\d+)',
                    r'-- degree (\d+)'
                ],
                'description': 'Factorizing polynomial'
            },
            'primary_decomposition': {
                'triggers': [r'primaryDecomposition', r'decompose\s*[\(\s]', r'decompose\s+\w', 
                           r'minimalPrimes\s*[\(\s]', r'minimalPrimes\s+\w',
                           r'minprimes\s*[\(\s]', r'minprimes\s+\w'],
                'patterns': [
                    # Primary decomposition patterns
                    r'-- component (\d+)',
                    r'-- (\d+) primary components',
                    r'-- testing component (\d+)',
                    # Minimal primes patterns  
                    r'-- prime (\d+)',
                    r'-- (\d+) primes found',
                    r'-- testing prime (\d+)',
                    r'-- codimension (\d+)',
                    # General decomposition progress
                    r'decomposing.*?(\d+)',
                    r'component (\d+) of (\d+)',
                ],
                'description': 'Computing primary decomposition'
            },
            'minimal_primes': {
                'triggers': [r'minimalPrimes\s*[\(\s]', r'minimalPrimes\s+\w',
                           r'minprimes\s*[\(\s]', r'minprimes\s+\w'],
                'patterns': [
                    r'-- prime (\d+)',
                    r'-- (\d+) primes found',
                    r'-- testing prime (\d+)',
                    r'-- codimension (\d+)',
                    r'prime (\d+) of (\d+)',
                ],
                'description': 'Computing minimal primes'
            },
            'elimination': {
                'triggers': [r'eliminate\s*\(', r'elimination'],
                'patterns': [
                    r'-- eliminating (\w+)',
                    r'-- step (\d+)',
                    r'-- variable (\d+)'
                ],
                'description': 'Eliminating variables'
            }
        }
    
    def detect_operation_type(self, code: str) -> Optional[str]:
        """Detect what type of operation is being performed."""
        
        code_lower = code.lower()
        
        # Operations that support verbose progress output
        supported_ops = ['groebner_basis', 'resolution', 'primary_decomposition', 'minimal_primes', 'factorization']
        
        for op_type, info in self.progress_patterns.items():
            if op_type in supported_ops:
                for trigger in info['triggers']:
                    if re.search(trigger, code, re.IGNORECASE):
                        return op_type
        
        return None
    
    def start_tracking(self, code: str):
        """Start tracking progress for the given computation."""
        
        self.operation_type = self.detect_operation_type(code) or "computation"
        self.active = True
        self.start_time = time.time()
        self.last_update = self.start_time
        
        # Send initial progress message
        op_info = self.progress_patterns.get(self.operation_type, {})
        description = op_info.get('description', 'Computing')
        
        self.send_progress_update(f"{description}...", 0, show_spinner=True)
        
        logger.debug(f"Started tracking {self.operation_type}")
    
    def process_output(self, output: str) -> bool:
        """
        Process M2 output for progress information.
        
        Args:
            output: Raw output from M2
            
        Returns:
            True if progress was detected and updated
        """
        
        if not self.active or self.operation_type not in self.progress_patterns:
            return False
        
        patterns = self.progress_patterns[self.operation_type]['patterns']
        found_progress = False
        
        for pattern in patterns:
            matches = re.finditer(pattern, output, re.IGNORECASE)
            for match in matches:
                found_progress = True
                self._update_from_match(match, pattern)
        
        return found_progress
    
    def _update_from_match(self, match, pattern: str):
        """Update progress based on regex match."""
        
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        # Extract progress info
        groups = match.groups()
        
        if 'pairs' in pattern.lower():
            if len(groups) >= 2:
                current, total = groups[0], groups[1]
                progress_text = f"Processing S-pairs: {current}/{total}"
                percentage = int(current) / int(total) * 100 if total != '0' else 0
            else:
                pairs = groups[0] if groups else "?"
                progress_text = f"S-pairs remaining: {pairs}"
                percentage = None
                
        elif 'degree' in pattern.lower():
            degree = groups[0] if groups else "?"
            progress_text = f"Processing degree {degree}"
            percentage = None
            
        elif 'component' in pattern.lower():
            comp = groups[0] if groups else "?"
            progress_text = f"Component {comp}"
            percentage = None
            
        elif 'syzygy' in pattern.lower():
            level = groups[0] if groups else "?"
            progress_text = f"Computing syzygy level {level}"
            percentage = None
            
        else:
            # Generic progress
            info = " ".join(groups) if groups else "working"
            progress_text = f"Progress: {info}"
            percentage = None
        
        # Send update (throttle to avoid spam)
        if current_time - self.last_update > 0.5:  # Max 2 updates per second
            self.send_progress_update(progress_text, percentage, elapsed=elapsed)
            self.last_update = current_time
    
    def send_progress_update(self, message: str, percentage: Optional[float] = None, 
                           elapsed: Optional[float] = None, show_spinner: bool = False, 
                           is_final: bool = False):
        """Send progress update to the frontend."""
        
        # Format elapsed time
        if elapsed is not None:
            if elapsed < 60:
                time_str = f" ({elapsed:.1f}s)"
            else:
                minutes = int(elapsed // 60)
                seconds = int(elapsed % 60)
                time_str = f" ({minutes}m {seconds:02d}s)"
        else:
            time_str = ""
        
        # Create progress message
        if percentage is not None:
            progress_msg = f"{message} [{percentage:.1f}%]{time_str}"
        else:
            spinner = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏" if show_spinner else ""
            if show_spinner:
                spinner_char = spinner[int(time.time() * 4) % len(spinner)]
                progress_msg = f"{spinner_char} {message}{time_str}"
            else:
                progress_msg = f"{message}{time_str}"
        
        # Send update with special flag for final messages
        self.send_update(progress_msg, is_final)
    
    def finish_tracking(self, success: bool = True):
        """Finish tracking progress."""
        
        if not self.active:
            return
        
        elapsed = time.time() - self.start_time
        
        if success:
            op_info = self.progress_patterns.get(self.operation_type, {})
            description = op_info.get('description', 'Computation')
            self.send_progress_update(f"✓ {description} completed", 100, elapsed, is_final=True)
        else:
            op_info = self.progress_patterns.get(self.operation_type, {})
            description = op_info.get('description', 'Computation')
            self.send_progress_update(f"⚠️ {description} interrupted", None, elapsed, is_final=True)
        
        self.active = False
        logger.debug(f"Finished tracking {self.operation_type}")
    
    def is_long_running_operation(self, code: str) -> bool:
        """Check if the code is likely to be a long-running operation."""
        
        # Operations that support verbose progress output in M2
        long_running_patterns = [
            r'gb\s*[\(\s]',           # Gröbner bases (supports gbTrace)
            r'gb\s+\w',               # Gröbner bases (supports gbTrace)
            r'res\s*[\(\s]',          # Resolutions (supports resTrace)  
            r'res\s+\w',              # Resolutions (supports resTrace)
            r'decompose\s*[\(\s]',    # Primary decomposition (supports Verbosity)
            r'decompose\s+\w',        # Primary decomposition (supports Verbosity)
            r'minimalPrimes\s*[\(\s]', # Minimal primes (supports Verbosity)
            r'minimalPrimes\s+\w',    # Minimal primes (supports Verbosity)
            r'minprimes\s*[\(\s]',    # Minimal primes (supports Verbosity)
            r'minprimes\s+\w',        # Minimal primes (supports Verbosity)
            r'factor\s*\(',           # Factorization (check if has verbosity)
        ]
        
        for pattern in long_running_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                return True
        
        return False


def format_progress_html(message: str) -> str:
    """Format progress message as HTML for rich display."""
    
    html = f"""
    <div style="
        padding: 8px 12px;
        background-color: #f0f8ff;
        border-left: 4px solid #0066cc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #333;
        border-radius: 4px;
        margin: 4px 0;
    ">
        <span style="color: #0066cc;">●</span> {message}
    </div>
    """
    
    return html