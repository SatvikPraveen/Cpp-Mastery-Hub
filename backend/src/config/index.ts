# File: backend/src/config/index.ts
# Extension: .ts

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(8000),
  HOST: z.string().default('localhost'),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default(5432),
  POSTGRES_DB: z.string().default('cpp_mastery_hub'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().min(1),
  
  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // MongoDB Configuration (for community features)
  MONGODB_URL: z.string().default('mongodb://localhost:27017/cpp_mastery_community'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRE: z.string().default('15m'),
  JWT_REFRESH_EXPIRE: z.string().default('7d'),
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  
  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // C++ Engine Configuration
  CPP_ENGINE_URL: z.string().default('http://localhost:9000'),
  CPP_ENGINE_TIMEOUT: z.string().transform(Number).default(30000),
  CPP_ENGINE_API_KEY: z.string().optional(),
  
  // File Upload Configuration
  UPLOAD_MAX_SIZE: z.string().transform(Number).default(10485760), // 10MB
  UPLOAD_ALLOWED_TYPES: z.string().default('cpp,hpp,h,c,cc,cxx'),
  
  // Security Configuration
  BCRYPT_ROUNDS: z.string().transform(Number).default(12),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default(100),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
  
  // Analytics
  ANALYTICS_ENABLED: z.string().transform(Boolean).default(true),
  MIXPANEL_TOKEN: z.string().optional(),
  
  // Frontend URL
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // WebSocket Configuration
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default(30000),
  WS_CONNECTION_TIMEOUT: z.string().transform(Number).default(60000),
});

// Validate and parse environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export const config = parseEnv();

// Database configuration
export const dbConfig = {
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,
  database: config.POSTGRES_DB,
  username: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  url: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production',
  logging: config.NODE_ENV === 'development',
  synchronize: config.NODE_ENV === 'development',
  entities: ['src/models/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
};

// Redis configuration
export const redisConfig = {
  url: config.REDIS_URL,
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  keyPrefix: 'cpp-mastery:',
};

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  expiresIn: config.JWT_EXPIRE,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRE,
  issuer: 'cpp-mastery-hub',
  audience: 'cpp-mastery-users',
};

// OAuth configuration
export const oauthConfig = {
  google: {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: `${config.FRONTEND_URL}/auth/google/callback`,
  },
  github: {
    clientId: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    redirectUri: `${config.FRONTEND_URL}/auth/github/callback`,
  },
};

// Email configuration
export const emailConfig = {
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: config.SMTP_USER && config.SMTP_PASS ? {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  } : undefined,
  from: config.EMAIL_FROM || 'noreply@cppmastery.com',
};

// C++ Engine configuration
export const cppEngineConfig = {
  url: config.CPP_ENGINE_URL,
  timeout: config.CPP_ENGINE_TIMEOUT,
  apiKey: config.CPP_ENGINE_API_KEY,
  endpoints: {
    compile: '/api/compile',
    execute: '/api/execute',
    analyze: '/api/analyze',
    visualize: '/api/visualize',
  },
};

// File upload configuration
export const uploadConfig = {
  maxSize: config.UPLOAD_MAX_SIZE,
  allowedTypes: config.UPLOAD_ALLOWED_TYPES.split(','),
  destination: 'uploads/',
  tempDir: 'temp/',
};

// Security configuration
export const securityConfig = {
  bcryptRounds: config.BCRYPT_ROUNDS,
  sessionSecret: config.SESSION_SECRET,
  corsOrigin: config.CORS_ORIGIN.split(','),
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX,
  },
};

// WebSocket configuration
export const wsConfig = {
  heartbeatInterval: config.WS_HEARTBEAT_INTERVAL,
  connectionTimeout: config.WS_CONNECTION_TIMEOUT,
  rooms: {
    codeExecution: 'code-execution',
    collaboration: 'collaboration',
    learning: 'learning-progress',
  },
};

// Feature flags
export const featureFlags = {
  analyticsEnabled: config.ANALYTICS_ENABLED,
  oauthEnabled: !!(config.GOOGLE_CLIENT_ID || config.GITHUB_CLIENT_ID),
  emailEnabled: !!(config.SMTP_HOST && config.SMTP_USER),
  cppEngineEnabled: true,
  communityEnabled: true,
  adminPanelEnabled: true,
};

// Environment-specific configurations
export const envConfig = {
  development: {
    logLevel: 'debug',
    enableApiDocs: true,
    enableCors: true,
    enableRequestLogging: true,
  },
  production: {
    logLevel: 'info',
    enableApiDocs: false,
    enableCors: false,
    enableRequestLogging: false,
  },
  test: {
    logLevel: 'error',
    enableApiDocs: false,
    enableCors: true,
    enableRequestLogging: false,
  },
}[config.NODE_ENV];

// Export default configuration object
export default {
  ...config,
  db: dbConfig,
  redis: redisConfig,
  jwt: jwtConfig,
  oauth: oauthConfig,
  email: emailConfig,
  cppEngine: cppEngineConfig,
  upload: uploadConfig,
  security: securityConfig,
  ws: wsConfig,
  features: featureFlags,
  env: envConfig,
};

// Configuration validation helper
export const validateConfig = () => {
  const requiredForProduction = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
  ];

  if (config.NODE_ENV === 'production') {
    const missing = requiredForProduction.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    }
  }

  return true;
};

// Initialize configuration
if (require.main === module) {
  try {
    validateConfig();
    console.log('✅ Configuration validated successfully');
    console.log(`🔧 Environment: ${config.NODE_ENV}`);
    console.log(`🚀 Server will run on: ${config.HOST}:${config.PORT}`);
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
}