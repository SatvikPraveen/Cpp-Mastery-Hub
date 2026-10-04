import { PrismaClient, type Prisma } from '@prisma/client';

import { getErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

import { config } from './index';

/**
 * PostgreSQL access through the generated Prisma client.
 *
 * `npx prisma generate` must have run (it needs the schema only, not a database); the
 * `type-check`, `build` and `test` scripts do this automatically. Constructing the client does
 * not open a connection: Prisma connects on the first query or on `connectDatabase()`.
 */
export const prisma = new PrismaClient({
  log:
    config.NODE_ENV === 'development'
      ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
      : [{ level: 'error', emit: 'stdout' }],
  errorFormat: config.NODE_ENV === 'production' ? 'minimal' : 'pretty',
});

if (config.NODE_ENV === 'development') {
  (prisma as PrismaClient<Prisma.PrismaClientOptions, 'query'>).$on('query', (event) => {
    logger.debug('Prisma query', {
      query: event.query,
      params: event.params,
      durationMs: event.duration,
    });
  });
}

let connected = false;

/** Connects and verifies the database with a trivial query. Idempotent. */
export async function connectDatabase(): Promise<PrismaClient> {
  if (connected) return prisma;
  try {
    logger.info('Connecting to PostgreSQL database...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    connected = true;
    logger.info('PostgreSQL database connected successfully');
    return prisma;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database', { error: getErrorMessage(error) });
    throw new Error(`Database connection failed: ${getErrorMessage(error)}`);
  }
}

/** Alias kept for the server bootstrap. */
export const initializeDatabase = connectDatabase;

export async function checkDatabaseHealth(): Promise<{
  postgres: boolean;
  details: Record<string, string>;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { postgres: true, details: { postgres: 'Connected' } };
  } catch (error) {
    return { postgres: false, details: { postgres: getErrorMessage(error) } };
  }
}

export async function disconnectDatabases(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');
  } finally {
    connected = false;
  }
}

/** Runs `fn` inside an interactive transaction. */
export function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabases,
  health: checkDatabaseHealth,
  transaction: withTransaction,
  client: prisma,
};
