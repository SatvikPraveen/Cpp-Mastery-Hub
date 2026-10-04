import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { authenticateToken } from './api/middleware/auth';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { createIPRateLimit } from './api/middleware/ratelimit';
import adminRoutes from './api/routes/admin';
import analysisRoutes from './api/routes/analysis';
import authRoutes from './api/routes/auth';
import codeRoutes from './api/routes/code';
import communityRoutes from './api/routes/community';
import { learningRouter } from './api/routes/learning';
import notificationRoutes from './api/routes/notifications';
import userRoutes from './api/routes/users';
import { config, securityConfig } from './config';
import { checkDatabaseHealth } from './config/database';
import { engineClient } from './services/engine/engine-client';
import { morganStream } from './utils/logger';

/**
 * Builds the Express application without opening a port, so tests can drive it with supertest.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind the Nginx reverse proxy in every deployment

  app.use(helmet());
  app.use(
    cors({
      origin: securityConfig.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(compression());
  // Source files are capped at 256 KiB by the engine client; 1 MiB leaves room for JSON overhead.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  if (config.NODE_ENV !== 'test') {
    app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));
  }

  /** Liveness plus dependency status; 503 when the database is unreachable. */
  app.get(['/health', '/api/health'], (_req, res, next) => {
    Promise.all([
      checkDatabaseHealth(),
      engineClient.health().then(
        (h) => ({ ok: true, detail: h.engine }),
        (e: unknown) => ({ ok: false, detail: e instanceof Error ? e.message : 'unreachable' })
      ),
    ])
      .then(([db, engine]) => {
        res.status(db.postgres ? 200 : 503).json({
          status: db.postgres ? 'ok' : 'degraded',
          uptimeSeconds: Math.round(process.uptime()),
          dependencies: { database: db.details['postgres'], engine: engine.detail },
        });
      })
      .catch(next);
  });

  app.use('/api', createIPRateLimit({ windowMs: 15 * 60_000, maxRequests: securityConfig.rateLimit.max }));
  app.use('/api/auth', authRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/code', codeRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/users', authenticateToken, userRoutes);
  app.use('/api/learning', learningRouter);
  app.use('/api/notifications', authenticateToken, notificationRoutes);
  app.use('/api/admin', authenticateToken, adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
