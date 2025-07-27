# Async Execution Mode (Experimental)

The M2 Jupyter kernel now supports an experimental async execution mode with advanced multiline parsing and real-time output streaming.

## Features

1. **Formal Grammar-Based Parser**: Properly handles multiline M2 statements using delimiter balancing
2. **Real-Time Output**: See results as each statement completes, not just at the end
3. **Better Error Recovery**: If one statement fails, subsequent statements can still execute
4. **Progress Tracking**: Integrates with `%pi` magic for per-statement progress

## Enabling Async Mode

### Option 1: Jupyter Configuration

Create or edit `~/.jupyter/jupyter_notebook_config.py`:

```python
c.M2Kernel.use_async_execution = True
```

### Option 2: Environment Variable

```bash
export M2KERNEL_USE_ASYNC_EXECUTION=true
jupyter lab
```

### Option 3: Per-Session Toggle (Coming Soon)

```
%async on   # Enable for session
%async off  # Disable for session
```

## How It Works

### Multiline Statement Detection

The parser uses formal grammar rules to detect statement boundaries:

```macaulay2
-- Single statement spanning multiple lines
I = ideal(
  x^2 + y^2,    -- Unbalanced parentheses
  x*y - z^2     -- Parser continues until balanced
)               -- Statement complete

-- Multiple statements in one cell
R = QQ[x,y,z]   -- Statement 1
I = ideal(x^2)  -- Statement 2
gb I            -- Statement 3
```

### Control Structure Handling

```macaulay2
-- Properly recognized as single statement
if x > 0 then
  print "positive"
else
  print "non-positive"
```

### String and Comment Awareness

```macaulay2
-- Triple-slash strings preserved
s = ///
This contains ) and } and ]
but they don't affect parsing
///

-- Comments ignored for delimiter counting
f(x) -- This ) doesn't count
```

## Examples

### Example 1: Sequential Execution with Progress

```macaulay2
%%pi 1
-- Each statement executes and displays immediately
R = QQ[x,y,z]
I = ideal(x^2, y^2, z^2)
gb I          -- See Gröbner basis result
res I         -- See resolution result
betti res I   -- See Betti numbers
```

### Example 2: Long Computation with Feedback

```macaulay2
%%pi 2
-- Setup
R = QQ[x,y,z,w,u,v]

-- Create complex ideal
I = ideal(
  x^2 + y^2 - 1,
  y^2 + z^2 - 1,
  z^2 + w^2 - 1,
  w^2 + u^2 - 1,
  u^2 + v^2 - 1
)

-- Long computation - see progress
decompose I
```

### Example 3: Error Recovery

```macaulay2
a = 1 + 2      -- Executes
b = undefined  -- Errors
c = 3 + 4      -- Still executes in async mode
```

## Differences from Sync Mode

| Feature | Sync Mode | Async Mode |
|---------|-----------|------------|
| Output Display | All at end | As available |
| Error Handling | Stops on error | Continues |
| Statement Parsing | Simple newline | Grammar-based |
| Progress Updates | Per cell | Per statement |

## Known Limitations

1. **Output Ordering**: In rare cases, outputs might appear slightly out of order
2. **Interruption**: Interrupting a cell interrupts remaining statements
3. **Performance**: Slight overhead for parsing complex cells

## Debugging

Enable debug logging to see parser decisions:

```
%debug on
```

View parsed statements:

```python
from m2_kernel.cell_parser import M2CellParser
parser = M2CellParser()
result = parser.parse_cell(your_code)
print(f"Statements: {len(result.statements)}")
for stmt in result.statements:
    print(f"  {stmt.code[:50]}...")
```

## Feedback

This is an experimental feature. Please report issues or suggestions to the M2-Jupyter-Kernel repository.