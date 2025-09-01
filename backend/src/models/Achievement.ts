// File: backend/src/models/Achievement.ts
// Extension: .ts (TypeScript Model)

import { z } from 'zod';

// Enums
export enum AchievementType {
  LEARNING = 'LEARNING',
  CODING = 'CODING',
  COMMUNITY = 'COMMUNITY',
  STREAK = 'STREAK',
  SPECIAL = 'SPECIAL',
  MILESTONE = 'MILESTONE',
  SEASONAL = 'SEASONAL',
  COMPETITIVE = 'COMPETITIVE'
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export enum TriggerEvent {
  LESSON_COMPLETE = 'LESSON_COMPLETE',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  QUIZ_PASS = 'QUIZ_PASS',
  CODE_EXECUTE = 'CODE_EXECUTE',
  CODE_SHARE = 'CODE_SHARE',
  POST_CREATE = 'POST_CREATE',
  COMMENT_CREATE = 'COMMENT_CREATE',
  LIKE_RECEIVE = 'LIKE_RECEIVE',
  STREAK_ACHIEVE = 'STREAK_ACHIEVE',
  PROFILE_COMPLETE = 'PROFILE_COMPLETE',
  REFERRAL_SUCCESS = 'REFERRAL_SUCCESS',
  CHALLENGE_WIN = 'CHALLENGE_WIN',
  TIME_SPENT = 'TIME_SPENT'
}

export enum ProgressType {
  COUNT = 'COUNT',
  PERCENTAGE = 'PERCENTAGE',
  BOOLEAN = 'BOOLEAN',
  TIME_BASED = 'TIME_BASED',
  SCORE_BASED = 'SCORE_BASED'
}

// Validation schemas
export const CreateAchievementSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must be less than 200 characters'),
  type: z.nativeEnum(AchievementType),
  rarity: z.nativeEnum(AchievementRarity),
  icon: z.string().url('Invalid icon URL'),
  badgeIcon: z.string().url('Invalid badge icon URL').optional(),
  points: z.number()
    .min(0, 'Points must be non-negative')
    .max(10000, 'Points must be less than 10,000'),
  requirements: z.object({
    triggerEvent: z.nativeEnum(TriggerEvent),
    targetValue: z.number().min(1, 'Target value must be positive'),
    progressType: z.nativeEnum(ProgressType),
    conditions: z.record(z.any()).optional(),
    timeLimit: z.number().positive().optional(), // in seconds
    prerequisites: z.array(z.string()).optional()
  }),
  isActive: z.boolean().default(true),
  isSecret: z.boolean().default(false),
  isRepeatable: z.boolean().default(false),
  maxCompletions: z.number().positive().optional(),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional()
});

export const UpdateAchievementSchema = CreateAchievementSchema.partial();

export const AchievementProgressSchema = z.object({
  userId: z.string(),
  achievementId: z.string(),
  currentValue: z.number().min(0, 'Current value must be non-negative'),
  targetValue: z.number().positive(),
  progressPercentage: z.number().min(0).max(100),
  isCompleted: z.boolean().default(false),
  completedAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

// Type definitions
export type CreateAchievementInput = z.infer<typeof CreateAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof UpdateAchievementSchema>;
export type AchievementProgressInput = z.infer<typeof AchievementProgressSchema>;

// Main interfaces
export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  rarity: AchievementRarity;
  icon: string;
  badgeIcon?: string;
  points: number;
  requirements: AchievementRequirements;
  isActive: boolean;
  isSecret: boolean;
  isRepeatable: boolean;
  maxCompletions?: number;
  validFrom?: Date;
  validUntil?: Date;
  tags: string[];
  metadata?: Record<string, any>;
  statistics: AchievementStatistics;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface AchievementRequirements {
  triggerEvent: TriggerEvent;
  targetValue: number;
  progressType: ProgressType;
  conditions?: Record<string, any>;
  timeLimit?: number; // in seconds
  prerequisites?: string[]; // Achievement IDs that must be completed first
}

export interface AchievementStatistics {
  totalEarned: number;
  uniqueEarners: number;
  completionRate: number; // percentage
  averageTimeToComplete?: number; // in seconds
  firstEarnedAt?: Date;
  lastEarnedAt?: Date;
  popularityScore: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: AchievementProgress;
  unlockedAt: Date;
  completionNumber: number; // For repeatable achievements
  witnessedBy?: string[]; // User IDs who witnessed the achievement
  sharedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AchievementProgress {
  id: string;
  userId: string;
  achievementId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: Date;
  startedAt: Date;
  lastUpdatedAt: Date;
  milestones: ProgressMilestone[];
  metadata?: Record<string, any>;
}

export interface ProgressMilestone {
  id: string;
  progressId: string;
  value: number;
  percentage: number;
  achievedAt: Date;
  description?: string;
}

export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  achievements: Achievement[];
  achievementCount: number;
  order: number;
  isVisible: boolean;
}

export interface AchievementSeason {
  id: string;
  name: string;
  description: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  achievements: Achievement[];
  specialRewards: SeasonalReward[];
  isActive: boolean;
  participantCount: number;
}

export interface SeasonalReward {
  id: string;
  seasonId: string;
  name: string;
  description: string;
  icon: string;
  type: 'badge' | 'title' | 'theme' | 'feature';
  requirements: string[];
  exclusiveUntil?: Date;
}

export interface AchievementChallenge {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'community';
  startDate: Date;
  endDate: Date;
  achievements: Achievement[];
  leaderboard: ChallengeLeaderboard[];
  prizes: ChallengePrize[];
  rules: string[];
  participantCount: number;
  isActive: boolean;
}

export interface ChallengeLeaderboard {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  achievementsUnlocked: number;
  lastActivityAt: Date;
}

export interface ChallengePrize {
  rank: number;
  name: string;
  description: string;
  icon?: string;
  value?: number;
  type: 'points' | 'badge' | 'premium' | 'certificate';
}

export interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  type: 'unlock' | 'progress' | 'milestone';
  title: string;
  message: string;
  isRead: boolean;
  isDisplayed: boolean;
  displayedAt?: Date;
  createdAt: Date;
}

export interface AchievementShare {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  platform: 'internal' | 'twitter' | 'linkedin' | 'facebook';
  message?: string;
  url?: string;
  engagementCount: number;
  createdAt: Date;
}

export interface AchievementInsight {
  userId: string;
  totalAchievements: number;
  totalPoints: number;
  completionRate: number;
  averageRarity: AchievementRarity;
  strongestCategory: AchievementType;
  recentUnlocks: UserAchievement[];
  nearCompletion: AchievementProgress[];
  recommendedAchievements: Achievement[];
  compareToAverage: {
    achievements: number;
    points: number;
    completionRate: number;
  };
  streakData: {
    current: number;
    longest: number;
    lastActivityDate: Date;
  };
}

// Repository interfaces
export interface AchievementRepository {
  // Achievement CRUD
  create(data: CreateAchievementInput): Promise<Achievement>;
  findById(id: string): Promise<Achievement | null>;
  findMany(filters: AchievementFilters): Promise<{ achievements: Achievement[]; total: number }>;
  update(id: string, data: UpdateAchievementInput): Promise<Achievement>;
  delete(id: string): Promise<void>;
  
  // User Achievement Management
  getUserAchievements(userId: string, filters?: UserAchievementFilters): Promise<UserAchievement[]>;
  getUserProgress(userId: string, achievementId?: string): Promise<AchievementProgress[]>;
  updateProgress(userId: string, achievementId: string, value: number, metadata?: any): Promise<AchievementProgress>;
  unlockAchievement(userId: string, achievementId: string, metadata?: any): Promise<UserAchievement>;
  
  // Progress Tracking
  trackEvent(userId: string, event: TriggerEvent, data: any): Promise<void>;
  checkTriggers(userId: string, event: TriggerEvent, data: any): Promise<Achievement[]>;
  processAchievementUnlock(userId: string, achievementId: string): Promise<void>;
  
  // Categories and Organization
  getCategories(): Promise<AchievementCategory[]>;
  getAchievementsByCategory(categoryId: string): Promise<Achievement[]>;
  getAchievementsByType(type: AchievementType): Promise<Achievement[]>;
  
  // Seasonal and Special
  getSeasonalAchievements(seasonId?: string): Promise<Achievement[]>;
  getCurrentSeason(): Promise<AchievementSeason | null>;
  getChallenges(active?: boolean): Promise<AchievementChallenge[]>;
  
  // Statistics and Analytics
  getGlobalStatistics(): Promise<Record<string, any>>;
  getUserInsights(userId: string): Promise<AchievementInsight>;
  getLeaderboard(type: 'points' | 'achievements' | 'completion', limit?: number): Promise<any[]>;
  
  // Social Features
  shareAchievement(userId: string, achievementId: string, platform: string, message?: string): Promise<AchievementShare>;
  getAchievementFeed(userId: string, limit?: number): Promise<UserAchievement[]>;
  
  // Notifications
  createNotification(userId: string, achievementId: string, type: string): Promise<AchievementNotification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<AchievementNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
}

export interface AchievementFilters {
  type?: AchievementType;
  rarity?: AchievementRarity;
  isActive?: boolean;
  isSecret?: boolean;
  isRepeatable?: boolean;
  tags?: string[];
  validOn?: Date;
  search?: string;
  sortBy?: 'name' | 'points' | 'rarity' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface UserAchievementFilters {
  type?: AchievementType;
  rarity?: AchievementRarity;
  completed?: boolean;
  unlockedAfter?: Date;
  unlockedBefore?: Date;
  sortBy?: 'unlockedAt' | 'points' | 'rarity' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Service interfaces
export interface AchievementService {
  // Core Achievement Operations
  createAchievement(data: CreateAchievementInput): Promise<Achievement>;
  getAchievement(id: string): Promise<Achievement>;
  getAchievements(filters: AchievementFilters): Promise<{ achievements: Achievement[]; total: number }>;
  updateAchievement(id: string, data: UpdateAchievementInput): Promise<Achievement>;
  deleteAchievement(id: string): Promise<void>;
  
  // User Progress and Unlocking
  getUserAchievements(userId: string, filters?: UserAchievementFilters): Promise<UserAchievement[]>;
  getUserProgress(userId: string): Promise<AchievementProgress[]>;
  trackUserEvent(userId: string, event: TriggerEvent, data: any): Promise<UserAchievement[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  
  // Discovery and Recommendations
  getRecommendedAchievements(userId: string, limit?: number): Promise<Achievement[]>;
  getNearCompletionAchievements(userId: string, limit?: number): Promise<AchievementProgress[]>;
  searchAchievements(query: string, filters?: AchievementFilters): Promise<Achievement[]>;
  
  // Categories and Organization
  getAchievementCategories(): Promise<AchievementCategory[]>;
  getAchievementsByCategory(categoryId: string): Promise<Achievement[]>;
  
  // Social and Community Features
  shareAchievement(userId: string, achievementId: string, platform: string): Promise<string>;
  getAchievementFeed(userId: string, limit?: number): Promise<UserAchievement[]>;
  getGlobalLeaderboard(type: 'points' | 'achievements', limit?: number): Promise<any[]>;
  
  // Analytics and Insights
  getUserInsights(userId: string): Promise<AchievementInsight>;
  getAchievementStatistics(achievementId: string): Promise<AchievementStatistics>;
  getGlobalStatistics(): Promise<Record<string, any>>;
  
  // Seasonal and Special Events
  getSeasonalAchievements(): Promise<Achievement[]>;
  getCurrentChallenges(): Promise<AchievementChallenge[]>;
  joinChallenge(userId: string, challengeId: string): Promise<void>;
  
  // Notifications
  getUserNotifications(userId: string): Promise<AchievementNotification[]>;
  markNotificationRead(userId: string, notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
}

// DTOs for API responses
export interface AchievementDto {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  rarity: AchievementRarity;
  icon: string;
  badgeIcon?: string;
  points: number;
  isSecret: boolean;
  tags: string[];
  statistics: {
    totalEarned: number;
    completionRate: number;
  };
}

export interface UserAchievementDto {
  id: string;
  achievement: AchievementDto;
  unlockedAt: Date;
  completionNumber: number;
  progress?: {
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
  };
}

export interface AchievementProgressDto {
  achievementId: string;
  achievement: AchievementDto;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  startedAt: Date;
  lastUpdatedAt: Date;
}

// Error types
export class AchievementNotFoundError extends Error {
  constructor(achievementId: string) {
    super(`Achievement not found: ${achievementId}`);
    this.name = 'AchievementNotFoundError';
  }
}

export class AchievementAlreadyUnlockedError extends Error {
  constructor(achievementId: string) {
    super(`Achievement already unlocked: ${achievementId}`);
    this.name = 'AchievementAlreadyUnlockedError';
  }
}

export class PrerequisiteNotMetError extends Error {
  constructor(prerequisiteIds: string[]) {
    super(`Prerequisites not met: ${prerequisiteIds.join(', ')}`);
    this.name = 'PrerequisiteNotMetError';
  }
}

export class AchievementInactiveError extends Error {
  constructor(achievementId: string) {
    super(`Achievement is not active: ${achievementId}`);
    this.name = 'AchievementInactiveError';
  }
}

export class AchievementExpiredError extends Error {
  constructor(achievementId: string) {
    super(`Achievement has expired: ${achievementId}`);
    this.name = 'AchievementExpiredError';
  }
}

export class MaxCompletionsReachedError extends Error {
  constructor(achievementId: string) {
    super(`Maximum completions reached for achievement: ${achievementId}`);
    this.name = 'MaxCompletionsReachedError';
  }
}