// File: backend/src/types/cache.ts
// Extension: .ts
// Location: backend/src/types/cache.ts

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  serialize?: boolean; // Whether to serialize the value
  compress?: boolean; // Whether to compress the value
}

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: Date;
  accessedAt: Date;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  keys(pattern?: string): Promise<string[]>;
  invalidateByTag(tag: string): Promise<void>;
  getStats(): Promise<CacheStats>;
}

export interface CacheKey {
  prefix: string;
  identifier: string;
  version?: string;
}

export const CacheKeys = {
  USER: (userId: string) => `user:${userId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_ACHIEVEMENTS: (userId: string) => `user:achievements:${userId}`,
  USER_PROGRESS: (userId: string) => `user:progress:${userId}`,
  COURSE: (courseId: string) => `course:${courseId}`,
  LESSON: (lessonId: string) => `lesson:${lessonId}`,
  EXERCISE: (exerciseId: string) => `exercise:${exerciseId}`,
  CODE_ANALYSIS: (hash: string) => `analysis:${hash}`,
  CODE_EXECUTION: (hash: string) => `execution:${hash}`,
  FORUM_POST: (postId: string) => `forum:post:${postId}`,
  FORUM_COMMENTS: (postId: string) => `forum:comments:${postId}`,
  COLLABORATION: (collaborationId: string) => `collaboration:${collaborationId}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  API_METRICS: (endpoint: string) => `metrics:api:${endpoint}`,
  SYSTEM_HEALTH: 'system:health',
} as const;