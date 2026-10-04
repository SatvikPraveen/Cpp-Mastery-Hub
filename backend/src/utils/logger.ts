import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { config, loggingConfig } from '../config';

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
      return `${String(timestamp)} [${level}]: ${String(message)} ${argsStr}`;
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
const isTest = config.NODE_ENV === 'test';

// Console transport for development
if (config.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: logFormat,
    })
  );
} else {
  transports.push(
    // Structured JSON on stdout: the container runtime collects and rotates it.
    new winston.transports.Console({
      level: config.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Rotating files under ./logs are opt-in (LOG_TO_FILES=true) for hosts without log collection;
// containers run with a read-only filesystem and log to stdout only.
if (!isTest && process.env['LOG_TO_FILES'] === 'true') {
  // All application logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: loggingConfig.maxSize,
      maxFiles: loggingConfig.maxFiles,
      level: loggingConfig.level,
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
      maxSize: loggingConfig.maxSize,
      maxFiles: loggingConfig.maxFiles,
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
      maxSize: loggingConfig.maxSize,
      maxFiles: loggingConfig.maxFiles,
      level: 'http',
      format: fileFormat,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: loggingConfig.level,
  levels: logLevels,
  transports,
  exitOnError: false,
  silent: isTest,
});

type LogContext = Record<string, unknown>;

// Enhanced logging methods with context
export const logWithContext = {
  error: (message: string, context?: LogContext, error?: Error) => {
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

  warn: (message: string, context?: LogContext) => {
    logger.warn(message, context);
  },

  info: (message: string, context?: LogContext) => {
    logger.info(message, context);
  },

  http: (message: string, context?: LogContext) => {
    logger.http(message, context);
  },

  debug: (message: string, context?: LogContext) => {
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

  suspiciousActivity: (userId: string, activity: string, details?: LogContext) => {
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

  healthCheck: (service: string, status: 'healthy' | 'unhealthy', details?: LogContext) => {
    logger.info('Health check', {
      event: 'health_check',
      service,
      status,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  systemEvent: (event: string, details: LogContext) => {
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

export default logger;