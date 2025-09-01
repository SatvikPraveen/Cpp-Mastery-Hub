// File: backend/src/types/auth.ts
// Extension: .ts
// Location: backend/src/types/auth.ts

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export interface AuthResponse {
  success: boolean;
  user?: Partial<User>;
  tokens?: AuthTokens;
  message?: string;
  error?: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}