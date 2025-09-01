// File: backend/src/api/middleware/rateLimit.ts
// Extension: .ts (TypeScript Middleware)

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

interface RateLimitOptions {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Maximum requests per window
  message?: string;          // Custom error message
  statusCode?: number;       // HTTP status code for rate limit exceeded
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skip?: (req: Request) => boolean;         // Skip rate limiting for certain requests
  onLimitReached?: (req: Request, res: Response) => void;  // Called when limit is reached
  store?: RateLimitStore;    // Custom store implementation
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsPerUser?: number;
  resetTime: Date;
  remainingRequests: number;
}

interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
  decrement?(key: string): Promise<void>;
  resetKey?(key: string): Promise<void>;
  resetAll?(): Promise<void>;
}

// Redis store implementation
export class RedisStore implements RateLimitStore {
  private redis: Redis;
  private windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const pipeline = this.redis.pipeline();
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(this.windowMs / 1000));
    
    const results = await pipeline.exec();
    const totalHits = results?.[0]?.[1] as number || 1;
    const resetTime = new Date((window + 1) * this.windowMs);

    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    await this.redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const pattern = `rate_limit:${key}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async resetAll(): Promise<void> {
    const keys = await this.redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// In-memory store implementation (for development/testing)
export class MemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: Date }> = new Map();
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const storeKey = `${key}:${window}`;
    const resetTime = new Date((window + 1) * this.windowMs);

    const existing = this.hits.get(storeKey);
    if (existing) {
      existing.count++;
      return { totalHits: existing.count, resetTime: existing.resetTime };
    } else {
      this.hits.set(storeKey, { count: 1, resetTime });
      return { totalHits: 1, resetTime };
    }
  }

  async decrement(key: string): Promise<void> {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const storeKey = `${key}:${window}`;
    
    const existing = this.hits.get(storeKey);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [storeKey] of this.hits) {
      if (storeKey.startsWith(`${key}:`)) {
        keysToDelete.push(storeKey);
      }
    }
    keysToDelete.forEach(k => this.hits.delete(k));
  }

  async resetAll(): Promise<void> {
    this.hits.clear();
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, value] of this.hits) {
      if (value.resetTime < now) {
        this.hits.delete(key);
      }
    }
  }
}

// Default rate limit configurations
export const rateLimitConfigs = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429
  },

  // Code execution endpoints
  codeExecution: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    message: 'Too many code executions, please wait before trying again.',
    statusCode: 429
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Upload limit exceeded, please try again later.',
    statusCode: 429
  },

  // Admin endpoints
  admin: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    message: 'Admin rate limit exceeded.',
    statusCode: 429
  },

  // Password reset endpoints
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later.',
    statusCode: 429
  }
};

// Create rate limit middleware
export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Rate limit exceeded',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip,
    skip = () => false,
    onLimitReached,
    store
  } = options;

  // Use provided store or create default based on environment
  const rateLimitStore = store || (process.env.REDIS_URL 
    ? new RedisStore(new Redis(process.env.REDIS_URL), windowMs)
    : new MemoryStore(windowMs)
  );

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if condition is met
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    
    try {
      const { totalHits, resetTime } = await rateLimitStore.increment(key);
      const remainingRequests = Math.max(0, maxRequests - totalHits);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Used': totalHits.toString()
      });

      // Check if limit exceeded
      if (totalHits > maxRequests) {
        // Set retry-after header
        const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
        res.set('Retry-After', retryAfter.toString());

        // Call onLimitReached callback
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        // Log rate limit violation
        console.warn(`Rate limit exceeded for ${key}: ${totalHits}/${maxRequests} requests`);

        return res.status(statusCode).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter,
          limit: maxRequests,
          remaining: 0,
          used: totalHits,
          resetTime: resetTime.toISOString()
        });
      }

      // Handle response to conditionally count requests
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        const shouldDecrement = (
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        );

        if (shouldDecrement && rateLimitStore.decrement) {
          rateLimitStore.decrement(key).catch(console.error);
        }

        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

// Predefined middleware functions
export const generalRateLimit = createRateLimit(rateLimitConfigs.general);
export const authRateLimit = createRateLimit(rateLimitConfigs.auth);
export const codeExecutionRateLimit = createRateLimit(rateLimitConfigs.codeExecution);
export const uploadRateLimit = createRateLimit(rateLimitConfigs.upload);
export const adminRateLimit = createRateLimit(rateLimitConfigs.admin);
export const passwordResetRateLimit = createRateLimit(rateLimitConfigs.passwordReset);

// IP-based rate limiting
export const createIPRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) =>
  createRateLimit({
    ...options,
    keyGenerator: (req: Request) => req.ip
  });

// User-based rate limiting
export const createUserRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) =>
  createRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const userId = req.user?.id || req.ip;
      return `user:${userId}`;
    }
  });

// API key-based rate limiting
export const createAPIKeyRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) =>
  createRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      return `api_key:${apiKey || req.ip}`;
    }
  });

// Route-specific rate limiting
export const createRouteRateLimit = (
  route: string,
  options: Omit<RateLimitOptions, 'keyGenerator'>
) =>
  createRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const userId = req.user?.id || req.ip;
      return `route:${route}:${userId}`;
    }
  });

// Sliding window rate limiter (more accurate but resource intensive)
export class SlidingWindowStore implements RateLimitStore {
  private redis: Redis;
  private windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    const redisKey = `sliding_limit:${key}`;

    // Remove expired entries
    pipeline.zremrangebyscore(redisKey, 0, now - this.windowMs);
    
    // Add current request
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    
    // Count current requests in window
    pipeline.zcard(redisKey);
    
    // Set expiration
    pipeline.expire(redisKey, Math.ceil(this.windowMs / 1000));

    const results = await pipeline.exec();
    const totalHits = results?.[2]?.[1] as number || 1;
    const resetTime = new Date(now + this.windowMs);

    return { totalHits, resetTime };
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `sliding_limit:${key}`;
    await this.redis.del(redisKey);
  }

  async resetAll(): Promise<void> {
    const keys = await this.redis.keys('sliding_limit:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Create sliding window rate limiter
export const createSlidingWindowRateLimit = (options: RateLimitOptions) => {
  if (!process.env.REDIS_URL) {
    console.warn('Sliding window rate limiter requires Redis. Falling back to fixed window.');
    return createRateLimit(options);
  }

  const redis = new Redis(process.env.REDIS_URL);
  const store = new SlidingWindowStore(redis, options.windowMs);

  return createRateLimit({
    ...options,
    store
  });
};

// Rate limit bypass for specific IPs (whitelist)
export const createWhitelistBypass = (whitelist: string[]) => {
  return (req: Request): boolean => {
    return whitelist.includes(req.ip);
  };
};

// Rate limit bypass for specific user roles
export const createRoleBypass = (allowedRoles: string[]) => {
  return (req: Request): boolean => {
    return req.user && allowedRoles.includes(req.user.role);
  };
};

// Combine multiple bypass conditions
export const combineBypassConditions = (...conditions: Array<(req: Request) => boolean>) => {
  return (req: Request): boolean => {
    return conditions.some(condition => condition(req));
  };
};

export default createRateLimit;