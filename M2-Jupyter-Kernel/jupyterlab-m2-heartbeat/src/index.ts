import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IStatusBar } from '@jupyterlab/statusbar';

import { INotebookTracker } from '@jupyterlab/notebook';

import { KernelMessage } from '@jupyterlab/services';

import { Widget } from '@lumino/widgets';

/**
 * M2 Heartbeat status widget
 */
class M2HeartbeatWidget extends Widget {
  private _status: 'idle' | 'busy' | 'dead' | 'unknown' = 'unknown';
  private _kernelName: string | null = null;
  private _lastHeartbeat: number = Date.now();
  private _pulseInterval: number | null = null;

  constructor() {
    super();
    this.addClass('m2-heartbeat-widget');
    
    // Create the heartbeat icon
    const icon = document.createElement('div');
    icon.className = 'heartbeat-icon';
    icon.innerHTML = '💓'; // Heart emoji as icon
    
    // Create status text
    const text = document.createElement('span');
    text.className = 'heartbeat-text';
    text.textContent = 'M2';
    
    this.node.appendChild(icon);
    this.node.appendChild(text);
    this.node.title = 'M2 Kernel Status: Unknown';
    
    // Start pulse animation
    this._startPulse();
  }

  setStatus(status: 'idle' | 'busy' | 'dead' | 'unknown', kernelName?: string) {
    this._status = status;
    this._lastHeartbeat = Date.now();
    
    if (kernelName) {
      this._kernelName = kernelName;
    }
    
    // Update visual state
    this.node.setAttribute('data-status', status);
    
    // Update tooltip
    const statusText = {
      'idle': 'Idle - Ready for commands',
      'busy': 'Computing...',
      'dead': 'Kernel not responding',
      'unknown': 'No M2 kernel connected'
    }[status];
    
    this.node.title = `M2 Kernel Status: ${statusText}`;
    
    // Update text if needed
    const textElem = this.node.querySelector('.heartbeat-text');
    if (textElem) {
      if (status === 'busy') {
        textElem.textContent = 'M2 🔄';
      } else {
        textElem.textContent = 'M2';
      }
    }
  }

  private _startPulse() {
    // Animate based on status
    this._pulseInterval = window.setInterval(() => {
      const age = Date.now() - this._lastHeartbeat;
      
      // If we haven't heard from kernel in 30s, mark as dead
      if (this._status !== 'unknown' && age > 30000) {
        this.setStatus('dead');
      }
    }, 5000);
  }

  dispose() {
    if (this._pulseInterval) {
      clearInterval(this._pulseInterval);
    }
    super.dispose();
  }
}

/**
 * JupyterLab plugin for M2 heartbeat indicator
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-m2-heartbeat:plugin',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    notebookTracker: INotebookTracker
  ) => {
    console.log('M2 Heartbeat extension is activated!');
    
    // Create the heartbeat widget
    const widget = new M2HeartbeatWidget();
    
    // Register in status bar
    statusBar.registerStatusItem('m2-heartbeat', {
      item: widget,
      align: 'right',
      rank: 100
    });

    // Track notebook changes
    notebookTracker.currentChanged.connect(() => {
      const current = notebookTracker.currentWidget;
      
      if (!current) {
        widget.setStatus('unknown');
        return;
      }

      const session = current.sessionContext;
      
      // Check if this is an M2 kernel
      if (session.kernelDisplayName?.includes('Macaulay2') || 
          session.kernelDisplayName?.includes('M2')) {
        
        // Listen to kernel status changes
        session.statusChanged.connect((_, status) => {
          switch (status) {
            case 'idle':
              widget.setStatus('idle', session.kernelDisplayName);
              break;
            case 'busy':
              widget.setStatus('busy', session.kernelDisplayName);
              break;
            case 'dead':
            case 'terminating':
              widget.setStatus('dead', session.kernelDisplayName);
              break;
            default:
              widget.setStatus('unknown');
          }
        });

        // Listen to custom heartbeat messages from M2 kernel
        session.iopubMessage.connect((_, msg) => {
          if (msg.header.msg_type === 'status') {
            const content = msg.content as any;
            if (content.execution_state === 'busy') {
              widget.setStatus('busy', session.kernelDisplayName);
            } else if (content.execution_state === 'idle') {
              widget.setStatus('idle', session.kernelDisplayName);
            }
          }
        });

        // Set initial status
        const kernel = session.session?.kernel;
        if (kernel) {
          widget.setStatus(kernel.status === 'busy' ? 'busy' : 'idle', session.kernelDisplayName);
        }
      } else {
        // Not an M2 kernel
        widget.setStatus('unknown');
      }
    });
  }
};

export default plugin;