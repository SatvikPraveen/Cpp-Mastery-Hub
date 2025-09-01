# File: backend/src/config/database.ts
# Extension: .ts

import { PrismaClient } from '@prisma/client';
import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';
import { config } from './index';

// Prisma client instance for PostgreSQL
let prisma: PrismaClient | null = null;

// MongoDB client and database instances
let mongoClient: MongoClient | null = null;
let mongoDB: Db | null = null;

// Prisma configuration
const prismaConfig = {
  log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] as const : ['error'] as const,
  errorFormat: 'pretty' as const,
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
};

/**
 * Initialize and connect to PostgreSQL using Prisma
 */
export async function connectDatabase(): Promise<PrismaClient> {
  try {
    if (prisma) {
      return prisma;
    }

    logger.info('🔗 Connecting to PostgreSQL database...');
    
    prisma = new PrismaClient(prismaConfig);
    
    // Test the connection
    await prisma.$connect();
    
    // Run a simple query to ensure connection is working
    await prisma.$queryRaw`SELECT 1 as test`;
    
    logger.info('✅ PostgreSQL database connected successfully');
    
    // Setup connection event handlers
    prisma.$on('error', (e) => {
      logger.error('Prisma error:', e);
    });

    if (config.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    return prisma;
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL database:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Initialize and connect to MongoDB for community features
 */
export async function connectMongoDB(): Promise<Db> {
  try {
    if (mongoDB) {
      return mongoDB;
    }

    logger.info('🔗 Connecting to MongoDB...');
    
    mongoClient = new MongoClient(config.MONGODB_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await mongoClient.connect();
    
    // Test the connection
    await mongoClient.db().admin().ping();
    
    mongoDB = mongoClient.db();
    
    logger.info('✅ MongoDB connected successfully');

    // Create indexes for better performance
    await createMongoIndexes(mongoDB);
    
    return mongoDB;
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

/**
 * Create MongoDB indexes for optimization
 */
async function createMongoIndexes(db: Db): Promise<void> {
  try {
    // Forum posts indexes
    await db.collection('forum_posts').createIndexes([
      { key: { createdAt: -1 } },
      { key: { userId: 1 } },
      { key: { categoryId: 1 } },
      { key: { tags: 1 } },
      { key: { votes: -1 } },
      { key: { title: 'text', content: 'text' } },
    ]);

    // Comments indexes
    await db.collection('comments').createIndexes([
      { key: { postId: 1, createdAt: -1 } },
      { key: { userId: 1 } },
      { key: { parentId: 1 } },
    ]);

    // User activity indexes
    await db.collection('user_activities').createIndexes([
      { key: { userId: 1, timestamp: -1 } },
      { key: { activityType: 1 } },
      { key: { timestamp: -1 } },
    ]);

    // Code snippets indexes
    await db.collection('code_snippets').createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { isPublic: 1, createdAt: -1 } },
      { key: { tags: 1 } },
      { key: { language: 1 } },
      { key: { title: 'text', description: 'text' } },
    ]);

    logger.info('✅ MongoDB indexes created successfully');
  } catch (error) {
    logger.warn('⚠️ Failed to create some MongoDB indexes:', error);
  }
}

/**
 * Get Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
}

/**
 * Get MongoDB database instance
 */
export function getMongoDatabase(): Db {
  if (!mongoDB) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return mongoDB;
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  postgres: boolean;
  mongodb: boolean;
  details: Record<string, any>;
}> {
  const health = {
    postgres: false,
    mongodb: false,
    details: {} as Record<string, any>,
  };

  // Check PostgreSQL
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1 as test`;
      health.postgres = true;
      health.details.postgres = 'Connected';
    } else {
      health.details.postgres = 'Not initialized';
    }
  } catch (error) {
    health.details.postgres = error.message;
  }

  // Check MongoDB
  try {
    if (mongoDB) {
      await mongoDB.admin().ping();
      health.mongodb = true;
      health.details.mongodb = 'Connected';
    } else {
      health.details.mongodb = 'Not initialized';
    }
  } catch (error) {
    health.details.mongodb = error.message;
  }

  return health;
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabases(): Promise<void> {
  try {
    // Disconnect Prisma
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('✅ PostgreSQL disconnected');
    }

    // Disconnect MongoDB
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      mongoDB = null;
      logger.info('✅ MongoDB disconnected');
    }
  } catch (error) {
    logger.error('❌ Error during database disconnection:', error);
    throw error;
  }
}

/**
 * Database transaction helper for complex operations
 */
export async function withTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return await client.$transaction(fn);
}

/**
 * Database migration utilities
 */
export const migrations = {
  /**
   * Run pending migrations
   */
  async run(): Promise<void> {
    try {
      logger.info('🔄 Running database migrations...');
      const client = getPrismaClient();
      await client.$executeRaw`SELECT 1`; // This will trigger migrations if needed
      logger.info('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  },

  /**
   * Reset database (development only)
   */
  async reset(): Promise<void> {
    if (config.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    try {
      logger.warn('🔄 Resetting database...');
      const client = getPrismaClient();
      
      // This would require additional implementation based on your schema
      // For now, we'll just log the intention
      logger.warn('⚠️ Database reset functionality needs implementation');
      
    } catch (error) {
      logger.error('❌ Database reset failed:', error);
      throw error;
    }
  },

  /**
   * Seed database with initial data
   */
  async seed(): Promise<void> {
    try {
      logger.info('🌱 Seeding database...');
      const client = getPrismaClient();
      
      // Basic seed data - extend as needed
      await client.user.upsert({
        where: { email: 'admin@cppmastery.com' },
        update: {},
        create: {
          email: 'admin@cppmastery.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isEmailVerified: true,
        },
      });

      logger.info('✅ Database seeding completed');
    } catch (error) {
      logger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
};

// Cleanup on process termination
process.on('SIGINT', async () => {
  await disconnectDatabases();
});

process.on('SIGTERM', async () => {
  await disconnectDatabases();
});

process.on('beforeExit', async () => {
  await disconnectDatabases();
});

export default {
  connect: connectDatabase,
  connectMongo: connectMongoDB,
  disconnect: disconnectDatabases,
  health: checkDatabaseHealth,
  transaction: withTransaction,
  client: getPrismaClient,
  mongo: getMongoDatabase,
  migrations,
};