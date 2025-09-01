// File: frontend/src/components/CodeEditor/CodeEditor.tsx
// Extension: .tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { 
  Play, 
  Square, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  Share2,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

import { useCodeExecution } from '../../hooks/useCodeExecution';
import { useCodeAnalysis } from '../../hooks/useCodeAnalysis';
import { useTheme } from '../../hooks/useTheme';
import { configureMonaco } from '../../utils/monaco-config';
import ExecutionOutput from './ExecutionOutput';
import AnalysisPanel from './AnalysisPanel';
import SettingsPanel from './SettingsPanel';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  showToolbar?: boolean;
  showOutput?: boolean;
  showAnalysis?: boolean;
  autoSave?: boolean;
  snippetId?: string;
}

interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoFormat: boolean;
  autoComplete: boolean;
  theme: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  language = 'cpp',
  readOnly = false,
  height = '500px',
  onCodeChange,
  onSave,
  showToolbar = true,
  showOutput = true,
  showAnalysis = true,
  autoSave = true,
  snippetId
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
    tabSize: 4,
    wordWrap: 'on',
    minimap: true,
    lineNumbers: 'on',
    autoFormat: true,
    autoComplete: true,
    theme: 'vs-dark'
  });

  // Code execution hook
  const {
    executeCode,
    executionResult,
    isExecuting,
    executionHistory
  } = useCodeExecution();

  // Code analysis hook
  const {
    analyzeCode,
    analysisResult,
    isAnalyzing,
    analysisHistory
  } = useCodeAnalysis();

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Configure Monaco for C++
    configureMonaco();

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value: code,
      language: language,
      theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly: readOnly,
      contextmenu: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      renderIndentGuides: true,
      cursorBlinking: 'blink',
      cursorSmoothCaretAnimation: true,
      suggestOnTriggerCharacters: settings.autoComplete,
      acceptSuggestionOnCommitCharacter: settings.autoComplete,
      quickSuggestions: settings.autoComplete,
      formatOnPaste: settings.autoFormat,
      formatOnType: settings.autoFormat,
      rulers: [80, 120]
    });

    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecute();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
      handleAnalyze();
    });

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const newCode = editor.getValue();
      setCode(newCode);
      setHasUnsavedChanges(true);
      onCodeChange?.(newCode);

      // Auto-save after 2 seconds of inactivity
      if (autoSave) {
        const timeoutId = setTimeout(() => {
          handleAutoSave(newCode);
        }, 2000);

        return () => clearTimeout(timeoutId);
      }
    });

    // Cleanup
    return () => {
      disposable.dispose();
      editor.dispose();
    };
  }, []);

  // Update editor theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
    }
  }, [theme]);

  // Update editor settings
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        suggestOnTriggerCharacters: settings.autoComplete,
        acceptSuggestionOnCommitCharacter: settings.autoComplete,
        quickSuggestions: settings.autoComplete,
        formatOnPaste: settings.autoFormat,
        formatOnType: settings.autoFormat
      });
    }
  }, [settings]);

  const handleExecute = useCallback(async () => {
    if (!code.trim()) {
      return;
    }

    try {
      await executeCode({
        code,
        language,
        input: '',
        compilerFlags: []
      });
    } catch (error) {
      console.error('Execution failed:', error);
    }
  }, [code, language, executeCode]);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      return;
    }

    try {
      await analyzeCode({
        code,
        language,
        analysisTypes: ['syntax', 'semantic', 'style', 'performance']
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }, [code, language, analyzeCode]);

  const handleSave = useCallback(() => {
    onSave?.(code);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  }, [code, onSave]);

  const handleAutoSave = useCallback((codeToSave: string) => {
    // Auto-save logic (e.g., save to localStorage or server)
    localStorage.setItem(`editor-autosave-${snippetId || 'default'}`, codeToSave);
    setLastSaved(new Date());
  }, [snippetId]);

  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset the code? All unsaved changes will be lost.')) {
      setCode(initialCode);
      editorRef.current?.setValue(initialCode);
      setHasUnsavedChanges(false);
    }
  }, [initialCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language === 'cpp' ? 'cpp' : 'c'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language]);

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cpp,.c,.cc,.cxx,.h,.hpp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setCode(content);
          editorRef.current?.setValue(content);
          setHasUnsavedChanges(true);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const handleShare = useCallback(() => {
    // Implement sharing functionality
    if (navigator.share) {
      navigator.share({
        title: 'C++ Code Snippet',
        text: 'Check out this C++ code:',
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    // Update editor layout after fullscreen change
    setTimeout(() => {
      editorRef.current?.layout();
    }, 100);
  }, [isFullscreen]);

  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  const getExecutionStatus = () => {
    if (isExecuting) return { icon: Loader2, text: 'Executing...', className: 'text-blue-600 animate-spin' };
    if (executionResult?.success) return { icon: CheckCircle, text: 'Success', className: 'text-green-600' };
    if (executionResult && !executionResult.success) return { icon: AlertCircle, text: 'Error', className: 'text-red-600' };
    return null;
  };

  const getAnalysisStatus = () => {
    if (isAnalyzing) return { icon: Loader2, text: 'Analyzing...', className: 'text-blue-600 animate-spin' };
    if (analysisResult?.issues?.length === 0) return { icon: CheckCircle, text: 'No Issues', className: 'text-green-600' };
    if (analysisResult?.issues?.length > 0) return { icon: AlertCircle, text: `${analysisResult.issues.length} Issues`, className: 'text-yellow-600' };
    return null;
  };

  const executionStatus = getExecutionStatus();
  const analysisStatus = getAnalysisStatus();

  return (
    <div className={`
      flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
      ${isFullscreen ? 'fixed inset-0 z-50' : ''}
    `}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {/* Run button */}
            <button
              onClick={handleExecute}
              disabled={isExecuting || !code.trim()}
              className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200"
              title="Run code (Ctrl+Enter)"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Run</span>
            </button>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !code.trim()}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200"
              title="Analyze code (Ctrl+Shift+A)"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>Analyze</span>
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* File operations */}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 transition-colors duration-200"
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
            </button>

            <button
              onClick={handleUpload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title="Upload file"
            >
              <Upload className="h-4 w-4" />
            </button>

            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={handleShare}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title="Share code"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title="Reset code"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status indicators */}
            {executionStatus && (
              <div className="flex items-center space-x-1">
                <executionStatus.icon className={`h-4 w-4 ${executionStatus.className}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{executionStatus.text}</span>
              </div>
            )}

            {analysisStatus && (
              <div className="flex items-center space-x-1">
                <analysisStatus.icon className={`h-4 w-4 ${analysisStatus.className}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{analysisStatus.text}</span>
              </div>
            )}

            {/* Save status */}
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 dark:text-orange-400">Unsaved changes</span>
            )}

            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title="Editor settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Editor and panels container */}
      <div className="flex-1 flex min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <div 
            ref={containerRef}
            className="flex-1"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 120px)' : height }}
          />
        </div>

        {/* Side panels */}
        {(showOutput || showAnalysis || showSettings) && (
          <div className="w-1/3 min-w-0 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Panel tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {showOutput && (
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                >
                  Output
                </button>
              )}
              {showAnalysis && (
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                >
                  Analysis
                </button>
              )}
              {showSettings && (
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                >
                  Settings
                </button>
              )}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-auto">
              {showOutput && (
                <ExecutionOutput 
                  result={executionResult}
                  isExecuting={isExecuting}
                  history={executionHistory}
                />
              )}
              {showAnalysis && (
                <AnalysisPanel 
                  result={analysisResult}
                  isAnalyzing={isAnalyzing}
                  onIssueClick={(line) => {
                    // Jump to line in editor
                    editorRef.current?.revealLineInCenter(line);
                    editorRef.current?.setPosition({ lineNumber: line, column: 1 });
                  }}
                />
              )}
              {showSettings && (
                <SettingsPanel 
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;