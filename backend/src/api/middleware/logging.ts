import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, format, transports, Logger } from 'winston';
import type Transport from 'winston-transport';

interface LoggingOptions {
  level?: string;
  includeBody?: boolean;
  includeHeaders?: boolean;
  includeQuery?: boolean;
  maskSensitiveData?: boolean;
  skipHealthChecks?: boolean;
  skipStaticFiles?: boolean;
  customFormat?: ReturnType<typeof format.combine>;
  transports?: Transport[];
}

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string | undefined;
  ip: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  headers?: unknown;
  query?: unknown;
  body?: unknown;
  timestamp: string;
}

interface LoggedError {
  message: string;
  stack?: string | undefined;
  code?: unknown;
  name: string;
}

interface ResponseLogData extends Partial<RequestLogData> {
  statusCode: number;
  responseTime: number;
  contentLength?: string | undefined;
  error?: LoggedError | undefined;
}

// Sensitive fields to mask in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'x-api-key',
  'secret',
  'key',
  'auth',
  'credential',
  'ssn',
  'credit_card',
  'cvv'
];

// Create logger instance
const createAppLogger = (options: LoggingOptions = {}): Logger => {
  const {
    level = process.env['LOG_LEVEL'] ?? 'info',
    customFormat,
    transports: customTransports
  } = options;

  const logFormat = customFormat ?? format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format.prettyPrint()
  );

  const defaultTransports: Transport[] = [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ];

  // Add file transports for production
  if (process.env['NODE_ENV'] === 'production') {
    defaultTransports.push(
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  return createLogger({
    level,
    format: logFormat,
    transports: customTransports ?? defaultTransports,
    // Don't exit on handled exceptions
    exitOnError: false,
    silent: process.env['NODE_ENV'] === 'test',
  });
};

// Mask sensitive data in objects
const maskSensitiveData = (obj: unknown, depth = 0): unknown => {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => maskSensitiveData(item, depth + 1));
  }

  // Build the copy with Object.fromEntries rather than assigning masked[key],
  // so a request-supplied key such as "__proto__" cannot reach the prototype.
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      return [
        key,
        SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))
          ? '[MASKED]'
          : maskSensitiveData(value, depth + 1),
      ];
    })
  );
};

const toLoggedError = (error: unknown): LoggedError | undefined => {
  if (!error) {
    return undefined;
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as { code?: unknown }).code,
      name: error.name,
    };
  }
  return { message: String(error), name: 'UnknownError' };
};

// Check if request should be skipped
const shouldSkipRequest = (req: Request, options: LoggingOptions): boolean => {
  const { skipHealthChecks = true, skipStaticFiles = true } = options;

  if (skipHealthChecks && req.path.includes('/health')) {
    return true;
  }

  if (skipStaticFiles && /\.(js|css|png|jpg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path)) {
    return true;
  }

  return false;
};

// Extract request data for logging
const extractRequestData = (req: Request, options: LoggingOptions): RequestLogData => {
  const {
    includeHeaders = false,
    includeQuery = true,
    includeBody = false,
    maskSensitiveData: mask = true
  } = options;

  const data: RequestLogData = {
    requestId: req.requestId ?? 'unknown',
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.sessionId,
    timestamp: new Date().toISOString()
  };

  if (includeHeaders) {
    data.headers = mask ? maskSensitiveData(req.headers) : req.headers;
  }

  if (includeQuery && Object.keys(req.query).length > 0) {
    data.query = mask ? maskSensitiveData(req.query) : req.query;
  }

  const body: unknown = req.body;
  if (includeBody && typeof body === 'object' && body !== null && Object.keys(body).length > 0) {
    data.body = mask ? maskSensitiveData(body) : body;
  }

  return data;
};

// Extract response data for logging
const extractResponseData = (
  req: Request,
  res: Response,
  responseTime: number,
  error?: unknown
): ResponseLogData => {
  return {
    ...req.logData,
    statusCode: res.statusCode,
    responseTime,
    contentLength: res.get('Content-Length'),
    error: toLoggedError(error),
  };
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.get('X-Request-ID') ?? uuidv4();
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

// Main logging middleware
export const createLoggingMiddleware = (options: LoggingOptions = {}): RequestHandler => {
  const logger = createAppLogger(options);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip certain requests
    if (shouldSkipRequest(req, options)) {
      next();
      return;
    }

    const startTime = Date.now();

    // Extract and store request data
    const logData = extractRequestData(req, options);
    req.logData = logData;

    // Log incoming request
    logger.info('Incoming request', logData);

    // Log response when finished
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const responseData = extractResponseData(req, res, responseTime);

      // Determine log level based on status code
      let logLevel = 'info';
      if (res.statusCode >= 400 && res.statusCode < 500) {
        logLevel = 'warn';
      } else if (res.statusCode >= 500) {
        logLevel = 'error';
      }

      logger.log(logLevel, 'Request completed', responseData);

      // Log slow requests
      if (responseTime > 1000) {
        logger.warn('Slow request detected', {
          ...responseData,
          warning: 'Request took longer than 1 second'
        });
      }
    });

    // Log errors
    res.on('error', (error: Error) => {
      const responseTime = Date.now() - startTime;
      const responseData = extractResponseData(req, res, responseTime, error);

      logger.error('Request error', responseData);
    });

    next();
  };
};

// Security logging middleware
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const logger = createAppLogger({ level: 'warn' });

  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/, // XSS attempts
    /\bunion\b[\s\S]{0,64}?\bselect\b/i, // SQL injection (bounded gap avoids ReDoS)
    /eval\s*\(/, // Code injection
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /\bon[a-z]{1,32}\s{0,8}=/i, // Event handler injection (bounded to avoid ReDoS)
  ];

  // Only inspect a bounded prefix of each untrusted input.
  const MAX_INSPECT = 4096;
  const userAgent = (req.get('User-Agent') || '').slice(0, MAX_INSPECT);
  const requestBody = (JSON.stringify(req.body) ?? '').slice(0, MAX_INSPECT);
  const queryString = req.url.slice(0, MAX_INSPECT);

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(userAgent) || pattern.test(requestBody) || pattern.test(queryString)) {
      logger.warn('Suspicious request detected', {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Log failed authentication attempts
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.warn('Failed authentication attempt', {
          requestId: req.requestId,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  next();
};

// Performance monitoring middleware
export const performanceLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const logger = createAppLogger({ level: 'info' });
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log performance metrics
    logger.info('Performance metrics', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString()
    });

    // Alert on performance issues
    if (duration > 5000) { // 5 seconds
      logger.error('Critical performance issue', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        alert: 'Request exceeded 5 second threshold',
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (
  error: unknown,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const logger = createAppLogger({ level: 'error' });
  const { status, statusCode } = (error ?? {}) as { status?: unknown; statusCode?: unknown };

  const errorData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    error: {
      ...toLoggedError(error),
      status: status ?? statusCode,
    },
    timestamp: new Date().toISOString()
  };

  logger.error('Request error', errorData);

  next(error);
};

// Audit logging for sensitive operations
export const auditLoggingMiddleware = (operation: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = createAppLogger({ level: 'info' });

    const auditData = {
      operation,
      requestId: req.requestId,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    // Log before operation
    logger.info('Audit: Operation started', auditData);

    res.on('finish', () => {
      const completedAuditData = {
        ...auditData,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        completedAt: new Date().toISOString()
      };

      logger.info('Audit: Operation completed', completedAuditData);
    });

    next();
  };
};

// Custom logger for different components
export const createComponentLogger = (component: string, options: LoggingOptions = {}): Logger => {
  return createAppLogger({
    ...options,
    customFormat: format.combine(
      format.timestamp(),
      format.label({ label: component }),
      format.errors({ stack: true }),
      format.json()
    )
  });
};

// Log aggregation for analytics
export const analyticsLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const logger = createAppLogger({ level: 'info' });

  res.on('finish', () => {
    // Only log successful requests for analytics
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const analyticsData = {
        event: 'api_request',
        method: req.method,
        endpoint: req.route?.path || req.path,
        statusCode: res.statusCode,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        timestamp: new Date().toISOString(),
        // Add custom analytics fields
        feature: req.path.split('/')[2], // Extract feature from path
        action: req.method.toLowerCase()
      };

      logger.info('Analytics event', analyticsData);
    }
  });

  next();
};

// Database query logging
export interface QueryLogInput {
  query?: string;
  sql?: string;
  duration: number;
  rowCount?: number;
}

export const queryLoggingMiddleware = (queryType: string, queryData: QueryLogInput): void => {
  const logger = createComponentLogger('DATABASE');

  const logData = {
    type: 'database_query',
    queryType,
    query: queryData.query ?? queryData.sql,
    duration: queryData.duration,
    rowCount: queryData.rowCount,
    timestamp: new Date().toISOString()
  };

  if (queryData.duration > 1000) {
    logger.warn('Slow database query detected', logData);
  } else {
    logger.debug('Database query executed', logData);
  }
};

// Health check logging
export const healthCheckLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path.includes('/health')) {
    const logger = createComponentLogger('HEALTH');
    
    res.on('finish', () => {
      logger.debug('Health check', {
        endpoint: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  next();
};

// Rate limit logging
export const rateLimitLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const logger = createComponentLogger('RATE_LIMIT');
  
  // Inspect rate limit headers once the response is complete
  res.on('finish', () => {
    const remaining = Number(res.get('X-RateLimit-Remaining'));
    const limit = Number(res.get('X-RateLimit-Limit'));

    if (Number.isFinite(remaining) && Number.isFinite(limit) && limit > 0 && remaining < limit * 0.1) {
      // Log when 90% of limit is used
      logger.warn('Rate limit threshold reached', {
        requestId: req.requestId,
        ip: req.ip,
        remaining,
        limit,
        usage: `${(((limit - remaining) / limit) * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// Export predefined logging middleware with common configurations
export const defaultLoggingMiddleware = createLoggingMiddleware({
  level: 'info',
  includeBody: process.env['NODE_ENV'] === 'development',
  includeHeaders: false,
  includeQuery: true,
  maskSensitiveData: true,
  skipHealthChecks: true,
  skipStaticFiles: true
});

export const verboseLoggingMiddleware = createLoggingMiddleware({
  level: 'debug',
  includeBody: true,
  includeHeaders: true,
  includeQuery: true,
  maskSensitiveData: true,
  skipHealthChecks: false,
  skipStaticFiles: false
});

export const productionLoggingMiddleware = createLoggingMiddleware({
  level: 'warn',
  includeBody: false,
  includeHeaders: false,
  includeQuery: false,
  maskSensitiveData: true,
  skipHealthChecks: true,
  skipStaticFiles: true
});

// Structured logging helpers
export const logAPICall = (
  logger: Logger,
  method: string,
  endpoint: string,
  duration: number,
  statusCode: number
): void => {
  logger.info('API Call', {
    type: 'api_call',
    method,
    endpoint,
    duration,
    statusCode,
    timestamp: new Date().toISOString()
  });
};

export const logUserAction = (
  logger: Logger,
  userId: string,
  action: string,
  resource: string,
  details?: unknown
): void => {
  logger.info('User Action', {
    type: 'user_action',
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logSystemEvent = (
  logger: Logger,
  event: string,
  severity: 'info' | 'warn' | 'error',
  details?: unknown
): void => {
  logger.log(severity, 'System Event', {
    type: 'system_event',
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
};

// Export main logger instance for use throughout the application
export const appLogger = createAppLogger();

// Export types for TypeScript support
export type { LoggingOptions, RequestLogData, ResponseLogData };

export default createLoggingMiddleware;