// File: backend/src/types/monitoring.ts
// Extension: .ts
// Location: backend/src/types/monitoring.ts

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface DatabaseMetrics {
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  queryTime: number;
  slowQueries: number;
  deadlocks: number;
  timestamp: Date;
}

export interface ApplicationMetrics {
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  codeExecutions: number;
  analysisRequests: number;
  collaborativeSessions: number;
  timestamp: Date;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: Date;
  details?: {
    version?: string;
    uptime?: number;
    dependencies?: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    }>;
  };
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  service: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export enum AlertType {
  THRESHOLD = 'THRESHOLD',
  ANOMALY = 'ANOMALY',
  AVAILABILITY = 'AVAILABILITY',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
