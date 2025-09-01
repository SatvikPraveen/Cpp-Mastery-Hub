// File: backend/src/services/learning/progress.ts
// Extension: .ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ProgressService {
  async getLearningStats(userId: string) {
    try {
      const [
        completedLessons,
        completedExercises,
        totalStudyTime,
        currentStreak,
        longestStreak,
        weeklyStudyTime,
        achievements
      ] = await Promise.all([
        this.getCompletedLessonsCount(userId),
        this.getCompletedExercisesCount(userId),
        this.getTotalStudyTime(userId),
        this.getCurrentStreak(userId),
        this.getLongestStreak(userId),
        this.getWeeklyStudyTime(userId),
        this.getUserAchievements(userId)
      ]);

      return {
        completedLessons,
        completedExercises,
        totalStudyTime, // in minutes
        currentStreak, // in days
        longestStreak, // in days
        weeklyStudyTime, // in minutes
        weeklyGoal: 300, // 5 hours default goal
        achievements: achievements.length
      };
    } catch (error) {
      logger.error('Failed to get learning stats:', error);
      throw new Error('Failed to retrieve learning statistics');
    }
  }

  private async getCompletedLessonsCount(userId: string): Promise<number> {
    return await prisma.lessonCompletion.count({
      where: { userId }
    });
  }

  private async getCompletedExercisesCount(userId: string): Promise<number> {
    return await prisma.exerciseSubmission.count({
      where: { 
        userId,
        status: 'PASSED'
      }
    });
  }

  private async getTotalStudyTime(userId: string): Promise<number> {
    const result = await prisma.studySession.aggregate({
      where: { userId },
      _sum: { duration: true }
    });
    return result._sum.duration || 0;
  }

  private async getCurrentStreak(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const hasActivity = await prisma.studySession.findFirst({
        where: {
          userId,
          createdAt: {
            gte: currentDate,
            lt: nextDate
          }
        }
      });

      if (!hasActivity) break;
      
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private async getLongestStreak(userId: string): Promise<number> {
    // This would require more complex logic to calculate historical streaks
    // For now, return a placeholder implementation
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
      select: { longestStreak: true }
    });
    return userStats?.longestStreak || 0;
  }

  private async getWeeklyStudyTime(userId: string): Promise<number> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await prisma.studySession.aggregate({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      },
      _sum: { duration: true }
    });

    return result._sum.duration || 0;
  }

  private async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      }
    });
  }

  async trackStudySession(userId: string, duration: number, activityType: string) {
    try {
      await prisma.studySession.create({
        data: {
          userId,
          duration,
          activityType,
          createdAt: new Date()
        }
      });

      // Update user stats
      await this.updateUserStats(userId);
    } catch (error) {
      logger.error('Failed to track study session:', error);
    }
  }

  private async updateUserStats(userId: string) {
    const stats = await this.getLearningStats(userId);
    
    await prisma.userStats.upsert({
      where: { userId },
      update: {
        totalStudyTime: stats.totalStudyTime,
        currentStreak: stats.currentStreak,
        longestStreak: Math.max(stats.currentStreak, stats.longestStreak),
        completedLessons: stats.completedLessons,
        completedExercises: stats.completedExercises
      },
      create: {
        userId,
        totalStudyTime: stats.totalStudyTime,
        currentStreak: stats.currentStreak,
        longestStreak: stats.currentStreak,
        completedLessons: stats.completedLessons,
        completedExercises: stats.completedExercises
      }
    });
  }
}