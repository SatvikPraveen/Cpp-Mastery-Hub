// File: backend/src/types/websocket.ts
// Extension: .ts
// Location: backend/src/types/websocket.ts

export interface WebSocketEvent<T = any> {
  type: string;
  payload: T;
  meta?: {
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  };
}

export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;
  
  // Collaboration
  join_collaboration: (collaborationId: string) => void;
  leave_collaboration: (collaborationId: string) => void;
  code_change: (data: CodeChangeData) => void;
  cursor_move: (data: CursorData) => void;
  selection_change: (data: SelectionData) => void;
  chat_message: (data: ChatMessageData) => void;
  
  // Code execution
  execute_code: (data: CodeExecutionData) => void;
  
  // Presence
  user_typing: (data: TypingData) => void;
  user_idle: () => void;
  user_active: () => void;
}

export interface ServerToClientEvents {
  // Connection
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (error: ErrorData) => void;
  
  // Authentication
  authenticated: (user: Partial<User>) => void;
  authentication_failed: (error: string) => void;
  
  // Collaboration
  collaboration_joined: (data: CollaborationJoinedData) => void;
  collaboration_left: (data: CollaborationLeftData) => void;
  user_joined: (user: CollaborationParticipant) => void;
  user_left: (userId: string) => void;
  code_changed: (data: CodeChangeData) => void;
  cursor_moved: (data: CursorData) => void;
  selection_changed: (data: SelectionData) => void;
  chat_message_received: (data: ChatMessageData) => void;
  
  // Code execution
  execution_started: (data: ExecutionStartedData) => void;
  execution_output: (data: ExecutionOutputData) => void;
  execution_completed: (data: ExecutionCompletedData) => void;
  execution_error: (data: ExecutionErrorData) => void;
  
  // Presence
  user_typing: (data: TypingData) => void;
  user_stopped_typing: (userId: string) => void;
  presence_update: (data: PresenceData) => void;
  
  // Notifications
  notification: (notification: Notification) => void;
  achievement_unlocked: (achievement: Achievement) => void;
}

export interface CodeChangeData {
  collaborationId: string;
  operation: OperationType;
  position: Position;
  content: string;
  userId: string;
}

export interface CursorData {
  collaborationId: string;
  userId: string;
  position: CursorPosition;
}

export interface SelectionData {
  collaborationId: string;
  userId: string;
  selection: {
    start: Position;
    end: Position;
  };
}

export interface ChatMessageData {
  collaborationId: string;
  content: string;
  type: MessageType;
  replyTo?: string;
}

export interface CodeExecutionData {
  collaborationId?: string;
  code: string;
  language: string;
  input?: string;
  config?: ExecutionConfig;
}

export interface TypingData {
  collaborationId: string;
  userId: string;
  isTyping: boolean;
}

export interface CollaborationJoinedData {
  collaboration: Collaboration;
  participants: CollaborationParticipant[];
  recentMessages: ChatMessage[];
}

export interface CollaborationLeftData {
  collaborationId: string;
  reason?: string;
}

export interface ExecutionStartedData {
  executionId: string;
  collaborationId?: string;
}

export interface ExecutionOutputData {
  executionId: string;
  output: string;
  type: 'stdout' | 'stderr';
}

export interface ExecutionCompletedData {
  executionId: string;
  result: CodeExecutionResponse;
}

export interface ExecutionErrorData {
  executionId: string;
  error: string;
}

export interface PresenceData {
  collaborationId: string;
  onlineUsers: Array<{
    userId: string;
    username: string;
    avatar?: string;
    role: CollaborationRole;
    lastActivity: Date;
  }>;
}

export interface ErrorData {
  code: string;
  message: string;
  details?: any;
}