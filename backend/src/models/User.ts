// File: backend/src/models/User.ts
// Extension: .ts (TypeScript Model)

import { z } from 'zod';

// Enums
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export enum LearningLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  PRO = 'PRO'
}

// Validation schemas
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase, lowercase, number, and special character'),
  firstName: z.string().min(1, 'First name is required').max(50).optional(),
  lastName: z.string().min(1, 'Last name is required').max(50).optional(),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  learningLevel: z.nativeEnum(LearningLevel).default(LearningLevel.BEGINNER)
});

export const UpdateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  website: z.string().url('Invalid website URL').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  learningLevel: z.nativeEnum(LearningLevel).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    courseReminders: z.boolean().default(true),
    communityUpdates: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    timezone: z.string().default('UTC')
  }).optional()
});

export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase, lowercase, number, and special character')
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase, lowercase, number, and special character')
});

// Type definitions
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  location?: string;
  role: UserRole;
  learningLevel: LearningLevel;
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  isActive: boolean;
  preferences: {
    emailNotifications: boolean;
    courseReminders: boolean;
    communityUpdates: boolean;
    marketingEmails: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
  stats: {
    coursesCompleted: number;
    coursesInProgress: number;
    totalLearningHours: number;
    streakDays: number;
    longestStreak: number;
    pointsEarned: number;
    badgesEarned: number;
    forumPosts: number;
    helpfulAnswers: number;
    reputation: number;
  };
  achievements: UserAchievement[];
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  passwordChangedAt?: Date;
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: string;
  unlockedAt: Date;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserOAuthAccount {
  id: string;
  userId: string;
  provider: 'google' | 'github' | 'discord';
  providerId: string;
  email: string;
  displayName?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessedAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
  score?: number;
  completedLessons: string[];
  bookmarkedLessons: string[];
  notes: UserNote[];
  quizScores: QuizScore[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNote {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  content: string;
  position?: number; // Position in lesson content
  isPrivate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizScore {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number; // in seconds
  answers: QuizAnswer[];
  completedAt: Date;
  attemptNumber: number;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string | string[];
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  paymentMethodId?: string;
  stripePriceId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database model for Prisma/TypeORM
export interface UserModel {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  location?: string;
  role: UserRole;
  learningLevel: LearningLevel;
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  isActive: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  preferences: string; // JSON string
  stats: string; // JSON string
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  passwordChangedAt?: Date;
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Repository interface
export interface UserRepository {
  create(data: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  findMany(filters: UserFilters): Promise<{ users: User[]; total: number }>;
  verifyEmail(token: string): Promise<User>;
  createPasswordReset(email: string): Promise<string>;
  resetPassword(token: string, newPassword: string): Promise<User>;
  changePassword(id: string, currentPassword: string, newPassword: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  incrementStats(id: string, stats: Partial<User['stats']>): Promise<void>;
  addAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  getProgress(userId: string, courseId?: string): Promise<UserProgress[]>;
  updateProgress(userId: string, courseId: string, progress: Partial<UserProgress>): Promise<UserProgress>;
}

export interface UserFilters {
  role?: UserRole;
  learningLevel?: LearningLevel;
  subscriptionTier?: SubscriptionTier;
  isActive?: boolean;
  isEmailVerified?: boolean;
  search?: string; // Search in username, email, firstName, lastName
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'username' | 'reputation';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Service interface
export interface UserService {
  register(data: CreateUserInput): Promise<{ user: User; token: string }>;
  login(data: UserLoginInput): Promise<{ user: User; token: string; refreshToken: string }>;
  logout(userId: string, sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }>;
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, data: UpdateUserInput): Promise<User>;
  forgotPassword(data: ForgotPasswordInput): Promise<void>;
  resetPassword(data: ResetPasswordInput): Promise<void>;
  changePassword(userId: string, data: ChangePasswordInput): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(email: string): Promise<void>;
  deleteAccount(userId: string, password: string): Promise<void>;
  getUsers(filters: UserFilters): Promise<{ users: User[]; total: number }>;
  banUser(userId: string, reason: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  promoteUser(userId: string, role: UserRole): Promise<User>;
  getUserStats(userId: string): Promise<User['stats']>;
  updateUserStats(userId: string, stats: Partial<User['stats']>): Promise<void>;
  getLeaderboard(type: 'points' | 'streak' | 'courses', limit?: number): Promise<User[]>;
}

// DTOs for API responses
export interface UserDto {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  location?: string;
  role: UserRole;
  learningLevel: LearningLevel;
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  stats: User['stats'];
  achievements: UserAchievement[];
  createdAt: Date;
}

export interface UserProfileDto extends UserDto {
  preferences: User['preferences'];
  lastLoginAt?: Date;
}

export interface UserStatsDto {
  coursesCompleted: number;
  coursesInProgress: number;
  totalLearningHours: number;
  streakDays: number;
  longestStreak: number;
  pointsEarned: number;
  badgesEarned: number;
  forumPosts: number;
  helpfulAnswers: number;
  reputation: number;
  rank?: number;
  weeklyProgress: {
    hoursThisWeek: number;
    lessonsThisWeek: number;
    goalsCompleted: number;
  };
  monthlyProgress: {
    hoursThisMonth: number;
    coursesThisMonth: number;
    badgesThisMonth: number;
  };
}

export interface AuthResponseDto {
  user: UserDto;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

// Error types
export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(field: string, value: string) {
    super(`User with ${field} '${value}' already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super('Email address has not been verified');
    this.name = 'EmailNotVerifiedError';
  }
}

export class AccountDeactivatedError extends Error {
  constructor() {
    super('Account has been deactivated');
    this.name = 'AccountDeactivatedError';
  }
}

export class InvalidTokenError extends Error {
  constructor(type: string) {
    super(`Invalid or expired ${type} token`);
    this.name = 'InvalidTokenError';
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(action: string) {
    super(`Insufficient permissions to ${action}`);
    this.name = 'InsufficientPermissionsError';
  }
}