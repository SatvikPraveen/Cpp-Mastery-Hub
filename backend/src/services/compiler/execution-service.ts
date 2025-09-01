# File: backend/src/services/compiler/execution-service.ts
# Extension: .ts

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import axios from 'axios';

import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';
import { SandboxService } from './sandbox';
import { QueueService } from './queue';
import { CacheService } from '../cache-service';
import { config } from '../../config';

interface ExecutionRequest {
  code: string;
  language: string;
  input?: string;
  compilerFlags?: string[];
  timeout?: number;
  userId?: string;
}

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

interface ExecutionStats {
  language: string;
  success: boolean;
  executionTime: number;
  memoryUsed: number;
}

export class CodeExecutionService {
  private sandboxService = new SandboxService();
  private queueService = new QueueService();
  private cacheService = new CacheService();
  private cppEngineUrl = config.cppEngineUrl || 'http://localhost:9000';

  constructor() {
    this.initializeQueue();
  }

  /**
   * Execute code with proper sandboxing and resource limits
   */
  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const executionId = uuidv4();
    
    try {
      logger.info('Code execution started', { 
        executionId, 
        userId: request.userId,
        language: request.language,
        codeLength: request.code.length
      });

      // Validate request
      this.validateExecutionRequest(request);

      // Check cache for identical executions
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached execution result', { executionId, cacheKey });
        return cachedResult;
      }

      // Add to execution queue for rate limiting and resource management
      await this.queueService.addToQueue(executionId, request);

      // Execute based on language and environment
      let result: ExecutionResult;
      
      if (this.isCppLanguage(request.language)) {
        result = await this.executeCppCode(request, executionId);
      } else {
        throw new ApiError(400, `Unsupported language: ${request.language}`);
      }

      // Cache successful results for a short time
      if (result.success) {
        await this.cacheResult(cacheKey, result);
      }

      // Track execution statistics
      await this.trackExecution(request.userId, {
        language: request.language,
        success: result.success,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed
      });

      logger.info('Code execution completed', { 
        executionId,
        success: result.success,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed
      });

      return result;

    } catch (error) {
      logger.error('Code execution failed', { executionId, error, userId: request.userId });
      
      // Return error result instead of throwing
      return {
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime: 0,
        memoryUsed: 0,
        exitCode: -1
      };
    } finally {
      // Cleanup queue
      await this.queueService.removeFromQueue(executionId);
    }
  }

  /**
   * Execute C++ code using the C++ engine service
   */
  private async executeCppCode(request: ExecutionRequest, executionId: string): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.cppEngineUrl}/execute`, {
        code: request.code,
        language: request.language,
        input: request.input || '',
        compilerFlags: request.compilerFlags || [],
        timeout: request.timeout || 10,
        executionId
      }, {
        timeout: (request.timeout || 10) * 1000 + 5000, // Add 5 seconds buffer
        headers: {
          'Content-Type': 'application/json',
          'X-Execution-ID': executionId
        }
      });

      return response.data;

    } catch (error) {
      if (error.response) {
        // C++ engine returned an error
        return {
          success: false,
          output: '',
          error: error.response.data.error || 'Compilation or execution failed',
          executionTime: 0,
          memoryUsed: 0,
          exitCode: error.response.data.exitCode || -1,
          compilationOutput: error.response.data.compilationOutput
        };
      } else if (error.code === 'ECONNREFUSED') {
        throw new ApiError(503, 'C++ execution engine is unavailable');
      } else {
        throw new ApiError(500, 'Failed to execute C++ code');
      }
    }
  }

  /**
   * Local C++ execution (fallback when engine is unavailable)
   */
  private async executeLocalCpp(request: ExecutionRequest, executionId: string): Promise<ExecutionResult> {
    const workDir = path.join('/tmp', executionId);
    const sourceFile = path.join(workDir, 'main.cpp');
    const binaryFile = path.join(workDir, 'main');
    
    try {
      // Create working directory
      await fs.mkdir(workDir, { recursive: true });
      
      // Write source code to file
      await fs.writeFile(sourceFile, request.code, 'utf8');

      // Compile the code
      const compileResult = await this.compileCode(sourceFile, binaryFile, request);
      
      if (!compileResult.success) {
        return {
          success: false,
          output: '',
          error: compileResult.error,
          executionTime: 0,
          memoryUsed: 0,
          exitCode: compileResult.exitCode,
          compilationOutput: compileResult.output
        };
      }

      // Execute the compiled binary
      const executionResult = await this.sandboxService.executeInSandbox(
        binaryFile,
        request.input || '',
        {
          timeout: request.timeout || 10,
          memoryLimit: 256 * 1024 * 1024, // 256MB
          workingDirectory: workDir
        }
      );

      return executionResult;

    } finally {
      // Cleanup temporary files
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup execution directory', { workDir, cleanupError });
      }
    }
  }

  /**
   * Compile C++ code
   */
  private async compileCode(sourceFile: string, binaryFile: string, request: ExecutionRequest) {
    return new Promise<{ success: boolean; output: string; error: string; exitCode: number }>((resolve) => {
      const compiler = this.getCompilerCommand(request.language);
      const flags = this.getCompilerFlags(request.language, request.compilerFlags);
      
      const args = [
        ...flags,
        sourceFile,
        '-o',
        binaryFile
      ];

      const compilerProcess = spawn(compiler, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000 // 30 second compile timeout
      });

      let stdout = '';
      let stderr = '';

      compilerProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      compilerProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      compilerProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: stderr,
          exitCode: code || 0
        });
      });

      compilerProcess.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message,
          exitCode: -1
        });
      });
    });
  }

  /**
   * Track execution statistics for analytics
   */
  async trackExecution(userId: string | undefined, stats: ExecutionStats): Promise<void> {
    try {
      if (!userId) return;

      // Store in database for analytics
      await this.storeExecutionStats(userId, stats);

      // Update user activity
      await this.updateUserActivity(userId);

    } catch (error) {
      logger.error('Failed to track execution', { userId, error });
      // Don't throw - tracking failures shouldn't affect execution
    }
  }

  /**
   * Get execution statistics for a user
   */
  async getUserExecutionStats(userId: string, timeframe?: string) {
    try {
      const cacheKey = `user_exec_stats:${userId}:${timeframe || 'all'}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate stats from database
      const stats = await this.calculateExecutionStats(userId, timeframe);
      
      // Cache for 1 hour
      await this.cacheService.setex(cacheKey, 3600, JSON.stringify(stats));
      
      return stats;

    } catch (error) {
      logger.error('Failed to get execution stats', { userId, error });
      throw error;
    }
  }

  /**
   * Validate execution request
   */
  private validateExecutionRequest(request: ExecutionRequest): void {
    if (!request.code || request.code.trim().length === 0) {
      throw new ApiError(400, 'Code cannot be empty');
    }

    if (request.code.length > 50000) {
      throw new ApiError(400, 'Code is too long (max 50,000 characters)');
    }

    if (!this.isSupportedLanguage(request.language)) {
      throw new ApiError(400, `Unsupported language: ${request.language}`);
    }

    if (request.input && request.input.length > 10000) {
      throw new ApiError(400, 'Input is too long (max 10,000 characters)');
    }

    if (request.timeout && (request.timeout < 1 || request.timeout > 30)) {
      throw new ApiError(400, 'Timeout must be between 1 and 30 seconds');
    }

    // Check for potentially dangerous code patterns
    this.checkForDangerousCode(request.code);
  }

  /**
   * Check for dangerous code patterns
   */
  private checkForDangerousCode(code: string): void {
    const dangerousPatterns = [
      /system\s*\(/gi,
      /exec\s*\(/gi,
      /popen\s*\(/gi,
      /#include\s*<\s*cstdlib\s*>/gi,
      /fork\s*\(/gi,
      /__asm/gi,
      /asm\s*\(/gi,
      /goto\s+\w+/gi // Excessive goto usage
    ];

    const foundDangerous = dangerousPatterns.some(pattern => pattern.test(code));
    
    if (foundDangerous) {
      logger.warn('Potentially dangerous code detected', { 
        codeSnippet: code.substring(0, 200) 
      });
      // For now, we'll allow but log. In production, might want to block or flag
    }
  }

  /**
   * Generate cache key for execution results
   */
  private generateCacheKey(request: ExecutionRequest): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({
        code: request.code,
        language: request.language,
        input: request.input,
        compilerFlags: request.compilerFlags
      }))
      .digest('hex');
    
    return `execution:${hash}`;
  }

  /**
   * Get cached execution result
   */
  private async getCachedResult(cacheKey: string): Promise<ExecutionResult | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Failed to get cached result', { cacheKey, error });
      return null;
    }
  }

  /**
   * Cache execution result
   */
  private async cacheResult(cacheKey: string, result: ExecutionResult): Promise<void> {
    try {
      // Cache for 5 minutes
      await this.cacheService.setex(cacheKey, 300, JSON.stringify(result));
    } catch (error) {
      logger.warn('Failed to cache result', { cacheKey, error });
    }
  }

  /**
   * Check if language is C++
   */
  private isCppLanguage(language: string): boolean {
    return ['cpp', 'c', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'].includes(language);
  }

  /**
   * Check if language is supported
   */
  private isSupportedLanguage(language: string): boolean {
    return this.isCppLanguage(language);
  }

  /**
   * Get compiler command for language
   */
  private getCompilerCommand(language: string): string {
    switch (language) {
      case 'c':
        return 'gcc';
      case 'cpp':
      case 'cpp11':
      case 'cpp14':
      case 'cpp17':
      case 'cpp20':
      case 'cpp23':
        return 'g++';
      default:
        throw new ApiError(400, `No compiler available for language: ${language}`);
    }
  }

  /**
   * Get compiler flags for language
   */
  private getCompilerFlags(language: string, userFlags: string[] = []): string[] {
    const baseFlags = ['-Wall', '-Wextra', '-O2'];
    
    const languageFlags: { [key: string]: string[] } = {
      'c': ['-std=c11'],
      'cpp': ['-std=c++17'],
      'cpp11': ['-std=c++11'],
      'cpp14': ['-std=c++14'],
      'cpp17': ['-std=c++17'],
      'cpp20': ['-std=c++20'],
      'cpp23': ['-std=c++23']
    };

    const flags = [...baseFlags, ...(languageFlags[language] || [])];
    
    // Add safe user flags
    const safeUserFlags = userFlags.filter(flag => this.isSafeCompilerFlag(flag));
    flags.push(...safeUserFlags);

    return flags;
  }

  /**
   * Check if compiler flag is safe
   */
  private isSafeCompilerFlag(flag: string): boolean {
    const allowedFlags = [
      '-O0', '-O1', '-O2', '-O3',
      '-g', '-Wall', '-Wextra', '-Werror',
      '-std=c++11', '-std=c++14', '-std=c++17', '-std=c++20', '-std=c++23',
      '-std=c11', '-std=c99',
      '-pedantic', '-pthread'
    ];

    return allowedFlags.includes(flag) || flag.startsWith('-D') || flag.startsWith('-I');
  }

  /**
   * Store execution statistics
   */
  private async storeExecutionStats(userId: string, stats: ExecutionStats): Promise<void> {
    try {
      // This would store in your analytics database
      // For now, we'll just log it
      logger.info('Execution stats', { userId, ...stats });
    } catch (error) {
      logger.error('Failed to store execution stats', { userId, error });
    }
  }

  /**
   * Update user activity timestamp
   */
  private async updateUserActivity(userId: string): Promise<void> {
    try {
      // Update last active timestamp
      // This would typically be done via a separate service
      logger.debug('User activity updated', { userId });
    } catch (error) {
      logger.error('Failed to update user activity', { userId, error });
    }
  }

  /**
   * Calculate execution statistics
   */
  private async calculateExecutionStats(userId: string, timeframe?: string) {
    // This would query your analytics database
    // Return mock data for now
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      languageBreakdown: {},
      executionsOverTime: []
    };
  }

  /**
   * Initialize execution queue
   */
  private initializeQueue(): void {
    this.queueService.on('execution:started', (executionId) => {
      logger.debug('Execution started', { executionId });
    });

    this.queueService.on('execution:completed', (executionId) => {
      logger.debug('Execution completed', { executionId });
    });
  }
}