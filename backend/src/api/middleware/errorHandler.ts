// File: backend/src/api/middleware/errorHandler.ts
// Extension: .ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { logger } from '../../utils/logger';
import config from '../../config';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  public errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR');
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Handle Zod validation errors
const handleZodError = (error: ZodError): ValidationError => {
  const errors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(err.message);
  });

  return new ValidationError('Validation failed', errors);
};

// Handle Prisma errors
const handlePrismaError = (error: PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return new AppError(
        `A record with this ${fieldName} already exists`,
        409,
        'DUPLICATE_ENTRY'
      );
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        'Invalid reference to related record',
        400,
        'FOREIGN_KEY_VIOLATION'
      );
    
    case 'P2025':
      // Record not found
      return new AppError(
        'Record not found',
        404,
        'RECORD_NOT_FOUND'
      );
    
    case 'P2014':
      // Required relation violation
      return new AppError(
        'Required relation is missing',
        400,
        'REQUIRED_RELATION_VIOLATION'
      );
    
    default:
      logger.error('Unhandled Prisma error:', error);
      return new DatabaseError('Database operation failed');
  }
};

// Handle Prisma validation errors
const handlePrismaValidationError = (error: PrismaClientValidationError): AppError => {
  return new ValidationError('Database validation failed', {
    database: [error.message],
  });
};

// Handle JWT errors
const handleJWTError = (): AuthenticationError => {
  return new AuthenticationError('Invalid token');
};

// Handle JWT expired error
const handleJWTExpiredError = (): AuthenticationError => {
  return new AuthenticationError('Token has expired');
};

// Send error response in development
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      status: err.status,
      message: err.message,
      code: err.code,
      stack: err.stack,
      ...(err instanceof ValidationError && { errors: err.errors }),
    },
  });
};

// Send error response in production
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  } else {
    // Programming errors: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

// Global error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err as AppError;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id,
  });

  // Handle specific error types
  if (err instanceof ZodError) {
    error = handleZodError(err);
  } else if (err instanceof PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof PrismaClientValidationError) {
    error = handlePrismaValidationError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.name === 'MulterError') {
    // Handle file upload errors
    if (err.message.includes('File too large')) {
      error = new AppError('File size too large', 413, 'FILE_TOO_LARGE');
    } else {
      error = new AppError('File upload failed', 400, 'UPLOAD_ERROR');
    }
  } else if (err.name === 'CastError') {
    // Handle MongoDB cast errors
    error = new AppError('Invalid ID format', 400, 'INVALID_ID');
  } else if (err.name === 'ValidationError') {
    // Handle Mongoose validation errors
    const errors: Record<string, string[]> = {};
    Object.keys((err as any).errors).forEach((key) => {
      errors[key] = [(err as any).errors[key].message];
    });
    error = new ValidationError('Validation failed', errors);
  } else if (!error.statusCode) {
    // Convert unknown errors to AppError
    error = new AppError(
      config.nodeEnv === 'development' ? err.message : 'Something went wrong',
      500
    );
  }

  // Send error response
  if (config.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// 404 Not Found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware factory
export const validateRequest = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[property];
      const result = schema.parse(data);
      req[property] = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(handleZodError(error));
      } else {
        next(error);
      }
    }
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Gracefully close server and exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Gracefully close server and exit process
  process.exit(1);
});

// Graceful shutdown handler
export const gracefulShutdown = (server: any) => {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      // prisma.$disconnect();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force close server after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Error reporting utility
export const reportError = (error: Error, context?: Record<string, any>) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Log to file/service
  logger.error('Error reported:', errorInfo);

  // Send to external error reporting service (Sentry, etc.)
  if (config.nodeEnv === 'production') {
    // Example: Sentry.captureException(error, { extra: context });
  }
};

// Health check middleware
export const healthCheck = (req: Request, res: Response) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  res.status(200).json(healthInfo);
};

export default {
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  catchAsync,
  validateRequest,
  gracefulShutdown,
  reportError,
  healthCheck,
};