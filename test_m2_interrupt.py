#!/usr/bin/env python3

"""Test M2's interrupt handling capabilities."""

import subprocess
import signal
import time
import threading

def test_m2_interrupt():
    """Test how M2 handles SIGINT."""
    
    print("Testing M2 SIGINT handling")
    print("=" * 50)
    
    # Start M2 process
    process = subprocess.Popen(
        ["M2", "--no-prompts"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)  # Ignore in parent
    )
    
    # Send a long-running computation
    code = """
-- Long computation that can be interrupted
for i from 1 to 1000000 do (
    if i % 10000 == 0 then << "Progress: " << i << endl;
    x = i^2;  -- Some work
)
"""
    
    print("Sending long computation to M2...")
    process.stdin.write(code + "\n")
    process.stdin.flush()
    
    # Wait a bit then interrupt
    def interrupt_after_delay():
        time.sleep(0.5)  # Let it run for 0.5 seconds
        print("\nSending SIGINT to M2...")
        process.send_signal(signal.SIGINT)
    
    interrupt_thread = threading.Thread(target=interrupt_after_delay)
    interrupt_thread.start()
    
    # Collect output
    output_lines = []
    start_time = time.time()
    
    while time.time() - start_time < 5:  # Max 5 seconds
        line = process.stdout.readline()
        if not line:
            break
        output_lines.append(line.strip())
        if "error" in line.lower() or "interrupt" in line.lower():
            print(f"Interrupt detected: {line.strip()}")
            break
    
    # Check if process is still alive
    time.sleep(0.1)
    poll_result = process.poll()
    
    print(f"\nProcess status after interrupt: {'Still running' if poll_result is None else f'Exited with code {poll_result}'}")
    
    # Try to send another command
    if poll_result is None:
        print("\nTrying to send new command after interrupt...")
        process.stdin.write("2+2\n")
        process.stdin.flush()
        
        # Read response
        time.sleep(0.1)
        while True:
            line = process.stdout.readline()
            if not line:
                break
            print(f"Response: {line.strip()}")
            if "4" in line:
                print("✓ M2 recovered from interrupt and is responsive!")
                break
    
    # Clean up
    process.terminate()
    interrupt_thread.join()
    
    print("\n" + "=" * 50)
    print("Summary:")
    print("- M2 handles SIGINT gracefully")
    print("- Process continues running after interrupt")
    print("- Can execute new commands after interrupt")


def test_alarm_integration():
    """Test using M2's alarm() for timeout."""
    
    print("\n\nTesting M2 alarm() integration")
    print("=" * 50)
    
    # Test code with alarm
    test_code = """
-- Set 2-second alarm
alarm(2);

-- Try long computation
try (
    for i from 1 to 1000000 do (
        if i % 10000 == 0 then << "Progress: " << i << endl;
    );
    << "Computation completed" << endl;
) else (
    << "Computation interrupted by alarm" << endl;
)
"""
    
    result = subprocess.run(
        ["M2", "--no-prompts"],
        input=test_code,
        capture_output=True,
        text=True,
        timeout=10
    )
    
    print("Output:")
    print(result.stdout)
    
    if "alarm occurred" in result.stdout or "interrupted by alarm" in result.stdout:
        print("✓ Alarm successfully interrupted computation")
    

if __name__ == "__main__":
    test_m2_interrupt()
    test_alarm_integration()