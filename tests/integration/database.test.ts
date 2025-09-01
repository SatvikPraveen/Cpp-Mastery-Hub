// File: tests/integration/database.test.ts
// Extension: .ts
// Location: tests/integration/database.test.ts

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { MongoClient, Db } from 'mongodb';
import Redis from 'redis';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let mongodb: Db;
  let redis: any;
  let mongoClient: any;

  beforeAll(async () => {
    // Initialize database connections
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test123@localhost:5433/cppmastery_test'
        }
      }
    });

    mongoClient = new MongoClient(
      process.env.MONGODB_URL || 'mongodb://test:test123@localhost:27018/cppmastery_test'
    );
    await mongoClient.connect();
    mongodb = mongoClient.db('cppmastery_test');

    redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6380'
    });
    await redis.connect();

    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    await mongoClient.close();
    await redis.quit();
  });

  describe('PostgreSQL Operations', () => {
    test('should create and retrieve user', async () => {
      const userData = {
        email: 'db-test@example.com',
        username: 'dbtestuser',
        passwordHash: 'hashedpassword123'
      };

      // Create user
      const createdUser = await prisma.user.create({
        data: userData
      });

      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.username).toBe(userData.username);

      // Retrieve user
      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id }
      });

      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser!.email).toBe(userData.email);
    });

    test('should handle user relationships', async () => {
      const userData = {
        email: 'relationship-test@example.com',
        username: 'relationshipuser',
        passwordHash: 'hashedpassword123'
      };

      const user = await prisma.user.create({ data: userData });

      // Create code snippet
      const snippetData = {
        title: 'Test Snippet',
        description: 'A test code snippet',
        code: '#include <iostream>\nint main() { return 0; }',
        language: 'cpp',
        authorId: user.id
      };

      const snippet = await prisma.codeSnippet.create({
        data: snippetData
      });

      // Retrieve user with snippets
      const userWithSnippets = await prisma.user.findUnique({
        where: { id: user.id },
        include: { codeSnippets: true }
      });

      expect(userWithSnippets!.codeSnippets).toHaveLength(1);
      expect(userWithSnippets!.codeSnippets[0].title).toBe(snippetData.title);
    });

    test('should enforce database constraints', async () => {
      const userData = {
        email: 'constraint-test@example.com',
        username: 'constraintuser',
        passwordHash: 'hashedpassword123'
      };

      await prisma.user.create({ data: userData });

      // Try to create user with same email
      await expect(
        prisma.user.create({
          data: { ...userData, username: 'differentuser' }
        })
      ).rejects.toThrow();

      // Try to create user with same username
      await expect(
        prisma.user.create({
          data: { ...userData, email: 'different@example.com' }
        })
      ).rejects.toThrow();
    });
  });

  describe('MongoDB Operations', () => {
    test('should store and retrieve forum posts', async () => {
      const postData = {
        title: 'MongoDB Test Post',
        content: 'This is a test post stored in MongoDB',
        authorId: 'test-user-id',
        category: 'GENERAL',
        tags: ['test', 'mongodb'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert post
      const result = await mongodb.collection('forum_posts').insertOne(postData);
      expect(result.insertedId).toBeDefined();

      // Retrieve post
      const retrievedPost = await mongodb.collection('forum_posts').findOne({
        _id: result.insertedId
      });

      expect(retrievedPost).toBeTruthy();
      expect(retrievedPost!.title).toBe(postData.title);
      expect(retrievedPost!.content).toBe(postData.content);
    });

    test('should handle complex queries', async () => {
      const posts = [
        {
          title: 'C++ Basics',
          content: 'Learning C++ fundamentals',
          authorId: 'user1',
          category: 'TUTORIALS',
          tags: ['cpp', 'basics'],
          createdAt: new Date()
        },
        {
          title: 'Advanced Templates',
          content: 'Template metaprogramming in C++',
          authorId: 'user2',
          category: 'TUTORIALS',
          tags: ['cpp', 'advanced', 'templates'],
          createdAt: new Date()
        }
      ];

      await mongodb.collection('forum_posts').insertMany(posts);

      // Query by category
      const tutorialPosts = await mongodb.collection('forum_posts')
        .find({ category: 'TUTORIALS' })
        .toArray();

      expect(tutorialPosts.length).toBeGreaterThanOrEqual(2);

      // Query by tags
      const advancedPosts = await mongodb.collection('forum_posts')
        .find({ tags: { $in: ['advanced'] } })
        .toArray();

      expect(advancedPosts.length).toBeGreaterThanOrEqual(1);
    });

    test('should support text search', async () => {
      // Create text index
      await mongodb.collection('forum_posts').createIndex({
        title: 'text',
        content: 'text'
      });

      const searchResults = await mongodb.collection('forum_posts')
        .find({ $text: { $search: 'C++ templates' } })
        .toArray();

      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('Redis Operations', () => {
    test('should store and retrieve cache data', async () => {
      const key = 'test:cache:key';
      const value = JSON.stringify({
        message: 'Hello Redis',
        timestamp: Date.now()
      });

      // Set cache
      await redis.set(key, value, { EX: 3600 }); // 1 hour expiry

      // Get cache
      const retrievedValue = await redis.get(key);
      expect(retrievedValue).toBe(value);

      const parsedValue = JSON.parse(retrievedValue);
      expect(parsedValue.message).toBe('Hello Redis');
    });

    test('should handle session data', async () => {
      const sessionId = 'test-session-id';
      const sessionData = {
        userId: 'user123',
        email: 'session@test.com',
        loginTime: Date.now()
      };

      // Store session
      await redis.hSet(`session:${sessionId}`, sessionData);
      await redis.expire(`session:${sessionId}`, 86400); // 24 hours

      // Retrieve session
      const retrievedSession = await redis.hGetAll(`session:${sessionId}`);
      expect(retrievedSession.userId).toBe(sessionData.userId);
      expect(retrievedSession.email).toBe(sessionData.email);
    });

    test('should support pub/sub for real-time features', async () => {
      const subscriber = redis.duplicate();
      await subscriber.connect();

      const publisher = redis.duplicate();
      await publisher.connect();

      return new Promise(async (resolve) => {
        await subscriber.subscribe('test-channel', (message) => {
          expect(message).toBe('Hello PubSub');
          subscriber.quit();
          publisher.quit();
          resolve(true);
        });

        await publisher.publish('test-channel', 'Hello PubSub');
      });
    });

    test('should handle rate limiting data', async () => {
      const userId = 'rate-limit-test-user';
      const key = `rate_limit:${userId}`;

      // Simulate multiple requests
      for (let i = 0; i < 5; i++) {
        await redis.incr(key);
        await redis.expire(key, 60); // 1 minute window
      }

      const requestCount = await redis.get(key);
      expect(parseInt(requestCount)).toBe(5);

      // Check if rate limit exceeded
      const isLimited = parseInt(requestCount) > 3;
      expect(isLimited).toBe(true);
    });
  });

  describe('Cross-Database Consistency', () => {
    test('should maintain data consistency across databases', async () => {
      // Create user in PostgreSQL
      const userData = {
        email: 'consistency@test.com',
        username: 'consistencyuser',
        passwordHash: 'hashedpassword123'
      };

      const user = await prisma.user.create({ data: userData });

      // Create related data in MongoDB
      const forumPostData = {
        title: 'Consistency Test Post',
        content: 'Testing cross-database consistency',
        authorId: user.id,
        category: 'GENERAL',
        createdAt: new Date()
      };

      const mongoResult = await mongodb.collection('forum_posts').insertOne(forumPostData);

      // Store reference in Redis
      await redis.set(
        `user:${user.id}:latest_post`,
        mongoResult.insertedId.toString(),
        { EX: 3600 }
      );

      // Verify consistency
      const redisPostId = await redis.get(`user:${user.id}:latest_post`);
      expect(redisPostId).toBe(mongoResult.insertedId.toString());

      const mongoPost = await mongodb.collection('forum_posts').findOne({
        _id: mongoResult.insertedId
      });
      expect(mongoPost!.authorId).toBe(user.id);
    });
  });

  describe('Database Performance', () => {
    test('should handle bulk operations efficiently', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        email: `bulk-test-${i}@example.com`,
        username: `bulkuser${i}`,
        passwordHash: 'hashedpassword123'
      }));

      const startTime = Date.now();
      
      // Bulk create users
      await prisma.user.createMany({
        data: users,
        skipDuplicates: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all users were created
      const userCount = await prisma.user.count({
        where: {
          email: { startsWith: 'bulk-test-' }
        }
      });

      expect(userCount).toBe(100);
    });

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `concurrent-${i}@example.com`,
            username: `concurrent${i}`,
            passwordHash: 'hashedpassword123'
          }
        })
      );

      const results = await Promise.all(concurrentOperations);
      
      expect(results).toHaveLength(10);
      results.forEach((user, index) => {
        expect(user.email).toBe(`concurrent-${index}@example.com`);
      });
    });
  });

  async function cleanupTestData(): Promise<void> {
    try {
      // Clean PostgreSQL test data
      await prisma.codeSnippet.deleteMany({
        where: {
          author: {
            email: { contains: 'test' }
          }
        }
      });

      await prisma.user.deleteMany({
        where: {
          email: { contains: 'test' }
        }
      });

      // Clean MongoDB test data
      await mongodb.collection('forum_posts').deleteMany({
        title: { $regex: /test/i }
      });

      // Clean Redis test data
      const keys = await redis.keys('test:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }

      const sessionKeys = await redis.keys('session:test-*');
      if (sessionKeys.length > 0) {
        await redis.del(sessionKeys);
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
});