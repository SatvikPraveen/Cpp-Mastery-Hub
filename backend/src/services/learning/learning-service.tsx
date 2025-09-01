// File: backend/src/services/learning/learning-service.ts
// Extension: .ts
import { PrismaClient } from '@prisma/client';
import { Course, Lesson, Exercise, UserProgress } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class LearningService {
  async getCourses(filters: {
    level?: string;
    category?: string;
    featured?: boolean;
    sort?: 'popular' | 'recent' | 'rating';
    userId?: string;
  }) {
    try {
      const { level, category, featured, sort = 'popular', userId } = filters;

      const where: any = {};
      if (level) where.level = level;
      if (category) where.category = category;
      if (featured) where.featured = true;

      let orderBy: any = {};
      switch (sort) {
        case 'recent':
          orderBy = { createdAt: 'desc' };
          break;
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        default:
          orderBy = { studentsCount: 'desc' };
      }

      const courses = await prisma.course.findMany({
        where,
        orderBy,
        include: {
          instructor: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          _count: {
            select: { lessons: true, enrollments: true }
          },
          enrollments: userId ? {
            where: { userId },
            select: { progress: true, completedAt: true }
          } : false
        }
      });

      return courses.map(course => ({
        ...course,
        lessonsCount: course._count.lessons,
        studentsCount: course._count.enrollments,
        progress: course.enrollments?.[0]?.progress || 0,
        isCompleted: !!course.enrollments?.[0]?.completedAt
      }));
    } catch (error) {
      logger.error('Failed to get courses:', error);
      throw new Error('Failed to retrieve courses');
    }
  }

  async getCourse(courseId: string, userId?: string) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          instructor: {
            select: { id: true, firstName: true, lastName: true, avatar: true, bio: true }
          },
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              completions: userId ? {
                where: { userId },
                select: { completedAt: true }
              } : false
            }
          },
          enrollments: userId ? {
            where: { userId },
            select: { progress: true, enrolledAt: true, completedAt: true }
          } : false,
          _count: {
            select: { lessons: true, enrollments: true, reviews: true }
          }
        }
      });

      if (!course) {
        throw new Error('Course not found');
      }

      const enrollment = course.enrollments?.[0];
      const completedLessons = course.lessons.filter(lesson => 
        lesson.completions && lesson.completions.length > 0
      );

      return {
        ...course,
        lessonsCount: course._count.lessons,
        studentsCount: course._count.enrollments,
        reviewsCount: course._count.reviews,
        progress: enrollment?.progress || 0,
        isEnrolled: !!enrollment,
        completedLessons: completedLessons.length,
        lessons: course.lessons.map(lesson => ({
          ...lesson,
          isCompleted: lesson.completions && lesson.completions.length > 0
        }))
      };
    } catch (error) {
      logger.error('Failed to get course:', error);
      throw new Error('Failed to retrieve course');
    }
  }

  async enrollInCourse(courseId: string, userId: string) {
    try {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId }
        }
      });

      if (existingEnrollment) {
        throw new Error('Already enrolled in this course');
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          enrolledAt: new Date()
        }
      });

      // Update course enrollment count
      await prisma.course.update({
        where: { id: courseId },
        data: {
          studentsCount: { increment: 1 }
        }
      });

      return enrollment;
    } catch (error) {
      logger.error('Failed to enroll in course:', error);
      throw new Error('Failed to enroll in course');
    }
  }

  async getLesson(courseId: string, lessonId: string, userId?: string) {
    try {
      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          courseId
        },
        include: {
          course: {
            select: { title: true }
          },
          completions: userId ? {
            where: { userId },
            select: { completedAt: true }
          } : false,
          exercises: {
            include: {
              submissions: userId ? {
                where: { userId },
                orderBy: { submittedAt: 'desc' },
                take: 1
              } : false
            }
          }
        }
      });

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Get previous and next lesson IDs
      const [previousLesson, nextLesson] = await Promise.all([
        prisma.lesson.findFirst({
          where: { courseId, order: { lt: lesson.order } },
          orderBy: { order: 'desc' },
          select: { id: true }
        }),
        prisma.lesson.findFirst({
          where: { courseId, order: { gt: lesson.order } },
          orderBy: { order: 'asc' },
          select: { id: true }
        })
      ]);

      // Calculate course progress
      let courseProgress = 0;
      if (userId) {
        const totalLessons = await prisma.lesson.count({
          where: { courseId }
        });
        const completedLessons = await prisma.lessonCompletion.count({
          where: {
            userId,
            lesson: { courseId }
          }
        });
        courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      }

      return {
        ...lesson,
        isCompleted: lesson.completions && lesson.completions.length > 0,
        previousLessonId: previousLesson?.id,
        nextLessonId: nextLesson?.id,
        courseProgress
      };
    } catch (error) {
      logger.error('Failed to get lesson:', error);
      throw new Error('Failed to retrieve lesson');
    }
  }

  async markLessonComplete(lessonId: string, userId: string) {
    try {
      const existingCompletion = await prisma.lessonCompletion.findUnique({
        where: {
          userId_lessonId: { userId, lessonId }
        }
      });

      if (existingCompletion) {
        return existingCompletion;
      }

      const completion = await prisma.lessonCompletion.create({
        data: {
          userId,
          lessonId,
          completedAt: new Date()
        }
      });

      // Update course progress
      await this.updateCourseProgress(userId, lessonId);

      return completion;
    } catch (error) {
      logger.error('Failed to mark lesson complete:', error);
      throw new Error('Failed to mark lesson as complete');
    }
  }

  async updateCourseProgress(userId: string, lessonId: string) {
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { courseId: true }
      });

      if (!lesson) return;

      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({
          where: { courseId: lesson.courseId }
        }),
        prisma.lessonCompletion.count({
          where: {
            userId,
            lesson: { courseId: lesson.courseId }
          }
        })
      ]);

      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      const isCompleted = progress === 100;

      await prisma.enrollment.upsert({
        where: {
          userId_courseId: { userId, courseId: lesson.courseId }
        },
        update: {
          progress,
          completedAt: isCompleted ? new Date() : null
        },
        create: {
          userId,
          courseId: lesson.courseId,
          progress,
          enrolledAt: new Date(),
          completedAt: isCompleted ? new Date() : null
        }
      });
    } catch (error) {
      logger.error('Failed to update course progress:', error);
    }
  }

  async getUserProgress(userId: string, courseId?: string) {
    try {
      const where: any = { userId };
      if (courseId) where.courseId = courseId;

      const enrollments = await prisma.enrollment.findMany({
        where,
        include: {
          course: {
            select: { id: true, title: true, thumbnail: true }
          }
        }
      });

      const totalProgress = enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0);
      const overallProgress = enrollments.length > 0 ? totalProgress / enrollments.length : 0;

      const courseProgress: Record<string, any> = {};
      enrollments.forEach(enrollment => {
        courseProgress[enrollment.courseId] = {
          title: enrollment.course.title,
          progress: enrollment.progress,
          completedAt: enrollment.completedAt
        };
      });

      return {
        overallProgress,
        courseProgress,
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter(e => e.completedAt).length
      };
    } catch (error) {
      logger.error('Failed to get user progress:', error);
      throw new Error('Failed to retrieve user progress');
    }
  }
}
