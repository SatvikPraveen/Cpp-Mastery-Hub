import Redis, { type RedisOptions } from 'ioredis';

import { getErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

import { redisConfig } from './index';

// Redis client instances
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

// Connection configuration shared by all clients
const baseOptions: RedisOptions = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keyPrefix: redisConfig.keyPrefix,
};

/**
 * Create Redis client with proper configuration
 */
function createRedisClient(purpose = 'main'): Redis {
  const client = redisConfig.url
    ? new Redis(redisConfig.url, baseOptions)
    : new Redis({
        ...baseOptions,
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisConfig.password ? { password: redisConfig.password } : {}),
      });

  // Event listeners
  client.on('connect', () => {
    logger.info(`✅ Redis ${purpose} client connected`);
  });

  client.on('ready', () => {
    logger.info(`🚀 Redis ${purpose} client ready`);
  });

  client.on('error', (error: Error) => {
    logger.error(`Redis ${purpose} client error`, { error: error.message });
  });

  client.on('close', () => {
    logger.warn(`⚠️ Redis ${purpose} client connection closed`);
  });

  client.on('reconnecting', (delay: number) => {
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
    logger.error('Failed to connect to Redis', { error: getErrorMessage(error) });
    throw new Error(`Redis connection failed: ${getErrorMessage(error)}`);
  }
}

/**
 * Whether the main Redis client has been connected.
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
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
  details: Record<string, string | number | boolean | undefined>;
}> {
  const health: {
    status: boolean;
    details: Record<string, string | number | boolean | undefined>;
  } = {
    status: false,
    details: {},
  };

  try {
    if (redisClient) {
      const info = await redisClient.info();
      const dbSize = await redisClient.dbsize();
      const lines = info.split('\n');
      const field = (name: string): string | undefined =>
        lines.find((line) => line.startsWith(`${name}:`))?.split(':')[1]?.trim();

      health.status = true;
      health.details = {
        connected: true,
        dbSize,
        memoryUsage: field('used_memory_human'),
        uptime: field('uptime_in_seconds'),
        version: field('redis_version'),
      };
    } else {
      health.details = { connected: false, error: 'Client not initialized' };
    }
  } catch (error) {
    health.details = { connected: false, error: getErrorMessage(error) };
  }

  return health;
}

/**
 * Cache management utilities
 */
export class CacheManager {
  private get client(): Redis {
    return getRedisClient();
  }

  /**
   * Set cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
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
  async setPattern(pattern: string, value: unknown, ttlSeconds = 3600): Promise<void> {
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
  async increment(key: string, increment = 1): Promise<number> {
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
    return values.map((value) => {
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
  async mset(keyValuePairs: Record<string, unknown>, ttlSeconds?: number): Promise<void> {
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
  private readonly keyPrefix = 'session:';

  private get client(): Redis {
    return getRedisClient();
  }

  /**
   * Create session
   */
  async createSession(sessionId: string, data: unknown, ttlSeconds = 86400): Promise<void> {
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
  async updateSession(sessionId: string, data: unknown, ttlSeconds?: number): Promise<void> {
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
  async extendSession(sessionId: string, ttlSeconds = 86400): Promise<boolean> {
    const key = `${this.keyPrefix}${sessionId}`;
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }
}

/**
 * Pub/Sub utilities
 */
export class PubSubManager {
  private get publisher(): Redis {
    return getRedisPublisher();
  }

  private get subscriber(): Redis {
    return getRedisSubscriber();
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: unknown): Promise<number> {
    const serializedMessage = JSON.stringify(message);
    return await this.publisher.publish(channel, serializedMessage);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: unknown) => void): Promise<void> {
    this.subscriber.on('message', (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage: unknown = JSON.parse(message);
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
    logger.error('Error during Redis disconnection', { error: getErrorMessage(error) });
    throw error;
  }
}

// Redis-backed helpers (they resolve the client lazily, so they are safe to import before
// `connectRedis()` has run; calls made before then throw)
export const cache = new CacheManager();
export const sessions = new SessionManager();
export const pubsub = new PubSubManager();

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