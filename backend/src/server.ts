import { createServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app';
import { config, securityConfig } from './config';
import { connectDatabase, disconnectDatabases } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { verifyAccessToken } from './services/auth/jwt';
import { notificationService } from './services/notification/notification-service';
import { getErrorMessage } from './utils/errors';
import { logger } from './utils/logger';

/**
 * Process entry point: connects dependencies, serves HTTP and a Socket.IO endpoint, and shuts
 * down gracefully on SIGINT/SIGTERM.
 *
 * Socket.IO is used for server-to-client notifications only. Each authenticated socket joins
 * the room `user:<id>`; services publish to that room. There are no client-to-server code
 * execution events (see docs/research/threat-model.md).
 */
async function main(): Promise<void> {
  const app = createApp();
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: securityConfig.corsOrigin, credentials: true },
    maxHttpBufferSize: 1e5,
  });

  io.use((socket, next) => {
    const token: unknown = socket.handshake.auth['token'];
    const claims = typeof token === 'string' ? verifyAccessToken(token) : null;
    if (!claims) {
      next(new Error('Authentication required'));
      return;
    }
    socket.data['userId'] = claims.userId;
    next();
  });

  notificationService.setPublisher((userId, notification) => {
    io.to(`user:${userId}`).emit('notification', notification);
  });

  io.on('connection', (socket) => {
    const userId = String(socket.data['userId']);
    void socket.join(`user:${userId}`);
    logger.debug('Socket connected', { socketId: socket.id, userId });
  });

  await connectDatabase();
  // Redis only backs caching and rate limits; without REDIS_URL the in-memory fallbacks are used.
  if (process.env['REDIS_URL']) {
    try {
      await connectRedis();
    } catch (error) {
      logger.warn('Redis unavailable, using in-memory cache and rate limits', {
        error: getErrorMessage(error),
      });
    }
  } else {
    logger.info('REDIS_URL not set: using in-memory cache and rate limits (single instance only)');
  }

  server.listen(config.PORT, config.HOST, () => {
    logger.info(`API listening on http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    void io.close();
    server.close(() => {
      void Promise.allSettled([disconnectDatabases(), disconnectRedis()]).then(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  logger.error('Fatal startup error', { error: getErrorMessage(error) });
  process.exit(1);
});
