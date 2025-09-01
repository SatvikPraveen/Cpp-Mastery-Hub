// File: backend/src/types/config.ts
// Extension: .ts
// Location: backend/src/types/config.ts

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    port: number;
    host: string;
    apiPrefix: string;
    corsOrigins: string[];
    trustProxy: boolean;
  };
  
  database: {
    postgres: {
      url: string;
      poolSize: number;
      connectionTimeout: number;
      idleTimeout: number;
      ssl: boolean;
    };
    mongodb: {
      url: string;
      maxPoolSize: number;
      minPoolSize: number;
      maxIdleTime: number;
    };
    redis: {
      url: string;
      maxRetries: number;
      retryDelay: number;
      commandTimeout: number;
    };
  };
  
  auth: {
    jwt: {
      secret: string;
      expiresIn: string;
      algorithm: string;
    };
    refresh: {
      secret: string;
      expiresIn: string;
    };
    session: {
      secret: string;
      maxAge: number;
      secure: boolean;
      httpOnly: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
    bcrypt: {
      rounds: number;
    };
  };
  
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    keyGenerator?: string;
  };
  
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    destination: string;
    preserveFileName: boolean;
  };
  
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: {
      name: string;
      address: string;
    };
    templates: {
      welcome: string;
      passwordReset: string;
      emailVerification: string;
    };
  };
  
  cppEngine: {
    url: string;
    timeout: number;
    retries: number;
    retryDelay: number;
  };
  
  security: {
    helmet: {
      contentSecurityPolicy: boolean;
      crossOriginEmbedderPolicy: boolean;
      dnsPrefetchControl: boolean;
      frameguard: boolean;
      hidePoweredBy: boolean;
      hsts: boolean;
      ieNoOpen: boolean;
      noSniff: boolean;
      originAgentCluster: boolean;
      permittedCrossDomainPolicies: boolean;
      referrerPolicy: boolean;
      xssFilter: boolean;
    };
    encryption: {
      algorithm: string;
      key: string;
      iv: string;
    };
  };
  
  monitoring: {
    prometheus: {
      enabled: boolean;
      endpoint: string;
      collectDefaultMetrics: boolean;
    };
    logging: {
      level: LogLevel;
      file: {
        enabled: boolean;
        filename: string;
        maxsize: number;
        maxFiles: number;
      };
      console: {
        enabled: boolean;
        colorize: boolean;
      };
    };
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
    };
  };
  
  websocket: {
    pingTimeout: number;
    pingInterval: number;
    upgradeTimeout: number;
    maxHttpBufferSize: number;
    allowEIO3: boolean;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
  };
}