# Macaulay2 Debugger Integration Strategy for Jupyter

## Executive Summary

This document outlines a comprehensive strategy for integrating Macaulay2's powerful interactive debugger with Jupyter notebooks. The goal is to provide a seamless debugging experience that leverages both M2's native debugging capabilities and Jupyter's rich interactive environment.

## Understanding M2's Debugger Architecture

### Core Components

#### 1. **Debugger Infrastructure** (`interp.dd`)
- **Entry Point**: The `debugger(f:Frame, c:Code)` function serves as the main debugger interface
- **Automatic Activation**: Triggered automatically when errors occur (controlled by `errorDepth` setting)
- **Interactive REPL**: Provides a specialized read-eval-print loop within the debugging context
- **Frame Management**: Maintains call stack and local variable access through frame structures

#### 2. **Debug Commands** (`evaluate.d`)
The debugger supports these core commands, implemented as special operators:

- **`step`** (`stepS`): Execute one line at a time, with optional count parameter
- **`continue`** (`continueS`): Resume execution from current position  
- **`break`** (`breakS`): Exit debugger and return to top level
- **`return`** (`returnS`): Return from current function with optional value
- **`breakpoint`** (`breakpointS`): Set explicit breakpoints in code

#### 3. **Information Commands** (`debugging.m2`, `code.m2`)
- **`listLocalSymbols`**: Display local variables and values
- **`current`**: Access current expression being debugged
- **`code current`**: Show source code of current expression
- **`value current`**: Execute current expression
- **`disassemble current`**: Show microcode representation
- **`locate`**: Get file position information

#### 4. **Error Handling System** (`tokens.d`)
Specialized error messages for debugger control flow:
- `returnMessage`: Function return control
- `continueMessage`/`continueMessageWithArg`: Loop continuation
- `stepMessage`/`stepMessageWithArg`: Step execution control
- `breakMessage`: Debugger exit control

### Debugging Workflow

1. **Error Trigger**: An error occurs during M2 code execution
2. **Depth Check**: System checks if error depth warrants debugger activation
3. **Context Setup**: Creates debugging frame with local variable access
4. **Interactive Mode**: Enters specialized REPL with debugging commands
5. **User Navigation**: User can inspect, step, or modify execution
6. **Resume/Exit**: User chooses to continue, return, or break out

## Jupyter Integration Strategy

### Revised Architecture Overview (Based on Jupyter Lab Python Debugging)

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   JupyterLab        │    │  Jupyter Protocol    │    │  Debug Adapter      │
│   Debugger UI       │◄──►│  Debug Extensions    │◄──►│  Protocol (DAP)     │
│   (Built-in)        │    │  (Control Channel)   │    │  M2 Adapter Layer   │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Standard Debug    │    │  debug_request/reply │    │  M2 Native          │
│   Variable Inspector│    │  debug_event         │    │  Debugger           │
│   Breakpoint UI     │    │  State Management    │    │  Commands           │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Key Insight: Leverage Existing JupyterLab Debugger

**Major Strategic Change**: Instead of building a custom debug UI, we can leverage JupyterLab's existing debugger interface by implementing the **Debug Adapter Protocol (DAP)** compatibility layer. This means:

1. **No Custom UI Required**: Use JupyterLab's built-in debugger interface
2. **Standard Protocol**: Implement DAP message translation for M2
3. **Industry Standard**: Follow Microsoft's Debug Adapter Protocol
4. **Immediate Compatibility**: Works with existing JupyterLab debugging tools

### Implementation Phases (Revised)

#### Phase 1: Debug Adapter Protocol (DAP) Foundation ⭐ UPDATED

**Objective**: Implement DAP compatibility to work with JupyterLab's existing debugger.

**Technical Approach**:
1. **Kernel Debug Support Declaration**:
   ```python
   # In kernel.py - kernel_info_reply
   def kernel_info(self):
       return {
           'implementation': 'M2',
           'implementation_version': '1.0',
           'language_info': {...},
           'debugger': True,  # Declare debugging support
           'supported_features': ['debugger']
       }
   ```

2. **DAP Message Handlers**:
   ```python
   # In kernel.py
   async def do_debug_request(self, msg):
       """Handle debug_request messages from JupyterLab"""
       dap_request = msg['content']
       
       # Route to appropriate handler
       if dap_request['command'] == 'initialize':
           return await self._debug_initialize(dap_request)
       elif dap_request['command'] == 'setBreakpoints':
           return await self._debug_set_breakpoints(dap_request)
       elif dap_request['command'] == 'continue':
           return await self._debug_continue(dap_request)
       # ... other DAP commands
   ```

3. **M2-to-DAP Adapter**:
   ```python
   class M2DebugAdapter:
       """Translates between M2 debugger and DAP protocol"""
       
       def __init__(self, m2_process):
           self.m2_process = m2_process
           self.active_session = None
           
       def translate_m2_event_to_dap(self, m2_event):
           """Convert M2 debug event to DAP format"""
           if "entering debugger" in m2_event:
               return {
                   'seq': self.next_seq(),
                   'type': 'event',
                   'event': 'stopped',
                   'body': {
                       'reason': 'breakpoint',
                       'threadId': 1,
                       'allThreadsStopped': True
                   }
               }
   ```

#### Phase 2: DAP Command Implementation ⭐ UPDATED

**Objective**: Implement core DAP commands that map to M2 debugger functionality.

**Core DAP Commands to Implement**:
```python
# Essential DAP commands for JupyterLab compatibility
DAP_COMMANDS = {
    'initialize': self._handle_initialize,
    'setBreakpoints': self._handle_set_breakpoints,
    'continue': self._handle_continue,
    'step': self._handle_step,
    'stepIn': self._handle_step_in,
    'stepOut': self._handle_step_out,
    'pause': self._handle_pause,
    'scopes': self._handle_scopes,
    'variables': self._handle_variables,
    'evaluate': self._handle_evaluate,
    'disconnect': self._handle_disconnect
}
```

**M2 Command Mapping**:
```python
# DAP to M2 command translation
def _handle_step(self, args):
    """DAP step -> M2 step command"""
    return self._send_m2_debug_command('step')

def _handle_continue(self, args):
    """DAP continue -> M2 continue command"""
    return self._send_m2_debug_command('continue')

def _handle_scopes(self, args):
    """DAP scopes -> M2 listLocalSymbols"""
    response = self._send_m2_debug_command('listLocalSymbols')
    return self._convert_to_dap_scopes(response)
```

**Fallback Magic Commands** (for advanced M2 features):
```python
# M2-specific debug magics (beyond DAP)
%m2_debug_disassemble     # Show disassemble current
%m2_debug_code           # Show code current  
%m2_debug_value          # Show value current
%m2_debug_locate         # Show locate current
```

**Implementation**:
```python
def _handle_debug_magic(self, command: str, args: str = "") -> Dict[str, Any]:
    """Handle debug-specific magic commands"""
    if not self.debug_session or not self.debug_session.active:
        return {'error': 'Not currently in debug mode'}
    
    debug_commands = {
        'step': lambda n='1': self._send_to_debugger(f'step {n}'),
        'continue': lambda: self._send_to_debugger('continue'),
        'break': lambda: self._send_to_debugger('break'),
        'locals': lambda: self._send_to_debugger('listLocalSymbols'),
        'current': lambda: self._send_to_debugger('current'),
        'code': lambda: self._send_to_debugger('code current')
    }
    
    return debug_commands.get(command, lambda: {'error': 'Unknown debug command'})()
```

#### Phase 3: JupyterLab Debugger Integration ⭐ UPDATED

**Objective**: Enable JupyterLab's built-in debugger to work with M2.

**Key Benefits**:
- **No Custom UI Development**: JupyterLab already has a full-featured debugger interface
- **Standard User Experience**: Users familiar with Python debugging can use M2 debugging
- **Automatic Updates**: Benefit from JupyterLab debugger improvements
- **Professional Features**: Variable inspector, call stack, breakpoint management

**Integration Requirements**:

1. **Kernel Declaration**:
   ```python
   # Kernel must declare debugging support
   'debugger': True
   ```

2. **DAP Message Handling**:
   ```python
   # Handle standard debug protocol messages
   - debug_request/debug_reply on Control channel
   - debug_event on IOPub channel
   ```

3. **M2-Specific Extensions**:
   ```python
   # Jupyter-specific DAP extensions for notebook cells
   - dumpCell: Submit M2 cell code for debugging
   - debugInfo: Get current M2 debug session state
   - richInspectVariables: Enhanced M2 object inspection
   ```

**JupyterLab Features Available**:
- Variable explorer with M2 symbols
- Breakpoint management in notebook cells
- Step-through debugging controls
- Call stack navigation
- Expression evaluation in debug context

#### Phase 4: Advanced Features

**Objective**: Implement sophisticated debugging features unique to Jupyter environment.

**Features**:

1. **Visual Breakpoints**:
   ```python
   # Cell magic for setting breakpoints
   %%debug_on_error
   R = QQ[x,y,z]
   I = ideal(x^2 + y^2, z^2)
   # Automatically enter debugger if error occurs
   ```

2. **Step-through Visualization**:
   - Highlight executed code in real-time
   - Show variable value changes
   - Visualize mathematical objects as they're computed

3. **Debug History**:
   - Save debugging sessions
   - Replay debugging steps
   - Export debug traces

4. **Collaborative Debugging**:
   - Share debugging sessions
   - Remote debugging support
   - Debug session annotations

### Technical Implementation Details

#### Debug Session Bridge

```python
class M2DebuggerBridge:
    """Bridge between Jupyter kernel and M2 debugger"""
    
    def __init__(self, m2_process):
        self.m2_process = m2_process
        self.debug_session = None
        self.debug_prompt_pattern = re.compile(r'i\d+\s*:\s*debug>')
        
    def detect_debug_entry(self, output: str) -> bool:
        """Detect when M2 enters debugger mode"""
        return ("entering debugger" in output or 
                self.debug_prompt_pattern.search(output))
    
    def extract_debug_info(self, output: str) -> Dict[str, Any]:
        """Extract debugging information from M2 output"""
        info = {}
        
        # Extract current expression
        if "current expression:" in output:
            info['current'] = self._extract_current_expression(output)
            
        # Extract local variables
        if "Local symbols:" in output:
            info['locals'] = self._extract_local_variables(output)
            
        # Extract call stack
        if "Call stack:" in output:
            info['stack'] = self._extract_call_stack(output)
            
        return info
    
    def send_debug_command(self, command: str) -> Dict[str, Any]:
        """Send command to M2 debugger and parse response"""
        if not self.debug_session:
            return {'error': 'No active debug session'}
            
        # Send command to M2
        response = self.m2_process.send_command(command)
        
        # Parse debugger response
        return self._parse_debug_response(response)
```

#### Widget Integration

```python
class JupyterDebugInterface:
    """Jupyter-specific debug interface"""
    
    def __init__(self, kernel):
        self.kernel = kernel
        self.widget = None
        
    def create_debug_widget(self):
        """Create interactive debug widget"""
        from ipywidgets import VBox, HBox, Button, Output, HTML
        
        # Control buttons
        step_btn = Button(description="Step", button_style='info')
        continue_btn = Button(description="Continue", button_style='success')
        break_btn = Button(description="Break", button_style='danger')
        
        # Information displays
        locals_output = Output()
        code_output = Output() 
        stack_output = Output()
        
        # Event handlers
        step_btn.on_click(lambda b: self._handle_step())
        continue_btn.on_click(lambda b: self._handle_continue())
        break_btn.on_click(lambda b: self._handle_break())
        
        # Layout
        controls = HBox([step_btn, continue_btn, break_btn])
        info_tabs = Tab([locals_output, code_output, stack_output])
        info_tabs.set_title(0, 'Local Variables')
        info_tabs.set_title(1, 'Source Code')
        info_tabs.set_title(2, 'Call Stack')
        
        self.widget = VBox([controls, info_tabs])
        return self.widget
    
    def update_debug_display(self, debug_info: Dict[str, Any]):
        """Update widget with current debug information"""
        if self.widget:
            # Update local variables
            self._update_locals_display(debug_info.get('locals', {}))
            
            # Update source code view
            self._update_code_display(debug_info.get('current', ''))
            
            # Update call stack
            self._update_stack_display(debug_info.get('stack', []))
```

## Integration Challenges and Solutions

### Challenge 1: Async Debugging in Jupyter

**Problem**: M2's debugger is synchronous, but Jupyter operates asynchronously.

**Solution**: 
- Implement debug session queuing
- Use background threads for debug communication
- Provide non-blocking debug UI updates

```python
class AsyncDebugManager:
    def __init__(self):
        self.debug_queue = asyncio.Queue()
        self.debug_active = False
        
    async def handle_debug_session(self):
        """Handle debug commands asynchronously"""
        while self.debug_active:
            command = await self.debug_queue.get()
            result = await self._execute_debug_command(command)
            await self._update_ui(result)
```

### Challenge 2: State Synchronization

**Problem**: Keeping Jupyter UI in sync with M2 debugger state.

**Solution**:
- Implement state polling mechanism
- Use event-driven updates
- Provide state validation checks

### Challenge 3: User Experience Consistency

**Problem**: Maintaining familiar debugging patterns while adapting to Jupyter.

**Solution**:
- Preserve M2's debugging command semantics
- Add Jupyter-specific enhancements
- Provide both text and visual interfaces

## Revised Feature Roadmap ⭐ UPDATED

### Phase 1 (DAP Foundation) - 3-4 weeks ⭐ SIMPLIFIED
- [ ] Implement `debugger: True` in kernel_info_reply
- [ ] Add debug_request/debug_reply message handlers
- [ ] Create M2DebugAdapter class for DAP translation
- [ ] Basic DAP command mapping (initialize, continue, step)
- [ ] Debug session state management

### Phase 2 (Core DAP Implementation) - 4-6 weeks  
- [ ] Complete DAP command implementation
- [ ] Breakpoint management (setBreakpoints, clearBreakpoints)
- [ ] Variable inspection (scopes, variables)
- [ ] Expression evaluation in debug context
- [ ] M2 debug event monitoring and translation

### Phase 3 (M2-Specific Enhancements) - 3-4 weeks
- [ ] Jupyter-specific DAP extensions (dumpCell, debugInfo)
- [ ] Enhanced variable inspection for M2 objects
- [ ] M2 magic commands for advanced debugging
- [ ] Integration with M2's locate/disassemble features

### Phase 4 (Polish & Testing) - 2-3 weeks
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Comprehensive testing with complex M2 code
- [ ] Documentation and examples

**Total Estimated Time: 12-17 weeks** (vs. original 16-24 weeks)

**Key Advantage**: By leveraging JupyterLab's existing debugger UI, we eliminate 6-8 weeks of custom widget development!

## Success Metrics

1. **Functionality**: All M2 debugger commands available in Jupyter
2. **Usability**: Intuitive debugging workflow for mathematicians
3. **Performance**: Responsive debugging with minimal latency
4. **Integration**: Seamless experience with existing Jupyter features
5. **Adoption**: Positive feedback from M2 community

## Conclusion ⭐ UPDATED

Integrating M2's debugger with Jupyter represents a **significant opportunity** to enhance the mathematical computing experience. **Key insight from studying JupyterLab's Python debugging**: We can leverage the existing, mature JupyterLab debugger interface by implementing **Debug Adapter Protocol (DAP) compatibility**.

### Strategic Advantages of DAP Approach

1. **Reduced Development Time**: 12-17 weeks vs. original 16-24 weeks
2. **Professional UI**: Leverage JupyterLab's polished debugger interface
3. **Industry Standard**: Follow Microsoft's widely-adopted Debug Adapter Protocol
4. **Future-Proof**: Automatic compatibility with JupyterLab debugger improvements
5. **User Familiarity**: Users already know the JupyterLab debugging interface

### Implementation Strategy

The **hybrid approach** combines:
- **DAP compatibility** for core debugging (step, continue, breakpoints, variables)
- **M2-specific extensions** for advanced features (disassemble, locate, value)
- **Fallback magic commands** for M2's unique debugging capabilities

### Impact

This integration will provide mathematicians with **unprecedented debugging capabilities** for algebraic computation, making the M2 Jupyter kernel the **premier environment** for interactive mathematical research and development.

## Next Steps ⭐ UPDATED

1. **Study DAP specification** and existing implementations
2. **Implement kernel debugger declaration** (`debugger: True`)
3. **Create basic DAP message handlers** for debug protocol
4. **Build M2DebugAdapter** for command translation
5. **Test with JupyterLab's debugger interface**

**Reference Documents**:
- `JUPYTER_DEBUG_PROTOCOL_ANALYSIS.md` - Detailed comparison with Python implementation
- Jupyter Enhancement Proposal 47 - Debug Protocol specification
- xeus-python source code - Reference DAP implementation

This integration will establish the M2 Jupyter kernel as the **gold standard** for mathematical computing environments with **full visual debugging support**.