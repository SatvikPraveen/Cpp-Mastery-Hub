// File: backend/src/api/middleware/validation.ts
// Extension: .ts

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Middleware to handle express-validator validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
      location: error.type === 'field' ? error.location : undefined
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: validationErrors,
      userId: req.user?.id
    });

    const error = new ApiError(400, 'Validation failed', {
      errors: validationErrors
    });

    return next(error);
  }

  next();
};

/**
 * Custom validation helper for file uploads
 */
export const validateFileUpload = (
  allowedTypes: string[], 
  maxSize: number = 5 * 1024 * 1024 // 5MB default
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    const file = req.file;

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return next(new ApiError(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }

    // Check file size
    if (file.size > maxSize) {
      return next(new ApiError(400, `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`));
    }

    next();
  };
};

/**
 * Custom validation for code content
 */
export const validateCodeContent = (req: Request, res: Response, next: NextFunction): void => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return next(new ApiError(400, 'Code is required and must be a string'));
  }

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /system\s*\(/gi,
    /exec\s*\(/gi,
    /eval\s*\(/gi,
    /#include\s*<\s*cstdlib\s*>/gi,
    /fork\s*\(/gi,
    /__asm/gi
  ];

  const foundDangerous = dangerousPatterns.some(pattern => pattern.test(code));
  
  if (foundDangerous) {
    logger.warn('Potentially dangerous code detected', {
      userId: req.user?.id,
      codeSnippet: code.substring(0, 200)
    });
    
    // Don't block completely, but flag for review
    req.body.flagged = true;
  }

  next();
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Basic HTML entity encoding
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  // Don't sanitize code field as it needs to preserve syntax
  const fieldsToSanitize = ['title', 'description', 'comment', 'message', 'name'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      req.body[field] = sanitizeObject(req.body[field]);
    }
  });

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  let { limit, offset, page } = req.query;

  // Convert to numbers and apply defaults
  const parsedLimit = parseInt(limit as string) || 20;
  const parsedOffset = parseInt(offset as string) || 0;
  const parsedPage = parseInt(page as string) || 1;

  // Validate ranges
  if (parsedLimit < 1 || parsedLimit > 100) {
    return next(new ApiError(400, 'Limit must be between 1 and 100'));
  }

  if (parsedOffset < 0) {
    return next(new ApiError(400, 'Offset must be non-negative'));
  }

  if (parsedPage < 1) {
    return next(new ApiError(400, 'Page must be positive'));
  }

  // Calculate offset from page if page is provided
  const finalOffset = page ? (parsedPage - 1) * parsedLimit : parsedOffset;

  // Set normalized values
  req.query.limit = parsedLimit.toString();
  req.query.offset = finalOffset.toString();
  req.query.page = parsedPage.toString();

  next();
};

/**
 * Validate search query parameters
 */
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { q, search } = req.query;
  const query = (q || search) as string;

  if (!query) {
    return next(new ApiError(400, 'Search query is required'));
  }

  if (query.length < 2) {
    return next(new ApiError(400, 'Search query must be at least 2 characters long'));
  }

  if (query.length > 100) {
    return next(new ApiError(400, 'Search query must be less than 100 characters'));
  }

  // Remove special characters that could cause issues
  const sanitizedQuery = query.replace(/[<>\"'%;()&+]/g, '');
  
  req.query.q = sanitizedQuery;
  req.query.search = sanitizedQuery;

  next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { sort, order } = req.query;

    if (sort) {
      const sortField = sort as string;
      if (!allowedFields.includes(sortField)) {
        return next(new ApiError(400, `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`));
      }
    }

    if (order) {
      const sortOrder = order as string;
      if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
        return next(new ApiError(400, 'Sort order must be "asc" or "desc"'));
      }
      req.query.order = sortOrder.toLowerCase();
    }

    next();
  };
};

/**
 * Validate UUID parameters
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return next(new ApiError(400, `Invalid ${paramName} format`));
    }

    next();
  };
};

/**
 * Validate date range parameters
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate as string);
    if (isNaN(start.getTime())) {
      return next(new ApiError(400, 'Invalid start date format'));
    }
    req.query.startDate = start.toISOString();
  }

  if (endDate) {
    const end = new Date(endDate as string);
    if (isNaN(end.getTime())) {
      return next(new ApiError(400, 'Invalid end date format'));
    }
    req.query.endDate = end.toISOString();
  }

  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (start > end) {
      return next(new ApiError(400, 'Start date must be before end date'));
    }

    // Prevent excessively large date ranges (e.g., more than 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end.getTime() - start.getTime() > maxRange) {
      return next(new ApiError(400, 'Date range cannot exceed 1 year'));
    }
  }

  next();
};

/**
 * Rate limiting validation for heavy operations
 */
export const validateRateLimit = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id;
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    logger.info('Rate limit check', {
      operation,
      userId,
      ip,
      userAgent
    });

    // This would integrate with Redis to track request counts
    // For now, we'll just log and continue
    next();
  };
};

/**
 * Content length validation
 */
export const validateContentLength = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      return next(new ApiError(413, `Request entity too large. Maximum size: ${maxSize} bytes`));
    }

    next();
  };
};