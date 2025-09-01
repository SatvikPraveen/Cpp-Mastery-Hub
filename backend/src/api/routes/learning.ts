// File: backend/src/api/routes/learning.ts
// Extension: .ts

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';

import { auth } from '../middleware/auth';
import { validateRequest, validatePagination, validateUUID } from '../middleware/validation';
import { LearningService } from '../../services/learning/learning-service';
import { ProgressService } from '../../services/learning/progress';
import { RecommendationService } from '../../services/learning/recommendations';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';

const router = Router();
const learningService = new LearningService();
const progressService = new ProgressService();
const recommendationService = new RecommendationService();

/**
 * @swagger
 * /api/learning/courses:
 *   get:
 *     summary: Get available courses
 *     tags: [Learning]
 *     parameters:
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search courses by title or description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesResponse'
 */
router.get('/courses', [
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('category').optional().isString().isLength({ max: 50 }),
  query('search').optional().isString().isLength({ min: 2, max: 100 }),
  validatePagination,
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { difficulty, category, search, limit, offset } = req.query;
    const userId = req.user?.id;

    const courses = await learningService.getCourses({
      difficulty: difficulty as string,
      category: category as string,
      search: search as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      userId // For personalized results
    });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/courses/{id}:
 *   get:
 *     summary: Get course details
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 */
router.get('/courses/:id', [
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;

    const course = await learningService.getCourseDetails(courseId, userId);

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/courses/{id}/enroll:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Successfully enrolled in course
 */
router.post('/courses/:id/enroll', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const enrollment = await learningService.enrollInCourse(userId, courseId);

    logger.info('User enrolled in course', { userId, courseId });

    res.json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/courses/{id}/lessons:
 *   get:
 *     summary: Get course lessons
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course lessons retrieved successfully
 */
router.get('/courses/:id/lessons', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const lessons = await learningService.getCourseLessons(courseId, userId);

    res.json({
      success: true,
      data: lessons
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/lessons/{id}:
 *   get:
 *     summary: Get lesson details
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Lesson details retrieved successfully
 */
router.get('/lessons/:id', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const lesson = await learningService.getLessonDetails(lessonId, userId);

    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/lessons/{id}/complete:
 *   post:
 *     summary: Mark lesson as completed
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeSpent:
 *                 type: integer
 *                 description: Time spent on lesson in seconds
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes from the student
 *     responses:
 *       200:
 *         description: Lesson marked as completed
 */
router.post('/lessons/:id/complete', [
  auth,
  validateUUID('id'),
  body('timeSpent').optional().isInt({ min: 0, max: 86400 }), // Max 24 hours
  body('notes').optional().isString().isLength({ max: 1000 }),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user?.id;
    const { timeSpent, notes } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const completion = await progressService.completeLesson(userId, lessonId, {
      timeSpent,
      notes
    });

    logger.info('Lesson completed', { userId, lessonId, timeSpent });

    res.json({
      success: true,
      data: completion,
      message: 'Lesson marked as completed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/exercises/{id}:
 *   get:
 *     summary: Get exercise details
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise details retrieved successfully
 */
router.get('/exercises/:id', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exerciseId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const exercise = await learningService.getExerciseDetails(exerciseId, userId);

    res.json({
      success: true,
      data: exercise
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/exercises/{id}/submit:
 *   post:
 *     summary: Submit exercise solution
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Student's solution code
 *               language:
 *                 type: string
 *                 enum: [cpp, c, cpp11, cpp14, cpp17, cpp20, cpp23]
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes about the solution
 *             required:
 *               - code
 *               - language
 *     responses:
 *       200:
 *         description: Exercise solution submitted successfully
 */
router.post('/exercises/:id/submit', [
  auth,
  validateUUID('id'),
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('language')
    .isIn(['cpp', 'c', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'])
    .withMessage('Language must be a supported C/C++ variant'),
  body('notes').optional().isString().isLength({ max: 1000 }),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exerciseId = req.params.id;
    const userId = req.user?.id;
    const { code, language, notes } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const submission = await learningService.submitExercise(userId, exerciseId, {
      code,
      language,
      notes
    });

    logger.info('Exercise submitted', { 
      userId, 
      exerciseId, 
      language,
      codeLength: code.length,
      passed: submission.passed
    });

    res.json({
      success: true,
      data: submission,
      message: submission.passed ? 'Exercise completed successfully!' : 'Exercise submitted, but some tests failed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/progress:
 *   get:
 *     summary: Get user learning progress
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learning progress retrieved successfully
 */
router.get('/progress', [
  auth,
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const progress = await progressService.getUserProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/progress/courses/{id}:
 *   get:
 *     summary: Get progress for a specific course
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course progress retrieved successfully
 */
router.get('/progress/courses/:id', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const courseProgress = await progressService.getCourseProgress(userId, courseId);

    res.json({
      success: true,
      data: courseProgress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/recommendations:
 *   get:
 *     summary: Get personalized learning recommendations
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [courses, lessons, exercises, review]
 *         description: Type of recommendations
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/recommendations', [
  auth,
  query('type').optional().isIn(['courses', 'lessons', 'exercises', 'review']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { type, limit = 10 } = req.query;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const recommendations = await recommendationService.getRecommendations(userId, {
      type: type as string,
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/achievements:
 *   get:
 *     summary: Get user achievements
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievements retrieved successfully
 */
router.get('/achievements', [
  auth,
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const achievements = await learningService.getUserAchievements(userId);

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/streaks:
 *   get:
 *     summary: Get user learning streaks
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learning streaks retrieved successfully
 */
router.get('/streaks', [
  auth,
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const streaks = await progressService.getUserStreaks(userId);

    res.json({
      success: true,
      data: streaks
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/quiz/{id}:
 *   get:
 *     summary: Get quiz details
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully
 */
router.get('/quiz/:id', [
  auth,
  validateUUID('id'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const quiz = await learningService.getQuizDetails(quizId, userId);

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/learning/quiz/{id}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     answer:
 *                       type: string
 *                     timeSpent:
 *                       type: integer
 *             required:
 *               - answers
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 */
router.post('/quiz/:id/submit', [
  auth,
  validateUUID('id'),
  body('answers').isArray().withMessage('Answers must be an array'),
  body('answers.*.questionId').isUUID().withMessage('Question ID must be valid'),
  body('answers.*.answer').isString().withMessage('Answer must be a string'),
  body('answers.*.timeSpent').optional().isInt({ min: 0 }),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id;
    const userId = req.user?.id;
    const { answers } = req.body;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const quizResult = await learningService.submitQuiz(userId, quizId, answers);

    logger.info('Quiz submitted', { 
      userId, 
      quizId, 
      score: quizResult.score,
      questionsAnswered: answers.length
    });

    res.json({
      success: true,
      data: quizResult,
      message: `Quiz completed! Score: ${quizResult.score}%`
    });
  } catch (error) {
    next(error);
  }
});

export { router as learningRouter };