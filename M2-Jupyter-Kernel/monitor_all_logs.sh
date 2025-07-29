#!/usr/bin/env fish

# Monitor all M2 kernel logs in real-time

set log_dir ~/.m2_kernel_logs

if not test -d $log_dir
    echo "No log directory found at $log_dir"
    echo "Restart the M2 kernel to create logs"
    exit 1
end

# Find the most recent files
set kernel_log (ls -t $log_dir/m2_kernel_*.log 2>/dev/null | head -1)
set stdout_log (ls -t $log_dir/m2_stdout_*.log 2>/dev/null | head -1)
set stderr_log (ls -t $log_dir/m2_stderr_*.log 2>/dev/null | head -1)

echo "Monitoring M2 kernel logs"
echo "=" (string repeat -n 60 =)

if test -n "$kernel_log"
    echo "Kernel log: $kernel_log"
end
if test -n "$stdout_log"
    echo "M2 stdout: $stdout_log"
end
if test -n "$stderr_log"
    echo "M2 stderr: $stderr_log"
end

echo "=" (string repeat -n 60 =)
echo "Press Ctrl+C to stop"
echo ""

# Use tail to follow all log files
set tail_cmd "tail -f"

if test -n "$kernel_log"
    set tail_cmd "$tail_cmd $kernel_log"
end
if test -n "$stdout_log"
    set tail_cmd "$tail_cmd $stdout_log"
end
if test -n "$stderr_log"
    set tail_cmd "$tail_cmd $stderr_log"
end

# Execute the tail command
eval $tail_cmd