# Interrupt and Timeout Analysis for M2 Jupyter Kernel

## Current State

### 1. **Heartbeat Mechanism**
- **Purpose**: Keeps websocket connection alive during long computations (>30s)
- **Implementation**: Sends periodic 'busy' status messages every 10 seconds
- **Status**: ✅ Implemented but needs visibility testing

### 2. **Interrupt Handling**
- **Current approach**: Sends SIGINT to M2 process group
- **When user clicks stop**: 
  1. Jupyter calls `do_interrupt()`
  2. Kernel sends SIGINT to M2
  3. Waits 2 seconds for M2 to respond
  4. Clears output queues

### 3. **Timeout Functionality**
- **Default**: 30 seconds (configurable)
- **Magic command**: `%timeout=300` sets 5-minute timeout
- **Purpose**: Prevents runaway computations from hanging indefinitely

## Key Questions Answered

### Q: Can we ask M2 to stop kindly rather than killing it?
**Current behavior**: The kernel sends SIGINT (Ctrl+C) which is the "polite" interrupt signal. M2 can catch and handle this signal gracefully. The kernel waits 2 seconds for M2 to respond before considering more drastic measures.

**Possible enhancement**: We could implement a two-stage interrupt:
1. First interrupt: Send SIGINT (current behavior)
2. Second interrupt (if first fails): Send SIGTERM
3. Third interrupt: Send SIGKILL (force kill)

### Q: What happens on notebook restart?
**Restart behavior**: When restarting the kernel, M2 process is terminated (SIGTERM then SIGKILL if needed). This is appropriate since restart implies starting fresh.

### Q: Why is %timeout=300 needed?
**Reasons for timeout**:
1. **Default protection**: Prevents accidental infinite loops from consuming resources
2. **Websocket timeout**: Even with heartbeat, some proxies/load balancers have hard limits
3. **User experience**: Gives users control over long-running computations
4. **Resource management**: Prevents forgotten notebooks from running indefinitely

**Common use cases for increased timeout**:
- Large Gröbner basis computations
- Complex resolution calculations  
- Decomposition of large ideals
- Any iterative algorithm with unknown convergence time

## Proposed Improvements

### 1. **Better Interrupt Handling**
```python
def interrupt(self, force=False):
    """Improved interrupt with escalation."""
    if force or self._interrupt_attempts > 1:
        # Force kill after multiple attempts
        os.kill(self.process.pid, signal.SIGKILL)
    else:
        # Try graceful interrupt first
        os.kill(self.process.pid, signal.SIGINT)
        self._interrupt_attempts += 1
```

### 2. **Interrupt Status Feedback**
Show interrupt progress to user:
- "Sending interrupt signal to M2..."
- "M2 interrupted successfully" or "Force stopping M2..."

### 3. **Smart Timeout Defaults**
Detect certain operations and auto-adjust timeout:
```python
if "gb" in code or "resolution" in code:
    suggested_timeout = 600  # 10 minutes for heavy computations
```

### 4. **Graceful Interrupt for M2**
M2 could be enhanced to handle SIGINT better:
- Save partial results
- Clean up resources
- Return partial output with "Interrupted" message

## Implementation Priority

1. **High**: Test and fix heartbeat visibility
2. **Medium**: Improve interrupt feedback messages
3. **Low**: Implement smart timeout suggestions
4. **Future**: Work with M2 team on better SIGINT handling

## Testing Interrupt/Timeout

```python
# Test interrupt handling
import time
import signal

# Test 1: Long computation with interrupt
code = """
for i from 1 to 10000000 do (
    if i % 100000 == 0 then print i;
)
"""

# Test 2: Timeout behavior
code_timeout = """
%timeout=5
while true do (
    -- Infinite loop to test timeout
)
"""

# Test 3: Heartbeat during long computation
code_heartbeat = """
%timeout=60
-- 45-second computation to test heartbeat
for i from 1 to 45 do (
    sleep 1;
    print i;
)
"""
```