// File: backend/src/api/middleware/logging.ts
// Extension: .ts (TypeScript Middleware)

import { Request, Response, NextFunction } from 'express';
import { createLogger, format, transports, Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

interface LoggingOptions {
  level?: string;
  includeBody?: boolean;
  includeHeaders?: boolean;
  includeQuery?: boolean;
  maskSensitiveData?: boolean;
  skipHealthChecks?: boolean;
  skipStaticFiles?: boolean;
  customFormat?: any;
  transports?: any[];
}

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  sessionId?: string;
  headers?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
  timestamp: string;
}

interface ResponseLogData extends RequestLogData {
  statusCode: number;
  responseTime: number;
  contentLength?: string;
  error?: any;
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
    level = process.env.LOG_LEVEL || 'info',
    customFormat,
    transports: customTransports
  } = options;

  const logFormat = customFormat || format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format.prettyPrint()
  );

  const defaultTransports = [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ];

  // Add file transports for production
  if (process.env.NODE_ENV === 'production') {
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
    transports: customTransports || defaultTransports,
    // Don't exit on handled exceptions
    exitOnError: false
  });
};

// Mask sensitive data in objects
const maskSensitiveData = (obj: any, depth = 0): any => {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, depth + 1));
  }

  const masked = { ...obj };
  
  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, depth + 1);
    }
  }

  return masked;
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
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  };

  if (includeHeaders) {
    data.headers = mask ? maskSensitiveData(req.headers) : req.headers;
  }

  if (includeQuery && Object.keys(req.query).length > 0) {
    data.query = mask ? maskSensitiveData(req.query) : req.query;
  }

  if (includeBody && req.body && Object.keys(req.body).length > 0) {
    data.body = mask ? maskSensitiveData(req.body) : req.body;
  }

  return data;
};

// Extract response data for logging
const extractResponseData = (
  req: Request,
  res: Response,
  responseTime: number,
  error?: any
): ResponseLogData => {
  const requestData = req.logData as RequestLogData;

  return {
    ...requestData,
    statusCode: res.statusCode,
    responseTime,
    contentLength: res.get('Content-Length'),
    error: error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    } : undefined
  };
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = req.get('X-Request-ID') || uuidv4();
  res.set('X-Request-ID', req.requestId);
  next();
};

// Main logging middleware
export const createLoggingMiddleware = (options: LoggingOptions = {}) => {
  const logger = createAppLogger(options);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip certain requests
    if (shouldSkipRequest(req, options)) {
      return next();
    }

    const startTime = Date.now();

    // Extract and store request data
    req.logData = extractRequestData(req, options);

    // Log incoming request
    logger.info('Incoming request', req.logData);

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody: any;

    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

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
    res.on('error', (error) => {
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
    /union.*select/i, // SQL injection
    /eval\s*\(/, // Code injection
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /on\w+\s*=/, // Event handler injection
  ];

  const userAgent = req.get('User-Agent') || '';
  const requestBody = JSON.stringify(req.body);
  const queryString = req.url;

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
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = createAppLogger({ level: 'error' });

  const errorData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status || error.statusCode
    },
    timestamp: new Date().toISOString()
  };

  logger.error('Request error', errorData);

  // Send error to external monitoring service if configured
  if (process.env.ERROR_REPORTING_URL) {
    // Send to external service (e.g., Sentry, LogRocket)
    // This would be implementation-specific
  }

  next(error);
};

// Audit logging for sensitive operations
export const auditLoggingMiddleware = (operation: string) => {
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
export const queryLoggingMiddleware = (queryType: string, queryData: any) => {
  const logger = createComponentLogger('DATABASE');
  
  const logData = {
    type: 'database_query',
    queryType,
    query: queryData.query || queryData.sql,
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
  
  const originalSet = res.set;
  res.set = function(field: any, val?: string) {
    // Log rate limit headers when they're set
    if (typeof field === 'object' && field['X-RateLimit-Remaining']) {
      const remaining = parseInt(field['X-RateLimit-Remaining']);
      const limit = parseInt(field['X-RateLimit-Limit']);
      
      if (remaining < limit * 0.1) { // Log when 90% of limit is used
        logger.warn('Rate limit threshold reached', {
          requestId: req.requestId,
          ip: req.ip,
          remaining,
          limit,
          usage: ((limit - remaining) / limit * 100).toFixed(1) + '%',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return originalSet.call(this, field, val);
  };
  
  next();
};

// Export predefined logging middleware with common configurations
export const defaultLoggingMiddleware = createLoggingMiddleware({
  level: 'info',
  includeBody: process.env.NODE_ENV === 'development',
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
export const logAPICall = (logger: Logger, method: string, endpoint: string, duration: number, statusCode: number) => {
  logger.info('API Call', {
    type: 'api_call',
    method,
    endpoint,
    duration,
    statusCode,
    timestamp: new Date().toISOString()
  });
};

export const logUserAction = (logger: Logger, userId: string, action: string, resource: string, details?: any) => {
  logger.info('User Action', {
    type: 'user_action',
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logSystemEvent = (logger: Logger, event: string, severity: 'info' | 'warn' | 'error', details?: any) => {
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