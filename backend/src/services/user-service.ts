import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

import { CacheService } from './cache-service';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  website?: string;
  location?: string;
  skills?: string[];
  avatarUrl?: string;
}

interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  weeklyDigest?: boolean;
  autoSave?: boolean;
  codeCompletion?: boolean;
}


export class UserService {
  private cacheService = new CacheService();

  /**
   * Get user profile with cached results
   */
  async getUserProfile(userId: string) {
    try {
      // Check cache first
      const cacheKey = `user_profile:${userId}`;
      const cachedProfile = await this.cacheService.get(cacheKey);
      
      if (cachedProfile) {
        logger.debug('User profile retrieved from cache', { userId });
        return JSON.parse(cachedProfile);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          website: true,
          location: true,
          skills: true,
          joinedAt: true,
          lastActiveAt: true,
          isVerified: true,
          role: true,
          settings: true,
          _count: {
            select: {
              codeSnippets: true,
              forumPosts: true,
              userAchievements: true,
              enrollments: true
            }
          }
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Calculate user stats
      const stats = await this.calculateUserStats(userId);

      const profile = {
        ...user,
        stats
      };

      // Cache the profile for 15 minutes
      await this.cacheService.setex(cacheKey, 900, JSON.stringify(profile));

      logger.info('User profile retrieved', { userId });
      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', { userId, error });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData) {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        // Only fields present in the request are written; Prisma maintains updatedAt.
        data: Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined)
        ) as Prisma.UserUpdateInput,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          website: true,
          location: true,
          skills: true,
          updatedAt: true
        }
      });

      // Invalidate cache
      const cacheKey = `user_profile:${userId}`;
      await this.cacheService.del(cacheKey);

      logger.info('User profile updated', { userId, updatedFields: Object.keys(data) });
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user profile', { userId, error });
      throw new ApiError(500, 'Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      // Log password change for security
      logger.info('Password changed successfully', { userId });

      // Revoke every session: a password change must log out other devices.
      await this.invalidateUserSessions(userId);

    } catch (error) {
      logger.error('Failed to change password', { userId, error });
      throw error;
    }
  }

  /**
   * Get user learning progress
   */
  async getLearningProgress(userId: string) {
    try {
      const cacheKey = `user_progress:${userId}`;
      const cachedProgress = await this.cacheService.get(cacheKey);
      
      if (cachedProgress) {
        return JSON.parse(cachedProgress);
      }

      const progress = await prisma.userProgress.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              totalLessons: true
            }
          }
        }
      });

      const progressData = {
        totalCourses: progress.length,
        completedCourses: progress.filter(p => p.completedAt).length,
        totalLessonsCompleted: progress.reduce((sum, p) => sum + p.lessonsCompleted, 0),
        totalTimeSpent: progress.reduce((sum, p) => sum + p.timeSpent, 0),
        courses: progress.map(p => ({
          courseId: p.courseId,
          courseName: p.course.title,
          difficulty: p.course.difficulty,
          progress: Math.round((p.lessonsCompleted / p.course.totalLessons) * 100),
          lessonsCompleted: p.lessonsCompleted,
          totalLessons: p.course.totalLessons,
          timeSpent: p.timeSpent,
          lastAccessedAt: p.lastAccessedAt,
          completedAt: p.completedAt
        }))
      };

      // Cache for 10 minutes
      await this.cacheService.setex(cacheKey, 600, JSON.stringify(progressData));

      return progressData;
    } catch (error) {
      logger.error('Failed to get learning progress', { userId, error });
      throw error;
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string) {
    try {
      const achievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              category: true,
              points: true
            }
          }
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });

      const achievementData = {
        totalAchievements: achievements.length,
        totalPoints: achievements.reduce((sum, a) => sum + a.achievement.points, 0),
        recentAchievements: achievements.slice(0, 5),
        categories: this.groupAchievementsByCategory(achievements)
      };

      return achievementData;
    } catch (error) {
      logger.error('Failed to get user achievements', { userId, error });
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit: number, offset: number) {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ],
          isActive: true
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          location: true,
          skills: true,
          _count: {
            select: {
              codeSnippets: true,
              forumPosts: true,
              userAchievements: true
            }
          }
        },
        take: limit,
        skip: offset,
        orderBy: {
          lastActiveAt: 'desc'
        }
      });

      const total = await prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ],
          isActive: true
        }
      });

      return {
        users,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error('Failed to search users', { query, error });
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          settings: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      return user.settings || this.getDefaultSettings();
    } catch (error) {
      logger.error('Failed to get user settings', { userId, error });
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, settings: UserSettings) {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings
          },
          updatedAt: new Date()
        },
        select: {
          settings: true
        }
      });

      // Invalidate cache
      const cacheKey = `user_profile:${userId}`;
      await this.cacheService.del(cacheKey);

      logger.info('User settings updated', { userId, settings: Object.keys(settings) });
      return updatedUser.settings;
    } catch (error) {
      logger.error('Failed to update user settings', { userId, error });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, password: string, reason: string, feedback?: string) {
    try {
      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new ApiError(400, 'Invalid password');
      }

      // Mark account as inactive
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: reason,
          deactivationFeedback: feedback ?? null
        }
      });

      // Log deactivation
      logger.info('User account deactivated', { userId, reason });

      // Clean up user sessions
      await this.invalidateUserSessions(userId);

      // Send confirmation email (optional)
      // await this.sendDeactivationConfirmation(userId);

    } catch (error) {
      logger.error('Failed to deactivate account', { userId, error });
      throw error;
    }
  }

  /**
   * Calculate user statistics
   */
  private async calculateUserStats(userId: string) {
    try {
      const [
        codeExecutions,
        snippetsCreated,
        forumPosts,
        lessonsCompleted,
        achievements
      ] = await Promise.all([
        prisma.codeExecution.count({ where: { userId } }),
        prisma.codeSnippet.count({ where: { userId } }),
        prisma.forumPost.count({ where: { userId } }),
        prisma.lessonProgress.count({ where: { userId, completed: true } }),
        prisma.userAchievement.count({ where: { userId } })
      ]);

      return {
        codeExecutions,
        snippetsCreated,
        forumPosts,
        lessonsCompleted,
        achievements
      };
    } catch (error) {
      logger.error('Failed to calculate user stats', { userId, error });
      return {
        codeExecutions: 0,
        snippetsCreated: 0,
        forumPosts: 0,
        lessonsCompleted: 0,
        achievements: 0
      };
    }
  }

  /**
   * Group achievements by category
   */
  private groupAchievementsByCategory(achievements: any[]) {
    const categories = achievements.reduce((acc, achievement) => {
      const category = achievement.achievement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    }, {});

    return Object.keys(categories).map(category => ({
      category,
      achievements: categories[category],
      count: categories[category].length
    }));
  }

  /**
   * Get default user settings
   */
  private getDefaultSettings(): UserSettings {
    return {
      theme: 'system',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      weeklyDigest: true,
      autoSave: true,
      codeCompletion: true
    };
  }

  /**
   * Invalidate all user sessions
   */
  private async invalidateUserSessions(userId: string) {
    try {
      // The auth middleware accepts a token only while its UserSession row is active, so
      // deactivating the rows revokes every outstanding access and refresh token.
      await prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      const sessionKeys = await this.cacheService.keys(`session:${userId}:*`);
      if (sessionKeys.length > 0) {
        await this.cacheService.del(...sessionKeys);
      }

      // Update refresh token version to invalidate all JWTs
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: {
            increment: 1
          }
        }
      });

      logger.info('User sessions invalidated', { userId, sessionCount: sessionKeys.length });
    } catch (error) {
      logger.error('Failed to invalidate user sessions', { userId, error });
    }
  }
}
export const userService = new UserService();
