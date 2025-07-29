#!/usr/bin/env fish

# Monitor M2 kernel logs in real-time

set log_dir ~/.m2_kernel_logs

if not test -d $log_dir
    echo "No log directory found at $log_dir"
    echo "Restart the M2 kernel to create logs"
    exit 1
end

# Find the most recent log file
set latest_log (ls -t $log_dir/*.log 2>/dev/null | head -1)

if test -z "$latest_log"
    echo "No log files found in $log_dir"
    exit 1
end

echo "Monitoring log file: $latest_log"
echo "Press Ctrl+C to stop"
echo "=" (string repeat -n 60 =)

# Follow the log file
tail -f $latest_log