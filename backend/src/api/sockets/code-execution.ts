// File: backend/src/api/sockets/code-execution.ts
// Extension: .ts (TypeScript Socket Handler)

import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { createRateLimit } from '../middleware/rateLimit';
import { createComponentLogger } from '../middleware/logging';

interface ExecutionRequest {
  id: string;
  userId: string;
  code: string;
  language: string;
  input?: string;
  options?: {
    timeout?: number;
    memoryLimit?: number;
    optimization?: string;
    standard?: string;
    warnings?: boolean;
    debug?: boolean;
  };
  timestamp: string;
}

interface ExecutionResult {
  id: string;
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsage: number;
  exitCode?: number;
  warnings?: string[];
  compilationTime?: number;
  timestamp: string;
}

interface AnalysisRequest {
  id: string;
  userId: string;
  code: string;
  language: string;
  analysisType: 'static' | 'complexity' | 'security' | 'performance' | 'full';
  timestamp: string;
}

interface AnalysisResult {
  id: string;
  success: boolean;
  analysis?: {
    complexity: {
      cyclomatic: number;
      cognitive: number;
      lines: number;
      functions: number;
    };
    metrics: {
      linesOfCode: number;
      blankLines: number;
      commentLines: number;
      codeToCommentRatio: number;
    };
    issues: Array<{
      type: 'error' | 'warning' | 'suggestion' | 'style';
      line: number;
      column: number;
      message: string;
      severity: 'high' | 'medium' | 'low';
      category: string;
      rule?: string;
    }>;
    suggestions: Array<{
      type: 'performance' | 'readability' | 'best_practice' | 'security';
      line: number;
      message: string;
      before: string;
      after: string;
      confidence: number;
    }>;
    score: number;
  };
  error?: string;
  analysisTime: number;
  timestamp: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
}

const logger = createComponentLogger('CODE_EXECUTION_SOCKET');

// Rate limiting for socket events
const createSocketRateLimit = () => {
  const limits = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 20; // 20 executions per minute

  return (userId: string): boolean => {
    const now = Date.now();
    const userLimit = limits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      limits.set(userId, { count: 1, resetTime: now + WINDOW_MS });
      return true;
    }

    if (userLimit.count >= MAX_REQUESTS) {
      return false;
    }

    userLimit.count++;
    return true;
  };
};

const socketRateLimit = createSocketRateLimit();

// Mock execution service - replace with actual implementation
class CodeExecutionService {
  private cppEngineUrl: string;

  constructor() {
    this.cppEngineUrl = process.env.CPP_ENGINE_URL || 'http://localhost:9000';
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Simulate code execution - replace with actual CPP engine call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      // Mock successful execution
      const executionTime = Date.now() - startTime;
      
      if (request.code.includes('error')) {
        return {
          id: request.id,
          success: false,
          error: 'Compilation error: undeclared identifier',
          executionTime,
          memoryUsage: 0,
          exitCode: 1,
          timestamp: new Date().toISOString()
        };
      }

      return {
        id: request.id,
        success: true,
        output: 'Hello, World!\nProgram executed successfully.',
        executionTime,
        memoryUsage: 1024 * 1024, // 1MB
        exitCode: 0,
        compilationTime: 150,
        warnings: request.options?.warnings ? ['Unused variable: x'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeCode(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Simulate code analysis
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 300));

      const analysisTime = Date.now() - startTime;
      const linesOfCode = request.code.split('\n').length;

      return {
        id: request.id,
        success: true,
        analysis: {
          complexity: {
            cyclomatic: Math.min(10, Math.max(1, Math.floor(linesOfCode / 10))),
            cognitive: Math.min(15, Math.max(1, Math.floor(linesOfCode / 8))),
            lines: linesOfCode,
            functions: Math.max(1, Math.floor(linesOfCode / 20))
          },
          metrics: {
            linesOfCode,
            blankLines: Math.floor(linesOfCode * 0.1),
            commentLines: Math.floor(linesOfCode * 0.15),
            codeToCommentRatio: 0.15
          },
          issues: [
            {
              type: 'warning',
              line: 5,
              column: 10,
              message: 'Variable declared but never used',
              severity: 'medium',
              category: 'unused-variable',
              rule: 'no-unused-vars'
            }
          ],
          suggestions: [
            {
              type: 'readability',
              line: 3,
              message: 'Consider using more descriptive variable names',
              before: 'int x = 5;',
              after: 'int numberOfItems = 5;',
              confidence: 0.8
            }
          ],
          score: Math.max(60, Math.min(95, 100 - linesOfCode))
        },
        analysisTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown analysis error',
        analysisTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

const executionService = new CodeExecutionService();

// Authentication middleware for sockets
const authenticateSocket = async (socket: AuthenticatedSocket, next: Function) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Socket connection attempt without token', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    // Validate token - replace with actual JWT validation
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // const user = await getUserById(decoded.userId);
    
    // Mock authentication
    const mockUser = {
      id: 'user123',
      role: 'student',
      username: 'testuser'
    };

    socket.userId = mockUser.id;
    socket.userRole = mockUser.role;
    socket.isAuthenticated = true;

    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole
    });

    next();
  } catch (error) {
    logger.error('Socket authentication failed', { 
      socketId: socket.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next(new Error('Authentication failed'));
  }
};

// Validation functions
const validateExecutionRequest = (data: any): ExecutionRequest | null => {
  if (!data?.code || typeof data.code !== 'string') return null;
  if (!data?.language || typeof data.language !== 'string') return null;
  if (data.code.length > 50000) return null; // 50KB limit
  
  return {
    id: data.id || generateRequestId(),
    userId: '', // Will be set by handler
    code: data.code,
    language: data.language,
    input: data.input || '',
    options: {
      timeout: Math.min(30000, data.options?.timeout || 10000),
      memoryLimit: Math.min(256 * 1024 * 1024, data.options?.memoryLimit || 64 * 1024 * 1024),
      optimization: data.options?.optimization || 'O0',
      standard: data.options?.standard || 'c++17',
      warnings: data.options?.warnings ?? true,
      debug: data.options?.debug ?? false
    },
    timestamp: new Date().toISOString()
  };
};

const validateAnalysisRequest = (data: any): AnalysisRequest | null => {
  if (!data?.code || typeof data.code !== 'string') return null;
  if (!data?.language || typeof data.language !== 'string') return null;
  if (data.code.length > 50000) return null;
  
  const validAnalysisTypes = ['static', 'complexity', 'security', 'performance', 'full'];
  if (!validAnalysisTypes.includes(data.analysisType)) {
    data.analysisType = 'static';
  }

  return {
    id: data.id || generateRequestId(),
    userId: '', // Will be set by handler
    code: data.code,
    language: data.language,
    analysisType: data.analysisType,
    timestamp: new Date().toISOString()
  };
};

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Socket event handlers
export const setupCodeExecutionSocket = (io: Server) => {
  // Set up Redis adapter for scaling across multiple servers
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  const codeNamespace = io.of('/code-execution');

  // Apply authentication middleware
  codeNamespace.use(authenticateSocket);

  codeNamespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Code execution socket connected', {
      socketId: socket.id,
      userId: socket.userId
    });

    // Join user-specific room for private messages
    socket.join(`user:${socket.userId}`);

    // Handle code execution requests
    socket.on('execute_code', async (data, callback) => {
      try {
        // Rate limiting
        if (!socketRateLimit(socket.userId!)) {
          const error = { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' };
          socket.emit('execution_error', error);
          if (callback) callback(error);
          return;
        }

        // Validate request
        const request = validateExecutionRequest(data);
        if (!request) {
          const error = { error: 'Invalid execution request', code: 'INVALID_REQUEST' };
          socket.emit('execution_error', error);
          if (callback) callback(error);
          return;
        }

        request.userId = socket.userId!;

        logger.info('Code execution requested', {
          requestId: request.id,
          userId: socket.userId,
          language: request.language,
          codeLength: request.code.length
        });

        // Emit execution started
        socket.emit('execution_started', { 
          id: request.id,
          message: 'Code execution started',
          timestamp: new Date().toISOString()
        });

        // Execute code
        const result = await executionService.executeCode(request);

        // Emit result
        socket.emit('execution_completed', result);
        if (callback) callback(result);

        logger.info('Code execution completed', {
          requestId: result.id,
          userId: socket.userId,
          success: result.success,
          executionTime: result.executionTime
        });

      } catch (error) {
        const errorResponse = {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        };

        socket.emit('execution_error', errorResponse);
        if (callback) callback(errorResponse);

        logger.error('Code execution error', {
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle code analysis requests
    socket.on('analyze_code', async (data, callback) => {
      try {
        // Rate limiting (shared with execution)
        if (!socketRateLimit(socket.userId!)) {
          const error = { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' };
          socket.emit('analysis_error', error);
          if (callback) callback(error);
          return;
        }

        // Validate request
        const request = validateAnalysisRequest(data);
        if (!request) {
          const error = { error: 'Invalid analysis request', code: 'INVALID_REQUEST' };
          socket.emit('analysis_error', error);
          if (callback) callback(error);
          return;
        }

        request.userId = socket.userId!;

        logger.info('Code analysis requested', {
          requestId: request.id,
          userId: socket.userId,
          language: request.language,
          analysisType: request.analysisType
        });

        // Emit analysis started
        socket.emit('analysis_started', {
          id: request.id,
          message: 'Code analysis started',
          timestamp: new Date().toISOString()
        });

        // Analyze code
        const result = await executionService.analyzeCode(request);

        // Emit result
        socket.emit('analysis_completed', result);
        if (callback) callback(result);

        logger.info('Code analysis completed', {
          requestId: result.id,
          userId: socket.userId,
          success: result.success,
          analysisTime: result.analysisTime
        });

      } catch (error) {
        const errorResponse = {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        };

        socket.emit('analysis_error', errorResponse);
        if (callback) callback(errorResponse);

        logger.error('Code analysis error', {
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle cancel execution
    socket.on('cancel_execution', (data) => {
      logger.info('Execution cancellation requested', {
        requestId: data.id,
        userId: socket.userId
      });

      // Implement cancellation logic here
      socket.emit('execution_cancelled', {
        id: data.id,
        message: 'Execution cancelled',
        timestamp: new Date().toISOString()
      });
    });

    // Handle execution queue status
    socket.on('queue_status', (callback) => {
      // Mock queue status
      const status = {
        position: Math.floor(Math.random() * 5),
        estimatedWaitTime: Math.floor(Math.random() * 10) * 1000,
        activeExecutions: Math.floor(Math.random() * 20),
        timestamp: new Date().toISOString()
      };

      if (callback) callback(status);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Code execution socket disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      });

      // Clean up any ongoing executions for this user
      // Implementation would depend on your execution queue system
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message
      });
    });
  });

  return codeNamespace;
};

// Helper function to broadcast execution status to admins
export const broadcastExecutionStats = (io: Server, stats: any) => {
  io.of('/code-execution').to('admin').emit('execution_stats', {
    ...stats,
    timestamp: new Date().toISOString()
  });
};

// Helper function to notify user about execution completion
export const notifyExecutionComplete = (io: Server, userId: string, result: ExecutionResult) => {
  io.of('/code-execution').to(`user:${userId}`).emit('execution_notification', {
    type: 'execution_complete',
    result,
    timestamp: new Date().toISOString()
  });
};

export default setupCodeExecutionSocket;