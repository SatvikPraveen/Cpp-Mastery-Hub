// File: frontend/src/pages/api/health.ts
// Extension: .ts (Next.js API Route)

import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    external_apis: ServiceHealth;
  };
  metrics: {
    memory_usage: MemoryUsage;
    response_time: number;
    active_connections: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time?: number;
  last_checked: string;
  error?: string;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  heap_used: number;
  heap_total: number;
}

interface HealthResponse {
  health: HealthCheck;
  message?: string;
}

// Environment configuration
const config = {
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  api_base_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
};

let startTime = Date.now();

// Health check utilities
class HealthChecker {
  private static async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!config.database_url) {
        return {
          status: 'degraded',
          last_checked: new Date().toISOString(),
          error: 'Database URL not configured'
        };
      }

      // In a real implementation, you would ping your database here
      // For now, we'll simulate a database check
      const mockDatabaseCheck = new Promise((resolve) => {
        setTimeout(() => resolve(true), Math.random() * 100);
      });

      await mockDatabaseCheck;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        response_time: responseTime,
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        last_checked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }

  private static async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!config.redis_url) {
        return {
          status: 'degraded',
          last_checked: new Date().toISOString(),
          error: 'Redis URL not configured'
        };
      }

      // In a real implementation, you would ping Redis here
      // For now, we'll simulate a Redis check
      const mockRedisCheck = new Promise((resolve) => {
        setTimeout(() => resolve(true), Math.random() * 50);
      });

      await mockRedisCheck;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        response_time: responseTime,
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        last_checked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  }

  private static async checkExternalAPIs(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check if the main API backend is reachable
      const response = await fetch(`${config.api_base_url}/health`, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'Frontend-Health-Check'
        }
      } as any);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: responseTime < 2000 ? 'healthy' : 'degraded',
          response_time: responseTime,
          last_checked: new Date().toISOString()
        };
      } else {
        return {
          status: 'unhealthy',
          response_time: responseTime,
          last_checked: new Date().toISOString(),
          error: `API returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        last_checked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'External API check failed'
      };
    }
  }

  private static getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      
      return {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.external,
        percentage: Math.round((memUsage.rss / (memUsage.rss + memUsage.external)) * 100),
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal
      };
    }

    // Fallback for environments where process.memoryUsage is not available
    return {
      used: 0,
      total: 0,
      percentage: 0,
      heap_used: 0,
      heap_total: 0
    };
  }

  private static determineOverallStatus(services: HealthCheck['services']): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.every(status => status === 'healthy')) {
      return 'healthy';
    }
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }

  static async performHealthCheck(): Promise<HealthCheck> {
    const checkStartTime = Date.now();
    
    // Run all service checks in parallel
    const [database, redis, external_apis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs()
    ]);

    const services = { database, redis, external_apis };
    const overallStatus = this.determineOverallStatus(services);
    const responseTime = Date.now() - checkStartTime;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: config.version,
      environment: config.environment,
      services,
      metrics: {
        memory_usage: this.getMemoryUsage(),
        response_time: responseTime,
        active_connections: 0 // Would be populated from actual connection pool
      }
    };
  }
}

// Rate limiting for health checks
const healthCheckCache = new Map<string, { data: HealthCheck; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

function getCachedHealthCheck(key: string): HealthCheck | null {
  const cached = healthCheckCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedHealthCheck(key: string, data: HealthCheck): void {
  healthCheckCache.set(key, { data, timestamp: Date.now() });
}

// Request logging
function logHealthCheckRequest(req: NextApiRequest, health: HealthCheck): void {
  if (config.environment === 'development') {
    console.log(`[${new Date().toISOString()}] Health Check Request:`, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      status: health.status,
      responseTime: health.metrics.response_time
    });
  }
}

// Main handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      health: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: config.version,
        environment: config.environment,
        services: {
          database: { status: 'unhealthy', last_checked: new Date().toISOString() },
          redis: { status: 'unhealthy', last_checked: new Date().toISOString() },
          external_apis: { status: 'unhealthy', last_checked: new Date().toISOString() }
        },
        metrics: {
          memory_usage: {
            used: 0,
            total: 0,
            percentage: 0,
            heap_used: 0,
            heap_total: 0
          },
          response_time: 0,
          active_connections: 0
        }
      },
      message: 'Method not allowed'
    });
  }

  try {
    // Check for cached result
    const cacheKey = 'health_check';
    let health = getCachedHealthCheck(cacheKey);

    if (!health) {
      // Perform fresh health check
      health = await HealthChecker.performHealthCheck();
      setCachedHealthCheck(cacheKey, health);
    }

    // Log the request
    logHealthCheckRequest(req, health);

    // Set appropriate headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Return appropriate status code based on health
    let statusCode: number;
    switch (health.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Still functional but not optimal
        break;
      case 'unhealthy':
        statusCode = 503; // Service unavailable
        break;
      default:
        statusCode = 500;
    }

    return res.status(statusCode).json({
      health,
      message: getStatusMessage(health.status)
    });

  } catch (error) {
    console.error('Health check error:', error);

    const errorHealth: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: config.version,
      environment: config.environment,
      services: {
        database: { status: 'unhealthy', last_checked: new Date().toISOString(), error: 'Health check failed' },
        redis: { status: 'unhealthy', last_checked: new Date().toISOString(), error: 'Health check failed' },
        external_apis: { status: 'unhealthy', last_checked: new Date().toISOString(), error: 'Health check failed' }
      },
      metrics: {
        memory_usage: HealthChecker['getMemoryUsage'](),
        response_time: 0,
        active_connections: 0
      }
    };

    return res.status(500).json({
      health: errorHealth,
      message: 'Health check failed'
    });
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'healthy':
      return 'All systems operational';
    case 'degraded':
      return 'Some systems experiencing issues but service is available';
    case 'unhealthy':
      return 'Service is experiencing significant issues';
    default:
      return 'Unknown status';
  }
}

// Export types for use in other parts of the application
export type { HealthCheck, ServiceHealth, MemoryUsage, HealthResponse };