# JupyterLab M2 Heartbeat Extension

A JupyterLab extension that displays the heartbeat status of Macaulay2 kernels in the status bar.

## Features

- 💓 Visual heartbeat indicator in the status bar
- Shows M2 kernel status: idle, busy, dead, or unknown
- Animated pulse that speeds up during computations
- Automatic detection of M2 kernels
- Tooltip shows detailed status information

## Installation

### Development Installation

1. Clone the repository and navigate to the extension directory:
```bash
cd jupyterlab-m2-heartbeat
```

2. Install dependencies:
```bash
jlpm install
```

3. Build the extension:
```bash
jlpm run build
```

4. Link the extension for development:
```bash
jupyter labextension develop . --overwrite
```

5. Rebuild JupyterLab:
```bash
jupyter lab build
```

### Production Installation

Once published to npm:
```bash
jupyter labextension install jupyterlab-m2-heartbeat
```

## Usage

The heartbeat indicator appears automatically in the JupyterLab status bar when you:
1. Open a notebook with an M2 kernel
2. The indicator shows:
   - 💓 Slow pulse when kernel is idle
   - 💓 Fast pulse when kernel is computing
   - 💔 Grayed out when kernel is dead
   - 💤 Faded when no M2 kernel is connected

## Development

To watch for changes and rebuild automatically:
```bash
jlpm run watch
```

In another terminal, run JupyterLab in watch mode:
```bash
jupyter lab --watch
```

## Visual States

- **Idle**: Slow, gentle pulse (2s interval)
- **Busy**: Fast, prominent pulse (0.8s interval) 
- **Dead**: No animation, grayed out
- **Unknown**: Faded, no animation