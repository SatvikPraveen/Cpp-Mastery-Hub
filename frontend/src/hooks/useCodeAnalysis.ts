// File: frontend/src/hooks/useCodeAnalysis.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';

export interface CodeIssue {
  id: string;
  rule_id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  category: 'memory_management' | 'performance' | 'style' | 'security' | 'best_practices' | 'modern_cpp';
  line: number;
  column: number;
  suggestion?: string;
  fix?: {
    description: string;
    before: string;
    after: string;
  };
}

export interface CodeMetrics {
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  function_count: number;
  class_count: number;
  complexity_indicators: number;
  comment_ratio: number;
  complexity_density: number;
}

export interface ComplexityAnalysis {
  cyclomatic_complexity: number;
  cognitive_complexity: number;
  max_nesting_depth: number;
  maintainability_index: number;
}

export interface AnalysisSuggestion {
  type: 'refactoring' | 'optimization' | 'modernization' | 'security';
  description: string;
  confidence: number;
  before_code?: string;
  after_code?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AnalysisResult {
  success: boolean;
  issues: CodeIssue[];
  metrics: CodeMetrics;
  complexity: ComplexityAnalysis;
  suggestions: AnalysisSuggestion[];
  overall_score: number;
  analysis_time_ms: number;
  error_message?: string;
}

export interface AnalysisOptions {
  min_severity?: 'low' | 'medium' | 'high';
  disabled_categories?: string[];
  disabled_rules?: string[];
  enable_suggestions?: boolean;
  enable_fixes?: boolean;
}

interface UseCodeAnalysisReturn {
  // State
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  
  // Actions
  analyzeCode: (code: string, options?: AnalysisOptions) => Promise<void>;
  clearResult: () => void;
  
  // Utilities
  getIssuesByCategory: (category: string) => CodeIssue[];
  getIssuesBySeverity: (severity: string) => CodeIssue[];
  getFilteredIssues: (filters: { category?: string; severity?: string }) => CodeIssue[];
  getTotalIssueCount: () => number;
  getScoreColor: (score: number) => string;
  getComplexityLevel: (complexity: number) => 'low' | 'medium' | 'high';
}

export const useCodeAnalysis = (): UseCodeAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const analyzeCode = useCallback(async (code: string, options: AnalysisOptions = {}) => {
    // Cancel any existing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setIsAnalyzing(true);
      setError(null);

      // Validate input
      if (!code.trim()) {
        throw new Error('Code cannot be empty');
      }

      if (code.length > 50000) {
        throw new Error('Code is too large for analysis (max 50,000 characters)');
      }

      // Prepare analysis request
      const analysisRequest = {
        code: code.trim(),
        language: 'cpp',
        options: {
          min_severity: options.min_severity || 'low',
          disabled_categories: options.disabled_categories || [],
          disabled_rules: options.disabled_rules || [],
          enable_suggestions: options.enable_suggestions !== false,
          enable_fixes: options.enable_fixes !== false
        }
      };

      // Call analysis API
      const response = await apiService.post<AnalysisResult>('/code/analyze', analysisRequest, {
        signal: abortControllerRef.current.signal,
        timeout: 30000 // 30 second timeout
      });

      if (response.success && response.data) {
        setResult(response.data);
        
        // Track analysis event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('codeAnalysisComplete', {
            detail: {
              issueCount: response.data.issues.length,
              score: response.data.overall_score,
              complexity: response.data.complexity.cyclomatic_complexity
            }
          }));
        }
      } else {
        throw new Error(response.message || 'Analysis failed');
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Analysis was cancelled, don't set error
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Code analysis failed';
      setError(errorMessage);
      setResult(null);

      console.error('Code analysis error:', err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    
    // Cancel any ongoing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const getIssuesByCategory = useCallback((category: string): CodeIssue[] => {
    if (!result) return [];
    return result.issues.filter(issue => issue.category === category);
  }, [result]);

  const getIssuesBySeverity = useCallback((severity: string): CodeIssue[] => {
    if (!result) return [];
    return result.issues.filter(issue => issue.severity === severity);
  }, [result]);

  const getFilteredIssues = useCallback((filters: { category?: string; severity?: string }): CodeIssue[] => {
    if (!result) return [];
    
    return result.issues.filter(issue => {
      if (filters.category && issue.category !== filters.category) return false;
      if (filters.severity && issue.severity !== filters.severity) return false;
      return true;
    });
  }, [result]);

  const getTotalIssueCount = useCallback((): number => {
    return result?.issues.length || 0;
  }, [result]);

  const getScoreColor = useCallback((score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }, []);

  const getComplexityLevel = useCallback((complexity: number): 'low' | 'medium' | 'high' => {
    if (complexity <= 5) return 'low';
    if (complexity <= 10) return 'medium';
    return 'high';
  }, []);

  return {
    // State
    isAnalyzing,
    result,
    error,
    
    // Actions
    analyzeCode,
    clearResult,
    
    // Utilities
    getIssuesByCategory,
    getIssuesBySeverity,
    getFilteredIssues,
    getTotalIssueCount,
    getScoreColor,
    getComplexityLevel
  };
};

// Hook for real-time analysis with debouncing
export const useRealtimeCodeAnalysis = (
  code: string,
  options: AnalysisOptions & { debounceMs?: number; autoAnalyze?: boolean } = {}
): UseCodeAnalysisReturn & { isDebouncing: boolean } => {
  const { debounceMs = 1000, autoAnalyze = true, ...analysisOptions } = options;
  const [isDebouncing, setIsDebouncing] = useState(false);
  const analysis = useCodeAnalysis();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!autoAnalyze || !code.trim()) {
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
      await analysis.analyzeCode(code, analysisOptions);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsDebouncing(false);
    };
  }, [code, debounceMs, autoAnalyze, analysisOptions, analysis.analyzeCode]);

  return {
    ...analysis,
    isDebouncing
  };
};

// Hook for batch analysis of multiple code snippets
export const useBatchCodeAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const analyzeBatch = useCallback(async (
    codeSnippets: Array<{ id: string; code: string; options?: AnalysisOptions }>
  ) => {
    setIsAnalyzing(true);
    const newResults = new Map<string, AnalysisResult>();
    const newErrors = new Map<string, string>();

    try {
      // Analyze snippets in parallel with a concurrency limit
      const concurrencyLimit = 3;
      const chunks = [];
      
      for (let i = 0; i < codeSnippets.length; i += concurrencyLimit) {
        chunks.push(codeSnippets.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async ({ id, code, options = {} }) => {
          try {
            const response = await apiService.post<AnalysisResult>('/code/analyze', {
              code: code.trim(),
              language: 'cpp',
              options
            });

            if (response.success && response.data) {
              newResults.set(id, response.data);
            } else {
              newErrors.set(id, response.message || 'Analysis failed');
            }
          } catch (error: any) {
            newErrors.set(id, error.response?.data?.message || error.message || 'Analysis failed');
          }
        });

        await Promise.all(promises);
      }

    } catch (error: any) {
      console.error('Batch analysis error:', error);
    } finally {
      setResults(newResults);
      setErrors(newErrors);
      setIsAnalyzing(false);
    }
  }, []);

  const getResult = useCallback((id: string): AnalysisResult | null => {
    return results.get(id) || null;
  }, [results]);

  const getError = useCallback((id: string): string | null => {
    return errors.get(id) || null;
  }, [errors]);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setErrors(new Map());
  }, []);

  return {
    isAnalyzing,
    results: results,
    errors: errors,
    analyzeBatch,
    getResult,
    getError,
    clearResults
  };
};

// Hook for analysis history and comparison
export const useAnalysisHistory = () => {
  const [history, setHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    code: string;
    result: AnalysisResult;
  }>>([]);

  const addToHistory = useCallback((code: string, result: AnalysisResult) => {
    const entry = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      code,
      result
    };

    setHistory(prev => [entry, ...prev.slice(0, 9)]); // Keep last 10 entries
  }, []);

  const compareWithPrevious = useCallback((currentResult: AnalysisResult) => {
    if (history.length === 0) return null;

    const previous = history[0].result;
    return {
      scoreChange: currentResult.overall_score - previous.overall_score,
      issueCountChange: currentResult.issues.length - previous.issues.length,
      complexityChange: currentResult.complexity.cyclomatic_complexity - previous.complexity.cyclomatic_complexity,
      newIssues: currentResult.issues.filter(issue => 
        !previous.issues.some(prevIssue => 
          prevIssue.rule_id === issue.rule_id && 
          prevIssue.line === issue.line
        )
      ),
      resolvedIssues: previous.issues.filter(prevIssue => 
        !currentResult.issues.some(issue => 
          issue.rule_id === prevIssue.rule_id && 
          issue.line === prevIssue.line
        )
      )
    };
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    compareWithPrevious,
    clearHistory
  };
};

export default useCodeAnalysis;