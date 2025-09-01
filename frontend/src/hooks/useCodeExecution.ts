// File: frontend/src/hooks/useCodeExecution.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

export interface ExecutionResult {
  id?: string;
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  exitCode: number;
  input?: string;
  language: string;
  version?: string;
  timestamp: Date;
}

export interface ExecutionOptions {
  input?: string;
  timeout?: number; // in seconds
  memoryLimit?: number; // in MB
  language?: string;
  version?: string;
  saveResult?: boolean;
}

export interface ExecutionHistory {
  id: string;
  code: string;
  result: ExecutionResult;
  timestamp: Date;
}

interface UseCodeExecutionReturn {
  // State
  isExecuting: boolean;
  result: ExecutionResult | null;
  error: string | null;
  history: ExecutionHistory[];
  
  // Actions
  executeCode: (code: string, options?: ExecutionOptions) => Promise<ExecutionResult>;
  stopExecution: () => void;
  clearResult: () => void;
  clearHistory: () => void;
  saveToHistory: (code: string, result: ExecutionResult) => void;
  
  // Utilities
  getExecutionStatus: () => 'idle' | 'running' | 'completed' | 'error';
  isSuccessful: (result?: ExecutionResult) => boolean;
  formatExecutionTime: (timeMs: number) => string;
  formatMemoryUsage: (bytes?: number) => string;
  getLanguageDisplayName: (language: string) => string;
  downloadResult: (result: ExecutionResult, filename?: string) => void;
}

export const useCodeExecution = (): UseCodeExecutionReturn => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const executionStartTimeRef = useRef<number>(0);

  // Load history from storage on mount
  useEffect(() => {
    const savedHistory = storageService.getLocal('code_execution_history', []);
    setHistory(savedHistory);
  }, []);

  // Save history to storage when it changes
  useEffect(() => {
    storageService.setLocal('code_execution_history', history);
  }, [history]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const executeCode = useCallback(async (code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> => {
    // Cancel any existing execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setIsExecuting(true);
      setError(null);
      executionStartTimeRef.current = Date.now();

      // Validate input
      if (!code.trim()) {
        throw new Error('Code cannot be empty');
      }

      if (code.length > 100000) {
        throw new Error('Code is too large for execution (max 100,000 characters)');
      }

      // Prepare execution request
      const executionRequest = {
        code: code.trim(),
        language: options.language || 'cpp',
        input: options.input || '',
        timeout: options.timeout || 30, // 30 seconds default
        memoryLimit: options.memoryLimit || 128, // 128MB default
        version: options.version
      };

      // Call execution API
      const response = await apiService.post<ExecutionResult>('/code/execute', executionRequest, {
        signal: abortControllerRef.current.signal,
        timeout: (options.timeout || 30) * 1000 + 5000 // Add 5s buffer
      });

      if (response.success && response.data) {
        const executionResult: ExecutionResult = {
          ...response.data,
          timestamp: new Date(),
          executionTime: response.data.executionTime || (Date.now() - executionStartTimeRef.current)
        };

        setResult(executionResult);

        // Save to history if requested
        if (options.saveResult !== false) {
          saveToHistory(code, executionResult);
        }

        // Track execution event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('codeExecutionComplete', {
            detail: {
              language: executionRequest.language,
              executionTime: executionResult.executionTime,
              success: executionResult.exitCode === 0,
              hasOutput: !!executionResult.output,
              hasError: !!executionResult.error
            }
          }));
        }

        return executionResult;
      } else {
        throw new Error(response.message || 'Code execution failed');
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Execution was cancelled
        const cancelledResult: ExecutionResult = {
          error: 'Execution cancelled by user',
          executionTime: Date.now() - executionStartTimeRef.current,
          exitCode: -1,
          language: options.language || 'cpp',
          timestamp: new Date()
        };
        setResult(cancelledResult);
        return cancelledResult;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Code execution failed';
      setError(errorMessage);
      
      const errorResult: ExecutionResult = {
        error: errorMessage,
        executionTime: Date.now() - executionStartTimeRef.current,
        exitCode: -1,
        language: options.language || 'cpp',
        timestamp: new Date()
      };
      
      setResult(errorResult);
      console.error('Code execution error:', err);
      return errorResult;

    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    
    // Cancel any ongoing execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    storageService.removeLocal('code_execution_history');
  }, []);

  const saveToHistory = useCallback((code: string, executionResult: ExecutionResult) => {
    const historyEntry: ExecutionHistory = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code,
      result: executionResult,
      timestamp: new Date()
    };

    setHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
  }, []);

  const getExecutionStatus = useCallback((): 'idle' | 'running' | 'completed' | 'error' => {
    if (isExecuting) return 'running';
    if (error) return 'error';
    if (result) return 'completed';
    return 'idle';
  }, [isExecuting, error, result]);

  const isSuccessful = useCallback((executionResult?: ExecutionResult): boolean => {
    const targetResult = executionResult || result;
    return targetResult ? targetResult.exitCode === 0 && !targetResult.error : false;
  }, [result]);

  const formatExecutionTime = useCallback((timeMs: number): string => {
    if (timeMs < 1000) {
      return `${timeMs}ms`;
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(timeMs / 60000);
      const seconds = ((timeMs % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }, []);

  const formatMemoryUsage = useCallback((bytes?: number): string => {
    if (!bytes) return 'N/A';
    
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }, []);

  const getLanguageDisplayName = useCallback((language: string): string => {
    const languageNames: Record<string, string> = {
      'cpp': 'C++',
      'c': 'C',
      'javascript': 'JavaScript',
      'python': 'Python',
      'java': 'Java',
      'typescript': 'TypeScript',
      'rust': 'Rust',
      'go': 'Go',
      'csharp': 'C#'
    };
    
    return languageNames[language.toLowerCase()] || language.toUpperCase();
  }, []);

  const downloadResult = useCallback((executionResult: ExecutionResult, filename?: string) => {
    const resultData = {
      timestamp: executionResult.timestamp,
      language: executionResult.language,
      executionTime: executionResult.executionTime,
      exitCode: executionResult.exitCode,
      output: executionResult.output,
      error: executionResult.error,
      input: executionResult.input,
      memoryUsed: executionResult.memoryUsed
    };

    const content = JSON.stringify(resultData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `execution_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    // State
    isExecuting,
    result,
    error,
    history,
    
    // Actions
    executeCode,
    stopExecution,
    clearResult,
    clearHistory,
    saveToHistory,
    
    // Utilities
    getExecutionStatus,
    isSuccessful,
    formatExecutionTime,
    formatMemoryUsage,
    getLanguageDisplayName,
    downloadResult
  };
};

// Hook for batch code execution
export const useBatchCodeExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const executeBatch = useCallback(async (
    codeItems: Array<{ id: string; code: string; options?: ExecutionOptions }>
  ) => {
    setIsExecuting(true);
    setProgress({ completed: 0, total: codeItems.length });
    const newResults = new Map<string, ExecutionResult>();
    const newErrors = new Map<string, string>();

    try {
      // Execute items sequentially to avoid overwhelming the server
      for (let i = 0; i < codeItems.length; i++) {
        const { id, code, options = {} } = codeItems[i];
        
        try {
          const response = await apiService.post<ExecutionResult>('/code/execute', {
            code: code.trim(),
            language: options.language || 'cpp',
            input: options.input || '',
            timeout: options.timeout || 30
          });

          if (response.success && response.data) {
            newResults.set(id, {
              ...response.data,
              timestamp: new Date()
            });
          } else {
            newErrors.set(id, response.message || 'Execution failed');
          }
        } catch (error: any) {
          newErrors.set(id, error.response?.data?.message || error.message || 'Execution failed');
        }

        setProgress({ completed: i + 1, total: codeItems.length });
      }

    } catch (error: any) {
      console.error('Batch execution error:', error);
    } finally {
      setResults(newResults);
      setErrors(newErrors);
      setIsExecuting(false);
    }
  }, []);

  const getResult = useCallback((id: string): ExecutionResult | null => {
    return results.get(id) || null;
  }, [results]);

  const getError = useCallback((id: string): string | null => {
    return errors.get(id) || null;
  }, [errors]);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setErrors(new Map());
    setProgress({ completed: 0, total: 0 });
  }, []);

  return {
    isExecuting,
    results,
    errors,
    progress,
    executeBatch,
    getResult,
    getError,
    clearResults
  };
};

// Hook for real-time execution with debouncing
export const useRealtimeExecution = (
  code: string,
  options: ExecutionOptions & { debounceMs?: number; autoExecute?: boolean } = {}
): UseCodeExecutionReturn & { isDebouncing: boolean } => {
  const { debounceMs = 2000, autoExecute = false, ...executionOptions } = options;
  const [isDebouncing, setIsDebouncing] = useState(false);
  const execution = useCodeExecution();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!autoExecute || !code.trim()) {
      setIsDebouncing(false);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsDebouncing(true);

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      setIsDebouncing(false);
      await execution.executeCode(code, executionOptions);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsDebouncing(false);
    };
  }, [code, debounceMs, autoExecute, executionOptions, execution.executeCode]);

  return {
    ...execution,
    isDebouncing
  };
};

// Hook for execution metrics and analytics
export const useExecutionMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalExecutions: 0,
    successfulExecutions: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    languageStats: {} as Record<string, number>,
    errorStats: {} as Record<string, number>
  });

  const updateMetrics = useCallback((result: ExecutionResult) => {
    setMetrics(prev => {
      const newMetrics = { ...prev };
      
      newMetrics.totalExecutions++;
      newMetrics.totalExecutionTime += result.executionTime;
      newMetrics.averageExecutionTime = newMetrics.totalExecutionTime / newMetrics.totalExecutions;
      
      if (result.exitCode === 0 && !result.error) {
        newMetrics.successfulExecutions++;
      }
      
      // Update language stats
      newMetrics.languageStats[result.language] = (newMetrics.languageStats[result.language] || 0) + 1;
      
      // Update error stats
      if (result.error) {
        const errorType = result.error.split(':')[0] || 'Unknown';
        newMetrics.errorStats[errorType] = (newMetrics.errorStats[errorType] || 0) + 1;
      }
      
      return newMetrics;
    });
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      totalExecutions: 0,
      successfulExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      languageStats: {},
      errorStats: {}
    });
  }, []);

  const getSuccessRate = useCallback(() => {
    return metrics.totalExecutions > 0 
      ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 
      : 0;
  }, [metrics]);

  return {
    metrics,
    updateMetrics,
    resetMetrics,
    getSuccessRate
  };
};

export default useCodeExecution;