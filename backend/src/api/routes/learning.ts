import { Difficulty } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { MAX_SOURCE_BYTES } from '../../services/engine/engine-client';
import { learningService } from '../../services/learning/learning-service';
import { handle, parse, requireUserId, stripUndefined } from '../http';
import { authenticateToken, optionalAuth } from '../middleware/auth';

/**
 * Learning endpoints, mounted at /api/learning. Course browsing is public; everything that
 * reads or writes a learner's state requires authentication.
 */
const router = Router();

const courseParam = z.object({ courseId: z.string().min(1).max(64) });
const lessonParams = courseParam.extend({ lessonId: z.string().min(1).max(64) });

router.get(
  '/courses',
  handle(async (req, res) => {
    const q = parse(
      z.object({
        difficulty: z.nativeEnum(Difficulty).optional(),
        category: z.string().max(50).optional(),
        search: z.string().max(100).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(24),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query
    );
    res.json({ success: true, data: await learningService.listCourses(stripUndefined(q)) });
  })
);

router.get(
  '/courses/:courseId',
  optionalAuth,
  handle(async (req, res) => {
    const { courseId } = parse(courseParam, req.params);
    res.json({ success: true, data: await learningService.getCourse(courseId, req.user?.id) });
  })
);

router.get(
  '/courses/:courseId/prerequisites',
  optionalAuth,
  handle(async (req, res) => {
    const { courseId } = parse(courseParam, req.params);
    res.json({ success: true, data: await learningService.prerequisites(courseId, req.user?.id) });
  })
);

router.get(
  '/courses/:courseId/lessons/:lessonId',
  optionalAuth,
  handle(async (req, res) => {
    const { courseId, lessonId } = parse(lessonParams, req.params);
    res.json({ success: true, data: await learningService.getLesson(courseId, lessonId, req.user?.id) });
  })
);

router.get(
  '/courses/:courseId/lessons/:lessonId/quiz',
  optionalAuth,
  handle(async (req, res) => {
    const { courseId, lessonId } = parse(lessonParams, req.params);
    res.json({ success: true, data: await learningService.getLessonQuiz(courseId, lessonId, req.user?.id) });
  })
);

router.post(
  '/courses/:courseId/enroll',
  authenticateToken,
  handle(async (req, res) => {
    const { courseId } = parse(courseParam, req.params);
    res.status(201).json({ success: true, data: await learningService.enroll(requireUserId(req), courseId) });
  })
);

router.get(
  '/courses/:courseId/progress',
  authenticateToken,
  handle(async (req, res) => {
    const { courseId } = parse(courseParam, req.params);
    res.json({ success: true, data: await learningService.courseProgress(requireUserId(req), courseId) });
  })
);

router.post(
  '/courses/:courseId/lessons/:lessonId/complete',
  authenticateToken,
  handle(async (req, res) => {
    const { courseId, lessonId } = parse(lessonParams, req.params);
    const { minutesSpent } = parse(z.object({ minutesSpent: z.number().int().min(0).max(600).default(0) }), req.body ?? {});
    res.json({ success: true, data: await learningService.completeLesson(requireUserId(req), courseId, lessonId, minutesSpent) });
  })
);

router.post(
  '/courses/:courseId/lessons/:lessonId/quiz/submit',
  authenticateToken,
  handle(async (req, res) => {
    const { courseId, lessonId } = parse(lessonParams, req.params);
    const body = parse(
      z.object({
        answers: z.record(z.string().max(64), z.number().int().min(0).max(16)),
        timeSpentSeconds: z.number().int().min(0).max(86_400).default(0),
      }),
      req.body
    );
    res.json({
      success: true,
      data: await learningService.submitQuiz(requireUserId(req), courseId, lessonId, body.answers, body.timeSpentSeconds),
    });
  })
);

router.post(
  '/exercises/:exerciseId/submissions',
  authenticateToken,
  handle(async (req, res) => {
    const { exerciseId } = parse(z.object({ exerciseId: z.string().min(1).max(64) }), req.params);
    const { code } = parse(
      z.object({ code: z.string().min(1).refine((s) => Buffer.byteLength(s, 'utf8') <= MAX_SOURCE_BYTES) }),
      req.body
    );
    res.status(202).json({ success: true, data: await learningService.submitExercise(requireUserId(req), exerciseId, code) });
  })
);

router.get(
  '/progress',
  authenticateToken,
  handle(async (req, res) => {
    res.json({ success: true, data: { progress: await learningService.progressOverview(requireUserId(req)) } });
  })
);

router.get(
  '/recommendations',
  authenticateToken,
  handle(async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) }), req.query);
    res.json({ success: true, data: { recommendations: await learningService.recommendations(requireUserId(req), limit) } });
  })
);

export { router as learningRouter };
export default router;
