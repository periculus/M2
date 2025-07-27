"""
Macaulay2 process management for the Jupyter kernel.

This module handles starting, communicating with, and managing M2 processes.
"""

import os
import re
import subprocess
import threading
import time
import signal
from queue import Queue, Empty
from typing import Optional, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


class M2ProcessError(Exception):
    """Exception raised when M2 process encounters an error."""
    pass


class M2TimeoutError(Exception):
    """Exception raised when M2 execution times out."""
    pass


class M2Process:
    """
    Manages a Macaulay2 process for kernel communication.
    
    Features:
    - Robust process management with automatic restart
    - Configurable timeouts with magic command support
    - LaTeX output capture
    - Error detection and formatting
    - Thread-safe execution
    """
    
    def __init__(self, m2_command: Optional[str] = None, default_timeout: float = 30.0, 
                 progress_callback: Optional[callable] = None, kernel=None):
        """
        Initialize M2 process manager.
        
        Args:
            m2_command: Path to M2 executable (default: "M2")
            default_timeout: Default execution timeout in seconds
            progress_callback: Optional callback for progress updates
            kernel: Reference to the kernel for settings
        """
        self.m2_command = m2_command or self._find_m2_executable()
        self.default_timeout = default_timeout
        self.current_timeout = default_timeout
        self.progress_callback = progress_callback
        self.kernel = kernel
        
        self.process: Optional[subprocess.Popen] = None
        self.output_queue: Queue = Queue()
        self.error_queue: Queue = Queue()
        self.output_thread: Optional[threading.Thread] = None
        self.error_thread: Optional[threading.Thread] = None
        
        self._lock = threading.Lock()
        self._execution_counter = 0
        self._logging_enabled = True  # Logging enabled by default
        
        # Progress indicator settings
        self._progress_mode = 'off'  # 'off', 'line', 'cell'
        self._progress_level = 1     # Verbosity level 1-3
        self._cell_progress_mode = False
        
        # Initialize process
        self.start_process()
    
    def _find_m2_executable(self) -> str:
        """Find M2 executable in PATH or common locations."""
        # Check PATH first
        if subprocess.run(["which", "M2"], capture_output=True).returncode == 0:
            return "M2"
        
        # Check common locations
        common_paths = [
            "/usr/local/bin/M2",
            "/opt/homebrew/bin/M2",
            "/usr/bin/M2",
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                return path
        
        # Check if we're in the M2 development environment
        build_m2 = "BUILD/cmake/usr-dist/arm64-Darwin-macOS-15.5/bin/M2"
        if os.path.exists(build_m2):
            return os.path.abspath(build_m2)
        
        raise M2ProcessError("Could not find M2 executable. Please ensure Macaulay2 is installed.")
    
    def start_process(self) -> None:
        """Start the M2 process with appropriate flags."""
        with self._lock:
            if self.process and self.process.poll() is None:
                return  # Process already running
            
            # Create log files for M2 stdout/stderr
            import os
            import datetime
            log_dir = os.path.expanduser("~/.m2_kernel_logs")
            os.makedirs(log_dir, exist_ok=True)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            
            self.m2_stdout_log = os.path.join(log_dir, f"m2_stdout_{timestamp}.log")
            self.m2_stderr_log = os.path.join(log_dir, f"m2_stderr_{timestamp}.log")
            
            cmd = [
                self.m2_command,
                "--webapp",
                "--no-prompts",
                "--no-randomize",
                "--no-readline",
                "--no-tty"
            ]
            
            logger.info(f"Starting M2 process: {' '.join(cmd)}")
            logger.info(f"M2 stdout log: {self.m2_stdout_log}")
            logger.info(f"M2 stderr log: {self.m2_stderr_log}")
            
            try:
                self.process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=0,
                    preexec_fn=os.setsid  # Create new process group
                )
                
                # Start output capture threads
                self._start_output_threads()
                
                # Send initialization commands
                self._initialize_session()
                
                logger.info(f"M2 process started with PID {self.process.pid}")
                
            except Exception as e:
                raise M2ProcessError(f"Failed to start M2 process: {e}")
    
    def _start_output_threads(self) -> None:
        """Start threads to capture stdout and stderr."""
        def read_stdout():
            # Only open log file if logging is enabled
            log_file = open(self.m2_stdout_log, 'a') if self._logging_enabled and hasattr(self, 'm2_stdout_log') else None
            try:
                while self.process and self.process.poll() is None:
                    try:
                        line = self.process.stdout.readline()
                        if line:
                            # Write to log file if enabled
                            if log_file:
                                log_file.write(line)
                                log_file.flush()
                            self.output_queue.put(('stdout', line))
                            # Log M2 errors immediately
                            if 'error' in line.lower() or 'terminated' in line.lower():
                                logger.warning(f"M2 output error: {line.strip()}")
                    except Exception as e:
                        logger.error(f"Error reading stdout: {e}")
                        if log_file:
                            log_file.write(f"\n[ERROR reading stdout: {e}]\n")
                        break
                # Log when thread exits
                exit_code = self.process.poll() if self.process else "None"
                logger.info(f"stdout reader thread exiting, M2 exit code: {exit_code}")
                if log_file:
                    log_file.write(f"\n[M2 process exited with code: {exit_code}]\n")
            finally:
                if log_file:
                    log_file.close()
        
        def read_stderr():
            # Only open log file if logging is enabled
            log_file = open(self.m2_stderr_log, 'a') if self._logging_enabled and hasattr(self, 'm2_stderr_log') else None
            try:
                while self.process and self.process.poll() is None:
                    try:
                        line = self.process.stderr.readline()
                        if line:
                            # Write to log file if enabled
                            if log_file:
                                log_file.write(line)
                                log_file.flush()
                            self.error_queue.put(('stderr', line))
                            # Log all stderr immediately
                            logger.warning(f"M2 stderr: {line.strip()}")
                    except Exception as e:
                        logger.error(f"Error reading stderr: {e}")
                        if log_file:
                            log_file.write(f"\n[ERROR reading stderr: {e}]\n")
                        break
                # Log when thread exits
                exit_code = self.process.poll() if self.process else "None"
                logger.info(f"stderr reader thread exiting, M2 exit code: {exit_code}")
                if log_file:
                    log_file.write(f"\n[M2 process exited with code: {exit_code}]\n")
            finally:
                if log_file:
                    log_file.close()
        
        self.output_thread = threading.Thread(target=read_stdout, daemon=True)
        self.error_thread = threading.Thread(target=read_stderr, daemon=True)
        
        self.output_thread.start()
        self.error_thread.start()
    
    def _initialize_session(self) -> None:
        """Send initialization commands to M2."""
        init_commands = [
            '-- Jupyter kernel initialization',
            'printWidth = 80;',
            ''  # Empty line to complete initialization
        ]
        
        logger.info("Initializing M2 session with settings:")
        for cmd in init_commands:
            if cmd:
                logger.info(f"  {cmd}")
        
        for cmd in init_commands:
            self._send_raw(cmd)
        
        # Clear any initialization output
        time.sleep(0.1)
        self._clear_output_queues()
    
    def _send_raw(self, code: str) -> None:
        """Send raw code to M2 process."""
        if not self.process or self.process.poll() is not None:
            exit_code = self.process.poll() if self.process else "None"
            logger.error(f"M2 process not running! Exit code: {exit_code}")
            raise M2ProcessError(f"M2 process is not running (exit code: {exit_code})")
        
        try:
            logger.info(f"[SEND TO M2] {code[:200]}")
            # Also log to stdout file
            if hasattr(self, 'm2_stdout_log'):
                with open(self.m2_stdout_log, 'a') as f:
                    f.write(f"\n[INPUT] {code}\n")
                    f.flush()
            
            self.process.stdin.write(code + '\n')
            self.process.stdin.flush()
            logger.debug("Successfully sent to M2")
        except BrokenPipeError as e:
            exit_code = self.process.poll()
            logger.error(f"BrokenPipeError: M2 died with exit code {exit_code}")
            raise M2ProcessError(f"M2 process terminated (exit code: {exit_code})")
    
    def _clear_output_queues(self) -> None:
        """Clear output queues."""
        while not self.output_queue.empty():
            try:
                self.output_queue.get_nowait()
            except Empty:
                break
        
        while not self.error_queue.empty():
            try:
                self.error_queue.get_nowait()
            except Empty:
                break
    
    def execute(self, code: str, timeout: Optional[float] = None) -> Dict[str, Any]:
        """
        Execute M2 code and return results with HTML/LaTeX output from webapp mode.
        
        Args:
            code: M2 code to execute
            timeout: Execution timeout (uses current_timeout if None)
            
        Returns:
            Dictionary with 'text', 'html', 'latex', 'error', and 'success' keys
        """
        with self._lock:
            effective_timeout = timeout or self.current_timeout
            
            # Handle magic commands
            if code.strip().startswith('%'):
                return self._handle_magic_command(code.strip())
            
            # Check if process is running
            if not self.process or self.process.poll() is not None:
                self.start_process()
            
            self._execution_counter += 1
            execution_id = self._execution_counter
            
            logger.debug(f"Executing #{execution_id}: {code[:50]}...")
            
            # Check if progress indicators are enabled and modify code accordingly
            modified_code = code
            progress_info = None
            
            if self._progress_mode != 'off':
                # Add verbosity to supported operations
                modified_code, progress_info = self._add_progress_verbosity(code, self._progress_level)
                
                # Reset line magic mode after use (cell magic persists)
                if self._progress_mode == 'line':
                    self._progress_mode = 'off'
            
            try:
                logger.debug(f"Sending code to M2 with timeout {effective_timeout}s: {modified_code[:50]}...")
                result = self._execute_with_timeout(modified_code, effective_timeout, execution_id)
                
                # Add progress information to result if available
                if progress_info:
                    result['progress_info'] = progress_info
                
                # Parse webapp HTML output only if in WebApp mode and execution was successful
                if result['success'] and result['text'].strip():
                    # Check current M2 output mode
                    current_mode = getattr(self.kernel, 'm2_output_mode', 'WebApp') if self.kernel else 'WebApp'
                    
                    if current_mode == 'WebApp':
                        # WebApp mode: Parse control characters and extract LaTeX/HTML
                        saved_other_output = result.get('other_output', '')
                        parsed_output = self._parse_webapp_output(result['text'])
                        # Always preserve other_output from text filtering
                        if saved_other_output:
                            parsed_output['other_output'] = saved_other_output
                        
                        # For webapp mode, use cleaned text if no substantial output was produced
                        if not parsed_output.get('html') and not parsed_output.get('latex') and not parsed_output.get('output_var'):
                            # Clean the text of control characters for display
                            clean_text = re.sub(r'[\x00-\x1f\x7f]', '', result['text']).strip()
                            # If the cleaned text is just position info + input echo, make it empty
                            if re.match(r'^\d+:\d+.*$', clean_text):
                                result['text'] = ''
                            else:
                                result['text'] = clean_text
                        
                        result.update(parsed_output)
                    else:
                        # Standard mode: Don't parse webapp control characters
                        # The text output is already clean ASCII from M2
                        logger.debug(f"Standard mode: using plain text output directly")
                        # Just ensure we have the basic structure
                        result.setdefault('html', '')
                        result.setdefault('latex', '')
                        result.setdefault('output_var', '')
                
                return result
                
            except M2TimeoutError:
                logger.warning(f"Execution #{execution_id} timed out after {effective_timeout}s")
                self._handle_timeout()
                return {
                    'text': f"Execution timed out after {effective_timeout} seconds",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': f"TimeoutError: Execution exceeded {effective_timeout} seconds",
                    'success': False
                }
            
            except Exception as e:
                logger.error(f"Execution #{execution_id} failed: {e}")
                return {
                    'text': '',
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': str(e),
                    'success': False
                }
    
    def _execute_with_timeout(self, code: str, timeout: float, execution_id: int) -> Dict[str, Any]:
        """Execute code with timeout handling."""
        # Clear output queues
        self._clear_output_queues()
        
        # Initialize smart timeout if kernel reference exists
        smart_timeout = None
        if self.kernel and hasattr(self.kernel, 'process_monitor'):
            from .smart_timeout import SmartTimeout
            smart_timeout = SmartTimeout(self.kernel)
            smart_timeout.start_execution(timeout)
        
        # Add execution marker
        marker = f"-- EXECUTION_START_{execution_id}"
        end_marker = f"-- EXECUTION_END_{execution_id}"
        
        # Send code with markers
        logger.debug(f"Sending marker: {marker}")
        self._send_raw(marker)
        logger.debug(f"Sending code: {code}")
        self._send_raw(code)
        logger.debug(f"Sending end marker: {end_marker}")
        self._send_raw(end_marker)
        
        # Collect output until end marker or timeout
        start_time = time.time()
        output_lines = []
        error_lines = []
        found_start = False
        found_end = False
        
        while not found_end:
            # Check timeout using smart timeout if available
            if smart_timeout:
                if smart_timeout.check_timeout():
                    raise M2TimeoutError(f"Execution timed out after {timeout} seconds")
            else:
                # Fallback to simple timeout
                if time.time() - start_time > timeout:
                    raise M2TimeoutError(f"Execution timed out after {timeout} seconds")
            
            # Check stdout
            try:
                source, line = self.output_queue.get(timeout=0.001)  # 1ms instead of 100ms
                if marker in line:
                    found_start = True
                    continue
                elif end_marker in line:
                    found_end = True
                    break
                elif found_start:
                    output_lines.append(line.rstrip())
                    # Call progress callback if available
                    if self.progress_callback:
                        self.progress_callback(line.rstrip())
            except Empty:
                pass
            
            # Check stderr
            try:
                source, line = self.error_queue.get(timeout=0.001)  # 1ms instead of 100ms
                if found_start and not found_end:
                    error_lines.append(line.rstrip())
            except Empty:
                pass
            
            # Check if process died
            if self.process.poll() is not None:
                exit_code = self.process.poll()
                logger.error(f"M2 process died with exit code: {exit_code}")
                logger.error(f"Last output lines: {output_lines[-10:]}")
                logger.error(f"Last error lines: {error_lines[-10:]}")
                
                # Log to file as well
                if hasattr(self, 'm2_stdout_log'):
                    with open(self.m2_stdout_log, 'a') as f:
                        f.write(f"\n[CRASH] M2 died with exit code {exit_code}\n")
                        f.write(f"Last output: {output_lines[-10:]}\n")
                    with open(self.m2_stderr_log, 'a') as f:
                        f.write(f"\n[CRASH] M2 died with exit code {exit_code}\n")
                        f.write(f"Last errors: {error_lines[-10:]}\n")
                
                raise M2ProcessError(f"M2 process terminated unexpectedly with code {exit_code}")
        
        if not found_end:
            raise M2TimeoutError(f"Execution timed out after {timeout} seconds")
        
        # Stop smart timeout tracking
        if smart_timeout:
            smart_timeout.stop_execution()
        
        # Process results
        output_text = '\n'.join(output_lines).strip()
        error_text = '\n'.join(error_lines).strip()
        
        # Keep the original output for webapp parsing
        original_output = output_text
        
        # Filter out comment lines and progress messages from output text
        other_output = ""
        if output_text:
            filtered_output, other_output = self._filter_output_comments(output_text)
        else:
            filtered_output = output_text
        
        # Filter out informational messages from stderr that aren't actual errors
        if error_text:
            error_text = self._filter_stderr_info(error_text)
        
        success = not error_text and not self._contains_error(output_text)
        
        return {
            'text': original_output,  # Pass original output for webapp parsing
            'latex': '',
            'error': error_text if error_text else (output_text if not success else ''),
            'success': success,
            'other_output': other_output
        }
    
    def _parse_webapp_output(self, webapp_output: str) -> Dict[str, str]:
        """Parse M2 webapp mode output using structured control character parsing."""
        result = {'html': '', 'latex': '', 'output_var': '', 'other_output': ''}
        
        logger.debug(f"Parsing webapp output of length {len(webapp_output)}")
        logger.debug(f"First 200 chars: {repr(webapp_output[:200])}")
        
        try:
            # Use structured parsing similar to M2Web
            parsed_segments = self._parse_webapp_segments(webapp_output)
            
            # Process parsed segments to build result
            result = self._process_webapp_segments(parsed_segments)
            
        except Exception as e:
            import traceback
            logger.debug(f"Failed to parse webapp output: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            # Fallback to simple cleaning
            import html
            simple_output = re.sub(r'[\x00-\x1f\x7f]', '', webapp_output)
            if simple_output.strip():
                result['html'] = f'<div class="m2-output"><pre>{html.escape(simple_output)}</pre></div>'
        
        return result
    
    def _parse_webapp_segments(self, webapp_output: str):
        """Parse webapp output into structured segments using control characters."""
        # Control character definitions (matching M2Web tags.ts)
        WEBAPP_TAGS = {
            '\x0E': 'Prompt',      # M2 prompt (i1 : )
            '\x11': 'Html',        # HTML content start
            '\x12': 'End',         # HTML content end
            '\x13': 'Cell',        # Cell container start
            '\x14': 'CellEnd',     # Cell container end
            '\x15': 'Position',    # Source position (file:line:col)
            '\x1C': 'Input',       # User input text
            '\x1D': 'InputContd',  # Multi-line input continuation
        }
        
        # Build regex for splitting (matches M2Web approach)
        control_chars = ''.join(WEBAPP_TAGS.keys())
        webapp_regex = re.compile(f'([{re.escape(control_chars)}])')
        
        # Clean carriage returns and split on control characters
        clean_output = webapp_output.replace('\r', '')
        segments = webapp_regex.split(clean_output)
        
        # Parse segments into structured format
        parsed_segments = []
        
        for i in range(0, len(segments)):
            if i % 2 == 0:
                # Even index: content
                content = segments[i]
                # Get control character that follows this content (if any)
                control_char = segments[i + 1] if i + 1 < len(segments) else None
                tag_name = WEBAPP_TAGS.get(control_char, None)
                
                if content or tag_name:  # Only add meaningful segments
                    parsed_segments.append({
                        'content': content,
                        'tag': tag_name,
                        'control_char': control_char
                    })
        return parsed_segments
    
    def _process_webapp_segments(self, segments):
        """Process parsed webapp segments into output format."""
        import html
        
        result = {'html': '', 'latex': '', 'output_var': '', 'other_output': ''}
        
        # State tracking (similar to M2Web)
        current_cell = None
        html_content = []
        output_variables = []
        type_info = []
        other_content = []
        positions = []
        
        # Process segments sequentially
        i = 0
        while i < len(segments):
            segment = segments[i]
            content = segment['content']
            tag = segment['tag']
            
            # Process based on tag type
            if tag == 'Cell':
                # Start new cell
                current_cell = {'content': content, 'outputs': [], 'types': []}
                
            elif tag == 'CellEnd':
                # End current cell
                if current_cell:
                    # Process completed cell
                    self._finalize_cell(current_cell, result)
                current_cell = None
                
            elif tag == 'Html':
                # HTML content follows - collect until End tag
                html_block = content  # Content before Html tag
                i += 1
                
                # Collect content until we hit End tag
                while i < len(segments):
                    if segments[i]['tag'] == 'End':
                        break
                    html_block += segments[i]['content']
                    if segments[i]['control_char']:
                        html_block += segments[i]['control_char']
                    i += 1
                
                # Store HTML content for processing
                html_content.append(html_block)
                
            elif tag == 'Prompt':
                # When we have a Prompt tag, look at the NEXT segment to see what the prompt contains
                if i + 1 < len(segments):
                    next_segment = segments[i + 1]
                    prompt_content = next_segment['content']
                    
                    # Check if the prompt content is an output variable (o1, o2, etc.)
                    if re.match(r'^(o\d+)$', prompt_content.strip()):
                        output_var = prompt_content.strip()
                        
                        # Look further ahead for assignment and HTML content
                        # Pattern: Prompt(i) -> o2/End(i+1) -> " = "/Html(i+2) -> "$5$"/End(i+3)
                        if i + 2 < len(segments):
                            assignment_segment = segments[i + 2]
                            assignment_content = assignment_segment['content']
                            
                            # Check for assignment pattern: " = "
                            if assignment_content.strip().startswith('='):
                                if not result['output_var']:  # Set first output variable
                                    result['output_var'] = output_var
                                
                                # Look for Html content that follows
                                variable_html = ""
                                if assignment_segment['tag'] == 'Html':
                                    # The assignment content is in an Html block, look for the actual content after it
                                    if i + 3 < len(segments):
                                        variable_html = segments[i + 3]['content']
                                
                                output_variables.append({
                                    'var': output_var,
                                    'assignment': assignment_content,
                                    'html_content': variable_html
                                })
                    
                    # Also check for type information patterns
                    elif re.match(r'^(o\d+)$', prompt_content.strip()):
                        # Look for type assignment ": Type"
                        if i + 2 < len(segments) and segments[i + 2]['tag'] == 'End':
                            if i + 3 < len(segments):
                                type_content = segments[i + 3]['content']
                                if type_content.strip().startswith(':'):
                                    type_info.append({
                                        'var': prompt_content.strip(),
                                        'content': type_content
                                    })
                
            elif tag == 'Position':
                # Store position information for debugging
                positions.append(content)
                
            elif tag == 'Input' or tag == 'InputContd':
                # Input content - typically we want to filter this out
                # but keep track for debugging
                pass
                
            elif tag is None and content.strip():
                # Plain content without tag - could be comments, progress, etc.
                # Filter out input echoes and prompts
                if not re.match(r'^\s*(i\d+\s*:|--|:\d+:|\d+:\d+)', content):
                    content_clean = content.strip()
                    if content_clean and content_clean != '--':
                        other_content.append(content_clean)
            
            i += 1
        
        # Build final result
        self._build_final_result(result, output_variables, type_info, html_content, other_content)
        
        return result
    
    def _finalize_cell(self, cell, result):
        """Finalize a completed cell (placeholder for future cell-level processing)."""
        # Future enhancement: process cell-level structure
        pass
    
    def _build_final_result(self, result, output_variables, type_info, html_content, other_content):
        """Build the final result from processed segments."""
        import html
        
        # Process output variables and build HTML
        html_parts = []
        latex_parts = []
        
        for output in output_variables:
            var = output['var']
            assignment = output.get('assignment', '')
            html_content = output.get('html_content', '')
            
            # Use HTML content if available, otherwise fallback to assignment parsing
            if html_content:
                value_content = html_content
                
                # Check for LaTeX content
                if '$' in value_content:
                    # Extract LaTeX
                    latex_matches = re.findall(r'\$([^$]+)\$', value_content)
                    if latex_matches:
                        latex_parts.extend(latex_matches)
                    
                    # For LaTeX content, display as-is (it will be rendered by MathJax)
                    html_value = html.escape(value_content)
                else:
                    # Handle non-LaTeX content - escape HTML entities
                    clean_content = re.sub(r'<[^>]*>', '', value_content)
                    clean_content = html.unescape(clean_content)
                    
                    # Special formatting for types like GroebnerBasis[...]
                    if re.match(r'^[A-Za-z]+\[.*\]$', clean_content.strip()):
                        match = re.match(r'^([A-Za-z]+)(\[.*\])$', clean_content.strip())
                        if match:
                            type_name = match.group(1)
                            bracket_content = match.group(2)
                            html_value = f'<code class="m2-nonmath">{html.escape(type_name)}</code> <span class="m2-description">{html.escape(bracket_content)}</span>'
                        else:
                            html_value = f'<code class="m2-nonmath">{html.escape(clean_content)}</code>'
                    else:
                        html_value = f'<code class="m2-nonmath">{html.escape(clean_content)}</code>'
            else:
                # Fallback to parsing assignment text
                value_match = re.search(r'=\s*(.*)', assignment, re.DOTALL)
                if value_match:
                    value_content = value_match.group(1).strip()
                    html_value = f'<code class="m2-nonmath">{html.escape(value_content)}</code>'
                else:
                    html_value = f'<code class="m2-nonmath">{html.escape(assignment)}</code>'
                
            # Build output line
            output_line = f'<span class="m2-output-var" style="font-weight: normal !important;">{var}</span><span class="m2-output-punct"> = </span>{html_value}'
            html_parts.append(f'<div class="m2-output-line">{output_line}</div>')
        
        # Add type information
        for type_info_item in type_info:
            var = type_info_item['var']
            content = type_info_item['content']
            
            # Extract type after ':'
            type_match = re.search(r':\s*(.*)', content, re.DOTALL)
            if type_match:
                type_content = type_match.group(1).strip()
                
                # Clean and format type
                if '$' in type_content:
                    # Keep LaTeX in types
                    clean_type = re.sub(r'<[^>]*>', '', type_content)
                    clean_type = html.unescape(clean_type)
                    html_type = clean_type
                else:
                    clean_type = re.sub(r'<[^>]*>', '', type_content)
                    clean_type = html.unescape(clean_type)
                    html_type = f'<span class="m2-type">{html.escape(clean_type)}</span>'
                
                # Build type line
                type_line = f'<span class="m2-output-var" style="font-weight: normal !important;">{var}</span><span class="m2-output-punct"> : </span>{html_type}'
                html_parts.append(f'<div class="m2-type-line">{type_line}</div>')
        
        # Set results
        if html_parts:
            result['html'] = f'<div class="m2-output">{"".join(html_parts)}</div>'
        
        if latex_parts:
            result['latex'] = '\\quad '.join(latex_parts)
        
        if other_content:
            result['other_output'] = '\n'.join(other_content)
        
        return result
    
    def _filter_output_comments(self, output_text: str) -> tuple[str, str]:
        """
        Split output into main output and other output based on control sequences.
        
        Returns:
            (main_output, other_output) where other_output contains informational messages
        """
        if not output_text:
            return output_text, ""
        
        # Don't filter control characters here! They're needed for webapp parsing
        # Just separate based on comment lines and input echoes
        main_lines = []
        other_lines = []
        
        for line in output_text.split('\n'):
            # Skip empty lines
            if not line.strip():
                continue
            
            # Lines starting with -- are informational/comments
            if line.strip().startswith('--'):
                other_lines.append(line)
            # Input echoes and position markers should be other output
            # These can have control characters before the position markers
            # Pattern: optional control chars + digits + colon + digits + optional stuff
            elif re.match(r'^[\x00-\x1f]*\d+:\d+', line):
                other_lines.append(line)
            # Also catch input prompts with control characters (i1 :, i2 :, etc.)
            elif re.match(r'^[\x00-\x1f]*i\d+[\x00-\x1f]*\s*:', line):
                other_lines.append(line)
            else:
                main_lines.append(line)
        
        return '\n'.join(main_lines), '\n'.join(other_lines)
    
    def _filter_stderr_info(self, stderr_text: str) -> str:
        """Filter out informational messages from stderr that aren't errors."""
        if not stderr_text:
            return stderr_text
        
        # Lines that are informational, not errors
        info_patterns = [
            r'^--\s+using resolution by homogenization',
            r'^--\s+resolution Strategy',
            r'^--\s+\[gb\]',
            r'^--\s+number of',
            r'^--\s+\{\d+\}',
            r'^--\s+$',  # Just "--" on a line
            r'^\s*$',    # Empty lines
        ]
        
        filtered_lines = []
        for line in stderr_text.split('\n'):
            is_info = False
            for pattern in info_patterns:
                if re.match(pattern, line.strip()):
                    is_info = True
                    break
            
            if not is_info and line.strip():
                filtered_lines.append(line)
        
        return '\n'.join(filtered_lines).strip()
    
    def _contains_error(self, text: str) -> bool:
        """Check if output contains M2 error messages."""
        error_patterns = [
            r'error:',
            r'Error:',
            r'ERROR:',
            r'stdio:\d+:\d+:\s*error',
            r'warning.*error'
        ]
        
        for pattern in error_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        
        return False
    
    def _handle_magic_command(self, code: str) -> Dict[str, Any]:
        """Handle kernel magic commands."""
        code = code.strip()
        
        if code.startswith('%timeout'):
            return self._handle_timeout_magic(code)
        elif code.startswith('%help') or code.startswith('%info'):
            return self._handle_help_magic()
        elif code.startswith('%debug'):
            return self._handle_debug_magic(code)
        elif code.startswith('%logging'):
            return self._handle_logging_magic(code)
        elif code.startswith('%latex'):
            return self._handle_latex_magic(code)
        elif code.startswith('%%pi') or code.startswith('%pi'):
            return self._handle_progress_magic(code)
        elif code.startswith('%status'):
            return self._handle_status_magic(code)
        elif code.startswith('%def') or code.startswith('%where'):
            return self._handle_definition_magic(code)
        else:
            return {
                'text': f"Unknown magic command: {code}",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': False
            }
    
    def _handle_timeout_magic(self, code: str) -> Dict[str, Any]:
        """Handle %timeout magic command."""
        if '=' in code:
            try:
                timeout_str = code.split('=')[1].strip()
                new_timeout = float(timeout_str)
                
                if new_timeout <= 0:
                    raise ValueError("Timeout must be positive")
                
                self.current_timeout = new_timeout
                return {
                    'text': f"Timeout set to {new_timeout} seconds",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
            except (ValueError, IndexError) as e:
                return {
                    'text': '',
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': f"Invalid timeout value: {e}",
                    'success': False
                }
        else:
            return {
                'text': f"Current timeout: {self.current_timeout} seconds",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
    
    def _handle_help_magic(self) -> Dict[str, Any]:
        """Handle %help or %info magic command."""
        help_text = """
Macaulay2 Jupyter Kernel Magic Commands
======================================

%help, %info       Show this help message

Code Intelligence:
  %def <symbol>      Show definition location of a symbol
  %where <symbol>    Alias for %def
  
  Examples:
    %def R           # Show where R was defined
    %where ideal     # Show if 'ideal' is built-in or user-defined

MAGIC COMMAND BEHAVIOR:
----------------------
• Line magics (%magic) affect ONLY the M2 code on the same line
• Cell magics (%%magic) affect ALL statements in the cell  
• Magic commands are processed before M2 code execution

Timeout Management:
  %timeout=<seconds>   Set execution timeout (e.g., %timeout=600 for 10 minutes)
  %timeout            Show current timeout setting
  
  Examples:
    %timeout=300      # Set 5-minute timeout
    %timeout          # Show current timeout

Debug and Logging:
  %debug on/off       Enable/disable debug mode for kernel
  %logging on/off     Enable/disable M2 process logging to files
  
  Examples:
    %debug on         # Enable debug logging
    %logging off      # Disable file logging (cleaner output)
    
  Log files are saved to: ~/.m2_kernel_logs/

LaTeX Display:
  %latex on/off       Enable/disable LaTeX rendering
  
  Examples:
    %latex off        # Use plain text output
    %latex on         # Enable LaTeX output (default)
  
  Note: LaTeX is automatically disabled for very large outputs
        (>50x50 matrices, >10KB LaTeX, >150 terms) to improve performance

Progress Indicators:
  %pi [level]         Enable progress for M2 code ON SAME LINE (line magic)
  %%pi [level]        Enable progress for ENTIRE CELL (cell magic)
  %pi off             Disable progress indicators
  
  Levels:
    1 = Basic progress (shows operation start/completion)
    2 = Detailed progress (includes intermediate steps)  
    3 = Verbose progress (full debug output)
  
  LINE MAGIC Examples:
    %pi 2 gb I        # Progress for 'gb I' only
    %pi 2             # No effect (no M2 code on line)
    %pi 1 gb I; res I # Progress for 'gb I' only, not 'res I'
    
  CELL MAGIC Examples:
    %%pi 1            # Progress for all commands in cell
    gb I              # This gets progress
    res I             # This also gets progress

Important Notes:
- Line magics must have M2 code on THE SAME LINE to have effect
- Cell magics must be on the FIRST line of a cell
- Settings persist for the session except line magic %pi
- Progress tracking: uses gbTrace for Gröbner bases, debugLevel for decompose
- Default timeout is 300 seconds (5 minutes)
- Use %logging off to reduce disk usage during normal work
- Use Jupyter's zoom feature (Ctrl/Cmd +/-) to adjust font sizes

For Macaulay2 help, use: help "topic" or viewHelp "topic"
        """.strip()
        
        return {
            'text': help_text,
            'html': '',
            'latex': '',
            'other_output': '',
            'error': '',
            'success': True
        }
    
    def _handle_debug_magic(self, code: str) -> Dict[str, Any]:
        """Handle %debug magic command."""
        if 'on' in code.lower():
            logger.setLevel(logging.DEBUG)
            return {
                'text': "Debug mode enabled",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        elif 'off' in code.lower():
            logger.setLevel(logging.INFO)
            return {
                'text': "Debug mode disabled", 
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        else:
            current_level = "enabled" if logger.level == logging.DEBUG else "disabled"
            return {
                'text': f"Debug mode is {current_level}",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
    
    def _handle_logging_magic(self, code: str) -> Dict[str, Any]:
        """Handle %logging magic command."""
        if 'on' in code.lower():
            self._logging_enabled = True
            return {
                'text': "M2 logging to files enabled",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        elif 'off' in code.lower():
            self._logging_enabled = False
            return {
                'text': "M2 logging to files disabled", 
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        else:
            current_state = "enabled" if self._logging_enabled else "disabled"
            return {
                'text': f"M2 logging is {current_state}",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
    
    def _handle_latex_magic(self, code: str) -> Dict[str, Any]:
        """Handle %latex magic command."""
        logger.debug(f"Handling latex magic: {repr(code)}")
        logger.debug(f"Kernel reference: {self.kernel}")
        logger.debug(f"Current enable_latex before change: {self.kernel.enable_latex if self.kernel else 'No kernel'}")
        
        if self.kernel is None:
            logger.warning("Kernel reference is None in latex magic handler")
            return {
                'text': "LaTeX settings not available (kernel reference missing)",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': False
            }
        
        # Parse the command more carefully
        code_lower = code.lower().strip()
        if ' on' in code_lower or code_lower.endswith(' on') or code_lower == '%latex on':
            self.kernel.enable_latex = True
            # Switch M2 to WebApp mode for LaTeX/HTML output
            if self.kernel._set_m2_output_mode(True):
                logger.info(f"LaTeX output enabled by magic command. enable_latex = {self.kernel.enable_latex}")
                return {
                    'text': "LaTeX output enabled",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
            else:
                logger.error("Failed to switch M2 to WebApp mode")
                return {
                    'text': "LaTeX output enabled but mode switch failed",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': 'Failed to switch M2 output mode',
                    'success': False
                }
        elif ' off' in code_lower or code_lower.endswith(' off') or code_lower == '%latex off':
            self.kernel.enable_latex = False
            # Switch M2 to Standard mode for plain text output
            if self.kernel._set_m2_output_mode(False):
                logger.info(f"LaTeX output disabled by magic command. enable_latex = {self.kernel.enable_latex}")
                return {
                    'text': "LaTeX output disabled", 
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
            else:
                logger.error("Failed to switch M2 to Standard mode")
                return {
                    'text': "LaTeX output disabled but mode switch failed",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': 'Failed to switch M2 output mode',
                    'success': False
                }
        else:
            # Just %latex by itself - show current state
            current_state = "enabled" if self.kernel.enable_latex else "disabled"
            logger.info(f"LaTeX status query: currently {current_state}")
            return {
                'text': f"LaTeX output is {current_state}",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
    
    def _handle_progress_magic(self, code: str) -> Dict[str, Any]:
        """Handle %pi magic command for progress indicators."""
        # Check if this is a cell magic (%%pi)
        if code.startswith('%%pi'):
            self._cell_progress_mode = True
            code = code[4:].strip()  # Remove %%pi prefix
        else:
            self._cell_progress_mode = False
            code = code[3:].strip()  # Remove %pi prefix
        
        # Parse arguments (e.g., %pi 2, %pi on, %pi off)
        code = code.strip()
        
        if code == '' or code == 'on':
            # Default to level 1
            self._progress_level = 1
            self._progress_mode = 'cell' if self._cell_progress_mode else 'line'
            mode_str = "cell magic" if self._cell_progress_mode else "line magic"
            return {
                'text': f"Progress indicators enabled ({mode_str}, level 1)",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        elif code == 'off':
            self._progress_mode = 'off'
            return {
                'text': "Progress indicators disabled",
                'html': '',
                'latex': '',
                'other_output': '',
                'error': '',
                'success': True
            }
        elif code.isdigit():
            level = int(code)
            if 1 <= level <= 3:
                self._progress_level = level
                self._progress_mode = 'cell' if self._cell_progress_mode else 'line'
                mode_str = "cell magic" if self._cell_progress_mode else "line magic"
                return {
                    'text': f"Progress indicators enabled ({mode_str}, level {level})",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
            else:
                return {
                    'text': '',
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': "Progress level must be 1, 2, or 3",
                    'success': False
                }
        else:
            return {
                'text': '',
                'html': '',
                'latex': '',
                'other_output': '',
                'error': f"Invalid progress command. Use: %pi [1-3|on|off] or %%pi [1-3|on|off]",
                'success': False
            }
    
    def _handle_status_magic(self, code: str) -> Dict[str, Any]:
        """Handle %status magic command to show/control M2 process monitoring."""
        parts = code.lower().split()
        
        if len(parts) > 1:
            if parts[1] == 'on':
                # Enable status widget (if kernel has process monitor)
                from .status_widget import M2StatusWidget
                if not hasattr(self.kernel, 'status_widget'):
                    self.kernel.status_widget = M2StatusWidget(self.kernel)
                self.kernel.status_widget.create_widget()
                return {
                    'text': 'M2 status widget enabled',
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
                    
            elif parts[1] == 'off':
                # Disable status widget
                if hasattr(self.kernel, 'status_widget'):
                    js_code = f"""
                    const widget = document.getElementById('{self.kernel.status_widget.widget_id}');
                    if (widget) widget.style.display = 'none';
                    """
                    self.kernel.send_response(
                        self.kernel.iopub_socket,
                        'display_data',
                        {'data': {'application/javascript': js_code}, 'metadata': {}}
                    )
                return {
                    'text': 'M2 status widget disabled',
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
                
        # Show current stats
        if hasattr(self.kernel, 'process_monitor'):
            stats = self.kernel.process_monitor.get_current_stats()
            if stats:
                text = f"M2 Process Status:\n"
                text += f"CPU: {stats['total_cpu']:.1f}%\n"
                text += f"Memory: {stats['total_memory_mb']:.0f} MB\n"
                text += f"Threads: {stats['num_threads']}\n"
                text += f"Processes: {stats['num_processes']}"
                
                return {
                    'text': text,
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
                
        return {
            'text': 'No M2 process statistics available\nUsage: %status [on|off]',
            'html': '',
            'latex': '',
            'other_output': '',
            'error': '',
            'success': True
        }
    
    def _handle_definition_magic(self, code: str) -> Dict[str, Any]:
        """Handle %def or %where magic command to show symbol definition."""
        # Extract symbol from command
        parts = code.split()
        if len(parts) < 2:
            return {
                'text': '',
                'html': '',
                'latex': '',
                'other_output': '',
                'error': 'Usage: %def <symbol> or %where <symbol>',
                'success': False
            }
        
        symbol = parts[1]
        
        # Get definition info from kernel's code intelligence
        if hasattr(self.kernel, 'code_intelligence'):
            definition = self.kernel.code_intelligence.get_definition(symbol)
            
            if definition:
                # Format output
                text_lines = [f"Definition of '{symbol}':"]
                
                if definition.get('builtin'):
                    text_lines.append(f"  Type: Built-in {definition.get('type', 'symbol')}")
                    text_lines.append(f"  {definition.get('documentation', '')}")
                else:
                    text_lines.append(f"  Location: {definition['file']}:{definition['line']}")
                    if definition.get('cell_id'):
                        text_lines.append(f"  Cell: {definition['cell_id']}")
                    text_lines.append(f"  Type: {definition.get('type', 'variable')}")
                    if definition.get('code'):
                        text_lines.append(f"  Code: {definition['code']}")
                
                return {
                    'text': '\n'.join(text_lines),
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
            else:
                return {
                    'text': f"No definition found for '{symbol}'\nNote: Only symbols defined in this session are tracked.",
                    'html': '',
                    'latex': '',
                    'other_output': '',
                    'error': '',
                    'success': True
                }
        else:
            return {
                'text': '',
                'html': '',
                'latex': '',
                'other_output': '',
                'error': 'Code intelligence not available',
                'success': False
            }
    
    def _add_progress_verbosity(self, code: str, level: int) -> Tuple[str, Dict[str, Any]]:
        """Add progress tracking options to M2 operations."""
        import re
        
        modified_code = code
        progress_info = {
            'level': level,
            'operations': [],
            'mode': 'flowing'
        }
        
        # For Gröbner basis computations, use gbTrace
        if re.search(r'\bgb\s+\w+', code, re.IGNORECASE):
            progress_info['operations'].append('Gröbner basis computation')
            # Set gbTrace based on level
            if level >= 1:
                # Prepend gbTrace setting
                modified_code = f"gbTrace = {level};\n{code}"
        
        # For resolution computations, use Strategy
        elif re.search(r'\bres\s+\w+', code, re.IGNORECASE):
            progress_info['operations'].append('Resolution computation')
            # For resolutions, we can use Strategy => ... options
            # But for now, just track that it's a resolution
        
        # For decompose/minimalPrimes, these support Verbosity
        elif re.search(r'\b(decompose|minimalPrimes|primaryDecomposition)\s+\w+', code, re.IGNORECASE):
            progress_info['operations'].append('Primary decomposition')
            # These actually do support Verbosity, but as a global option
            if level >= 1:
                # Set debugLevel for more output
                modified_code = f"debugLevel = {level};\n{code}"
        
        return modified_code, progress_info
    
    def _handle_timeout(self) -> None:
        """Handle execution timeout by interrupting M2 process."""
        if self.process and self.process.poll() is None:
            try:
                # Send interrupt signal
                os.killpg(os.getpgid(self.process.pid), signal.SIGINT)
                
                # Wait a bit for graceful shutdown
                time.sleep(1.0)
                
                # Force kill if still running
                if self.process.poll() is None:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                
                logger.info("M2 process terminated due to timeout")
                
            except ProcessLookupError:
                pass  # Process already dead
            except Exception as e:
                logger.error(f"Failed to terminate M2 process: {e}")
        
        # Restart process for next execution
        self.start_process()
    
    def interrupt(self) -> None:
        """Interrupt the current M2 computation."""
        with self._lock:
            if not self.process or self.process.poll() is not None:
                logger.info("No M2 process to interrupt")
                return
                
            try:
                logger.info(f"Interrupting M2 process {self.process.pid}")
                
                # Send SIGINT to the process group
                os.killpg(os.getpgid(self.process.pid), signal.SIGINT)
                logger.info("Sent SIGINT to M2 process")
                
                # Wait for process to respond to interrupt
                start_time = time.time()
                while time.time() - start_time < 2.0:  # Wait up to 2 seconds
                    if self.process.poll() is not None:
                        logger.info("M2 process terminated after interrupt")
                        break
                    time.sleep(0.1)
                
                # Clear output queues regardless of whether process died
                self._clear_output_queues()
                
                # If process is still running, it handled interrupt gracefully
                if self.process.poll() is None:
                    logger.info("M2 process interrupted and still running")
                    # Send a newline to get back to prompt
                    try:
                        self._send_raw("")
                    except:
                        pass
                else:
                    # Process died, need to restart it
                    logger.warning("M2 process died during interrupt, restarting")
                    self.process = None
                    self.start_process()
                        
            except ProcessLookupError:
                # Process already dead
                logger.info("M2 process was already terminated")
                self.process = None
                self.start_process()
            except Exception as e:
                logger.error(f"Failed to interrupt M2 process: {e}")
                # Last resort: force kill and restart
                try:
                    if self.process and self.process.poll() is None:
                        os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                        self.process.wait(timeout=1.0)
                except Exception:
                    pass
                finally:
                    self.process = None
                    self.start_process()
    
    def shutdown(self) -> None:
        """Shutdown the M2 process gracefully."""
        with self._lock:
            if self.process and self.process.poll() is None:
                try:
                    # Send exit command
                    self._send_raw("exit")
                    
                    # Wait for graceful shutdown
                    try:
                        self.process.wait(timeout=5.0)
                    except subprocess.TimeoutExpired:
                        # Force kill
                        os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                        self.process.wait()
                    
                    logger.info("M2 process shutdown completed")
                    
                except Exception as e:
                    logger.error(f"Error during M2 shutdown: {e}")
                finally:
                    self.process = None
    
    def is_alive(self) -> bool:
        """Check if M2 process is running."""
        return self.process is not None and self.process.poll() is None
    
    def __del__(self):
        """Cleanup on object destruction."""
        try:
            self.shutdown()
        except:
            pass