# Process Monitoring and Smart Timeout Implementation

## Overview

We've successfully integrated process monitoring and smart timeout functionality into the M2 Jupyter kernel to address the user's request: "Usually one doesn't want a long gb that is 100% busy running to just die from a timeout you forgot about".

## Features Implemented

### 1. Process Monitor (`m2_kernel/process_monitor.py`)
- Tracks M2 process CPU usage, memory, and thread count
- Uses psutil to monitor process activity in real-time
- Detects when M2 has spawned subprocesses
- Provides current statistics via `get_current_stats()`

### 2. Smart Timeout (`m2_kernel/smart_timeout.py`)
- Replaces simple timeout with intelligent timeout management
- Monitors CPU activity during execution
- If M2 is actively computing (>50% CPU), grants timeout extensions
- Sends warnings at 75%, 90%, and 95% of timeout
- Hard limit of 1 hour to prevent infinite extensions

### 3. Status Widget (`m2_kernel/status_widget.py`)
- Visual CPU/memory monitor in Jupyter notebook
- Auto-hides when M2 is idle
- Shows color-coded activity levels:
  - Green: Idle (<10% CPU)
  - Blue: Light activity (10-50% CPU)
  - Yellow: Active (50-80% CPU)
  - Red: Heavy computation (>80% CPU)
- Displays memory usage and thread count

### 4. Magic Commands
- `%status` - Show current M2 process statistics
- `%status on` - Enable visual status widget
- `%status off` - Disable status widget

## Integration Points

### Kernel Initialization
```python
# In kernel.__init__
self.process_monitor = M2ProcessMonitor(self)

# After M2 process starts
if self.m2_process and self.m2_process.process:
    self.process_monitor.start_monitoring(self.m2_process.process.pid)
```

### Smart Timeout in Execution
```python
# In _execute_with_timeout
smart_timeout = SmartTimeout(self.kernel)
smart_timeout.start_execution(timeout)

# In main loop
if smart_timeout.check_timeout():
    raise M2TimeoutError(...)
```

## How It Works

1. **During Computation**: 
   - Process monitor tracks CPU usage every second
   - Updates status widget if enabled
   - Logs high CPU usage periods

2. **When Timeout Approaches**:
   - Smart timeout checks if M2 is actively computing
   - If CPU > 50%, grants 20% more time (minimum 30s)
   - Sends warning messages with remaining time
   - Shows current CPU usage in warnings

3. **Status Visibility**:
   - `%status` magic shows instant snapshot
   - Status widget provides real-time monitoring
   - Auto-hides when idle to reduce clutter

## Example Usage

```m2
-- Set a short timeout
%timeout=10

-- Enable status monitoring
%status on

-- Run intensive computation
R = QQ[x,y,z,w];
I = ideal(random(3,R), random(3,R), random(3,R));
gb I;  -- This might take 15-20 seconds

-- The smart timeout will:
-- 1. Detect high CPU usage
-- 2. Grant extensions as needed
-- 3. Show warnings but allow completion
```

## Benefits

1. **No More Timeout Surprises**: Active computations won't be killed
2. **Better Visibility**: Users can see if M2 is working or stuck
3. **Informed Decisions**: CPU/memory stats help diagnose issues
4. **Graceful Warnings**: Users get notified before timeouts

## Testing

Run the test scripts:
- `test_process_monitor.py` - Unit tests for monitoring
- `demo_smart_timeout.py` - Live demonstration
- `/tmp/test_process_monitor.ipynb` - Jupyter notebook test

## Dependencies

- `psutil` - Required for process monitoring (falls back gracefully if not installed)

## Future Enhancements

1. Persist timeout extensions across cells
2. Add memory-based timeout decisions
3. Export computation statistics
4. Integration with Jupyter Lab status bar