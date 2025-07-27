"""
Status widget for Jupyter to show M2 process activity.
"""

import json
import uuid
from typing import Dict, Optional


class M2StatusWidget:
    """
    Creates a status widget in Jupyter that shows:
    - CPU usage with visual indicator
    - Memory usage
    - Number of threads/subprocesses
    - Computation status (idle/working/busy)
    """
    
    def __init__(self, kernel):
        self.kernel = kernel
        self.widget_id = f"m2-status-{uuid.uuid4().hex[:8]}"
        self.last_status = None
        
    def create_widget(self):
        """Create the initial status widget."""
        html = f"""
        <div id="{self.widget_id}" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            min-width: 200px;
            z-index: 1000;
            transition: all 0.3s ease;
        ">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; margin-right: 10px;">M2 Status</span>
                <span id="{self.widget_id}-indicator" style="
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #28a745;
                    display: inline-block;
                "></span>
            </div>
            
            <div id="{self.widget_id}-cpu" style="margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>CPU</span>
                    <span id="{self.widget_id}-cpu-text">0%</span>
                </div>
                <div style="
                    background: #e9ecef;
                    height: 4px;
                    border-radius: 2px;
                    overflow: hidden;
                ">
                    <div id="{self.widget_id}-cpu-bar" style="
                        background: #28a745;
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
            </div>
            
            <div id="{self.widget_id}-details" style="
                color: #6c757d;
                font-size: 11px;
                margin-top: 5px;
            ">
                Memory: <span id="{self.widget_id}-memory">0 MB</span>
                | Threads: <span id="{self.widget_id}-threads">1</span>
            </div>
            
            <div id="{self.widget_id}-message" style="
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #e9ecef;
                font-size: 11px;
                color: #495057;
                display: none;
            "></div>
        </div>
        
        <script>
        (function() {{
            // Auto-hide when idle
            let hideTimeout;
            const widget = document.getElementById('{self.widget_id}');
            
            window.updateM2Status = function(data) {{
                if (!widget) return;
                
                // Update CPU
                const cpu = data.cpu || 0;
                document.getElementById('{self.widget_id}-cpu-text').textContent = cpu + '%';
                document.getElementById('{self.widget_id}-cpu-bar').style.width = cpu + '%';
                
                // Update color based on CPU
                let color = '#28a745'; // green
                if (cpu > 80) color = '#dc3545'; // red
                else if (cpu > 50) color = '#ffc107'; // yellow
                else if (cpu > 10) color = '#17a2b8'; // blue
                
                document.getElementById('{self.widget_id}-cpu-bar').style.background = color;
                document.getElementById('{self.widget_id}-indicator').style.background = color;
                
                // Update details
                document.getElementById('{self.widget_id}-memory').textContent = data.memory + ' MB';
                document.getElementById('{self.widget_id}-threads').textContent = data.threads;
                
                // Update message if present
                const msgEl = document.getElementById('{self.widget_id}-message');
                if (data.message) {{
                    msgEl.textContent = data.message;
                    msgEl.style.display = 'block';
                }} else {{
                    msgEl.style.display = 'none';
                }}
                
                // Show widget
                widget.style.opacity = '1';
                widget.style.transform = 'translateX(0)';
                
                // Auto-hide after 5s of idle
                clearTimeout(hideTimeout);
                if (cpu < 10) {{
                    hideTimeout = setTimeout(() => {{
                        widget.style.opacity = '0.3';
                        widget.style.transform = 'translateX(calc(100% - 50px))';
                    }}, 5000);
                }}
            }};
            
            // Initially hidden
            widget.style.opacity = '0.3';
            widget.style.transform = 'translateX(calc(100% - 50px))';
            
            // Hover to show
            widget.addEventListener('mouseenter', () => {{
                widget.style.opacity = '1';
                widget.style.transform = 'translateX(0)';
            }});
        }})();
        </script>
        """
        
        # Send widget HTML
        self.kernel.send_response(
            self.kernel.iopub_socket,
            'display_data',
            {
                'data': {
                    'text/html': html
                },
                'metadata': {}
            }
        )
        
    def update_status(self, stats: Dict):
        """Update the status widget with new data."""
        # Extract key metrics
        cpu = int(stats.get('total_cpu', 0))
        memory = int(stats.get('total_memory_mb', 0))
        threads = stats.get('num_threads', 1)
        
        # Determine message based on activity
        message = None
        if cpu > 90:
            message = "Heavy computation in progress"
        elif cpu > 50:
            message = "Active computation"
        elif cpu > 10:
            message = "Light activity"
            
        # Only update if changed significantly
        new_status = (cpu, memory, threads)
        if new_status != self.last_status:
            self.last_status = new_status
            
            # Send update via JavaScript
            js_code = f"""
            if (typeof updateM2Status !== 'undefined') {{
                updateM2Status({{
                    cpu: {cpu},
                    memory: {memory},
                    threads: {threads},
                    message: {json.dumps(message)}
                }});
            }}
            """
            
            self.kernel.send_response(
                self.kernel.iopub_socket,
                'display_data',
                {
                    'data': {
                        'application/javascript': js_code
                    },
                    'metadata': {},
                    'transient': {
                        'display_id': f'{self.widget_id}-update'
                    }
                }
            )


def add_status_magic(kernel_class):
    """Add %status magic command to show/hide status widget."""
    
    def handle_status_magic(self, code):
        """Handle %status magic command."""
        parts = code.lower().split()
        
        if len(parts) > 1:
            if parts[1] == 'on':
                # Create and show widget
                if not hasattr(self, 'status_widget'):
                    self.status_widget = M2StatusWidget(self)
                self.status_widget.create_widget()
                return {'text': 'M2 status widget enabled', 'success': True}
                
            elif parts[1] == 'off':
                # Hide widget
                js_code = f"""
                const widget = document.getElementById('{self.status_widget.widget_id}');
                if (widget) widget.style.display = 'none';
                """
                self.send_response(
                    self.iopub_socket,
                    'display_data',
                    {'data': {'application/javascript': js_code}, 'metadata': {}}
                )
                return {'text': 'M2 status widget disabled', 'success': True}
                
        # Show current stats
        if hasattr(self, 'process_monitor'):
            stats = self.process_monitor.get_current_stats()
            if stats:
                return {
                    'text': f"M2 Process Status:\n"
                           f"CPU: {stats['total_cpu']:.1f}%\n"
                           f"Memory: {stats['total_memory_mb']:.0f} MB\n"
                           f"Threads: {stats['num_threads']}\n"
                           f"Processes: {stats['num_processes']}",
                    'success': True
                }
                
        return {'text': 'No M2 process statistics available', 'success': True}
        
    # Register handler
    kernel_class._handle_status_magic = handle_status_magic