import { Prisma, SubmissionStatus, type Difficulty } from '@prisma/client';

import { prisma } from '../../config/database';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { analysisService } from '../analyzer/analysis-service';
import { NotificationType, notificationService } from '../notification/notification-service';

import { gradeQuiz, publicQuestions, quizQuestionsSchema, type GradedQuiz } from './quiz-grading';
import { rankRecommendations, type Recommendation } from './recommendations';

const courseCard = {
  id: true,
  title: true,
  shortDescription: true,
  difficulty: true,
  category: true,
  tags: true,
  thumbnailUrl: true,
  estimatedHours: true,
  totalLessons: true,
  enrollmentCount: true,
  rating: true,
} as const;

const recommendationFeatures = {
  id: true,
  title: true,
  difficulty: true,
  prerequisites: true,
  tags: true,
  enrollmentCount: true,
} as const;

export interface CourseQuery {
  difficulty?: Difficulty;
  category?: string;
  search?: string;
  limit: number;
  offset: number;
}

/** Courses, lessons, enrolment, progress, quizzes and exercise submissions. */
export class LearningService {
  async listCourses(q: CourseQuery) {
    const where: Prisma.CourseWhereInput = { isPublished: true };
    if (q.difficulty) where.difficulty = q.difficulty;
    if (q.category) where.category = q.category;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { tags: { has: q.search.toLowerCase() } },
      ];
    }
    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: courseCard,
        orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
        skip: q.offset,
        take: q.limit,
      }),
      prisma.course.count({ where }),
    ]);
    return { items, total, limit: q.limit, offset: q.offset };
  }

  async getCourse(courseId: string, userId?: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, isPublished: true },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { orderIndex: 'asc' },
          select: { id: true, title: true, description: true, orderIndex: true, duration: true },
        },
      },
    });
    if (!course) throw new ApiError(404, 'Course not found');
    const enrollment = userId
      ? await prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } })
      : null;
    // Decimal does not serialise to JSON as a number; send it as a string.
    return { ...course, price: course.price?.toString() ?? null, enrollment };
  }

  async getLesson(courseId: string, lessonId: string, userId?: string) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isPublished: true, course: { isPublished: true } },
      include: {
        exercises: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            description: true,
            instructions: true,
            starterCode: true,
            difficulty: true,
            points: true,
            hints: true,
          },
        },
      },
    });
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    const [neighbours, progress, quiz] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          courseId,
          isPublished: true,
          orderIndex: { in: [lesson.orderIndex - 1, lesson.orderIndex + 1] },
        },
        select: { id: true, title: true, orderIndex: true },
      }),
      userId
        ? prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } })
        : Promise.resolve(null),
      prisma.quiz.findFirst({ where: { lessonId, isPublished: true }, select: { id: true, title: true } }),
    ]);
    return {
      ...lesson,
      previous: neighbours.find((n) => n.orderIndex < lesson.orderIndex) ?? null,
      next: neighbours.find((n) => n.orderIndex > lesson.orderIndex) ?? null,
      progress,
      quiz,
    };
  }

  /** Idempotent enrolment. */
  async enroll(userId: string, courseId: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, isPublished: true },
      select: { id: true },
    });
    if (!course) throw new ApiError(404, 'Course not found');
    return prisma.$transaction(async (tx) => {
      const existing = await tx.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) return existing;
      const now = new Date();
      const enrollment = await tx.courseEnrollment.create({
        data: { userId, courseId, lastAccessedAt: now },
      });
      await tx.course.update({ where: { id: courseId }, data: { enrollmentCount: { increment: 1 } } });
      await tx.userProgress.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId, lastAccessedAt: now },
        update: {},
      });
      return enrollment;
    });
  }

  /**
   * Marks a lesson complete and recomputes course progress as completed / published lessons.
   * Idempotent: completing a lesson twice does not change the counts.
   */
  async completeLesson(userId: string, courseId: string, lessonId: string, minutesSpent = 0) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isPublished: true },
      select: { id: true },
    });
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    const enrolled = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) throw new ApiError(409, 'Enroll in the course first');

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, completed: true, completedAt: now, timeSpent: minutesSpent },
        update: { completed: true, completedAt: now, timeSpent: { increment: minutesSpent } },
      });
      const [done, total] = await Promise.all([
        tx.lessonProgress.count({
          where: { userId, completed: true, lesson: { courseId, isPublished: true } },
        }),
        tx.lesson.count({ where: { courseId, isPublished: true } }),
      ]);
      const percent = total === 0 ? 0 : Math.round((1000 * done) / total) / 10;
      const completedAt = total > 0 && done === total ? (enrolled.completedAt ?? now) : null;
      await tx.userProgress.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: {
          userId,
          courseId,
          lessonsCompleted: done,
          timeSpent: minutesSpent,
          lastAccessedAt: now,
          completedAt,
        },
        update: {
          lessonsCompleted: done,
          timeSpent: { increment: minutesSpent },
          lastAccessedAt: now,
          completedAt,
        },
      });
      await tx.courseEnrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { progress: percent, lastAccessedAt: now, completedAt },
      });
      return {
        lessonsCompleted: done,
        totalLessons: total,
        progress: percent,
        courseCompleted: completedAt !== null,
        newlyCompleted: completedAt !== null && enrolled.completedAt === null,
      };
    });
    if (result.newlyCompleted) {
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
      await notificationService.notify({
        userId,
        type: NotificationType.COURSE_COMPLETED,
        title: 'Course completed',
        message: `You completed "${course?.title ?? 'a course'}". Check your recommendations for what to learn next.`,
        data: { courseId },
      });
    }
    return result;
  }

  /** Dashboard view: one row per enrolled course with the next unfinished lesson. */
  async progressOverview(userId: string) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: { sort: 'desc', nulls: 'last' } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            lessons: {
              where: { isPublished: true },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                progress: { where: { userId, completed: true }, select: { id: true } },
              },
            },
          },
        },
      },
    });
    return enrollments.map((e) => {
      const next = e.course.lessons.find((l) => l.progress.length === 0) ?? null;
      return {
        courseId: e.course.id,
        courseTitle: e.course.title,
        progress: e.progress,
        completedAt: e.completedAt,
        lastAccessedAt: e.lastAccessedAt ?? e.enrolledAt,
        nextLesson: next ? { id: next.id, title: next.title } : null,
      };
    });
  }

  async courseProgress(userId: string, courseId: string) {
    const [enrollment, lessons] = await Promise.all([
      prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
      prisma.lessonProgress.findMany({
        where: { userId, lesson: { courseId } },
        select: { lessonId: true, completed: true, completedAt: true, timeSpent: true },
      }),
    ]);
    if (!enrollment) throw new ApiError(404, 'Not enrolled in this course');
    return { enrollment, lessons };
  }

  async recommendations(userId: string, limit = 5): Promise<Recommendation[]> {
    const [enrollments, candidates] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId },
        select: { completedAt: true, course: { select: recommendationFeatures } },
      }),
      prisma.course.findMany({ where: { isPublished: true }, select: recommendationFeatures }),
    ]);
    return rankRecommendations(
      candidates,
      {
        completed: enrollments.filter((e) => e.completedAt !== null).map((e) => e.course),
        enrolledIds: new Set(enrollments.map((e) => e.course.id)),
      },
      limit
    );
  }

  async prerequisites(courseId: string, userId?: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, isPublished: true },
      select: { prerequisites: true },
    });
    if (!course) throw new ApiError(404, 'Course not found');
    const [courses, completed] = await Promise.all([
      prisma.course.findMany({
        where: { id: { in: course.prerequisites } },
        select: { id: true, title: true, difficulty: true },
      }),
      userId
        ? prisma.courseEnrollment.findMany({
            where: { userId, courseId: { in: course.prerequisites }, completedAt: { not: null } },
            select: { courseId: true },
          })
        : Promise.resolve([] as Array<{ courseId: string }>),
    ]);
    const done = new Set(completed.map((c) => c.courseId));
    return courses.map((c) => ({ ...c, completed: done.has(c.id) }));
  }

  async getLessonQuiz(courseId: string, lessonId: string, userId?: string) {
    const quiz = await this.loadQuiz(courseId, lessonId);
    const attemptsUsed = userId
      ? await prisma.quizAttempt.count({ where: { userId, quizId: quiz.id } })
      : 0;
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed,
      questions: publicQuestions(quiz.questions),
    };
  }

  async submitQuiz(
    userId: string,
    courseId: string,
    lessonId: string,
    answers: Record<string, number>,
    timeSpentSeconds: number
  ): Promise<GradedQuiz & { attempt: number }> {
    const quiz = await this.loadQuiz(courseId, lessonId);
    return prisma.$transaction(
      async (tx) => {
        const used = await tx.quizAttempt.count({ where: { userId, quizId: quiz.id } });
        if (used >= quiz.maxAttempts) {
          throw new ApiError(409, `No attempts left (maximum ${quiz.maxAttempts})`);
        }
        const graded = gradeQuiz(quiz.questions, answers, quiz.passingScore);
        await tx.quizAttempt.create({
          data: {
            userId,
            quizId: quiz.id,
            answers: answers as Prisma.InputJsonObject,
            score: graded.score,
            timeSpent: timeSpentSeconds,
          },
        });
        return { ...graded, attempt: used + 1 };
      },
      // Serializable so two concurrent submissions cannot both pass the attempt check.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Records an exercise submission with *static* feedback from the analysis engine. Test cases
   * are not executed (no sandbox, see docs/research/threat-model.md), so the status stays
   * PENDING and the feedback says so explicitly.
   */
  async submitExercise(userId: string, exerciseId: string, code: string) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, isPublished: true },
      select: { id: true },
    });
    if (!exercise) throw new ApiError(404, 'Exercise not found');

    let feedback: string;
    let testResults: Prisma.InputJsonValue | undefined;
    try {
      const report = await analysisService.analyze(code);
      testResults = {
        staticAnalysis: {
          engine: report.engine.version,
          summary: report.summary,
          diagnostics: report.diagnostics.slice(0, 50),
        },
      } as unknown as Prisma.InputJsonValue;
      feedback =
        report.summary.total === 0
          ? 'Static analysis found no issues. Test cases will run once sandboxed execution is available.'
          : `Static analysis found ${report.summary.errors} error(s) and ${report.summary.warnings} ` +
            'warning(s). Test cases have not been run.';
    } catch (error) {
      logger.warn('Static feedback unavailable for submission', { exerciseId, error });
      feedback = 'Submission stored. Automated feedback is temporarily unavailable.';
    }

    return prisma.exerciseSubmission.create({
      data: {
        userId,
        exerciseId,
        code,
        language: 'cpp',
        status: SubmissionStatus.PENDING,
        feedback,
        ...(testResults !== undefined ? { testResults } : {}),
      },
    });
  }

  private async loadQuiz(courseId: string, lessonId: string) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId, isPublished: true },
      select: { id: true },
    });
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    const quiz = await prisma.quiz.findFirst({ where: { lessonId, isPublished: true } });
    if (!quiz) throw new ApiError(404, 'This lesson has no quiz');
    const parsed = quizQuestionsSchema.safeParse(quiz.questions);
    if (!parsed.success) {
      logger.error('Malformed quiz questions JSON', { quizId: quiz.id, issues: parsed.error.issues });
      throw new ApiError(500, 'Quiz is misconfigured');
    }
    return { ...quiz, questions: parsed.data };
  }
}

export const learningService = new LearningService();
