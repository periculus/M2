# M2 Webapp Protocol Integration for Jupyter Kernel

## Executive Summary

The M2 webapp protocol provides a **structured communication layer** using control characters that could revolutionize our Jupyter kernel implementation. Based on analysis of Macaulay2Web's parsing logic, we can eliminate fragile regex-based output parsing and gain precise control over display formatting.

## Webapp Protocol Structure

### Control Character Tags

From `/src/common/tags.ts`:

| Character | Code | Tag Name | CSS Classes | Purpose |
|-----------|------|----------|-------------|---------|
| `\x11` | 17 | Html | M2Html | HTML content start |
| `\x12` | 18 | End | M2End | End of HTML/special content |
| `\x13` | 19 | Cell | M2Text M2Cell | Cell container start |
| `\x14` | 20 | CellEnd | M2CellEnd | Cell container end |
| `\x1C` | 28 | Input | M2Text M2Input | User input text |
| `\x1D` | 29 | InputContd | M2Text M2Input M2InputContd | Multi-line input continuation |
| `\x0E` | 14 | Prompt | M2Text M2Prompt | M2 prompt (i1 : ) |
| `\x15` | 21 | Position | M2Position | Source position (file:line:col) |

### Parsing Algorithm

The webapp protocol uses a **split-and-parse** approach:

1. **Split on Control Characters**: `msg.split(webAppRegex)` creates an array where:
   - Even indices (0, 2, 4...) contain text content
   - Odd indices (1, 3, 5...) contain the control character that preceded the text

2. **State-Driven Processing**: Each control character triggers specific HTML element creation and state changes

3. **Special Input Handling**: Input sections end at newlines, not control characters

## Key Parsing Insights from M2Web

### 1. **Reliable State Management**

```typescript
// M2Web maintains parsing state
let htmlSec; // current HTML section being written to
let inputEndFlag = false; // tracks end of input sections
let interpreterDepth = 1; // tracks M2 interpreter nesting
```

### 2. **Cell Structure Management**

```typescript
// Cells are hierarchical containers
if (tag == webAppTags.CellEnd) {
    const oldHtmlSec = htmlSec;
    closeHtml(); // finalize current section
    // Process completed cell for tutorials/syntax highlighting
}
```

### 3. **Input Processing with Syntax Highlighting**

```typescript
// Input gets syntax highlighted when complete
if (htmlSec.classList.contains("M2Input")) {
    htmlSec.innerHTML = Prism.highlight(
        htmlSec.textContent,
        Prism.languages.macaulay2
    );
    htmlSec.classList.add("M2PastInput");
}
```

### 4. **HTML Content Direct Insertion**

```typescript
// HTML content is inserted directly (not escaped)
if (htmlSec.classList.contains("M2Html")) {
    htmlSec.insertAdjacentHTML("beforeend", htmlSec.dataset.code);
    autoRender(htmlSec); // KaTeX math rendering
}
```

### 5. **Position Tracking for Error Location**

```typescript
// Position data is stored for error highlighting
if (htmlSec.classList.contains("M2Position")) {
    htmlSec.parentElement.dataset.positions += htmlSec.dataset.code + " ";
}
```

## Jupyter Kernel Integration Strategy

### Phase 1: Webapp Protocol Parser

```python
class M2WebappProtocolParser:
    """Parse M2 webapp protocol for Jupyter kernel"""
    
    # Control character definitions from M2Web
    WEBAPP_TAGS = {
        '\x11': ('Html', 'html_start'),
        '\x12': ('End', 'html_end'), 
        '\x13': ('Cell', 'cell_start'),
        '\x14': ('CellEnd', 'cell_end'),
        '\x1C': ('Input', 'input_start'),
        '\x1D': ('InputContd', 'input_continuation'),
        '\x0E': ('Prompt', 'prompt'),
        '\x15': ('Position', 'source_position')
    }
    
    WEBAPP_REGEX = re.compile(f'([\\x0E\\x11-\\x15\\x1C\\x1D])')
    
    def __init__(self):
        self.current_cell = None
        self.html_sections = []
        self.input_sections = []
        self.position_data = []
        self.interpreter_depth = 1
        
    def parse_output(self, raw_output: str) -> 'ParsedOutput':
        """Parse M2 webapp output into structured format"""
        # Remove carriage returns and split on control characters
        clean_output = raw_output.replace('\r', '')
        segments = self.WEBAPP_REGEX.split(clean_output)
        
        parsed = ParsedOutput()
        
        for i in range(0, len(segments), 2):
            text_content = segments[i] if i < len(segments) else ''
            
            if i + 1 < len(segments):
                control_char = segments[i + 1]
                tag_info = self.WEBAPP_TAGS.get(control_char)
                
                if tag_info:
                    tag_name, tag_type = tag_info
                    self._process_tag(tag_type, text_content, parsed)
                    
        return parsed
        
    def _process_tag(self, tag_type: str, content: str, parsed: 'ParsedOutput'):
        """Process individual tags according to M2Web logic"""
        
        if tag_type == 'cell_start':
            self.current_cell = CellSection()
            parsed.cells.append(self.current_cell)
            
        elif tag_type == 'cell_end':
            if self.current_cell:
                self.current_cell.finalize()
                
        elif tag_type == 'html_start':
            self.current_html = HtmlSection()
            if self.current_cell:
                self.current_cell.add_html_section(self.current_html)
                
        elif tag_type == 'html_end':
            if hasattr(self, 'current_html'):
                self.current_html.finalize()
                
        elif tag_type == 'input_start':
            # Input ends at newline, not control character
            input_parts = content.split('\n', 1)
            input_text = input_parts[0]
            
            input_section = InputSection(input_text)
            if self.current_cell:
                self.current_cell.add_input_section(input_section)
                
            # Process remaining text if any
            if len(input_parts) > 1:
                self._process_remaining_content(input_parts[1], parsed)
                
        elif tag_type == 'prompt':
            # Extract interpreter depth from prompt
            prompt_match = re.match(r'^(i+)', content)
            if prompt_match:
                self.interpreter_depth = len(prompt_match.group(1))
            parsed.add_prompt(content, self.interpreter_depth)
            
        elif tag_type == 'source_position':
            # Parse position data: "filename:line:column"
            position = self._parse_position(content)
            if position:
                parsed.add_position(position)
                self.position_data.append(position)
```

### Phase 2: Jupyter Output Generation

```python
class WebappToJupyterConverter:
    """Convert webapp parsed output to Jupyter display formats"""
    
    def __init__(self):
        self.syntax_highlighter = M2SyntaxHighlighter()
        self.latex_renderer = M2LaTeXRenderer()
        
    def convert_to_jupyter_output(self, parsed: ParsedOutput) -> Dict[str, Any]:
        """Convert parsed webapp output to Jupyter display data"""
        
        result = {
            'text/plain': '',
            'text/html': '',
            'application/vnd.jupyter.stdout': '',
            'metadata': {}
        }
        
        # Process cells
        for cell in parsed.cells:
            cell_output = self._process_cell(cell)
            
            # Combine outputs
            if cell_output.get('text/plain'):
                result['text/plain'] += cell_output['text/plain'] + '\n'
                
            if cell_output.get('text/html'):
                result['text/html'] += cell_output['text/html']
                
        # Add position data for debugging
        if parsed.positions:
            result['metadata']['m2_positions'] = parsed.positions
            
        return result
        
    def _process_cell(self, cell: CellSection) -> Dict[str, Any]:
        """Process individual cell according to M2Web logic"""
        
        output = {
            'text/plain': '',
            'text/html': ''
        }
        
        # Build HTML structure like M2Web
        html_parts = ['<div class="M2Cell">']
        
        # Add cell bar (left border)
        html_parts.append('<span class="M2CellBar M2Left"></span>')
        
        # Process input sections with syntax highlighting
        for input_section in cell.input_sections:
            highlighted = self.syntax_highlighter.highlight(input_section.content)
            html_parts.append(f'<span class="M2Input M2PastInput">{highlighted}</span>')
            output['text/plain'] += input_section.content + '\n'
            
        # Process HTML sections (direct insertion like M2Web)
        for html_section in cell.html_sections:
            html_parts.append(html_section.content)
            
        # Process regular text content
        if cell.text_content:
            html_parts.append(f'<span class="M2Text">{cell.text_content}</span>')
            output['text/plain'] += cell.text_content
            
        html_parts.append('</div>')
        output['text/html'] = ''.join(html_parts)
        
        return output
```

### Phase 3: Enhanced M2 Process Integration

```python
class EnhancedM2Process:
    """M2 process with webapp protocol support"""
    
    def __init__(self):
        self.webapp_parser = M2WebappProtocolParser()
        self.output_converter = WebappToJupyterConverter()
        self.debug_tracker = M2DebugPositionTracker()
        
    def start_process(self):
        """Start M2 with webapp protocol enabled"""
        self.process = subprocess.Popen([
            'M2', 
            '--webapp',  # Enable webapp protocol!
            '--no-prompts', 
            '--no-readline', 
            '--no-tty'
        ], 
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=False,  # Binary mode to handle control characters
        bufsize=0
        )
        
    def execute_code(self, code: str) -> Dict[str, Any]:
        """Execute code and parse webapp output"""
        
        # Send code to M2
        self.process.stdin.write((code + '\n').encode())
        self.process.stdin.flush()
        
        # Read output with control characters
        raw_output = self._read_output_with_timeout()
        
        # Parse using webapp protocol
        parsed_output = self.webapp_parser.parse_output(raw_output.decode())
        
        # Update debug position tracking
        for position in parsed_output.positions:
            self.debug_tracker.update_position(position)
            
        # Convert to Jupyter format
        jupyter_output = self.output_converter.convert_to_jupyter_output(parsed_output)
        
        return jupyter_output
        
    def _read_output_with_timeout(self, timeout: float = 30.0) -> bytes:
        """Read output preserving control characters"""
        
        output_chunks = []
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self.process.poll() is not None:
                break
                
            # Read available data
            try:
                chunk = self.process.stdout.read(4096)
                if chunk:
                    output_chunks.append(chunk)
                    # Check for prompt indicating completion
                    if b'\x0E' in chunk:  # Prompt character
                        break
                else:
                    time.sleep(0.01)
            except:
                break
                
        return b''.join(output_chunks)
```

## Benefits for Debugger Integration

### 1. **Precise Error Location Tracking**

The `\x15` Position tag provides **exact source locations**:

```python
class M2DebugPositionTracker:
    """Track source positions for precise debugging"""
    
    def update_position(self, position_data: Dict[str, Any]):
        """Update current position from webapp \x15 tag"""
        self.current_location = {
            'filename': position_data['filename'],
            'line': position_data['line'], 
            'column': position_data['column']
        }
        
    def get_dap_location(self) -> Dict[str, Any]:
        """Convert to DAP source location format"""
        if self.current_location:
            return {
                'source': {
                    'path': self.current_location['filename'],
                    'name': os.path.basename(self.current_location['filename'])
                },
                'line': self.current_location['line'],
                'column': self.current_location['column']
            }
        return None
```

### 2. **Structured Debug Output Processing**

Webapp protocol provides **clean separation** of debug information:

```python
def process_debug_webapp_output(self, parsed_output: ParsedOutput) -> List[DAPEvent]:
    """Process debug output using webapp structure"""
    
    events = []
    
    for cell in parsed_output.cells:
        # Check for debugger entry in cell content
        if 'entering debugger' in cell.text_content:
            # Create DAP stopped event with precise location
            location = self.debug_tracker.get_dap_location()
            events.append({
                'seq': self.next_seq(),
                'type': 'event',
                'event': 'stopped',
                'body': {
                    'reason': 'breakpoint',
                    'threadId': 1,
                    'allThreadsStopped': True,
                    **location
                }
            })
            
        # Process input sections for debug commands
        for input_section in cell.input_sections:
            if self._is_debug_command(input_section.content):
                events.append(self._process_debug_command(input_section.content))
                
    return events
```

### 3. **Enhanced Variable Inspection**

HTML sections can contain **formatted variable displays**:

```python
def extract_debug_variables(self, parsed_output: ParsedOutput) -> Dict[str, Any]:
    """Extract variable information from webapp HTML sections"""
    
    variables = {}
    
    for cell in parsed_output.cells:
        for html_section in cell.html_sections:
            # Parse HTML for variable tables, mathematical displays
            variables.update(self._parse_html_variables(html_section.content))
            
    return {
        'scopes': [{
            'name': 'Local Variables',
            'variablesReference': 1,
            'expensive': False
        }],
        'variables': variables
    }
```

## Implementation Roadmap

### Phase 1: Basic Webapp Integration (2-3 weeks)
- [ ] Implement M2WebappProtocolParser
- [ ] Update M2Process to use --webapp flag  
- [ ] Basic parsing and output conversion
- [ ] Test with existing kernel functionality

### Phase 2: Enhanced Display (2-3 weeks)
- [ ] Implement syntax highlighting integration
- [ ] HTML content processing and KaTeX rendering
- [ ] Cell structure and visual formatting
- [ ] Position tracking for error highlighting

### Phase 3: Debug Integration (3-4 weeks)
- [ ] Debug position tracking with \x15 tags
- [ ] Structured debug output processing
- [ ] Enhanced DAP adapter with webapp data
- [ ] Variable inspection from HTML sections

### Phase 4: Advanced Features (2-3 weeks)
- [ ] Tutorial integration (like M2Web)
- [ ] Interactive cell processing
- [ ] Error location highlighting
- [ ] Performance optimization

## Key Advantages

1. **Reliability**: Eliminate regex-based parsing fragility
2. **Structure**: Leverage M2's built-in output organization
3. **Rich Display**: Direct HTML and LaTeX content support
4. **Debug Precision**: Exact source location tracking
5. **Performance**: Efficient control character parsing
6. **Compatibility**: Match M2Web's proven parsing logic

## Questions for Implementation

1. **Current Usage**: Are you currently using `--webapp` in the kernel?
2. **Raw Output Examples**: Could you provide sample webapp output for testing?
3. **Priority**: Should this be our next major implementation focus?
4. **Integration**: How does this fit with your current development timeline?

This webapp protocol integration would provide a **solid foundation** for both improved output display and enhanced debugger integration. It's exactly the structured communication layer our advanced features need!

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze M2 webapp protocol for kernel improvements", "status": "completed", "priority": "high", "id": "81"}, {"content": "Design enhanced output parsing using M2 control tags", "status": "completed", "priority": "high", "id": "82"}, {"content": "Integrate webapp protocol insights into debugger strategy", "status": "in_progress", "priority": "high", "id": "83"}, {"content": "Update kernel architecture to leverage M2 structured output", "status": "pending", "priority": "medium", "id": "84"}]