# File: backend/src/config/redis.ts
# Extension: .ts

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config, redisConfig } from './index';

// Redis client instances
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

// Connection retry configuration
const retryConfig = {
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Create Redis client with proper configuration
 */
function createRedisClient(purpose: string = 'main'): Redis {
  const client = redisConfig.url 
    ? new Redis(redisConfig.url, {
        ...retryConfig,
        keyPrefix: redisConfig.keyPrefix,
        lazyConnect: true,
      })
    : new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        keyPrefix: redisConfig.keyPrefix,
        ...retryConfig,
      });

  // Event listeners
  client.on('connect', () => {
    logger.info(`✅ Redis ${purpose} client connected`);
  });

  client.on('ready', () => {
    logger.info(`🚀 Redis ${purpose} client ready`);
  });

  client.on('error', (error) => {
    logger.error(`❌ Redis ${purpose} client error:`, error);
  });

  client.on('close', () => {
    logger.warn(`⚠️ Redis ${purpose} client connection closed`);
  });

  client.on('reconnecting', (delay) => {
    logger.info(`🔄 Redis ${purpose} client reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    logger.warn(`🔚 Redis ${purpose} client connection ended`);
  });

  return client;
}

/**
 * Initialize Redis connections
 */
export async function connectRedis(): Promise<{
  client: Redis;
  subscriber: Redis;
  publisher: Redis;
}> {
  try {
    if (redisClient && redisSubscriber && redisPublisher) {
      return { client: redisClient, subscriber: redisSubscriber, publisher: redisPublisher };
    }

    logger.info('🔗 Connecting to Redis...');

    // Create main client
    redisClient = createRedisClient('main');
    await redisClient.connect();

    // Create subscriber client (for pub/sub)
    redisSubscriber = createRedisClient('subscriber');
    await redisSubscriber.connect();

    // Create publisher client (for pub/sub)
    redisPublisher = createRedisClient('publisher');
    await redisPublisher.connect();

    // Test connections
    await redisClient.ping();
    await redisSubscriber.ping();
    await redisPublisher.ping();

    logger.info('✅ All Redis clients connected successfully');

    return { client: redisClient, subscriber: redisSubscriber, publisher: redisPublisher };
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw new Error(`Redis connection failed: ${error.message}`);
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Get Redis subscriber client
 */
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not connected. Call connectRedis() first.');
  }
  return redisSubscriber;
}

/**
 * Get Redis publisher client
 */
export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    throw new Error('Redis publisher not connected. Call connectRedis() first.');
  }
  return redisPublisher;
}

/**
 * Redis health check
 */
export async function checkRedisHealth(): Promise<{
  status: boolean;
  details: Record<string, any>;
}> {
  const health = {
    status: false,
    details: {} as Record<string, any>,
  };

  try {
    if (redisClient) {
      const info = await redisClient.info();
      const dbSize = await redisClient.dbsize();
      const memory = await redisClient.memory('usage');
      
      health.status = true;
      health.details = {
        connected: true,
        dbSize,
        memoryUsage: memory,
        uptime: info.split('\n').find(line => line.startsWith('uptime_in_seconds')),
        version: info.split('\n').find(line => line.startsWith('redis_version')),
      };
    } else {
      health.details = { connected: false, error: 'Client not initialized' };
    }
  } catch (error) {
    health.details = { connected: false, error: error.message };
  }

  return health;
}

/**
 * Cache management utilities
 */
export class CacheManager {
  private client: Redis;
  
  constructor() {
    this.client = getRedisClient();
  }

  /**
   * Set cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const serializedValue = JSON.stringify(value);
    await this.client.setex(key, ttlSeconds, serializedValue);
  }

  /**
   * Get cache value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  /**
   * Set cache with pattern-based expiration
   */
  async setPattern(pattern: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await this.set(pattern, value, ttlSeconds);
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(`${redisConfig.keyPrefix}${pattern}`);
    if (keys.length === 0) return 0;
    
    return await this.client.del(...keys);
  }

  /**
   * Increment counter
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    return await this.client.incrby(key, increment);
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.client.mget(...keys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    });
  }

  /**
   * Set multiple keys
   */
  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
    const pipeline = this.client.pipeline();
    
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        pipeline.setex(key, ttlSeconds, serializedValue);
      } else {
        pipeline.set(key, serializedValue);
      }
    });
    
    await pipeline.exec();
  }
}

/**
 * Session management utilities
 */
export class SessionManager {
  private client: Redis;
  private keyPrefix: string = 'session:';
  
  constructor() {
    this.client = getRedisClient();
  }

  /**
   * Create session
   */
  async createSession(sessionId: string, data: any, ttlSeconds: number = 86400): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Get session data
   */
  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `${this.keyPrefix}${sessionId}`;
    const data = await this.client.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;
    
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    } else {
      // Preserve existing TTL
      const currentTtl = await this.client.ttl(key);
      await this.client.setex(key, Math.max(currentTtl, 3600), JSON.stringify(data));
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `${this.keyPrefix}${sessionId}`;
    const result = await this.client.del(key);
    return result > 0;
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttlSeconds: number = 86400): Promise<boolean> {
    const key = `${this.keyPrefix}${sessionId}`;
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }
}

/**
 * Pub/Sub utilities
 */
export class PubSubManager {
  private publisher: Redis;
  private subscriber: Redis;
  
  constructor() {
    this.publisher = getRedisPublisher();
    this.subscriber = getRedisSubscriber();
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<number> {
    const serializedMessage = JSON.stringify(message);
    return await this.publisher.publish(channel, serializedMessage);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch {
          callback(message);
        }
      }
    });
    
    await this.subscriber.subscribe(channel);
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }
}

/**
 * Graceful Redis disconnection
 */
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis main client disconnected');
    }

    if (redisSubscriber) {
      await redisSubscriber.quit();
      redisSubscriber = null;
      logger.info('✅ Redis subscriber disconnected');
    }

    if (redisPublisher) {
      await redisPublisher.quit();
      redisPublisher = null;
      logger.info('✅ Redis publisher disconnected');
    }
  } catch (error) {
    logger.error('❌ Error during Redis disconnection:', error);
    throw error;
  }
}

// Initialize Redis instances
export const cache = new CacheManager();
export const sessions = new SessionManager();
export const pubsub = new PubSubManager();

// Cleanup on process termination
process.on('SIGINT', async () => {
  await disconnectRedis();
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
});

export default {
  connect: connectRedis,
  disconnect: disconnectRedis,
  health: checkRedisHealth,
  client: getRedisClient,
  subscriber: getRedisSubscriber,
  publisher: getRedisPublisher,
  cache,
  sessions,
  pubsub,
};