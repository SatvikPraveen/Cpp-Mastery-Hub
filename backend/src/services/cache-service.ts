import { getRedisClient, isRedisConnected } from '../config/redis';
import { getErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Process-local fallback store used when Redis is not connected (tests, local development
 * without Redis). Entries expire lazily on access and are swept periodically.
 */
export class MemoryStore {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  get(key: string): string | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      // Evict the oldest insertion to bound memory use.
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
    this.entries.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(keys: string[]): number {
    let removed = 0;
    for (const key of keys) {
      if (this.entries.delete(key)) {
        removed++;
      }
    }
    return removed;
  }

  keys(pattern: string): string[] {
    const matcher = globToRegExp(pattern);
    return [...this.entries.keys()].filter((key) => matcher.test(key) && this.get(key) !== null);
  }

  ttl(key: string): number {
    const entry = this.entries.get(key);
    if (!entry || this.get(key) === null) {
      return -2;
    }
    if (entry.expiresAt === null) {
      return -1;
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Convert a Redis-style glob (`*`, `?`) into an anchored regular expression. */
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const source = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  // The pattern is built from escaped input, so it cannot contain user-controlled syntax.
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`^${source}$`);
}

const sharedMemoryStore = new MemoryStore();

/**
 * String key/value cache with TTLs.
 *
 * Uses the shared Redis connection when it is up (see `connectRedis()` in
 * `config/redis.ts`) and transparently falls back to an in-process store otherwise, so
 * callers never fail just because the cache is unavailable.
 */
export class CacheService {
  private readonly memory: MemoryStore;

  constructor(memoryStore: MemoryStore = sharedMemoryStore) {
    this.memory = memoryStore;
  }

  /** Whether reads/writes currently go to Redis. */
  get usingRedis(): boolean {
    return isRedisConnected();
  }

  async get(key: string): Promise<string | null> {
    if (this.usingRedis) {
      try {
        return await getRedisClient().get(key);
      } catch (error) {
        logger.warn('Cache read failed, using in-memory cache', { key, error: getErrorMessage(error) });
      }
    }
    return this.memory.get(key);
  }

  /** Read and JSON-decode a value; returns null on a miss or if the value is not valid JSON. */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.usingRedis) {
      try {
        const redis = getRedisClient();
        if (ttlSeconds && ttlSeconds > 0) {
          await redis.setex(key, ttlSeconds, value);
        } else {
          await redis.set(key, value);
        }
        return;
      } catch (error) {
        logger.warn('Cache write failed, using in-memory cache', { key, error: getErrorMessage(error) });
      }
    }
    this.memory.set(key, value, ttlSeconds);
  }

  /** Redis-style alias: set with expiry in seconds. */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.set(key, value, ttlSeconds);
  }

  /** JSON-encode and store a value. */
  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    if (this.usingRedis) {
      try {
        return await getRedisClient().del(...keys);
      } catch (error) {
        logger.warn('Cache delete failed, using in-memory cache', { error: getErrorMessage(error) });
      }
    }
    return this.memory.del(keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async ttl(key: string): Promise<number> {
    if (this.usingRedis) {
      try {
        return await getRedisClient().ttl(key);
      } catch (error) {
        logger.warn('Cache ttl failed, using in-memory cache', { key, error: getErrorMessage(error) });
      }
    }
    return this.memory.ttl(key);
  }

  /**
   * List keys matching a glob pattern. With Redis this scans incrementally (SCAN) rather
   * than using the blocking KEYS command. Returned keys are without the client key prefix.
   */
  async keys(pattern: string): Promise<string[]> {
    if (this.usingRedis) {
      try {
        const redis = getRedisClient();
        const prefix = typeof redis.options.keyPrefix === 'string' ? redis.options.keyPrefix : '';
        const found: string[] = [];
        let cursor = '0';
        do {
          const [next, batch] = await redis.scan(cursor, 'MATCH', `${prefix}${pattern}`, 'COUNT', 100);
          cursor = next;
          found.push(...batch.map((key) => (prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key)));
        } while (cursor !== '0');
        return found;
      } catch (error) {
        logger.warn('Cache scan failed, using in-memory cache', { pattern, error: getErrorMessage(error) });
      }
    }
    return this.memory.keys(pattern);
  }

  /** Clear the in-process fallback store (does not touch Redis). */
  clearLocal(): void {
    this.memory.clear();
  }
}

export const cacheService = new CacheService();
