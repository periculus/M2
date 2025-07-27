"""
Asynchronous execution system for M2 statements with real-time feedback.

Provides a queue-based execution model where statements are parsed,
queued, executed sequentially, and results displayed immediately.
"""

import asyncio
import threading
import queue
import logging
from typing import Callable, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

from .cell_parser import Statement, ParsedCell

logger = logging.getLogger(__name__)


@dataclass
class ExecutionTask:
    """Represents a task to execute."""
    statement: Statement
    cell_id: str
    task_id: int
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()


@dataclass
class ExecutionResult:
    """Result of executing a statement."""
    task: ExecutionTask
    output: Dict[str, Any]
    completed_at: datetime = None
    success: bool = True
    
    def __post_init__(self):
        if self.completed_at is None:
            self.completed_at = datetime.now()


class AsyncM2Executor:
    """
    Asynchronous executor for M2 statements.
    
    Features:
    - Parse cells into statements asynchronously
    - Queue statements for execution
    - Execute statements sequentially (preserving order)
    - Display results immediately as they complete
    - Handle interruptions gracefully
    """
    
    def __init__(self, m2_process, send_output_callback: Callable):
        """
        Initialize executor.
        
        Args:
            m2_process: M2Process instance for execution
            send_output_callback: Function to send output to frontend
        """
        self.m2_process = m2_process
        self.send_output = send_output_callback
        
        # Execution queue
        self.task_queue = queue.Queue()
        self.result_queue = queue.Queue()
        
        # State tracking
        self.is_running = False
        self.current_task = None
        self.cell_tasks = {}  # cell_id -> list of tasks
        
        # Thread management
        self.executor_thread = None
        self._stop_event = threading.Event()
        
    def start(self):
        """Start the executor thread."""
        if not self.is_running:
            self.is_running = True
            self._stop_event.clear()
            self.executor_thread = threading.Thread(
                target=self._executor_loop,
                daemon=True,
                name="M2AsyncExecutor"
            )
            self.executor_thread.start()
            logger.info("Async executor started")
    
    def stop(self):
        """Stop the executor thread."""
        if self.is_running:
            self.is_running = False
            self._stop_event.set()
            # Put sentinel to wake up thread
            self.task_queue.put(None)
            if self.executor_thread:
                self.executor_thread.join(timeout=1.0)
            logger.info("Async executor stopped")
    
    def execute_cell_async(self, cell_id: str, parsed_cell: ParsedCell, 
                          cell_magic_handler: Optional[Callable] = None):
        """
        Execute a parsed cell asynchronously.
        
        Args:
            cell_id: Unique identifier for this cell execution
            parsed_cell: Parsed cell structure
            cell_magic_handler: Optional handler for cell magic
        """
        # Handle cell magic if present
        if parsed_cell.cell_magic and cell_magic_handler:
            cell_magic_handler(parsed_cell.cell_magic)
        
        # Queue all statements
        tasks = []
        for i, statement in enumerate(parsed_cell.statements):
            task = ExecutionTask(
                statement=statement,
                cell_id=cell_id,
                task_id=i
            )
            tasks.append(task)
            self.task_queue.put(task)
        
        # Track tasks for this cell
        self.cell_tasks[cell_id] = tasks
        
        # Send initial status
        self._send_status(f"Queued {len(tasks)} statements for execution", cell_id)
    
    def interrupt_cell(self, cell_id: str):
        """Interrupt execution of a specific cell."""
        # Mark tasks as cancelled
        if cell_id in self.cell_tasks:
            # Clear remaining tasks for this cell from queue
            remaining_tasks = []
            while not self.task_queue.empty():
                try:
                    task = self.task_queue.get_nowait()
                    if task and task.cell_id != cell_id:
                        remaining_tasks.append(task)
                except queue.Empty:
                    break
            
            # Re-queue non-cancelled tasks
            for task in remaining_tasks:
                self.task_queue.put(task)
            
            # Interrupt current execution if it's from this cell
            if self.current_task and self.current_task.cell_id == cell_id:
                self.m2_process.interrupt()
            
            self._send_status(f"Interrupted cell execution", cell_id)
    
    def _executor_loop(self):
        """Main executor loop running in separate thread."""
        logger.info("Executor loop started")
        
        while self.is_running:
            try:
                # Get next task (blocking with timeout)
                task = self.task_queue.get(timeout=0.1)
                
                if task is None:  # Sentinel
                    break
                
                self.current_task = task
                
                # Execute the statement
                result = self._execute_task(task)
                
                # Queue result for display
                self.result_queue.put(result)
                
                # Send output immediately
                self._send_result(result)
                
                self.current_task = None
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Executor error: {e}", exc_info=True)
                if self.current_task:
                    # Send error result
                    error_result = ExecutionResult(
                        task=self.current_task,
                        output={
                            'text': '',
                            'error': str(e),
                            'success': False
                        },
                        success=False
                    )
                    self._send_result(error_result)
                    self.current_task = None
        
        logger.info("Executor loop stopped")
    
    def _execute_task(self, task: ExecutionTask) -> ExecutionResult:
        """Execute a single task."""
        logger.debug(f"Executing task {task.task_id} from cell {task.cell_id}")
        
        # Send execution started notification
        self._send_status(
            f"Executing statement {task.task_id + 1}",
            task.cell_id,
            is_executing=True
        )
        
        # Handle line magic if present
        if task.statement.line_magic:
            magic_name, magic_arg = task.statement.line_magic
            # Process magic (this should modify execution state)
            magic_result = self.m2_process.execute(f"%{magic_name} {magic_arg or ''}")
            if not magic_result['success']:
                return ExecutionResult(
                    task=task,
                    output=magic_result,
                    success=False
                )
        
        # Execute the M2 code
        output = self.m2_process.execute(task.statement.code)
        
        return ExecutionResult(
            task=task,
            output=output,
            success=output.get('success', True)
        )
    
    def _send_result(self, result: ExecutionResult):
        """Send execution result to frontend."""
        task = result.task
        
        # Prepare output with metadata
        output = result.output.copy()
        output['statement_index'] = task.task_id
        output['cell_id'] = task.cell_id
        output['execution_time'] = (result.completed_at - task.created_at).total_seconds()
        
        # Send via callback
        self.send_output(output, task.statement.code)
        
        # Update status
        if result.success:
            completed = task.task_id + 1
            total = len(self.cell_tasks.get(task.cell_id, []))
            self._send_status(
                f"Completed {completed}/{total} statements",
                task.cell_id
            )
    
    def _send_status(self, message: str, cell_id: str, is_executing: bool = False):
        """Send status update to frontend."""
        status_html = f"""
        <div style="
            padding: 4px 8px;
            background-color: {'#e3f2fd' if is_executing else '#f5f5f5'};
            border-left: 3px solid {'#2196f3' if is_executing else '#9e9e9e'};
            font-family: monospace;
            font-size: 12px;
            color: #424242;
            margin: 2px 0;
        ">
            {'⏳' if is_executing else '📋'} {message}
        </div>
        """
        
        self.send_output({
            'html': status_html,
            'text': message,
            'metadata': {
                'is_status': True,
                'cell_id': cell_id
            }
        }, "")