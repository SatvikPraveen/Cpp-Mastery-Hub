// File: backend/src/types/events.ts
// Extension: .ts
// Location: backend/src/types/events.ts

export interface EventPayload<T = any> {
  type: string;
  data: T;
  metadata: {
    timestamp: Date;
    source: string;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    version: string;
  };
}

export interface UserEvent extends EventPayload {
  type: 'user.registered' | 'user.login' | 'user.logout' | 'user.updated' | 'user.deleted';
  data: {
    userId: string;
    email?: string;
    username?: string;
    role?: UserRole;
    [key: string]: any;
  };
}

export interface CodeEvent extends EventPayload {
  type: 'code.analyzed' | 'code.executed' | 'code.saved' | 'code.shared';
  data: {
    userId: string;
    codeId?: string;
    language: string;
    linesOfCode?: number;
    executionTime?: number;
    hasErrors?: boolean;
    [key: string]: any;
  };
}

export interface LearningEvent extends EventPayload {
  type: 'course.enrolled' | 'lesson.completed' | 'exercise.submitted' | 'achievement.unlocked';
  data: {
    userId: string;
    courseId?: string;
    lessonId?: string;
    exerciseId?: string;
    achievementId?: string;
    score?: number;
    timeSpent?: number;
    [key: string]: any;
  };
}

export interface CollaborationEvent extends EventPayload {
  type: 'collaboration.created' | 'collaboration.joined' | 'collaboration.left' | 'collaboration.ended';
  data: {
    collaborationId: string;
    ownerId: string;
    participantId?: string;
    participantCount?: number;
    duration?: number;
    [key: string]: any;
  };
}

export interface SecurityEvent extends EventPayload {
  type: 'security.login_failed' | 'security.rate_limited' | 'security.suspicious_activity';
  data: {
    userId?: string;
    ipAddress: string;
    userAgent: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    [key: string]: any;
  };
}

export interface SystemEvent extends EventPayload {
  type: 'system.startup' | 'system.shutdown' | 'system.error' | 'system.maintenance';
  data: {
    service: string;
    version: string;
    environment: string;
    error?: string;
    [key: string]: any;
  };
}

export type DomainEvent = 
  | UserEvent 
  | CodeEvent 
  | LearningEvent 
  | CollaborationEvent 
  | SecurityEvent 
  | SystemEvent;

export interface EventHandler<T extends EventPayload = EventPayload> {
  handle(event: T): Promise<void>;
}

export interface EventBus {
  publish<T extends EventPayload>(event: T): Promise<void>;
  subscribe<T extends EventPayload>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}