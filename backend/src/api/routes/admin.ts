import { Prisma, PostStatus, ReportStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../config/database';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { handle, parse, requireUserId } from '../http';
import { hasRoleAtLeast, requireRole } from '../middleware/auth';

/**
 * Administration endpoints. Mounted behind `authenticateToken`; every route additionally
 * requires MODERATOR or ADMIN as noted.
 *
 *   GET   /stats                          platform counts                      (moderator)
 *   GET   /users, GET /users/:userId      list / inspect users                 (moderator)
 *   PATCH /users/:userId                  change role or active flag           (admin)
 *   POST  /users/:userId/ban|unban        deactivate / reactivate an account   (moderator)
 *   PATCH /posts/:postId                  pin, lock, hide a forum post         (moderator)
 *   GET   /reports                        open (or filtered) post reports      (moderator)
 *   POST  /reports/:reportId/resolve      action or dismiss; actioning hides the post (moderator)
 *   GET   /settings, PUT /settings/:key   SystemConfig key/value store         (admin)
 */
const router = Router();
const moderator = requireRole(['moderator', 'admin']);
const admin = requireRole(['admin']);

const userIdParam = z.object({ userId: z.string().min(1).max(64) });
const adminUserSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  isVerified: true,
  lastActiveAt: true,
  joinedAt: true,
  deactivatedAt: true,
  deactivationReason: true,
} as const;

router.get(
  '/stats',
  moderator,
  handle(async (_req, res) => {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [users, activeUsers, newUsers, snippets, posts, enrollments] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: since } } }),
      prisma.user.count({ where: { joinedAt: { gte: since } } }),
      prisma.codeSnippet.count(),
      prisma.forumPost.count(),
      prisma.courseEnrollment.count(),
    ]);
    res.json({
      success: true,
      data: { users, activeUsersLast7Days: activeUsers, newUsersLast7Days: newUsers, snippets, posts, enrollments },
    });
  })
);

router.get(
  '/users',
  moderator,
  handle(async (req, res) => {
    const q = parse(
      z.object({
        search: z.string().max(100).optional(),
        role: z.nativeEnum(UserRole).optional(),
        active: z.enum(['true', 'false']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query
    );
    const where: Prisma.UserWhereInput = {};
    if (q.role) where.role = q.role;
    if (q.active) where.isActive = q.active === 'true';
    if (q.search) {
      where.OR = [
        { username: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({ where, select: adminUserSelect, orderBy: { joinedAt: 'desc' }, skip: q.offset, take: q.limit }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, limit: q.limit, offset: q.offset } });
  })
);

router.get(
  '/users/:userId',
  moderator,
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...adminUserSelect,
        _count: { select: { codeSnippets: true, forumPosts: true, forumComments: true, enrollments: true } },
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: { user } });
  })
);

router.patch(
  '/users/:userId',
  admin,
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const body = parse(
      z.object({ role: z.nativeEnum(UserRole).optional(), isActive: z.boolean().optional() }).strict(),
      req.body
    );
    const actor = req.user;
    if (!actor) throw new ApiError(401, 'Authentication required');
    if (userId === actor.id) throw new ApiError(400, 'Administrators cannot change their own account here');
    if (body.role === 'SUPER_ADMIN' && !hasRoleAtLeast(actor, 'SUPER_ADMIN')) {
      throw new ApiError(403, 'Only a super administrator can grant SUPER_ADMIN');
    }
    const data: Prisma.UserUpdateInput = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    const user = await updateUser(userId, data);
    logger.info('Admin updated user', { actorId: actor.id, userId, changes: body });
    res.json({ success: true, data: { user } });
  })
);

router.post(
  '/users/:userId/ban',
  moderator,
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(200) }), req.body);
    const actorId = requireUserId(req);
    if (userId === actorId) throw new ApiError(400, 'You cannot ban yourself');
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new ApiError(404, 'User not found');
    if (req.user && !hasRoleAtLeast(req.user, target.role)) {
      throw new ApiError(403, 'Cannot ban a user with a higher role');
    }
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: false, deactivatedAt: new Date(), deactivationReason: `banned: ${reason}` },
        select: adminUserSelect,
      }),
      prisma.userSession.updateMany({ where: { userId }, data: { isActive: false } }),
    ]);
    logger.warn('User banned', { actorId, userId, reason });
    res.json({ success: true, data: { user } });
  })
);

router.post(
  '/users/:userId/unban',
  moderator,
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const user = await updateUser(userId, { isActive: true, deactivatedAt: null, deactivationReason: null });
    logger.info('User unbanned', { actorId: requireUserId(req), userId });
    res.json({ success: true, data: { user } });
  })
);

router.patch(
  '/posts/:postId',
  moderator,
  handle(async (req, res) => {
    const { postId } = parse(z.object({ postId: z.string().min(1).max(64) }), req.params);
    const body = parse(
      z
        .object({
          isPinned: z.boolean().optional(),
          isLocked: z.boolean().optional(),
          status: z.nativeEnum(PostStatus).optional(),
        })
        .strict(),
      req.body
    );
    const data: Prisma.ForumPostUpdateInput = {};
    if (body.isPinned !== undefined) data.isPinned = body.isPinned;
    if (body.isLocked !== undefined) data.isLocked = body.isLocked;
    if (body.status !== undefined) data.status = body.status;
    try {
      const post = await prisma.forumPost.update({ where: { id: postId }, data });
      logger.info('Moderator updated post', { actorId: requireUserId(req), postId, changes: body });
      res.json({ success: true, data: { post } });
    } catch (error) {
      throw notFound(error, 'Post not found');
    }
  })
);

router.get(
  '/reports',
  moderator,
  handle(async (req, res) => {
    const q = parse(
      z.object({
        status: z.nativeEnum(ReportStatus).default(ReportStatus.OPEN),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query
    );
    const where = { status: q.status };
    const [items, total] = await prisma.$transaction([
      prisma.postReport.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: q.offset,
        take: q.limit,
        include: {
          post: { select: { id: true, title: true, status: true, userId: true } },
          reporter: { select: { id: true, username: true } },
        },
      }),
      prisma.postReport.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, limit: q.limit, offset: q.offset } });
  })
);

router.post(
  '/reports/:reportId/resolve',
  moderator,
  handle(async (req, res) => {
    const { reportId } = parse(z.object({ reportId: z.string().min(1).max(64) }), req.params);
    const { action } = parse(z.object({ action: z.enum(['action', 'dismiss']) }), req.body);
    const resolvedById = requireUserId(req);
    const report = await prisma.postReport.findUnique({ where: { id: reportId } });
    if (!report) throw new ApiError(404, 'Report not found');
    const status = action === 'action' ? ReportStatus.ACTIONED : ReportStatus.DISMISSED;
    const now = new Date();
    await prisma.$transaction([
      // Resolving one report resolves every open report on the same post.
      prisma.postReport.updateMany({
        where: { postId: report.postId, status: ReportStatus.OPEN },
        data: { status, resolvedById, resolvedAt: now },
      }),
      ...(action === 'action'
        ? [prisma.forumPost.update({ where: { id: report.postId }, data: { status: PostStatus.HIDDEN } })]
        : []),
    ]);
    logger.info('Report resolved', { reportId, postId: report.postId, action, resolvedById });
    res.json({ success: true, data: { postId: report.postId, status } });
  })
);

router.get(
  '/settings',
  admin,
  handle(async (_req, res) => {
    res.json({ success: true, data: await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } }) });
  })
);

router.put(
  '/settings/:key',
  admin,
  handle(async (req, res) => {
    const { key } = parse(z.object({ key: z.string().regex(/^[a-z][a-z0-9_.]{1,63}$/) }), req.params);
    const body = parse(
      z.object({ value: z.unknown(), description: z.string().max(500).optional() }),
      req.body
    );
    if (body.value === undefined) throw new ApiError(400, 'value is required');
    const value = body.value as Prisma.InputJsonValue;
    const updatedBy = requireUserId(req);
    const setting = await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, description: body.description ?? null, updatedBy },
      update: { value, updatedBy, ...(body.description !== undefined ? { description: body.description } : {}) },
    });
    res.json({ success: true, data: setting });
  })
);

async function updateUser(userId: string, data: Prisma.UserUpdateInput) {
  try {
    return await prisma.user.update({ where: { id: userId }, data, select: adminUserSelect });
  } catch (error) {
    throw notFound(error, 'User not found');
  }
}

function notFound(error: unknown, message: string): unknown {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
    ? new ApiError(404, message)
    : error;
}

export default router;
