# File: backend/src/services/analyzer/analysis-service.ts
# Extension: .ts

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';
import { CacheService } from '../cache-service';
import { config } from '../../config';

interface AnalysisRequest {
  code: string;
  language: string;
  analysisTypes: string[];
  userId?: string;
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'info' | 'style';
  severity: 'high' | 'medium' | 'low';
  line: number;
  column: number;
  message: string;
  rule: string;
  suggestion?: string;
}

interface CodeSuggestion {
  type: 'performance' | 'readability' | 'best_practice' | 'modern_cpp';
  title: string;
  description: string;
  line: number;
  originalCode: string;
  suggestedCode: string;
  impact: 'high' | 'medium' | 'low';
}

interface AnalysisResult {
  success: boolean;
  issues: AnalysisIssue[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics;
  complexity: ComplexityMetrics;
  analysisTime: number;
}

interface CodeMetrics {
  linesOfCode: number;
  functionsCount: number;
  classesCount: number;
  includesCount: number;
  commentsRatio: number;
  duplicatedLines: number;
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  maintainabilityIndex: number;
}

interface VisualizationRequest {
  code: string;
  type: 'ast' | 'memory' | 'execution_flow' | 'call_graph';
  userId?: string;
}

interface VisualizationData {
  type: string;
  data: any;
  metadata: {
    nodeCount: number;
    complexity: string;
    generatedAt: string;
  };
}

export class StaticAnalysisService {
  private cacheService = new CacheService();
  private cppEngineUrl = config.cppEngineUrl || 'http://localhost:9000';

  /**
   * Analyze C++ code for issues and improvements
   */
  async analyzeCode(request: AnalysisRequest): Promise<AnalysisResult> {
    const analysisId = uuidv4();
    
    try {
      logger.info('Static analysis started', {
        analysisId,
        userId: request.userId,
        language: request.language,
        analysisTypes: request.analysisTypes,
        codeLength: request.code.length
      });

      // Validate request
      this.validateAnalysisRequest(request);

      // Check cache for identical analysis
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached analysis result', { analysisId, cacheKey });
        return cachedResult;
      }

      // Perform analysis using C++ engine
      const result = await this.performAnalysis(request, analysisId);

      // Cache successful results
      if (result.success) {
        await this.cacheResult(cacheKey, result);
      }

      logger.info('Static analysis completed', {
        analysisId,
        success: result.success,
        issuesCount: result.issues.length,
        suggestionsCount: result.suggestions.length,
        analysisTime: result.analysisTime
      });

      return result;

    } catch (error) {
      logger.error('Static analysis failed', { analysisId, error, userId: request.userId });
      throw error;
    }
  }

  /**
   * Generate code visualization data
   */
  async generateVisualization(request: VisualizationRequest): Promise<VisualizationData> {
    const visualizationId = uuidv4();

    try {
      logger.info('Code visualization started', {
        visualizationId,
        userId: request.userId,
        type: request.type,
        codeLength: request.code.length
      });

      // Validate request
      this.validateVisualizationRequest(request);

      // Check cache
      const cacheKey = this.generateVisualizationCacheKey(request);
      const cachedResult = await this.getCachedVisualization(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached visualization', { visualizationId, cacheKey });
        return cachedResult;
      }

      // Generate visualization using C++ engine
      const result = await this.performVisualization(request, visualizationId);

      // Cache the result
      await this.cacheVisualization(cacheKey, result);

      logger.info('Code visualization completed', {
        visualizationId,
        type: request.type,
        nodeCount: result.metadata.nodeCount
      });

      return result;

    } catch (error) {
      logger.error('Code visualization failed', { visualizationId, error, userId: request.userId });
      throw error;
    }
  }

  /**
   * Track analysis statistics
   */
  async trackAnalysis(userId: string | undefined, stats: any): Promise<void> {
    try {
      if (!userId) return;

      // Store analysis statistics for user analytics
      await this.storeAnalysisStats(userId, stats);

    } catch (error) {
      logger.error('Failed to track analysis', { userId, error });
      // Don't throw - tracking failures shouldn't affect analysis
    }
  }

  /**
   * Get analysis suggestions for improvement
   */
  async getCodeSuggestions(code: string, language: string): Promise<CodeSuggestion[]> {
    try {
      const response = await axios.post(`${this.cppEngineUrl}/suggestions`, {
        code,
        language
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.suggestions || [];

    } catch (error) {
      logger.error('Failed to get code suggestions', { error });
      return [];
    }
  }

  /**
   * Perform static analysis using C++ engine
   */
  private async performAnalysis(request: AnalysisRequest, analysisId: string): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();

      const response = await axios.post(`${this.cppEngineUrl}/analyze`, {
        code: request.code,
        language: request.language,
        analysisTypes: request.analysisTypes,
        analysisId
      }, {
        timeout: 30000, // 30 seconds for analysis
        headers: {
          'Content-Type': 'application/json',
          'X-Analysis-ID': analysisId
        }
      });

      const analysisTime = Date.now() - startTime;

      return {
        ...response.data,
        analysisTime
      };

    } catch (error) {
      if (error.response) {
        // C++ engine returned an error
        return {
          success: false,
          issues: [],
          suggestions: [],
          metrics: this.getDefaultMetrics(),
          complexity: this.getDefaultComplexity(),
          analysisTime: 0
        };
      } else if (error.code === 'ECONNREFUSED') {
        throw new ApiError(503, 'Code analysis engine is unavailable');
      } else {
        throw new ApiError(500, 'Failed to analyze code');
      }
    }
  }

  /**
   * Perform local basic analysis (fallback)
   */
  private async performLocalAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      const issues: AnalysisIssue[] = [];
      const suggestions: CodeSuggestion[] = [];

      // Basic syntax checks
      if (request.analysisTypes.includes('syntax')) {
        issues.push(...this.performSyntaxAnalysis(request.code));
      }

      // Basic style checks
      if (request.analysisTypes.includes('style')) {
        issues.push(...this.performStyleAnalysis(request.code));
        suggestions.push(...this.performStyleSuggestions(request.code));
      }

      // Performance analysis
      if (request.analysisTypes.includes('performance')) {
        suggestions.push(...this.performPerformanceAnalysis(request.code));
      }

      // Calculate metrics
      const metrics = this.calculateCodeMetrics(request.code);
      const complexity = this.calculateComplexity(request.code);

      return {
        success: true,
        issues,
        suggestions,
        metrics,
        complexity,
        analysisTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Local analysis failed', { error });
      return {
        success: false,
        issues: [],
        suggestions: [],
        metrics: this.getDefaultMetrics(),
        complexity: this.getDefaultComplexity(),
        analysisTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform code visualization
   */
  private async performVisualization(request: VisualizationRequest, visualizationId: string): Promise<VisualizationData> {
    try {
      const response = await axios.post(`${this.cppEngineUrl}/visualize`, {
        code: request.code,
        type: request.type,
        visualizationId
      }, {
        timeout: 20000, // 20 seconds for visualization
        headers: {
          'Content-Type': 'application/json',
          'X-Visualization-ID': visualizationId
        }
      });

      return response.data;

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new ApiError(503, 'Visualization engine is unavailable');
      } else {
        throw new ApiError(500, 'Failed to generate visualization');
      }
    }
  }

  /**
   * Basic syntax analysis
   */
  private performSyntaxAnalysis(code: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for common syntax issues
      if (line.includes('=') && !line.includes('==') && !line.includes('!=') && line.includes('if')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          line: lineNumber,
          column: line.indexOf('='),
          message: 'Possible assignment in conditional statement',
          rule: 'assignment-in-condition',
          suggestion: 'Use == for comparison or wrap assignment in parentheses'
        });
      }

      // Check for missing semicolons (basic check)
      if (line.trim().length > 0 && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') && 
          !line.trim().endsWith('}') &&
          !line.trim().startsWith('#') &&
          !line.trim().startsWith('//')) {
        issues.push({
          type: 'error',
          severity: 'high',
          line: lineNumber,
          column: line.length,
          message: 'Missing semicolon',
          rule: 'missing-semicolon'
        });
      }
    });

    return issues;
  }

  /**
   * Basic style analysis
   */
  private performStyleAnalysis(code: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check line length
      if (line.length > 100) {
        issues.push({
          type: 'style',
          severity: 'low',
          line: lineNumber,
          column: 100,
          message: 'Line too long (>100 characters)',
          rule: 'line-length',
          suggestion: 'Break long lines for better readability'
        });
      }

      // Check for tabs vs spaces
      if (line.includes('\t')) {
        issues.push({
          type: 'style',
          severity: 'low',
          line: lineNumber,
          column: line.indexOf('\t'),
          message: 'Use spaces instead of tabs',
          rule: 'no-tabs'
        });
      }
    });

    return issues;
  }

  /**
   * Performance suggestions
   */
  private performPerformanceAnalysis(code: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for string concatenation in loops
      if (line.includes('string') && line.includes('+') && 
          (code.includes('for') || code.includes('while'))) {
        suggestions.push({
          type: 'performance',
          title: 'Use stringstream for string concatenation',
          description: 'String concatenation in loops can be inefficient',
          line: lineNumber,
          originalCode: line.trim(),
          suggestedCode: 'Consider using std::stringstream or std::string::reserve()',
          impact: 'medium'
        });
      }

      // Check for vector push_back without reserve
      if (line.includes('push_back') && !code.includes('reserve')) {
        suggestions.push({
          type: 'performance',
          title: 'Consider using vector::reserve()',
          description: 'Pre-allocating vector capacity can improve performance',
          line: lineNumber,
          originalCode: line.trim(),
          suggestedCode: 'Call vector.reserve(expected_size) before push_back operations',
          impact: 'medium'
        });
      }
    });

    return suggestions;
  }

  /**
   * Style suggestions
   */
  private performStyleSuggestions(code: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Check for modern C++ features
    if (code.includes('NULL') && !code.includes('nullptr')) {
      suggestions.push({
        type: 'modern_cpp',
        title: 'Use nullptr instead of NULL',
        description: 'nullptr is type-safe and preferred in modern C++',
        line: 0,
        originalCode: 'NULL',
        suggestedCode: 'nullptr',
        impact: 'low'
      });
    }

    if (code.includes('auto ') < code.split('=').length / 2) {
      suggestions.push({
        type: 'modern_cpp',
        title: 'Consider using auto for type deduction',
        description: 'Auto can make code more readable and maintainable',
        line: 0,
        originalCode: 'explicit type declarations',
        suggestedCode: 'Use auto where appropriate',
        impact: 'low'
      });
    }

    return suggestions;
  }

  /**
   * Calculate basic code metrics
   */
  private calculateCodeMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    return {
      linesOfCode: nonEmptyLines.length,
      functionsCount: (code.match(/\w+\s*\([^)]*\)\s*{/g) || []).length,
      classesCount: (code.match(/class\s+\w+/g) || []).length,
      includesCount: (code.match(/#include/g) || []).length,
      commentsRatio: ((code.match(/\/\/|\/\*|\*\//g) || []).length / lines.length) * 100,
      duplicatedLines: 0 // Would need more sophisticated analysis
    };
  }

  /**
   * Calculate basic complexity metrics
   */
  private calculateComplexity(code: string): ComplexityMetrics {
    // Basic cyclomatic complexity calculation
    const decisionPoints = (code.match(/if|else|while|for|case|&&|\|\||\?/g) || []).length;
    
    return {
      cyclomaticComplexity: decisionPoints + 1,
      cognitiveComplexity: decisionPoints * 1.2, // Simplified calculation
      nestingDepth: this.calculateNestingDepth(code),
      maintainabilityIndex: Math.max(0, 171 - 5.2 * Math.log(nonEmptyLines.length) - 0.23 * decisionPoints)
    };
  }

  /**
   * Calculate nesting depth
   */
  private calculateNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  /**
   * Generate cache key for analysis
   */
  private generateCacheKey(request: AnalysisRequest): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({
        code: request.code,
        language: request.language,
        analysisTypes: request.analysisTypes.sort()
      }))
      .digest('hex');
    
    return `analysis:${hash}`;
  }

  /**
   * Generate cache key for visualization
   */
  private generateVisualizationCacheKey(request: VisualizationRequest): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({
        code: request.code,
        type: request.type
      }))
      .digest('hex');
    
    return `visualization:${hash}`;
  }

  /**
   * Validate analysis request
   */
  private validateAnalysisRequest(request: AnalysisRequest): void {
    if (!request.code || request.code.trim().length === 0) {
      throw new ApiError(400, 'Code cannot be empty');
    }

    if (request.code.length > 50000) {
      throw new ApiError(400, 'Code is too long (max 50,000 characters)');
    }

    const validAnalysisTypes = ['syntax', 'semantic', 'performance', 'security', 'style', 'complexity'];
    const invalidTypes = request.analysisTypes.filter(type => !validAnalysisTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      throw new ApiError(400, `Invalid analysis types: ${invalidTypes.join(', ')}`);
    }
  }

  /**
   * Validate visualization request
   */
  private validateVisualizationRequest(request: VisualizationRequest): void {
    if (!request.code || request.code.trim().length === 0) {
      throw new ApiError(400, 'Code cannot be empty');
    }

    const validTypes = ['ast', 'memory', 'execution_flow', 'call_graph'];
    if (!validTypes.includes(request.type)) {
      throw new ApiError(400, `Invalid visualization type: ${request.type}`);
    }
  }

  // Cache and utility methods
  private async getCachedResult(cacheKey: string): Promise<AnalysisResult | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  private async cacheResult(cacheKey: string, result: AnalysisResult): Promise<void> {
    try {
      await this.cacheService.setex(cacheKey, 1800, JSON.stringify(result)); // 30 minutes
    } catch (error) {
      logger.warn('Failed to cache analysis result', { error });
    }
  }

  private async getCachedVisualization(cacheKey: string): Promise<VisualizationData | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  private async cacheVisualization(cacheKey: string, result: VisualizationData): Promise<void> {
    try {
      await this.cacheService.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour
    } catch (error) {
      logger.warn('Failed to cache visualization', { error });
    }
  }

  private getDefaultMetrics(): CodeMetrics {
    return {
      linesOfCode: 0,
      functionsCount: 0,
      classesCount: 0,
      includesCount: 0,
      commentsRatio: 0,
      duplicatedLines: 0
    };
  }

  private getDefaultComplexity(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 1,
      cognitiveComplexity: 1,
      nestingDepth: 0,
      maintainabilityIndex: 100
    };
  }

  private async storeAnalysisStats(userId: string, stats: any): Promise<void> {
    // Implementation for storing analysis statistics
    logger.info('Analysis stats tracked', { userId, ...stats });
  }
}