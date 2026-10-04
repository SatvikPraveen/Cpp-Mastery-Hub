/**
 * Custom API Error class for structured error handling
 */
export type ErrorDetails = Record<string, unknown>;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details: ErrorDetails | undefined;

  constructor(
    statusCode: number,
    message: string,
    details?: ErrorDetails,
    isOperational = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error for request validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: ErrorDetails) {
    super(400, message, details);
  }
}

/**
 * Authentication Error for auth failures
 */
export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(401, message);
  }
}

/**
 * Authorization Error for permission failures
 */
export class AuthorizationError extends ApiError {
  constructor(message = 'Access denied') {
    super(403, message);
  }
}

/**
 * Not Found Error for missing resources
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
  }
}

/**
 * Conflict Error for resource conflicts
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
  }
}

/**
 * Rate Limit Error for rate limiting
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded') {
    super(429, message);
  }
}

/**
 * Service Error for external service failures
 */
export class ServiceError extends ApiError {
  constructor(message: string, details?: ErrorDetails) {
    super(502, message, details);
  }
}

/**
 * Database Error for database-related issues
 */
export class DatabaseError extends ApiError {
  constructor(message: string, details?: ErrorDetails) {
    super(500, `Database error: ${message}`, details);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: ErrorDetails | undefined;
    timestamp: string;
    path: string;
    requestId?: string | undefined;
  };
}

/**
 * Error codes for different types of errors
 */
export const ErrorCodes = {
  // Validation errors (1000-1999)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authentication errors (2000-2999)
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',

  // Authorization errors (3000-3999)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // Resource errors (4000-4999)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Rate limiting errors (5000-5999)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // External service errors (6000-6999)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CPP_ENGINE_UNAVAILABLE: 'CPP_ENGINE_UNAVAILABLE',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',

  // Code execution errors (7000-7999)
  COMPILATION_FAILED: 'COMPILATION_FAILED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  UNSAFE_CODE_DETECTED: 'UNSAFE_CODE_DETECTED',

  // File processing errors (8000-8999)
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',

  // System errors (9000-9999)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'
} as const;

/**
 * Get error code for HTTP status code
 */
export function getErrorCodeForStatus(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return ErrorCodes.VALIDATION_FAILED;
    case 401:
      return ErrorCodes.INVALID_CREDENTIALS;
    case 403:
      return ErrorCodes.INSUFFICIENT_PERMISSIONS;
    case 404:
      return ErrorCodes.RESOURCE_NOT_FOUND;
    case 409:
      return ErrorCodes.RESOURCE_CONFLICT;
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED;
    case 502:
    case 503:
      return ErrorCodes.EXTERNAL_SERVICE_ERROR;
    case 500:
    default:
      return ErrorCodes.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: ApiError | Error,
  path: string,
  requestId?: string
): ErrorResponse {
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;
  const detailCode = isApiError ? error.details?.['code'] : undefined;

  return {
    success: false,
    error: {
      message: error.message,
      code: typeof detailCode === 'string' ? detailCode : getErrorCodeForStatus(statusCode),
      statusCode,
      details: isApiError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      path,
      requestId
    }
  };
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Sanitize error message for client response
 */
export function sanitizeErrorMessage(error: Error, isProduction = false): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  // In production, don't expose internal error details
  if (isProduction) {
    return 'An internal server error occurred';
  }

  return error.message;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Get error severity based on status code
 */
export function getErrorSeverity(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) {
    return ErrorSeverity.CRITICAL;
  } else if (statusCode >= 400 && statusCode < 500) {
    return ErrorSeverity.MEDIUM;
  } else {
    return ErrorSeverity.LOW;
  }
}

/**
 * Structured error for logging
 */
export interface StructuredError {
  message: string;
  statusCode: number;
  code: string;
  severity: ErrorSeverity;
  details?: ErrorDetails | undefined;
  stack?: string | undefined;
  userId?: string | undefined;
  requestId?: string | undefined;
  path?: string | undefined;
  method?: string | undefined;
  userAgent?: string | undefined;
  ip?: string | undefined;
  timestamp: string;
}

/**
 * Convert error to structured format for logging
 */
export function structureError(
  error: Error | ApiError,
  context?: {
    userId?: string | undefined;
    requestId?: string | undefined;
    path?: string | undefined;
    method?: string | undefined;
    userAgent?: string | undefined;
    ip?: string | undefined;
  }
): StructuredError {
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;

  return {
    message: error.message,
    statusCode,
    code: getErrorCodeForStatus(statusCode),
    severity: getErrorSeverity(statusCode),
    details: isApiError ? error.details : undefined,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };
}

/**
 * Error categories for metrics and monitoring
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RESOURCE = 'resource',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  CODE_EXECUTION = 'code_execution',
  FILE_PROCESSING = 'file_processing',
  SYSTEM = 'system'
}

/**
 * Get error category from error code
 */
const ERROR_CODE_CATEGORIES: ReadonlyMap<string, ErrorCategory> = new Map<string, ErrorCategory>([
  [ErrorCodes.VALIDATION_FAILED, ErrorCategory.VALIDATION],
  [ErrorCodes.INVALID_INPUT, ErrorCategory.VALIDATION],
  [ErrorCodes.MISSING_REQUIRED_FIELD, ErrorCategory.VALIDATION],
  [ErrorCodes.INVALID_FORMAT, ErrorCategory.VALIDATION],
  [ErrorCodes.INVALID_CREDENTIALS, ErrorCategory.AUTHENTICATION],
  [ErrorCodes.TOKEN_EXPIRED, ErrorCategory.AUTHENTICATION],
  [ErrorCodes.TOKEN_INVALID, ErrorCategory.AUTHENTICATION],
  [ErrorCodes.ACCOUNT_LOCKED, ErrorCategory.AUTHENTICATION],
  [ErrorCodes.ACCOUNT_DEACTIVATED, ErrorCategory.AUTHENTICATION],
  [ErrorCodes.INSUFFICIENT_PERMISSIONS, ErrorCategory.AUTHORIZATION],
  [ErrorCodes.RESOURCE_ACCESS_DENIED, ErrorCategory.AUTHORIZATION],
  [ErrorCodes.OPERATION_NOT_ALLOWED, ErrorCategory.AUTHORIZATION],
  [ErrorCodes.RESOURCE_NOT_FOUND, ErrorCategory.RESOURCE],
  [ErrorCodes.RESOURCE_ALREADY_EXISTS, ErrorCategory.RESOURCE],
  [ErrorCodes.RESOURCE_CONFLICT, ErrorCategory.RESOURCE],
  [ErrorCodes.RATE_LIMIT_EXCEEDED, ErrorCategory.RATE_LIMIT],
  [ErrorCodes.QUOTA_EXCEEDED, ErrorCategory.RATE_LIMIT],
  [ErrorCodes.EXTERNAL_SERVICE_ERROR, ErrorCategory.EXTERNAL_SERVICE],
  [ErrorCodes.CPP_ENGINE_UNAVAILABLE, ErrorCategory.EXTERNAL_SERVICE],
  [ErrorCodes.DATABASE_CONNECTION_ERROR, ErrorCategory.EXTERNAL_SERVICE],
  [ErrorCodes.COMPILATION_FAILED, ErrorCategory.CODE_EXECUTION],
  [ErrorCodes.EXECUTION_TIMEOUT, ErrorCategory.CODE_EXECUTION],
  [ErrorCodes.EXECUTION_ERROR, ErrorCategory.CODE_EXECUTION],
  [ErrorCodes.MEMORY_LIMIT_EXCEEDED, ErrorCategory.CODE_EXECUTION],
  [ErrorCodes.UNSAFE_CODE_DETECTED, ErrorCategory.CODE_EXECUTION],
  [ErrorCodes.FILE_TOO_LARGE, ErrorCategory.FILE_PROCESSING],
  [ErrorCodes.INVALID_FILE_TYPE, ErrorCategory.FILE_PROCESSING],
  [ErrorCodes.FILE_UPLOAD_FAILED, ErrorCategory.FILE_PROCESSING],
]);

/**
 * Get error category from error code (one of the string codes in `ErrorCodes`).
 */
export function getErrorCategory(code: string): ErrorCategory {
  return ERROR_CODE_CATEGORIES.get(code) ?? ErrorCategory.SYSTEM;
}

/**
 * Custom error for specific use cases
 */
export class CodeExecutionError extends ApiError {
  constructor(
    message: string,
    public readonly executionDetails?: {
      compilationOutput?: string;
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      timeout?: boolean;
      memoryExceeded?: boolean;
    }
  ) {
    super(422, message, { code: ErrorCodes.EXECUTION_ERROR, ...executionDetails });
  }
}

export class CompilationError extends ApiError {
  constructor(
    message: string,
    public readonly compilationOutput: string
  ) {
    super(422, message, { 
      code: ErrorCodes.COMPILATION_FAILED, 
      compilationOutput 
    });
  }
}

export class FileUploadError extends ApiError {
  constructor(
    message: string,
    public readonly fileDetails?: ErrorDetails
  ) {
    super(400, message, { code: ErrorCodes.FILE_UPLOAD_FAILED, ...fileDetails });
  }
}

/**
 * Error wrapper for async operations
 */
export function wrapAsync<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>
): (...args: A) => Promise<T> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw ApiErrors as-is, wrap others
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(500, error.message, { originalError: error.name });
      }
      throw new ApiError(500, 'Unknown error', { originalError: String(error) });
    }
  };
}

/**
 * Extract a human-readable message from an unknown thrown value.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}