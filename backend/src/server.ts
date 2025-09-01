// File: backend/src/server.ts
// Extension: .ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import config from './config';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { authMiddleware } from './api/middleware/auth';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeMongoDB } from './config/mongodb';

// Routes
import authRoutes from './api/routes/auth';
import userRoutes from './api/routes/users';
import codeRoutes from './api/routes/code';
import learningRoutes from './api/routes/learning';
import communityRoutes from './api/routes/community';
import analysisRoutes from './api/routes/analysis';
import adminRoutes from './api/routes/admin';

// Services
import { CodeExecutionService } from './services/compiler/execution-service';
import { AnalysisService } from './services/analyzer/analysis-service';
import { LearningService } from './services/learning/learning-service';
import { NotificationService } from './services/notification/notification-service';

// Socket handlers
import { handleCodeExecution } from './api/sockets/code-execution';
import { handleRealTimeCollaboration } from './api/sockets/collaboration';
import { handleLearningProgress } from './api/sockets/learning';

dotenv.config();

class CPPMasteryServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port || 8000;
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: config.rateLimit.max, // requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Stricter rate limiting for code execution
    const codeExecutionLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // 10 executions per minute
      message: 'Too many code executions, please slow down.',
    });
    this.app.use('/api/code/execute', codeExecutionLimiter);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging
    const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
    this.app.use(morgan(morganFormat, {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API documentation
    if (config.nodeEnv !== 'production') {
      this.setupSwagger();
    }
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authMiddleware, userRoutes);
    this.app.use('/api/code', authMiddleware, codeRoutes);
    this.app.use('/api/learning', authMiddleware, learningRoutes);
    this.app.use('/api/community', communityRoutes);
    this.app.use('/api/analysis', authMiddleware, analysisRoutes);
    this.app.use('/api/admin', authMiddleware, adminRoutes);

    // Static file serving
    this.app.use('/static', express.static('public'));
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeSocketHandlers(): void {
    this.io.use((socket, next) => {
      // Socket authentication middleware
      const token = socket.handshake.auth.token;
      if (token) {
        // Verify JWT token
        // Add user to socket object
      }
      next();
    });

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle code execution events
      handleCodeExecution(socket, this.io);

      // Handle real-time collaboration
      handleRealTimeCollaboration(socket, this.io);

      // Handle learning progress updates
      handleLearningProgress(socket, this.io);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupSwagger(): void {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  public async start(): Promise<void> {
    try {
      // Initialize databases
      await initializeDatabase();
      await initializeRedis();
      await initializeMongoDB();

      // Initialize services
      await this.initializeServices();

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`🚀 C++ Mastery Hub server running on port ${this.port}`);
        logger.info(`📚 Environment: ${config.nodeEnv}`);
        logger.info(`📖 API Documentation: http://localhost:${this.port}/api-docs`);
        logger.info(`🔥 WebSocket server ready for connections`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize code execution service
    const codeExecutionService = new CodeExecutionService();
    await codeExecutionService.initialize();

    // Initialize analysis service
    const analysisService = new AnalysisService();
    await analysisService.initialize();

    // Initialize learning service
    const learningService = new LearningService();
    await learningService.initialize();

    // Initialize notification service
    const notificationService = new NotificationService();
    await notificationService.initialize();

    logger.info('✅ All services initialized successfully');
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Close server
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close socket connections
      this.io.close(() => {
        logger.info('Socket.IO server closed');
      });

      // Close database connections
      // await prisma.$disconnect();
      // await redis.disconnect();
      // await mongoose.disconnect();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the server
const server = new CPPMasteryServer();
server.start().catch((error) => {
  logger.error('Failed to start C++ Mastery Hub server:', error);
  process.exit(1);
});

export default server;