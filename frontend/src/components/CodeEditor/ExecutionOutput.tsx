// File: frontend/src/components/CodeEditor/ExecutionOutput.tsx
// Extension: .tsx

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MemoryStick, 
  Terminal,
  AlertTriangle,
  Copy,
  Download,
  RotateCcw,
  Loader2
} from 'lucide-react';

interface ExecutionResult {
  success: boolean;
  output: string;
  error: string;
  executionTime: number;
  memoryUsed: number;
  exitCode: number;
  compilationOutput?: string;
  warnings?: string[];
}

interface ExecutionHistoryItem {
  id: string;
  timestamp: Date;
  result: ExecutionResult;
  code: string;
}

interface ExecutionOutputProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
  history?: ExecutionHistoryItem[];
  onRerun?: () => void;
}

const ExecutionOutput: React.FC<ExecutionOutputProps> = ({
  result,
  isExecuting,
  history = [],
  onRerun
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'error' | 'compilation' | 'history'>('output');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Auto-switch to error tab if there's an error
  useEffect(() => {
    if (result && !result.success && result.error) {
      setActiveTab('error');
    } else if (result && result.success) {
      setActiveTab('output');
    }
  }, [result]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
  };

  const tabs = [
    { id: 'output', label: 'Output', icon: Terminal },
    { id: 'error', label: 'Errors', icon: XCircle, badge: result?.error ? 1 : 0 },
    { id: 'compilation', label: 'Compilation', icon: AlertTriangle, badge: result?.warnings?.length || 0 },
    { id: 'history', label: 'History', icon: Clock, badge: history.length }
  ] as const;

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Executing code...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result && history.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Terminal className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No execution results yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Click the Run button to execute your code
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with execution stats */}
      {result && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                result.success 
                  ? 'text-green-700 dark:text-green-400' 
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {result.success ? 'Execution Successful' : 'Execution Failed'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {onRerun && (
                <button
                  onClick={onRerun}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded transition-colors duration-200"
                  title="Rerun"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Execution metrics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {formatTime(result.executionTime)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {formatMemory(result.memoryUsed)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Exit: {result.exitCode}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full px-2 py-0.5">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'output' && (
          <div className="p-4">
            {result?.output ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Program Output
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(result.output, 'output')}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded transition-colors duration-200"
                      title="Copy output"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(result.output, 'output.txt')}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded transition-colors duration-200"
                      title="Download output"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto">
                  {result.output}
                </pre>
                {copiedText === 'output' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Output copied to clipboard!
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Terminal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No output generated</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'error' && (
          <div className="p-4">
            {result?.error ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                    Error Output
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(result.error, 'error')}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded transition-colors duration-200"
                      title="Copy error"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto text-red-800 dark:text-red-300">
                  {result.error}
                </pre>
                {copiedText === 'error' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Error copied to clipboard!
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No errors</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compilation' && (
          <div className="p-4">
            {result?.compilationOutput || result?.warnings?.length ? (
              <div className="space-y-4">
                {result.compilationOutput && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Compilation Output
                      </h4>
                      <button
                        onClick={() => handleCopy(result.compilationOutput!, 'compilation')}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded transition-colors duration-200"
                        title="Copy compilation output"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto">
                      {result.compilationOutput}
                    </pre>
                  </div>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                      Warnings ({result.warnings.length})
                    </h4>
                    <div className="space-y-2">
                      {result.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg"
                        >
                          <pre className="text-sm font-mono text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">
                            {warning}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {copiedText === 'compilation' && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Compilation output copied to clipboard!
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No compilation issues</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4">
            {history.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Execution History
                </h4>
                {history.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {item.result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatTime(item.result.executionTime)}</span>
                        <span>{formatMemory(item.result.memoryUsed)}</span>
                      </div>
                    </div>
                    
                    {item.result.output && (
                      <div className="mt-2">
                        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-auto max-h-20">
                          {item.result.output.slice(0, 200)}
                          {item.result.output.length > 200 && '...'}
                        </pre>
                      </div>
                    )}
                    
                    {item.result.error && (
                      <div className="mt-2">
                        <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded text-xs font-mono overflow-auto max-h-20 text-red-800 dark:text-red-300">
                          {item.result.error.slice(0, 200)}
                          {item.result.error.length > 200 && '...'}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                
                {history.length > 10 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Showing 10 most recent executions
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No execution history</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionOutput;