"""
Macaulay2 Jupyter Kernel

A modern, robust Jupyter kernel for Macaulay2 with rich LaTeX output.
"""

import logging
import re
from typing import Dict, Any, List, Optional

from ipykernel.kernelbase import Kernel
from traitlets import Unicode, Float, Bool

from .m2_process import M2Process, M2ProcessError, M2TimeoutError

logger = logging.getLogger(__name__)


class M2Kernel(Kernel):
    """
    A Jupyter kernel for Macaulay2 with rich LaTeX output and modern features.
    
    Features:
    - Rich LaTeX/MathJax rendering
    - Intelligent timeout management
    - Magic commands
    - Enhanced error handling
    - Tab completion (basic)
    """
    
    # Kernel identification
    implementation = 'M2Kernel'
    implementation_version = '2.0.0'
    language = 'macaulay2'
    language_version = '1.25'
    language_info = {
        'name': 'macaulay2',
        'codemirror_mode': {
            'name': 'macaulay2',  # Use custom M2 mode
            'version': 1
        },
        'pygments_lexer': 'macaulay2',  # Use our custom lexer
        'file_extension': '.m2',
        'mimetype': 'text/x-macaulay2',
        'nbconvert_exporter': '',
        'help_links': [
            {
                'text': 'Macaulay2 Documentation',
                'url': 'https://macaulay2.com/doc/'
            },
            {
                'text': 'Macaulay2 Tutorial',
                'url': 'https://macaulay2.com/doc/Macaulay2Doc/html/_getting_spstarted.html'
            }
        ]
    }
    
    banner = "Macaulay2 Jupyter Kernel 2.0.0\\nFor help, type %help or see https://macaulay2.com/doc/"
    
    # Configurable traits
    m2_command = Unicode(
        help="Path to the Macaulay2 executable"
    ).tag(config=True)
    
    default_timeout = Float(
        300.0,  # 5 minutes default for long computations
        help="Default execution timeout in seconds"
    ).tag(config=True)
    
    enable_latex = Bool(
        True,
        help="Enable LaTeX output rendering"
    ).tag(config=True)
    
    use_async_execution = Bool(
        False,
        help="Enable async multiline parser and execution (experimental)"
    ).tag(config=True)
    
    debug_mode = Bool(
        True,  # Temporarily enable debug mode
        help="Enable debug logging"
    ).tag(config=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Setup logging - write to file for debugging
        import os
        log_dir = os.path.expanduser("~/.m2_kernel_logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"m2_kernel_{os.getpid()}.log")
        
        # Configure logging to both file and console
        log_level = logging.DEBUG if self.debug_mode else logging.INFO
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
        logger.info(f"M2 Kernel starting - PID: {os.getpid()}, Log file: {log_file}")
        
        # Register M2 lexer for syntax highlighting
        self._register_m2_lexer()
        
        # Initialize M2 process
        self.m2_process: Optional[M2Process] = None
        self._initialize_m2_process()
        
        # Initialize progress tracker
        from .progress_tracker import M2ProgressTracker
        self.progress_tracker = M2ProgressTracker(self._send_progress_update)
        
        # Initialize process monitor
        from .process_monitor import M2ProcessMonitor
        self.process_monitor = M2ProcessMonitor(self)
        
        # Initialize code intelligence
        from .code_intelligence import M2CodeIntelligence
        self.code_intelligence = M2CodeIntelligence()
        
        # Initialize cell parser and async executor
        from .cell_parser import M2CellParser
        from .async_executor import AsyncM2Executor
        self.cell_parser = M2CellParser()
        self.async_executor = AsyncM2Executor(self.m2_process, self._send_output)
        self.async_executor.start()
        
        # Initialize heartbeat mechanism
        from .heartbeat import KernelHeartbeat
        self.heartbeat = KernelHeartbeat(self)
        self.heartbeat.start()
        
        # Track execution state
        self._execution_interrupted = False
        self._progress_display_active = False
        
        # Track M2 output mode (WebApp vs Standard)
        self.m2_output_mode = "WebApp"  # Start in WebApp mode (matches --webapp startup)
        
        logger.info("M2 Kernel initialized successfully")
    
    def _register_m2_lexer(self) -> None:
        """Register the M2 Pygments lexer for syntax highlighting."""
        try:
            from pygments.lexers import get_lexer_by_name
            from pygments.util import ClassNotFound
            
            # Try to get the M2 lexer
            try:
                get_lexer_by_name('macaulay2')
                logger.debug("M2 lexer already registered")
            except ClassNotFound:
                # Register our custom lexer
                from .m2_lexer import M2Lexer
                from pygments.lexers import _lexer_cache
                
                # Register the lexer
                _lexer_cache[M2Lexer.name] = M2Lexer
                for alias in M2Lexer.aliases:
                    _lexer_cache[alias] = M2Lexer
                
                logger.info("Registered custom M2 lexer for syntax highlighting")
                
        except Exception as e:
            logger.warning(f"Failed to register M2 lexer: {e}")
            logger.info("Falling back to Python syntax highlighting")
    
    def _initialize_m2_process(self) -> None:
        """Initialize the M2 process."""
        try:
            # Create progress callback
            def progress_callback(output):
                if hasattr(self, 'progress_tracker') and self.progress_tracker:
                    self.progress_tracker.process_output(output)
            
            m2_cmd = self.m2_command if self.m2_command else None
            self.m2_process = M2Process(
                m2_command=m2_cmd,
                default_timeout=self.default_timeout,
                progress_callback=progress_callback,
                kernel=self
            )
            logger.info("M2 process initialized")
            
            # Start process monitoring if M2 started successfully
            if self.m2_process and self.m2_process.process and hasattr(self, 'process_monitor'):
                self.process_monitor.start_monitoring(self.m2_process.process.pid)
                logger.info(f"Started monitoring M2 process PID: {self.m2_process.process.pid}")
        except M2ProcessError as e:
            logger.error(f"Failed to initialize M2 process: {e}")
            self.m2_process = None
    
    def _send_progress_update(self, message: str, is_final: bool = False):
        """Send progress update to the frontend."""
        try:
            from .progress_tracker import format_progress_html
            
            display_id = 'progress_indicator'
            
            # For intermediate updates, use update_display_data for in-place updates
            if hasattr(self, '_progress_display_active') and self._progress_display_active and not is_final:
                self.send_response(
                    self.iopub_socket,
                    'update_display_data',
                    {
                        'data': {
                            'text/plain': f"Progress: {message}",
                            'text/html': format_progress_html(message)
                        },
                        'metadata': {
                            'transient': {'display_id': display_id}
                        }
                    }
                )
            else:
                # For initial and final updates, use display_data
                self.send_response(
                    self.iopub_socket,
                    'display_data',
                    {
                        'data': {
                            'text/plain': f"Progress: {message}",
                            'text/html': format_progress_html(message)
                        },
                        'metadata': {
                            'transient': {'display_id': display_id}
                        }
                    }
                )
                self._progress_display_active = not is_final
                
        except Exception as e:
            logger.debug(f"Failed to send progress update: {e}")
    
    def do_execute(
        self,
        code: str,
        silent: bool,
        store_history: bool = True,
        user_expressions: Optional[Dict] = None,
        allow_stdin: bool = False,
        *,
        cell_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute user code.
        
        Args:
            code: The code to execute
            silent: Whether to suppress output
            store_history: Whether to store in history
            user_expressions: User expressions to evaluate
            allow_stdin: Whether to allow stdin
            cell_id: Unique cell identifier
            
        Returns:
            Execution result dictionary
        """
        if not code.strip():
            return {
                'status': 'ok',
                'execution_count': self.execution_count,
                'payload': [],
                'user_expressions': {},
            }
            
        # Track definitions in the code
        if not cell_id:
            cell_id = f"cell_{self.execution_count}"
        self.code_intelligence.track_definitions(code, cell_id=cell_id)
        
        # Use async execution if enabled
        if self.use_async_execution:
            return self._do_execute_async(code, silent, store_history,
                                        user_expressions, allow_stdin, cell_id)
        
        # Clear interrupt flag at start of execution
        self._execution_interrupted = False
        
        # Check if M2 process is available
        if not self.m2_process:
            self._send_error("M2 process not available. Please restart the kernel.")
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': 'M2ProcessError',
                'evalue': 'M2 process not available',
                'traceback': ['M2 process failed to initialize']
            }
        
        try:
            # Start heartbeat to keep connection alive
            self.heartbeat.begin_computation(self.execution_count)
            
            # Handle magic commands
            original_code = code
            
            # Check for cell magic (%%pi) at the beginning of the cell
            if code.strip().startswith('%%pi'):
                lines = code.strip().split('\n')
                magic_line = lines[0]
                remaining_code = '\n'.join(lines[1:]) if len(lines) > 1 else ''
                
                # Handle the cell magic through the magic handler
                magic_result = self.m2_process._handle_magic_command(magic_line)
                if not magic_result['success']:
                    return {
                        'status': 'error',
                        'execution_count': self.execution_count,
                        'ename': 'MagicError',
                        'evalue': magic_result['error'],
                        'traceback': [magic_result['error']]
                    }
                
                # Don't display magic command result for %pi
                # It will be shown in the progress tracker
                if magic_result.get('text') and not silent and not magic_line.strip().startswith('%%pi'):
                    self._send_output(magic_result, magic_line)
                
                # Use remaining code for execution (if any)
                code = remaining_code if remaining_code and remaining_code.strip() else ''
            else:
                # Check for line magic (%pi) anywhere in the code
                import re
                lines = code.split('\n')
                processed_lines = []
                
                for i, line in enumerate(lines):
                    line_stripped = line.strip()
                    
                    # Keep empty lines and comments for proper execution flow
                    if not line_stripped:
                        processed_lines.append(line)
                        continue
                    if line_stripped.startswith('--'):
                        processed_lines.append(line)
                        continue
                        
                    # Check if line starts with a line magic
                    if line_stripped.startswith('%') and not line_stripped.startswith('%%'):
                        # Parse the line magic
                        # Match magic command - be more flexible with arguments
                        # For %timeout=600, we want the whole thing as magic
                        # For %pi 2 gb I, we want "%pi 2" as magic and "gb I" as remaining
                        # For %latex off, we want the whole thing as magic
                        if line_stripped.startswith('%latex'):
                            # Special handling for %latex on/off
                            parts = line_stripped.split(None, 2)  # Split on whitespace, max 3 parts
                            if len(parts) >= 2 and parts[1] in ['on', 'off']:
                                magic_command = f"{parts[0]} {parts[1]}"
                                remaining_on_line = parts[2] if len(parts) > 2 else ""
                            else:
                                magic_command = parts[0]
                                remaining_on_line = " ".join(parts[1:]) if len(parts) > 1 else ""
                        elif line_stripped.startswith(('%def', '%where')):
                            # Special handling for %def and %where - they take a symbol argument
                            parts = line_stripped.split(None, 2)  # Split on whitespace, max 3 parts
                            if len(parts) >= 2:
                                magic_command = f"{parts[0]} {parts[1]}"  # Include the symbol
                                remaining_on_line = parts[2] if len(parts) > 2 else ""
                            else:
                                magic_command = parts[0]
                                remaining_on_line = ""
                        else:
                            # General magic parsing
                            magic_match = re.match(r'^(%\w+(?:=\w+|\s+\d+)?)\s*(.*)$', line_stripped)
                            if magic_match:
                                magic_command = magic_match.group(1)
                                remaining_on_line = magic_match.group(2)
                            else:
                                # Fallback - just take the first word as magic
                                parts = line_stripped.split(None, 1)
                                magic_command = parts[0]
                                remaining_on_line = parts[1] if len(parts) > 1 else ""
                        
                        # Handle the line magic through the magic handler
                        magic_result = self.m2_process._handle_magic_command(magic_command)
                        if not magic_result['success']:
                            return {
                                'status': 'error',
                                'execution_count': self.execution_count,
                                'ename': 'MagicError',
                                'evalue': magic_result['error'],
                                'traceback': [magic_result['error']]
                            }
                        
                        # For %def and %where, don't display here - let statement execution handle it
                        if not magic_command.strip().startswith(('%def', '%where')):
                            # Display magic command result
                            if magic_result.get('text') and not silent:
                                # Don't display for %pi - it will be shown in the progress tracker
                                if not magic_command.strip().startswith('%pi'):
                                    self._send_output(magic_result, magic_command)
                        
                        # For %pi magic, check if there's M2 code on the same line
                        if magic_command.startswith('%pi'):
                            if remaining_on_line:
                                # Apply progress to this line only
                                if self.m2_process._progress_mode == 'line':
                                    # Execute the code on this line with progress
                                    result = self._execute_with_progress(remaining_on_line, silent)
                                    if result:
                                        return result
                                    # Reset line magic mode after use
                                    self.m2_process._progress_mode = 'off'
                                    # For line mode, we're done - don't process any other lines
                                    return {
                                        'status': 'ok',
                                        'execution_count': self.execution_count,
                                        'payload': [],
                                        'user_expressions': {},
                                    }
                                else:
                                    processed_lines.append(remaining_on_line)
                            else:
                                # Warning: line magic with no code
                                if not silent:
                                    self._send_output({
                                        'text': 'Warning: Line magic %pi has no M2 statement on the same line',
                                        'html': '<em style="color: orange;">Warning: Line magic %pi has no M2 statement on the same line</em>'
                                    }, '')
                                # Reset line magic mode since it wasn't used
                                if self.m2_process._progress_mode == 'line':
                                    self.m2_process._progress_mode = 'off'
                        else:
                            # For %def and %where, keep the whole line for later processing
                            if magic_command.strip().startswith(('%def', '%where')):
                                processed_lines.append(line_stripped)  # Keep the whole magic command
                            elif remaining_on_line:
                                # Other magics - if there's remaining code on the line, keep it
                                processed_lines.append(remaining_on_line)
                    else:
                        processed_lines.append(line)
                
                # Use processed code for execution
                code = '\n'.join(processed_lines)
            
            # If no code remains after processing magic commands, return success
            # Also return success if we only have comments (no actual M2 statements)
            if not code or not code.strip() or all(line.strip().startswith('--') or not line.strip() for line in code.split('\n')):
                return {
                    'status': 'ok',
                    'execution_count': self.execution_count,
                    'payload': [],
                    'user_expressions': {}
                }
            
            # Parse cell into individual statements for proper output ordering
            from .cell_parser import M2CellParser, Statement
            parser = M2CellParser()
            parsed_cell = parser.parse_cell(code)
            
            # If parsing failed, execute as single block (backward compatibility)
            if not parsed_cell.statements:
                logger.debug("Cell parsing failed, executing as single block")
                parsed_cell.statements = [Statement(code=code, start_line=0)]
            
            # Execute each statement separately to maintain output order
            all_results = []
            for i, statement in enumerate(parsed_cell.statements):
                stmt_code = statement.code.strip()
                if not stmt_code:
                    continue
                    
                # Check if this is a magic command that wasn't handled earlier
                if stmt_code.startswith('%') and not stmt_code.startswith('%%'):
                    # This is a line magic - handle it now
                    magic_result = self.m2_process._handle_magic_command(stmt_code)
                    if not magic_result['success']:
                        all_results.append({
                            'text': '',
                            'html': '',
                            'latex': '',
                            'other_output': '',
                            'error': magic_result['error'],
                            'success': False,
                            'statement_index': i,
                            'total_statements': len(parsed_cell.statements)
                        })
                        continue
                    else:
                        # Add successful magic result
                        magic_result['statement_index'] = i
                        magic_result['total_statements'] = len(parsed_cell.statements)
                        all_results.append(magic_result)
                        continue
                    
                # Check if this specific statement needs progress tracking
                progress_enabled = self.m2_process._progress_mode != 'off'
                is_long_running = self.progress_tracker.is_long_running_operation(stmt_code)
                
                if progress_enabled and is_long_running and not silent:
                    # Start progress tracking only when magic is enabled
                    self.progress_tracker.start_tracking(stmt_code)
                    
                    # Don't send the "Running..." message as it clutters output
                    # The progress tracker will handle showing progress updates
                    
                    # Progress tracking is handled by the progress tracker
                    # Don't modify code here
                
                # Execute statement
                logger.debug(f"Executing statement {i+1}/{len(parsed_cell.statements)}: {stmt_code[:50]}...")
                try:
                    result = self.m2_process.execute(stmt_code)
                    logger.debug(f"Statement result: {result['success']}, has output: {bool(result.get('text'))}")
                    
                    # Add statement index for proper separator handling
                    result['statement_index'] = i
                    result['total_statements'] = len(parsed_cell.statements)
                    
                    # Check if statement ends with semicolon (output suppression)
                    if stmt_code.rstrip().endswith(';'):
                        logger.debug("Statement ends with semicolon, suppressing output")
                        # Don't add to results if semicolon suppresses output
                        # But still check for errors
                        if not result['success']:
                            all_results.append(result)
                    else:
                        all_results.append(result)
                except M2ProcessError as e:
                    logger.error(f"M2 process error during statement execution: {e}")
                    # Add error result
                    all_results.append({
                        'text': '',
                        'html': '',
                        'latex': '',
                        'other_output': '',
                        'error': str(e),
                        'success': False,
                        'statement_index': i,
                        'total_statements': len(parsed_cell.statements)
                    })
                    # Don't continue executing if M2 crashed
                    break
                
                # Stop progress tracking for this statement if it was started
                if progress_enabled and is_long_running:
                    self.progress_tracker.finish_tracking(result.get('success', True))
            
            # Now process all results
            if not all_results:
                return {
                    'status': 'ok',
                    'execution_count': self.execution_count,
                    'payload': [],
                    'user_expressions': {}
                }
            
            # Send each result in order
            for result in all_results:
                if result['success']:
                    # Send successful output
                    if not silent and (result.get('text') or result.get('other_output')):
                        logger.debug(f"Sending output for statement {result.get('statement_index', 0) + 1}")
                        self._send_output(result, original_code)
                        
                    # Handle progress info if present
                    if not silent and result.get('progress_info'):
                        # Progress info is handled by the progress tracker
                        pass
                else:
                    # Send error output
                    if not silent:
                        self._send_error(result['error'])
                    
                    # Return error status on first error
                    return {
                        'status': 'error',
                        'execution_count': self.execution_count,
                        'ename': 'M2ExecutionError',
                        'evalue': result['error'],
                        'traceback': self._format_traceback(result['error'])
                    }
            
            # All statements executed successfully
            return {
                'status': 'ok',
                'execution_count': self.execution_count,
                'payload': [],
                'user_expressions': {}
            }
            
        except M2ProcessError as e:
            logger.error(f"M2 process error during execution: {e}")
            # Try to restart M2 and inform user
            self._send_error(f"M2 process crashed: {e}")
            self._send_error("Attempting to restart M2...")
            try:
                self._initialize_m2_process()
                self._send_error("M2 restarted successfully. Please try your command again.")
            except Exception as restart_error:
                self._send_error(f"Failed to restart M2: {restart_error}")
            
            return {
                    'status': 'error',
                    'execution_count': self.execution_count,
                    'ename': 'M2ProcessCrash',
                    'evalue': str(e),
                    'traceback': [f"M2 process crashed: {e}"]
                }
            
            # Check if execution was interrupted
            if self._execution_interrupted:
                # Stop progress tracking only if it was started
                if progress_enabled and is_long_running:
                    self.progress_tracker.finish_tracking(success=False)
                
                return {
                    'status': 'error',
                    'execution_count': self.execution_count,
                    'ename': 'KeyboardInterrupt',
                    'evalue': 'Computation interrupted by user',
                    'traceback': ['KeyboardInterrupt: Computation interrupted by user']
                }
            
            # Stop progress tracking only if it was started
            if progress_enabled and is_long_running:
                self.progress_tracker.finish_tracking(result['success'])
            
            if result['success']:
                # Send successful output
                if not silent and result['text']:
                    logger.debug(f"Result keys: {result.keys()}")
                    logger.debug(f"Has latex: {'latex' in result}")
                    logger.debug(f"Has html: {'html' in result}")
                    self._send_output(result, original_code)
                    
                # Handle progress info if present
                if not silent and result.get('progress_info'):
                    self._send_progress_banner(result['progress_info'])
                
                return {
                    'status': 'ok',
                    'execution_count': self.execution_count,
                    'payload': [],
                    'user_expressions': {},
                }
            else:
                # Handle execution error
                if not silent:
                    self._send_error(result['error'])
                
                return {
                    'status': 'error',
                    'execution_count': self.execution_count,
                    'ename': 'M2ExecutionError',
                    'evalue': result['error'],
                    'traceback': self._format_traceback(result['error'])
                }
        
        except M2TimeoutError as e:
            if not silent:
                self._send_error(str(e))
            
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': 'M2TimeoutError',
                'evalue': str(e),
                'traceback': [str(e)]
            }
        
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Unexpected error in do_execute: {e}\nTraceback:\n{tb}")
            
            if not silent:
                self._send_error(f"Kernel error: {e}")
            
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': 'KernelError',
                'evalue': str(e),
                'traceback': [str(e)]
            }
        
        finally:
            # Always stop heartbeat after execution
            self.heartbeat.end_computation()
    
    def _send_output(self, result: Dict[str, Any], original_code: str) -> None:
        """Send execution output to the frontend."""
        # Check if this is an error result from M2
        if result.get('error') and not result.get('success', True):
            # Style M2 errors with reddish background
            import html as html_lib
            error_html = f"""<style>
.m2-error-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.4;
    background-color: #ffe6e6;
    border-left: 3px solid #ff4444;
    padding: 10px 15px;
    margin: 10px 0;
    white-space: pre-wrap;
    color: #cc0000;
}}
</style>
<div class="m2-error-output">{html_lib.escape(result['error'])}</div>"""
            
            self.send_response(
                self.iopub_socket,
                'display_data',
                {
                    'data': {
                        'text/html': error_html,
                        'text/plain': result['error']
                    },
                    'metadata': {}
                }
            )
            return
        
        # Handle output based on current M2 mode
        if self.m2_output_mode == "Standard":
            # Standard mode: M2 already provides clean plain text output
            # Just remove any stray control characters and use as-is
            import re
            clean_text = result['text']
            clean_text = re.sub(r'[\x0e\x11\x12\x15]', '', clean_text)
            output_data = {'text/plain': clean_text}
            use_latex = False  # Never use LaTeX processing in Standard mode
        else:
            # WebApp mode: Use existing LaTeX/HTML processing
            use_latex = self.enable_latex and self._should_use_latex(result)
            
            # For WebApp mode, use the parsed HTML but preserve meaningful text/plain
            if result.get('html') and result['html'].strip():
                # We have processed HTML - clean the original text and extract meaningful content
                import re
                clean_text = re.sub(r'[\x00-\x1f\x7f]', '', result['text'])
                
                # Try to extract meaningful content from the clean text for text/plain
                if result.get('output_var'):
                    output_var = result['output_var']
                    
                    # Look for actual content in the parsed HTML without raw tokens
                    html_content = result.get('html', '')
                    
                    # Extract text content from HTML by removing all tags
                    import re
                    text_content = re.sub(r'<[^>]+>', '', html_content)
                    # Clean up whitespace and newlines
                    text_content = re.sub(r'\s+', ' ', text_content).strip()
                    
                    if text_content and text_content != output_var:
                        # Use the extracted text content
                        clean_text = text_content
                    elif result.get('latex'):
                        clean_text = f"{output_var} = {result['latex']}"
                    else:
                        # Fallback: use cleaned original text if available, otherwise minimal representation
                        if clean_text.strip() and not re.match(r'^\s*\d+:\d+.*$', clean_text.strip()):
                            # Keep original clean text if it has meaningful content
                            pass
                        else:
                            clean_text = f"{output_var}"
                elif clean_text.strip() == '' or re.match(r'^\s*\d+:\d+.*$', clean_text.strip()):
                    # Empty or just position info - use empty string  
                    clean_text = ''
                output_data = {'text/plain': clean_text}
            else:
                # No processed HTML - use original text (but still clean control chars)
                import re
                clean_text = re.sub(r'[\x00-\x1f\x7f]', '', result['text'])
                output_data = {'text/plain': clean_text}
        
        logger.debug(f"_send_output called with keys: {result.keys()}")
        logger.debug(f"enable_latex: {self.enable_latex}, use_latex: {use_latex}")
        logger.debug(f"latex content: {result.get('latex', 'None')[:100] if result.get('latex') else 'None'}")
        logger.debug(f"html content: {result.get('html', 'None')[:100] if result.get('html') else 'None'}")
        
        # Handle "other output" if present (informational messages)
        other_output_html = ""
        if result.get('other_output') and result['other_output'].strip():
            # Check if we're using progress indicators
            if not (hasattr(self, 'm2_process') and self.m2_process._progress_mode != 'off'):
                # No progress mode - show other output in light blue block
                import html as html_lib
                escaped_other = html_lib.escape(result['other_output'])
                other_output_html = f'<div class="m2-other-output">{escaped_other}</div>'
        
        # When LaTeX is disabled, show HTML output if available
        if not use_latex:
            # Check if we have regular HTML output (e.g., for GroebnerBasis objects)
            if result.get('html') and result['html'].strip():
                # Use the HTML from webapp parser
                html_content = result['html']
                
                # Add styling - include styles for M2 output formatting
                styled_html = f"""<style>
.m2-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 10px;
}}
.m2-output-line {{
    margin: 5px 0;
}}
.m2-output-var {{
    color: #0066cc;
    font-weight: bold !important;
}}
.m2-output-punct {{
    color: #666;
    margin: 0 5px;
}}
.m2-nonmath {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background-color: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
}}
.m2-type {{
    color: #666;
    font-style: italic;
}}
.m2-other-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.4;
    background-color: #f0f8ff;
    border-left: 3px solid #87ceeb;
    padding: 10px 15px;
    margin-bottom: 10px;
    white-space: pre-wrap;
    color: #333;
    opacity: 0.9;
}}
.m2-large-output-notice {{
    margin-top: 10px;
    padding: 8px 12px;
    background-color: #f0f8ff;
    border-left: 3px solid #1e90ff;
    font-size: 12px;
    color: #555;
    font-style: italic;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}}
.m2-command-separator {{
    border-top: 1px solid #e0e0e0;
    margin: 15px 10px 15px 10px;
    opacity: 0.5;
}}
</style>
{other_output_html}{html_content}"""
                
                # Add notice if LaTeX was disabled due to size (not user preference)
                if self.enable_latex and result.get('latex') and not self._should_use_latex(result):
                    styled_html += '''<div class="m2-large-output-notice">⚡ LaTeX rendering disabled for large output. Showing plain text for better performance.</div>'''
                
                # Add command separator if this is part of multi-command output
                if result.get('statement_index') is not None and result.get('statement_index', 0) > 0:
                    # Insert separator after the <style> tag
                    style_end = styled_html.find('</style>') + 8
                    styled_html = styled_html[:style_end] + '<div class="m2-command-separator"></div>' + styled_html[style_end:]
                
                output_data['text/html'] = styled_html
            elif other_output_html:
                # Only other output, no main HTML content
                styled_html = f"""<style>
.m2-other-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.4;
    background-color: #f0f8ff;
    border-left: 3px solid #87ceeb;
    padding: 10px 15px;
    margin-bottom: 10px;
    white-space: pre-wrap;
    color: #333;
    opacity: 0.9;
}}
.m2-command-separator {{
    border-top: 1px solid #e0e0e0;
    margin: 15px 10px 15px 10px;
    opacity: 0.5;
}}
</style>
{other_output_html}"""
                
                # Add command separator if needed
                if result.get('statement_index') is not None and result.get('statement_index', 0) > 0:
                    style_end = styled_html.find('</style>') + 8
                    styled_html = styled_html[:style_end] + '<div class="m2-command-separator"></div>' + styled_html[style_end:]
                
                output_data['text/html'] = styled_html
        elif use_latex and result.get('html'):
            # LaTeX is enabled, use the HTML output
            html_content = result['html']
            
            if html_content.strip():
                # Add CSS styling for better formatting
                # Include LaTeX for copy functionality if available
                latex_for_copy = ""
                if self.enable_latex and result.get('latex') and use_latex:
                    output_var = result.get('output_var', '')
                    latex_content = result['latex']
                    if output_var and latex_content:
                        latex_for_copy = f"{output_var} = {latex_content}"
                    elif latex_content:
                        latex_for_copy = latex_content
                
                # Build the full HTML with proper escaping
                copy_button = ""
                if latex_for_copy and use_latex:  # Only show copy button if we're actually displaying LaTeX
                    # Escape the LaTeX for JavaScript
                    escaped_latex = latex_for_copy.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                    copy_button = f'''<button class='m2-copy-button' onclick='navigator.clipboard.writeText("{escaped_latex}"); this.textContent="Copied!"; setTimeout(() => this.textContent="Copy LaTeX", 1500);' title='Copy LaTeX to clipboard'>Copy LaTeX</button>'''
                
                # Build other output HTML if present
                other_output_html = ""
                if result.get('other_output') and result['other_output'].strip():
                    # Check if we're using progress indicators
                    if hasattr(self, 'm2_process') and self.m2_process._progress_mode != 'off':
                        # Progress mode active - don't show other output as separate block
                        # It will be handled by the progress tracker
                        pass
                    else:
                        # No progress mode - show other output in light blue block
                        import html as html_lib
                        escaped_other = html_lib.escape(result['other_output'])
                        other_output_html = f'<div class="m2-other-output">{escaped_other}</div>'
                
                styled_html = f"""<style>
.m2-output {{
    font-family: 'Computer Modern', 'Latin Modern Math', serif !important;
    margin: 10px 0;
    position: relative;
}}
.m2-context {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 0.9em !important;
    color: #666 !important;
    margin-bottom: 3px;
    font-style: italic;
}}
.m2-output-line {{
    margin: 2px 0;
}}
.m2-type-line {{
    margin: 2px 0;
}}
span.m2-output-var {{
    font-weight: normal !important;
    color: black !important;
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
}}
.m2-output span.m2-output-var {{
    font-weight: normal !important;
    color: black !important;
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
}}
.m2-output-line span.m2-output-var {{
    font-weight: normal !important;
    color: black !important;
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
}}
.m2-type-line span.m2-output-var {{
    font-weight: normal !important;
    color: black !important;
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
}}
.m2-output-punct {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-weight: normal !important;
    color: black !important;
}}
.m2-nonmath {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
}}
.m2-type {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    color: #333 !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
}}
.m2-description {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    color: #333 !important;
    background: none !important;
    padding: 0 !important;
}}
samp.token.class-name {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    color: #0066cc !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
    font-weight: 500 !important;
}}
samp.token.function {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    color: #0066cc !important;
    background: none !important;
    padding: 0 !important;
    border: none !important;
    font-weight: normal !important;
}}
.m2-copy-button {{
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 2px 8px;
    font-size: 11px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    opacity: 0.3;
    transition: opacity 0.2s;
}}
.m2-output:hover .m2-copy-button {{
    opacity: 0.8;
}}
.m2-copy-button:hover {{
    opacity: 1 !important;
    background: #e0e0e0;
}}
.m2-copy-button:active {{
    background: #d0d0d0;
}}
/* MathJax/MathML font size control to match HTML content */
mjx-container {{
    font-size: 110% !important;
}}
.MathJax, .MathJax_Display {{
    font-size: 110% !important;
}}
math {{
    font-size: 110% !important;
}}
/* For KaTeX if used */
.katex {{
    font-size: 110% !important;
}}
/* Large output notice */
.m2-large-output-notice {{
    margin-top: 10px;
    padding: 8px 12px;
    background-color: #f0f8ff;
    border-left: 3px solid #1e90ff;
    font-size: 12px;
    color: #555;
    font-style: italic;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}}
/* Other output block */
.m2-other-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.4;
    background-color: #f0f8ff;  /* Light blue background */
    border-left: 3px solid #87ceeb;  /* Slightly darker blue border */
    padding: 10px 15px;
    margin-bottom: 10px;
    white-space: pre-wrap;
    color: #333;
    opacity: 0.9;
}}
/* Command separator for multi-command cells */
.m2-command-separator {{
    border-top: 1px solid #e0e0e0;
    margin: 15px 10px 15px 10px;
    opacity: 0.5;
}}
</style>
{other_output_html}
{html_content}
{copy_button}"""
                
                # Add command separator if this is part of multi-command output
                separator_html = ""
                if result.get('statement_index') is not None and result.get('statement_index', 0) > 0:
                    separator_html = '<div class="m2-command-separator"></div>'
                
                # Rebuild HTML with separator at the beginning if needed
                if separator_html:
                    # Insert separator after the <style> tag
                    style_end = styled_html.find('</style>') + 8
                    styled_html = styled_html[:style_end] + separator_html + styled_html[style_end:]
                
                # Add notice if we're not showing LaTeX due to size
                if result.get('latex') and not use_latex:
                    styled_html += '''<div class="m2-large-output-notice">⚡ LaTeX rendering disabled for large output. Showing plain text for better performance.</div>'''
                    
                output_data['text/html'] = styled_html
        
        # Add LaTeX output if available, enabled, and appropriate size
        if self.enable_latex and result.get('latex') and use_latex:
            latex_content = result['latex']
            output_var = result.get('output_var', '')
            
            if latex_content.strip():
                # Include output variable reference in LaTeX
                if output_var:
                    # Create properly formatted LaTeX with output variable
                    formatted_latex = f"{output_var} = {latex_content}"
                else:
                    formatted_latex = latex_content
                    
                # Don't use \large or \Large - control size via CSS instead
                if not formatted_latex.startswith('$'):
                    formatted_latex = f"$${formatted_latex}$$"
                    
                output_data['text/latex'] = formatted_latex
        
        # Send display data
        self.send_response(
            self.iopub_socket,
            'execute_result',
            {
                'execution_count': self.execution_count,
                'data': output_data,
                'metadata': {}
            }
        )
    
    def _set_m2_output_mode(self, latex_enabled: bool) -> bool:
        """
        Switch M2's output mode between WebApp (LaTeX/HTML) and Standard (plain text).
        
        Args:
            latex_enabled: True for WebApp mode, False for Standard mode
            
        Returns:
            bool: True if mode switch was successful
        """
        target_mode = "WebApp" if latex_enabled else "Standard"
        
        # Skip if already in correct mode
        if self.m2_output_mode == target_mode:
            logger.debug(f"Already in {target_mode} mode, skipping switch")
            return True
            
        # Send mode switch command to M2
        mode_command = f"topLevelMode = global {target_mode}"
        logger.info(f"Switching M2 output mode to {target_mode}")
        
        try:
            result = self.m2_process.execute(mode_command)
            if result['success']:
                self.m2_output_mode = target_mode
                logger.info(f"Successfully switched to {target_mode} mode")
                return True
            else:
                logger.error(f"Failed to switch to {target_mode} mode: {result['error']}")
                return False
        except Exception as e:
            logger.error(f"Exception during mode switch: {e}")
            return False
    
    def _should_use_latex(self, result: Dict[str, Any]) -> bool:
        """
        Determine if LaTeX should be used based on output size and complexity.
        
        Returns False for very large outputs to improve performance.
        """
        if not result.get('latex'):
            return False
            
        latex_content = result['latex']
        
        # Check for very large matrices first (before size check)
        # Count occurrences of matrix delimiters
        matrix_rows = latex_content.count('\\\\')
        matrix_cols = latex_content.count('&')
        
        # Estimate matrix size (very rough)
        # For a matrix, cols ≈ (number of &) / rows
        if matrix_rows > 0:
            avg_cols_per_row = matrix_cols / matrix_rows if matrix_rows > 0 else 0
            # Disable for matrices larger than 50x50
            if matrix_rows > 50 or avg_cols_per_row > 50:
                return False
            # Allow smaller matrices even if they have lots of LaTeX
            if matrix_rows > 20 and matrix_rows <= 50:
                # For medium matrices, use a more lenient size threshold
                if len(latex_content) > 20000:  # 20KB for matrices
                    return False
                else:
                    return True  # Don't apply other checks for medium matrices
        
        # Check LaTeX content size (for non-matrix content)
        if len(latex_content) > 10000:  # ~10KB threshold for non-matrices
            return False
            
        # Check plain text size as well
        if result.get('text') and len(result['text']) > 15000:
            return False
            
        # Check for deeply nested structures by counting braces
        open_braces = latex_content.count('{')
        close_braces = latex_content.count('}')
        
        # If we have many braces, it's likely a complex structure
        if open_braces > 300 or close_braces > 300:
            return False
            
        # Check for long polynomials (many + or - signs)
        plus_minus_count = latex_content.count('+') + latex_content.count('-')
        if plus_minus_count > 150:
            return False
            
        return True
    
    def _execute_with_progress(self, code: str, silent: bool) -> Optional[Dict[str, Any]]:
        """Execute code with progress tracking already enabled."""
        try:
            # Check if this is a long-running operation
            is_long_running = self.progress_tracker.is_long_running_operation(code)
            
            if is_long_running and not silent:
                # Start progress tracking
                self.progress_tracker.start_tracking(code)
            
            # Execute code with progress modifications
            modified_code, progress_info = self.m2_process._add_progress_verbosity(code, self.m2_process._progress_level)
            result = self.m2_process.execute(modified_code)
            
            # Stop progress tracking
            if is_long_running:
                self.progress_tracker.finish_tracking(result['success'])
            
            # Send progress banner if we have progress info
            if not silent and progress_info and progress_info.get('operations'):
                self._send_progress_banner(progress_info)
            
            # Send output
            if result['success'] and not silent and result['text']:
                self._send_output(result, code)
            elif not result['success']:
                return {
                    'status': 'error',
                    'execution_count': self.execution_count,
                    'ename': 'M2Error',
                    'evalue': result.get('error', 'Unknown error'),
                    'traceback': [result.get('error', 'M2 execution failed')]
                }
            
            return None  # Success, continue with rest of cell
            
        except Exception as e:
            logger.error(f"Error in progress execution: {e}")
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': type(e).__name__,
                'evalue': str(e),
                'traceback': [str(e)]
            }
    
    def _send_progress_banner(self, progress_info: Dict[str, Any]) -> None:
        """Send flowing progress banner for enhanced progress display."""
        operations = progress_info.get('operations', [])
        level = progress_info.get('level', 1)
        
        if not operations:
            return
            
        # Create a flowing progress banner with blue styling
        operation_list = ', '.join(operations)
        level_desc = {1: 'Basic', 2: 'Detailed', 3: 'Verbose'}[level]
        
        banner_html = f"""
        <div class="m2-progress-banner">
            <div class="m2-progress-header">
                <span class="m2-progress-icon">⚡</span>
                <span class="m2-progress-title">Progress Tracking Active</span>
                <span class="m2-progress-level">({level_desc} Level {level})</span>
            </div>
            <div class="m2-progress-operations">
                <strong>Operations:</strong> {operation_list}
            </div>
            <div class="m2-progress-note">
                <em>Progress updates will appear during computation with enhanced verbosity</em>
            </div>
        </div>
        
        <style>
        .m2-progress-banner {{
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin: 8px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }}
        .m2-progress-header {{
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }}
        .m2-progress-icon {{
            font-size: 1.2em;
        }}
        .m2-progress-title {{
            font-weight: bold;
            font-size: 1.1em;
        }}
        .m2-progress-level {{
            opacity: 0.9;
            font-size: 0.9em;
        }}
        .m2-progress-operations {{
            margin: 4px 0;
            font-size: 0.95em;
        }}
        .m2-progress-note {{
            margin-top: 6px;
            font-size: 0.85em;
            opacity: 0.8;
        }}
        </style>
        """
        
        self.send_response(
            self.iopub_socket,
            'display_data',
            {
                'data': {
                    'text/html': banner_html,
                    'text/plain': f"Progress tracking active: {operation_list} (Level {level})"
                },
                'metadata': {}
            }
        )
    
    def _send_error(self, error_message: str) -> None:
        """Send error message to the frontend with styled display."""
        import html as html_lib
        
        # Send to stderr stream
        self.send_response(
            self.iopub_socket,
            'stream',
            {
                'name': 'stderr',
                'text': f"Error: {error_message}\\n"
            }
        )
        
        # Also send as display_data with reddish styling
        error_html = f"""<style>
.m2-error-output {{
    font-family: 'Source Code Pro', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.4;
    background-color: #ffe6e6;  /* Light red background */
    border-left: 3px solid #ff4444;  /* Red border */
    padding: 10px 15px;
    margin: 10px 0;
    white-space: pre-wrap;
    color: #cc0000;
}}
</style>
<div class="m2-error-output">{html_lib.escape(error_message)}</div>"""
        
        self.send_response(
            self.iopub_socket,
            'display_data',
            {
                'data': {
                    'text/html': error_html,
                    'text/plain': error_message
                },
                'metadata': {}
            }
        )
    
    def _format_latex_output(self, latex: str) -> str:
        """Format LaTeX output for Jupyter display."""
        if not latex:
            return ''
        
        # Remove extra whitespace and newlines
        latex = latex.strip()
        
        # Skip if it's not actually LaTeX
        if not re.search(r'\\[a-zA-Z]', latex):
            return ''
        
        # Remove any existing dollar signs to avoid double-wrapping
        latex = latex.strip('$')
        
        # Clean up the LaTeX - remove M2 output markers
        latex = re.sub(r'^o\d+\s*=\s*', '', latex)
        latex = re.sub(r'\n\s*$', '', latex)
        latex = latex.strip()
        
        # Skip empty results
        if not latex:
            return ''
            
        # Return clean LaTeX without dollar signs (Jupyter adds them)
        return latex
    
    def _latex_to_html(self, latex: str) -> str:
        """Convert LaTeX to HTML with MathJax."""
        if not latex:
            return ''
        
        # Simple HTML wrapper for MathJax rendering
        return f'<div class="math">\\({latex.strip("$")}\\)</div>'
    
    def _format_traceback(self, error: str) -> List[str]:
        """Format error message as traceback."""
        if not error:
            return []
        
        # Split error into lines and format
        lines = error.split('\\n')
        formatted_lines = []
        
        for line in lines:
            if line.strip():
                formatted_lines.append(line)
        
        return formatted_lines if formatted_lines else [error]
    
    def do_complete(self, code: str, cursor_pos: int) -> Dict[str, Any]:
        """
        Provide tab completion.
        
        Args:
            code: Current code in the cell
            cursor_pos: Cursor position
            
        Returns:
            Completion result dictionary
        """
        # Use code intelligence for completions
        return self.code_intelligence.get_completions(code, cursor_pos)
    
    def _get_completions(self, word: str, context: str) -> List[str]:
        """Get completion suggestions using M2's apropos function."""
        if not word or len(word) < 1:  # Allow single character completions
            return []
        
        logger.debug(f"Getting completions for: '{word}'")
        
        # Use M2's apropos function for intelligent completions
        if self.m2_process:
            try:
                # Create a regex pattern for prefix matching
                pattern = f"^{re.escape(word)}"
                apropos_code = f'apropos "{pattern}"'
                
                logger.debug(f"Executing apropos: {apropos_code}")
                
                # Execute with short timeout for responsiveness
                result = self.m2_process.execute(apropos_code, timeout=2.0)
                
                logger.debug(f"Apropos result: {result}")
                
                if result['success']:
                    # First try to extract from LaTeX output
                    if result.get('latex'):
                        latex_text = result['latex']
                        # Extract symbols from LaTeX format: \mathit{symbol}
                        latex_matches = re.findall(r'\\mathit\{(\w+)\}', latex_text)
                        if latex_matches:
                            matches = latex_matches
                            logger.debug(f"Found {len(matches)} matches from LaTeX: {matches}")
                            # Sort by relevance
                            matches.sort(key=lambda x: (len(x), x))
                            return matches[:20]
                    
                    # Fallback to text parsing if LaTeX parsing fails
                    if result['text']:
                        text = result['text'].strip()
                        # Remove output markers
                        text = re.sub(r'^o\d+\s*=\s*', '', text)
                        
                        logger.debug(f"Cleaned text: {text}")
                        
                        # Extract symbols from the list
                        matches = []
                        # Check if it's a list format like {symbol1, symbol2, ...}
                        if '{' in text and '}' in text:
                            # Extract all text between braces
                            brace_match = re.search(r'\{([^}]+)\}', text)
                            if brace_match:
                                content = brace_match.group(1)
                                # Split by comma and clean each symbol
                                symbols = content.split(',')
                                for sym in symbols:
                                    sym = sym.strip()
                                    # Remove any LaTeX formatting
                                    sym = re.sub(r'\\mathit\{(\w+)\}', r'\1', sym)
                                    if sym and sym.isidentifier():
                                        matches.append(sym)
                    
                    # Sort by relevance (shorter matches first, then alphabetical)
                    matches.sort(key=lambda x: (len(x), x))
                    
                    logger.debug(f"Found {len(matches)} matches: {matches[:10]}...")
                    
                    return matches[:20]  # Limit to 20 suggestions
            except Exception as e:
                logger.error(f"Completion error: {e}", exc_info=True)
        
        # Fallback to basic keywords if apropos fails
        m2_keywords = [
            'ring', 'ideal', 'matrix', 'gb', 'res', 'syz', 'kernel', 'image',
            'QQ', 'ZZ', 'RR', 'CC', 'GF', 'frac',
            'installPackage', 'needsPackage', 'loadPackage',
            'help', 'example', 'viewHelp', 'apropos', 'about',
            'if', 'then', 'else', 'for', 'while', 'do', 'break', 'continue',
            'true', 'false', 'null',
            'print', 'peek', 'toString', 'toExternalString',
            'class', 'new', 'method', 'symbol'
        ]
        
        matches = [kw for kw in m2_keywords if kw.startswith(word)]
        matches.sort(key=lambda x: (x != word, x))
        
        return matches[:20]
    
    def do_inspect(self, code: str, cursor_pos: int, detail_level: int = 0, omit_sections=()) -> Dict[str, Any]:
        """
        Provide object inspection/help.
        
        Args:
            code: Current code
            cursor_pos: Cursor position
            detail_level: Level of detail requested
            
        Returns:
            Inspection result dictionary
        """
        # Detail level 2 is used for go-to-definition
        if detail_level == 2:
            return self.code_intelligence.get_goto_definition_info(code, cursor_pos)
            
        # First try code intelligence for quick hover info
        result = self.code_intelligence.get_inspection(code, cursor_pos, detail_level)
        
        # If not found or user wants more detail (but not go-to-def), fall back to M2 help
        if not result['found'] or (detail_level > 0 and detail_level != 2):
            # Extract the word at cursor position
            line = code[:cursor_pos].split('\\n')[-1]
            words = re.findall(r'\\b\\w+\\b', line)
            
            if not words:
                return result
            
            target_word = words[-1]
            
            # Try to get help for the word
            help_content = self._get_help_content(target_word)
            
            if help_content:
                # Import HTML formatter
                from .enhanced_help import (
                    parse_methods_output, format_help_html,
                    get_function_info
                )
                
                # Try to get enhanced HTML help
                html_content = None
                try:
                    # Re-fetch methods for HTML formatting
                    func_info = get_function_info(target_word)
                    methods = []
                    
                    if self.m2_process:
                        m2_result = self.m2_process.execute(f'methods {target_word}', timeout=2.0)
                        if m2_result['success'] and m2_result['text']:
                            methods = parse_methods_output(m2_result['text'])
                    
                    html_content = format_help_html(
                        target_word, 
                        methods, 
                        func_info.get('description', '')
                    )
                except Exception as e:
                    logger.debug(f"Failed to generate HTML help: {e}")
                    html_content = f"<pre>{help_content}</pre>"
                
                return {
                    'status': 'ok',
                    'found': True,
                    'data': {
                        'text/plain': help_content,
                        'text/html': html_content
                    },
                    'metadata': {}
                }
                
        return result
    
    def _get_help_content(self, word: str) -> str:
        """Get help content for a word."""
        if not self.m2_process:
            return ""
        
        # Import enhanced help functions
        from .enhanced_help import (
            parse_methods_output, format_help_output, 
            get_function_info
        )
        
        # Get basic info
        func_info = get_function_info(word)
        description = func_info.get('description', '')
        
        # Try to get methods
        methods = []
        try:
            # Get methods list
            methods_code = f'methods {word}'
            result = self.m2_process.execute(methods_code, timeout=2.0)
            
            if result['success'] and result['text']:
                methods = parse_methods_output(result['text'])
        except Exception as e:
            logger.debug(f"Failed to get methods for {word}: {e}")
        
        # Try to get class info
        try:
            class_code = f'class {word}'
            result = self.m2_process.execute(class_code, timeout=1.0)
            
            if result['success'] and result['text']:
                class_info = result['text'].strip()
                if not description and class_info:
                    description = f"Type: {class_info}"
        except Exception:
            pass
        
        # Format the help output
        if methods or description:
            return format_help_output(word, methods, description)
        
        # Fallback to basic information
        basic_help = {
            'ring': 'Create a polynomial ring or get the ring of an object',
            'ideal': 'Create an ideal from generators',
            'matrix': 'Create a matrix from lists or other input',
            'gb': 'Compute a Gröbner basis',
            'res': 'Compute a free resolution',
            'ker': 'Compute the kernel of a map',
            'coker': 'Compute the cokernel of a map',
            'QQ': 'The field of rational numbers',
            'ZZ': 'The ring of integers',
            'RR': 'The field of real numbers (floating point)',
            'CC': 'The field of complex numbers',
            'installPackage': 'Install a Macaulay2 package',
            'needsPackage': 'Load a Macaulay2 package',
            'loadPackage': 'Load a Macaulay2 package with options'
        }
        
        return basic_help.get(word, f"No help available for '{word}'")
    
    def _add_verbosity_flags(self, code: str) -> str:
        """Add verbosity flags to M2 operations that support them."""
        # TEMPORARILY DISABLED - just return original code
        return code
        
        import re
        
        # Operations that support Verbosity => N option
        verbosity_ops = [
            (r'\b(decompose|minimalPrimes|minprimes)\s+(\w+)$', r'\1(\2, Verbosity => 2)'),
        ]
        
        modified_code = code
        
        for pattern, replacement in verbosity_ops:
            # Check if verbosity is already specified
            if re.search(r'Verbosity\s*=>', code, re.IGNORECASE):
                continue  # Don't modify if user already specified verbosity
            
            # Add verbosity if the operation is found
            if re.search(pattern, code, re.IGNORECASE):
                modified_code = re.sub(pattern, replacement, modified_code, flags=re.IGNORECASE)
                logger.debug(f"Added verbosity to: {code} -> {modified_code}")
                break
        
        return modified_code
    
    def do_is_complete(self, code: str) -> Dict[str, Any]:
        """
        Check if code is complete.
        
        Args:
            code: Code to check
            
        Returns:
            Completion status dictionary
        """
        # Simple heuristic: check for unmatched parentheses/brackets
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}'}
        
        for char in code:
            if char in pairs:
                stack.append(pairs[char])
            elif char in pairs.values():
                if not stack or stack.pop() != char:
                    return {'status': 'invalid'}
        
        if stack:
            return {'status': 'incomplete', 'indent': '    '}
        else:
            return {'status': 'complete'}
    
    def do_interrupt(self) -> None:
        """
        Handle interrupt request (Ctrl+C).
        
        This method is called when the user presses Ctrl+C to interrupt
        a running computation.
        """
        logger.info("Interrupt request received")
        
        # Set interrupt flag
        self._execution_interrupted = True
        
        # Send interrupt notification to frontend
        self.send_response(
            self.iopub_socket,
            'stream',
            {
                'name': 'stderr',
                'text': "⚠️  Computation interrupted by user\n"
            }
        )
        
        # Stop progress tracking if active
        if hasattr(self, 'progress_tracker') and self.progress_tracker.active:
            self.progress_tracker.finish_tracking(success=False)
        
        # Interrupt the M2 process
        if self.m2_process:
            try:
                self.m2_process.interrupt()
                logger.info("M2 process interrupted successfully")
                
                # Send confirmation to frontend
                self.send_response(
                    self.iopub_socket,
                    'stream',
                    {
                        'name': 'stdout',
                        'text': "✓ M2 computation stopped\n"
                    }
                )
                
            except Exception as e:
                logger.error(f"Failed to interrupt M2 process: {e}")
                
                # Send error notification
                self.send_response(
                    self.iopub_socket,
                    'stream',
                    {
                        'name': 'stderr',
                        'text': f"Error interrupting computation: {e}\n"
                    }
                )
                
                # If interrupt fails, try to restart the process
                try:
                    self._initialize_m2_process()
                    logger.info("M2 process restarted after failed interrupt")
                    
                    self.send_response(
                        self.iopub_socket,
                        'stream',
                        {
                            'name': 'stdout',
                            'text': "🔄 M2 process restarted\n"
                        }
                    )
                    
                except Exception as restart_error:
                    logger.error(f"Failed to restart M2 process: {restart_error}")
                    
                    self.send_response(
                        self.iopub_socket,
                        'stream',
                        {
                            'name': 'stderr',
                            'text': f"Failed to restart M2 process: {restart_error}\n"
                        }
                    )
    
    def _do_execute_async(
        self,
        code: str,
        silent: bool,
        store_history: bool = True,
        user_expressions: Optional[Dict] = None,
        allow_stdin: bool = False,
        cell_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute code using async multiline parser."""
        logger.info(f"Executing cell asynchronously: {code[:50]}...")
        
        # Update execution count
        if not silent:
            self.execution_count += 1
        
        # Check if M2 process is available
        if not self.m2_process or not self.m2_process.is_alive():
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': 'M2ProcessError',
                'evalue': 'M2 process not available',
                'traceback': ['M2 process failed to initialize']
            }
        
        try:
            # Start heartbeat
            self.heartbeat.begin_computation(self.execution_count)
            
            # Parse the cell
            parsed_cell = self.cell_parser.parse_cell(code)
            logger.debug(f"Parsed cell: {len(parsed_cell.statements)} statements")
            
            # Generate cell ID if not provided
            if not cell_id:
                cell_id = f"cell_{self.execution_count}"
            
            # Handle cell magic synchronously if present
            if parsed_cell.cell_magic:
                magic_name, magic_arg = parsed_cell.cell_magic
                magic_code = f"%%{magic_name} {magic_arg or ''}"
                result = self.m2_process.execute(magic_code)
                if not result['success'] and not silent:
                    self.heartbeat.end_computation()
                    return {
                        'status': 'error',
                        'execution_count': self.execution_count,
                        'ename': 'MagicError',
                        'evalue': result['error'],
                        'traceback': [result['error']]
                    }
            
            # Execute statements asynchronously
            self.async_executor.execute_cell_async(
                cell_id=cell_id,
                parsed_cell=parsed_cell
            )
            
            # End heartbeat
            self.heartbeat.end_computation()
            
            # Return success immediately (results will come async)
            return {
                'status': 'ok',
                'execution_count': self.execution_count,
                'payload': [],
                'user_expressions': {}
            }
            
        except Exception as e:
            logger.error(f"Async execution error: {e}", exc_info=True)
            self.heartbeat.end_computation()
            return {
                'status': 'error',
                'execution_count': self.execution_count,
                'ename': type(e).__name__,
                'evalue': str(e),
                'traceback': [str(e)]
            }
    
    def do_shutdown(self, restart: bool) -> Dict[str, Any]:
        """
        Shutdown the kernel.
        
        Args:
            restart: Whether this is a restart
            
        Returns:
            Shutdown result dictionary
        """
        logger.info(f"Kernel shutdown requested (restart={restart})")
        
        # Stop heartbeat
        if hasattr(self, 'heartbeat'):
            self.heartbeat.stop()
        
        # Stop async executor
        if hasattr(self, 'async_executor'):
            self.async_executor.stop()
        
        if self.m2_process:
            try:
                self.m2_process.shutdown()
            except Exception as e:
                logger.error(f"Error shutting down M2 process: {e}")
            finally:
                self.m2_process = None
        
        return {'status': 'ok', 'restart': restart}