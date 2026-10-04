import type { Server } from 'http';

import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

import { config } from '../../config';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const isDevelopment = (): boolean => config.NODE_ENV === 'development';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public code: string | undefined;
  /** Client-safe structured detail (for example validation issues), sent with 4xx responses. */
  public details: unknown;

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
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Handle Zod validation errors
const handleZodError = (error: ZodError): ValidationError => {
  const errors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.') || 'body';
    const messages = errors[field] ?? [];
    messages.push(err.message);
    errors[field] = messages;
  });

  return new ValidationError('Validation failed', errors);
};

// Handle Prisma errors
const handlePrismaError = (error: PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.['target'];
      const fieldName = Array.isArray(target) && typeof target[0] === 'string' ? target[0] : 'field';
      return new AppError(
        `A record with this ${fieldName} already exists`,
        409,
        'DUPLICATE_ENTRY'
      );
    }

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
      logger.error('Unhandled Prisma error', { code: error.code, message: error.message });
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
  // Same shape as production so clients parse one format; adds the stack for debugging.
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    code: err.code,
    ...(err instanceof ValidationError && { errors: err.errors }),
    ...(err.details !== undefined ? { details: err.details } : {}),
    stack: err.stack,
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
      ...(err.statusCode < 500 && err.details !== undefined ? { details: err.details } : {}),
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

function hasErrorsRecord(err: Error): err is Error & { errors: Record<string, { message?: unknown }> } {
  const candidate = (err as { errors?: unknown }).errors;
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function getClientErrorStatus(err: Error): number | null {
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const value = typeof statusCode === 'number' ? statusCode : status;
  return typeof value === 'number' && value >= 400 && value < 500 ? value : null;
}

// Global error handling middleware (Express identifies error handlers by arity, so `_next` stays)
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: AppError;

  // Log error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
  });

  // Handle specific error types
  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ApiError) {
    error = new AppError(err.message, err.statusCode);
    error.details = err.details;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body rejected by express.json()
    error = new AppError('Invalid JSON in request body', 400, 'INVALID_JSON');
  } else if (err instanceof ZodError) {
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
  } else if (err.name === 'ValidationError' && hasErrorsRecord(err)) {
    // Validation errors from libraries that report a field -> error map
    const errors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(err.errors)) {
      errors[key] = [typeof value.message === 'string' ? value.message : 'Invalid value'];
    }
    error = new ValidationError('Validation failed', errors);
  } else if (getClientErrorStatus(err) !== null) {
    // Errors from middleware such as body-parser carry a 4xx status (e.g. 413 payload too large)
    error = new AppError(err.message, getClientErrorStatus(err) ?? 400);
  } else {
    // Convert unknown errors to a non-operational AppError (details hidden in production)
    error = new AppError(isDevelopment() ? err.message : 'Something went wrong', 500);
    error.isOperational = false;
  }

  // Send error response
  if (isDevelopment()) {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

// Async error wrapper: forwards rejections to the Express error handler
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

// Zod validation middleware factory; replaces the validated property with the parsed value
export const validateRequest = (
  schema: ZodTypeAny,
  property: 'body' | 'query' | 'params' = 'body'
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      next(handleZodError(result.error));
      return;
    }
    // The parsed value has the shape the schema describes; Express types these loosely.
    (req as unknown as Record<typeof property, unknown>)[property] = result.data;
    next();
  };
};

// Graceful shutdown handler
export const gracefulShutdown = (server: Server): void => {
  const shutdown = (signal: string): void => {
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
    }, 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Error reporting utility
export const reportError = (error: Error, context?: Record<string, unknown>): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Log to file/service
  logger.error('Error reported:', errorInfo);

  // An external error reporting service (Sentry, etc.) would be called here in production.
};

// Health check middleware
export const healthCheck = (_req: Request, res: Response): void => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env['npm_package_version'] ?? '1.0.0',
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