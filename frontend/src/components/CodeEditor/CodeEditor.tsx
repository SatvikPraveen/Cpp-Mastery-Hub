import loader from '@monaco-editor/loader';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Save,
  Settings,
  Share2,
  Upload,
  Zap,
} from 'lucide-react';
import type * as Monaco from 'monaco-editor';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useCodeAnalysis } from '../../hooks/useCodeAnalysis';
import { useCodeExecution } from '../../hooks/useCodeExecution';
import type { ExecutionResult } from '../../hooks/useCodeExecution';
import { useTheme } from '../../hooks/useTheme';
import { configureMonaco } from '../../utils/monaco-config';

import AnalysisPanel from './AnalysisPanel';
import ExecutionOutput from './ExecutionOutput';
import type { ExecutionHistoryItem, ExecutionOutputResult } from './ExecutionOutput';
import SettingsPanel from './SettingsPanel';
import type { EditorSettings } from './SettingsPanel';

export interface CodeEditorProps {
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

const DEFAULT_CODE =
  '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}';

const toOutputResult = (result: ExecutionResult): ExecutionOutputResult => ({
  success: !result.error && result.exitCode === 0,
  output: result.output ?? '',
  error: result.error ?? '',
  executionTime: result.executionTime,
  memoryUsed: result.memoryUsed ?? 0,
  exitCode: result.exitCode,
});

const toEditorOptions = (
  settings: EditorSettings
): Monaco.editor.IEditorOptions & Monaco.editor.IGlobalEditorOptions => ({
  fontSize: settings.fontSize,
  tabSize: settings.tabSize,
  insertSpaces: settings.insertSpaces,
  wordWrap: settings.wordWrap ? 'on' : 'off',
  minimap: { enabled: settings.minimap },
  lineNumbers: settings.lineNumbers ? 'on' : 'off',
  formatOnPaste: settings.formatOnSave,
  formatOnType: settings.formatOnSave,
});

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = DEFAULT_CODE,
  language = 'cpp',
  readOnly = false,
  height = '500px',
  onCodeChange,
  onSave,
  showToolbar = true,
  showOutput = true,
  showAnalysis = true,
  autoSave = true,
  snippetId,
}) => {
  const monacoRef = useRef<typeof Monaco | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { actualTheme } = useTheme();
  const monacoTheme = actualTheme === 'dark' ? 'vs-dark' : 'vs';

  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [settings, setSettings] = useState<EditorSettings>({
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 4,
    wordWrap: true,
    minimap: true,
    lineNumbers: true,
    autoSave,
    formatOnSave: true,
    insertSpaces: true,
  });

  const { executeCode, result: rawExecutionResult, isExecuting, history } = useCodeExecution();
  const { analyzeCode, result: analysisResult, isAnalyzing } = useCodeAnalysis();

  const executionResult = rawExecutionResult ? toOutputResult(rawExecutionResult) : null;
  const executionHistory: ExecutionHistoryItem[] = history.map((entry) => ({
    id: entry.id,
    code: entry.code,
    timestamp: entry.timestamp,
    result: toOutputResult(entry.result),
  }));

  // Latest handlers, read by Monaco keybindings registered once at mount.
  const handlersRef = useRef({
    save: () => {},
    execute: () => {},
    analyze: () => {},
  });

  const handleExecute = useCallback(async () => {
    if (!code.trim()) return;
    try {
      await executeCode(code, { language, input: '' });
    } catch (error) {
      console.error('Execution failed:', error);
    }
  }, [code, language, executeCode]);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    await analyzeCode(code);
  }, [code, analyzeCode]);

  const handleSave = useCallback(() => {
    onSave?.(code);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  }, [code, onSave]);

  const handleAutoSave = useCallback(
    (codeToSave: string) => {
      try {
        localStorage.setItem(`editor-autosave-${snippetId ?? 'default'}`, codeToSave);
        setLastSaved(new Date());
      } catch {
        // Storage unavailable (private mode / quota); auto-save is best-effort.
      }
    },
    [snippetId]
  );

  handlersRef.current = {
    save: handleSave,
    execute: () => void handleExecute(),
    analyze: () => void handleAnalyze(),
  };

  const autoSaveRef = useRef(handleAutoSave);
  autoSaveRef.current = handleAutoSave;
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  // Load Monaco in the browser only and create the editor once.
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      // Loaded at runtime by @monaco-editor/loader: monaco-editor's ESM build imports global CSS,
      // which Next.js cannot bundle. Types still come from the monaco-editor package.
      const monaco = await loader.init();
      if (disposed || !containerRef.current) return;
      monacoRef.current = monaco;
      configureMonaco(monaco);

      const editor = monaco.editor.create(containerRef.current, {
        ...toEditorOptions(settings),
        value: code,
        language,
        theme: monacoTheme,
        fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly,
        rulers: [80, 120],
      });
      editorRef.current = editor;

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
        handlersRef.current.save()
      );
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
        handlersRef.current.execute()
      );
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () =>
        handlersRef.current.analyze()
      );

      const subscription = editor.onDidChangeModelContent(() => {
        const newCode = editor.getValue();
        setCode(newCode);
        setHasUnsavedChanges(true);
        onCodeChangeRef.current?.(newCode);

        if (autoSave) {
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => autoSaveRef.current(newCode), 2000);
        }
      });

      cleanup = () => {
        subscription.dispose();
        editor.dispose();
        editorRef.current = null;
      };
    };

    void init();

    return () => {
      disposed = true;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      cleanup?.();
    };
    // The editor is created once; later changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  useEffect(() => {
    editorRef.current?.updateOptions(toEditorOptions(settings));
  }, [settings]);

  const handleReset = useCallback(() => {
    // eslint-disable-next-line no-alert -- destructive action needs explicit confirmation
    if (window.confirm('Are you sure you want to reset the code? All unsaved changes will be lost.')) {
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
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        setCode(content);
        editorRef.current?.setValue(content);
        setHasUnsavedChanges(true);
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleShare = useCallback(async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'C++ Code Snippet',
          text: 'Check out this C++ code:',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => editorRef.current?.layout(), 100);
  }, []);

  const getExecutionStatus = () => {
    if (isExecuting) return { icon: Loader2, text: 'Executing...', className: 'text-blue-600 animate-spin' };
    if (executionResult?.success) return { icon: CheckCircle, text: 'Success', className: 'text-green-600' };
    if (executionResult && !executionResult.success) return { icon: AlertCircle, text: 'Error', className: 'text-red-600' };
    return null;
  };

  const getAnalysisStatus = () => {
    if (isAnalyzing) return { icon: Loader2, text: 'Analyzing...', className: 'text-blue-600 animate-spin' };
    if (analysisResult && analysisResult.issues.length === 0) {
      return { icon: CheckCircle, text: 'No Issues', className: 'text-green-600' };
    }
    if (analysisResult && analysisResult.issues.length > 0) {
      return {
        icon: AlertCircle,
        text: `${analysisResult.issues.length} Issues`,
        className: 'text-yellow-600',
      };
    }
    return null;
  };

  const executionStatus = getExecutionStatus();
  const analysisStatus = getAnalysisStatus();

  return (
    <div
      className={`
      flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
      ${isFullscreen ? 'fixed inset-0 z-50' : ''}
    `}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {/* Run button */}
            <button
              onClick={() => void handleExecute()}
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
              onClick={() => void handleAnalyze()}
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
              onClick={() => void handleShare()}
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
        {(showOutput || showAnalysis) && (
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
            </div>
          </div>
        )}
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
};

export default CodeEditor;