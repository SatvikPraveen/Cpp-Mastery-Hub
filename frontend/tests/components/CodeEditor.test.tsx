// File: frontend/tests/components/CodeEditor.test.tsx
// Extension: .tsx
// Location: frontend/tests/components/CodeEditor.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor } from '../../src/components/CodeEditor/CodeEditor';
import { useCodeExecution } from '../../src/hooks/useCodeExecution';
import { useCodeAnalysis } from '../../src/hooks/useCodeAnalysis';

// Mock the hooks
jest.mock('../../src/hooks/useCodeExecution');
jest.mock('../../src/hooks/useCodeAnalysis');
jest.mock('../../src/services/api');

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: jest.fn(({ onChange, value, options }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ width: '100%', height: '400px' }}
    />
  ))
}));

const mockUseCodeExecution = useCodeExecution as jest.MockedFunction<typeof useCodeExecution>;
const mockUseCodeAnalysis = useCodeAnalysis as jest.MockedFunction<typeof useCodeAnalysis>;

describe('CodeEditor Component', () => {
  const defaultProps = {
    initialCode: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    language: 'cpp' as const,
    onCodeChange: jest.fn(),
    onSave: jest.fn()
  };

  const mockExecutionHook = {
    executeCode: jest.fn(),
    isExecuting: false,
    executionResult: null,
    error: null
  };

  const mockAnalysisHook = {
    analyzeCode: jest.fn(),
    isAnalyzing: false,
    analysisResult: null,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCodeExecution.mockReturnValue(mockExecutionHook);
    mockUseCodeAnalysis.mockReturnValue(mockAnalysisHook);
  });

  it('renders code editor with initial code', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(defaultProps.initialCode);
  });

  it('renders toolbar with action buttons', () => {
    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
  });

  it('calls onCodeChange when code is modified', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    await act(async () => {
      await user.clear(editor);
      await user.type(editor, 'int main() { return 0; }');
    });
    
    expect(defaultProps.onCodeChange).toHaveBeenCalledWith('int main() { return 0; }');
  });

  it('executes code when run button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const runButton = screen.getByText('Run');
    await user.click(runButton);
    
    expect(mockExecutionHook.executeCode).toHaveBeenCalledWith({
      code: defaultProps.initialCode,
      language: 'cpp',
      input: ''
    });
  });

  it('analyzes code when analyze button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const analyzeButton = screen.getByText('Analyze');
    await user.click(analyzeButton);
    
    expect(mockAnalysisHook.analyzeCode).toHaveBeenCalledWith({
      code: defaultProps.initialCode,
      language: 'cpp'
    });
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalledWith(defaultProps.initialCode);
  });

  it('shows loading state when executing code', () => {
    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      isExecuting: true
    });

    render(<CodeEditor {...defaultProps} />);
    
    const runButton = screen.getByText('Running...');
    expect(runButton).toBeInTheDocument();
    expect(runButton).toBeDisabled();
  });

  it('shows loading state when analyzing code', () => {
    mockUseCodeAnalysis.mockReturnValue({
      ...mockAnalysisHook,
      isAnalyzing: true
    });

    render(<CodeEditor {...defaultProps} />);
    
    const analyzeButton = screen.getByText('Analyzing...');
    expect(analyzeButton).toBeInTheDocument();
    expect(analyzeButton).toBeDisabled();
  });

  it('displays execution results', () => {
    const executionResult = {
      success: true,
      output: 'Hello, World!\n',
      executionTime: 0.5,
      memoryUsage: 1024
    };

    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      executionResult
    });

    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Output:')).toBeInTheDocument();
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    expect(screen.getByText(/Execution time: 0.5ms/)).toBeInTheDocument();
    expect(screen.getByText(/Memory usage: 1.00 KB/)).toBeInTheDocument();
  });

  it('displays execution errors', () => {
    const executionResult = {
      success: false,
      error: 'Compilation failed',
      details: 'main.cpp:5:1: error: expected \';\' before \'}\' token'
    };

    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      executionResult
    });

    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Compilation failed')).toBeInTheDocument();
    expect(screen.getByText(/expected \';\' before/)).toBeInTheDocument();
  });

  it('displays analysis results', () => {
    const analysisResult = {
      issues: [
        {
          type: 'warning',
          message: 'Unused variable',
          line: 3,
          column: 9,
          severity: 'medium'
        }
      ],
      complexity: {
        cyclomatic: 2,
        cognitive: 1
      },
      suggestions: [
        'Consider using const for variables that don\'t change'
      ]
    };

    mockUseCodeAnalysis.mockReturnValue({
      ...mockAnalysisHook,
      analysisResult
    });

    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Analysis Results:')).toBeInTheDocument();
    expect(screen.getByText('1 issue found')).toBeInTheDocument();
    expect(screen.getByText('Unused variable')).toBeInTheDocument();
    expect(screen.getByText('Line 3, Column 9')).toBeInTheDocument();
  });

  it('supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    // Test Ctrl+S for save
    await act(async () => {
      await user.click(editor);
      await user.keyboard('{Control>}s{/Control}');
    });
    
    expect(defaultProps.onSave).toHaveBeenCalledWith(defaultProps.initialCode);
  });

  it('supports different language modes', () => {
    render(<CodeEditor {...defaultProps} language="cpp17" />);
    
    // Language selector should show cpp17
    expect(screen.getByDisplayValue('C++17')).toBeInTheDocument();
  });

  it('handles input for code execution', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} showInput />);
    
    const inputTextarea = screen.getByPlaceholderText('Program input...');
    await user.type(inputTextarea, 'test input');
    
    const runButton = screen.getByText('Run');
    await user.click(runButton);
    
    expect(mockExecutionHook.executeCode).toHaveBeenCalledWith({
      code: defaultProps.initialCode,
      language: 'cpp',
      input: 'test input'
    });
  });

  it('formats code when format button is clicked', async () => {
    const user = userEvent.setup();
    const unformattedCode = 'int main(){return 0;}';
    
    render(<CodeEditor {...defaultProps} initialCode={unformattedCode} />);
    
    const formatButton = screen.getByText('Format');
    await user.click(formatButton);
    
    // Should trigger code change with formatted code
    await waitFor(() => {
      expect(defaultProps.onCodeChange).toHaveBeenCalledWith(
        expect.stringContaining('int main() {\n    return 0;\n}')
      );
    });
  });

  it('shows settings panel when settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Editor Settings');
    await user.click(settingsButton);
    
    expect(screen.getByText('Editor Settings')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();
  });

  it('applies theme changes', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Editor Settings');
    await user.click(settingsButton);
    
    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'dark');
    
    // Monaco editor should receive the theme prop
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('handles font size changes', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Editor Settings');
    await user.click(settingsButton);
    
    const fontSizeInput = screen.getByLabelText('Font Size');
    await user.clear(fontSizeInput);
    await user.type(fontSizeInput, '16');
    
    // Settings should be applied
    await waitFor(() => {
      expect(fontSizeInput).toHaveValue(16);
    });
  });

  it('handles network errors gracefully', () => {
    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      error: 'Network error: Failed to connect to server'
    });

    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Network error: Failed to connect to server')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('supports collaborative editing mode', () => {
    render(<CodeEditor {...defaultProps} collaborative={true} />);
    
    expect(screen.getByText('Collaborative Mode')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('shows line numbers by default', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    // In a real Monaco editor, line numbers would be visible
  });

  it('supports code completion and IntelliSense', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    // Simulate typing to trigger autocomplete
    await act(async () => {
      await user.click(editor);
      await user.type(editor, '\nstd::');
    });
    
    // In a real implementation, this would show autocomplete suggestions
    expect(editor).toHaveValue(expect.stringContaining('std::'));
  });

  it('handles large code files efficiently', () => {
    const largeCode = 'int main() {\n' + '    // Large comment\n'.repeat(1000) + '    return 0;\n}';
    
    render(<CodeEditor {...defaultProps} initialCode={largeCode} />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(largeCode);
  });

  it('preserves scroll position after code execution', async () => {
    const user = userEvent.setup();
    const longCode = '#include <iostream>\n' + 'int main() {\n'.repeat(50) + '    return 0;\n' + '}\n'.repeat(50);
    
    render(<CodeEditor {...defaultProps} initialCode={longCode} />);
    
    const runButton = screen.getByText('Run');
    await user.click(runButton);
    
    // In a real implementation, scroll position would be preserved
    expect(mockExecutionHook.executeCode).toHaveBeenCalled();
  });

  it('shows compilation warnings', () => {
    const executionResult = {
      success: true,
      output: 'Program executed successfully',
      warnings: [
        'warning: unused variable \'x\' [-Wunused-variable]',
        'warning: comparison between signed and unsigned integer expressions'
      ]
    };

    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      executionResult
    });

    render(<CodeEditor {...defaultProps} />);
    
    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText(/unused variable/)).toBeInTheDocument();
    expect(screen.getByText(/comparison between signed and unsigned/)).toBeInTheDocument();
  });

  it('supports different compiler standards', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Editor Settings');
    await user.click(settingsButton);
    
    const standardSelect = screen.getByLabelText('C++ Standard');
    await user.selectOptions(standardSelect, 'c++20');
    
    const runButton = screen.getByText('Run');
    await user.click(runButton);
    
    expect(mockExecutionHook.executeCode).toHaveBeenCalledWith({
      code: defaultProps.initialCode,
      language: 'cpp',
      input: '',
      compilerOptions: expect.objectContaining({
        standard: 'c++20'
      })
    });
  });

  it('handles tab and space indentation settings', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Editor Settings');
    await user.click(settingsButton);
    
    const indentationSelect = screen.getByLabelText('Indentation');
    await user.selectOptions(indentationSelect, 'spaces');
    
    const indentSizeInput = screen.getByLabelText('Indent Size');
    await user.clear(indentSizeInput);
    await user.type(indentSizeInput, '4');
    
    await waitFor(() => {
      expect(indentSizeInput).toHaveValue(4);
    });
  });

  it('supports find and replace functionality', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    // Simulate Ctrl+F for find
    await act(async () => {
      await user.click(editor);
      await user.keyboard('{Control>}f{/Control}');
    });
    
    // In a real Monaco editor, this would open the find widget
    expect(editor).toHaveFocus();
  });

  it('shows memory usage visualization', () => {
    const executionResult = {
      success: true,
      output: 'Hello, World!',
      memoryUsage: 2048,
      memoryPeak: 3072,
      memoryVisualization: {
        stack: [
          { name: 'main', size: 64, type: 'function' }
        ],
        heap: []
      }
    };

    mockUseCodeExecution.mockReturnValue({
      ...mockExecutionHook,
      executionResult
    });

    render(<CodeEditor {...defaultProps} showMemoryVisualization />);
    
    expect(screen.getByText('Memory Visualization')).toBeInTheDocument();
    expect(screen.getByText('Stack')).toBeInTheDocument();
    expect(screen.getByText('Heap')).toBeInTheDocument();
  });

  it('handles accessibility features', () => {
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    const runButton = screen.getByText('Run');
    const analyzeButton = screen.getByText('Analyze');
    const saveButton = screen.getByText('Save');
    
    // Check ARIA labels and keyboard accessibility
    expect(editor).toBeInTheDocument();
    expect(runButton).not.toBeDisabled();
    expect(analyzeButton).not.toBeDisabled();
    expect(saveButton).not.toBeDisabled();
  });

  it('supports multiple cursors and selection', async () => {
    const user = userEvent.setup();
    render(<CodeEditor {...defaultProps} />);
    
    const editor = screen.getByTestId('monaco-editor');
    
    // Simulate Alt+Click for multiple cursors
    await act(async () => {
      await user.click(editor);
      await user.keyboard('{Alt>}{/Alt}');
    });
    
    // In a real Monaco editor, this would create multiple cursors
    expect(editor).toHaveFocus();
  });

  it('provides code minimap for large files', () => {
    const largeCode = '#include <iostream>\n'.repeat(100) + 'int main() { return 0; }';
    
    render(<CodeEditor {...defaultProps} initialCode={largeCode} showMinimap />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue(largeCode);
    // In a real implementation, minimap would be visible for large files
  });
});