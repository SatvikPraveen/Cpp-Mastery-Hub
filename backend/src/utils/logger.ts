// File: backend/src/utils/logger.ts
// Extension: .ts

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...args } = info;
      const argsStr = Object.keys(args).length ? JSON.stringify(args, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${argsStr}`;
    }
  )
);

// Define file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport for development
if (config.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: logFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// File transport for all environments
transports.push(
  new DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: config.logging.level,
    format: fileFormat,
    handleExceptions: true,
    handleRejections: true,
  })
);

// Error file transport
transports.push(
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: 'error',
    format: fileFormat,
    handleExceptions: true,
    handleRejections: true,
  })
);

// HTTP requests log file (for morgan)
transports.push(
  new DailyRotateFile({
    filename: 'logs/access-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    level: 'http',
    format: fileFormat,
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
});

// Enhanced logging methods with context
export const logWithContext = {
  error: (message: string, context?: Record<string, any>, error?: Error) => {
    logger.error(message, {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    });
  },

  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(message, context);
  },

  info: (message: string, context?: Record<string, any>) => {
    logger.info(message, context);
  },

  http: (message: string, context?: Record<string, any>) => {
    logger.http(message, context);
  },

  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(message, context);
  },
};

// Security-sensitive logging
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip: string, userAgent?: string) => {
    logger.info('Login attempt', {
      event: 'login_attempt',
      email,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  loginSuccess: (userId: string, email: string, ip: string) => {
    logger.info('Login successful', {
      event: 'login_success',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  loginFailure: (email: string, reason: string, ip: string) => {
    logger.warn('Login failed', {
      event: 'login_failure',
      email,
      reason,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  logout: (userId: string, email: string) => {
    logger.info('User logout', {
      event: 'logout',
      userId,
      email,
      timestamp: new Date().toISOString(),
    });
  },

  passwordReset: (email: string, ip: string) => {
    logger.info('Password reset requested', {
      event: 'password_reset_request',
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  suspiciousActivity: (userId: string, activity: string, details?: Record<string, any>) => {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      userId,
      activity,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  accessDenied: (userId: string, resource: string, action: string) => {
    logger.warn('Access denied', {
      event: 'access_denied',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  },
};

// Performance logging
export const performanceLogger = {
  apiCall: (
    method: string,
    endpoint: string,
    duration: number,
    statusCode: number,
    userId?: string
  ) => {
    logger.http('API call', {
      event: 'api_call',
      method,
      endpoint,
      duration,
      statusCode,
      userId,
      timestamp: new Date().toISOString(),
    });
  },

  databaseQuery: (query: string, duration: number, recordCount?: number) => {
    logger.debug('Database query', {
      event: 'db_query',
      query: query.substring(0, 100), // Truncate long queries
      duration,
      recordCount,
      timestamp: new Date().toISOString(),
    });
  },

  codeExecution: (
    userId: string,
    language: string,
    duration: number,
    status: string,
    memoryUsage?: number
  ) => {
    logger.info('Code execution', {
      event: 'code_execution',
      userId,
      language,
      duration,
      status,
      memoryUsage,
      timestamp: new Date().toISOString(),
    });
  },
};

// Business logic logging
export const businessLogger = {
  userRegistration: (userId: string, email: string, method: string) => {
    logger.info('User registered', {
      event: 'user_registration',
      userId,
      email,
      method,
      timestamp: new Date().toISOString(),
    });
  },

  courseEnrollment: (userId: string, courseId: string) => {
    logger.info('Course enrollment', {
      event: 'course_enrollment',
      userId,
      courseId,
      timestamp: new Date().toISOString(),
    });
  },

  lessonCompleted: (userId: string, lessonId: string, duration: number) => {
    logger.info('Lesson completed', {
      event: 'lesson_completed',
      userId,
      lessonId,
      duration,
      timestamp: new Date().toISOString(),
    });
  },

  achievementUnlocked: (userId: string, achievementId: string) => {
    logger.info('Achievement unlocked', {
      event: 'achievement_unlocked',
      userId,
      achievementId,
      timestamp: new Date().toISOString(),
    });
  },

  codeShared: (userId: string, snippetId: string, visibility: string) => {
    logger.info('Code shared', {
      event: 'code_shared',
      userId,
      snippetId,
      visibility,
      timestamp: new Date().toISOString(),
    });
  },
};

// Error tracking with context
export const errorLogger = {
  apiError: (
    error: Error,
    request: {
      method: string;
      url: string;
      ip: string;
      userAgent?: string;
      userId?: string;
    }
  ) => {
    logger.error('API Error', {
      event: 'api_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request,
      timestamp: new Date().toISOString(),
    });
  },

  databaseError: (error: Error, operation: string, table?: string) => {
    logger.error('Database Error', {
      event: 'database_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      operation,
      table,
      timestamp: new Date().toISOString(),
    });
  },

  validationError: (errors: Record<string, string[]>, endpoint: string) => {
    logger.warn('Validation Error', {
      event: 'validation_error',
      errors,
      endpoint,
      timestamp: new Date().toISOString(),
    });
  },
};

// Structured logging for monitoring systems
export const monitoringLogger = {
  metric: (name: string, value: number, tags?: Record<string, string>) => {
    logger.info('Metric', {
      event: 'metric',
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  },

  healthCheck: (service: string, status: 'healthy' | 'unhealthy', details?: Record<string, any>) => {
    logger.info('Health check', {
      event: 'health_check',
      service,
      status,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  systemEvent: (event: string, details: Record<string, any>) => {
    logger.info('System event', {
      event: 'system_event',
      eventType: event,
      details,
      timestamp: new Date().toISOString(),
    });
  },
};

// Create a stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export the logger and all utilities
export {
  logger,
  logWithContext,
  securityLogger,
  performanceLogger,
  businessLogger,
  errorLogger,
  monitoringLogger,
  morganStream,
};

export default logger;