// File: backend/src/types/collaboration.ts
// Extension: .ts
// Location: backend/src/types/collaboration.ts

export interface Collaboration {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  owner?: Partial<User>;
  code?: string;
  language: string;
  isActive: boolean;
  maxParticipants: number;
  participants: CollaborationParticipant[];
  permissions: CollaborationPermissions;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationParticipant {
  id: string;
  userId: string;
  user?: Partial<User>;
  collaborationId: string;
  role: CollaborationRole;
  permissions: ParticipantPermissions;
  isOnline: boolean;
  lastActivity?: Date;
  cursor?: CursorPosition;
  joinedAt: Date;
}

export enum CollaborationRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export interface CollaborationPermissions {
  allowEdit: boolean;
  allowExecute: boolean;
  allowInvite: boolean;
  allowChat: boolean;
  allowVoice: boolean;
  requireApproval: boolean;
}

export interface ParticipantPermissions {
  canEdit: boolean;
  canExecute: boolean;
  canInvite: boolean;
  canChat: boolean;
  canManageParticipants: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CollaborationEvent {
  id: string;
  collaborationId: string;
  userId: string;
  type: CollaborationEventType;
  data: any;
  timestamp: Date;
}

export enum CollaborationEventType {
  JOIN = 'JOIN',
  LEAVE = 'LEAVE',
  CODE_CHANGE = 'CODE_CHANGE',
  CURSOR_MOVE = 'CURSOR_MOVE',
  SELECTION_CHANGE = 'SELECTION_CHANGE',
  EXECUTE = 'EXECUTE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  ROLE_CHANGE = 'ROLE_CHANGE'
}

export interface CodeChange {
  id: string;
  collaborationId: string;
  userId: string;
  operation: OperationType;
  position: Position;
  content: string;
  timestamp: Date;
}

export enum OperationType {
  INSERT = 'INSERT',
  DELETE = 'DELETE',
  REPLACE = 'REPLACE'
}

export interface Position {
  line: number;
  column: number;
}

export interface ChatMessage {
  id: string;
  collaborationId: string;
  userId: string;
  user?: Partial<User>;
  content: string;
  type: MessageType;
  replyTo?: string;
  timestamp: Date;
}

export enum MessageType {
  TEXT = 'TEXT',
  CODE_SNIPPET = 'CODE_SNIPPET',
  SYSTEM = 'SYSTEM'
}

export interface CollaborationInvite {
  id: string;
  collaborationId: string;
  inviterId: string;
  inviteeId: string;
  email?: string;
  role: CollaborationRole;
  message?: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}