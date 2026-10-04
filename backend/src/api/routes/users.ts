import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../config/database';
import { userService } from '../../services/user-service';
import { ApiError } from '../../utils/errors';
import { handle, parse, requireUserId, stripUndefined } from '../http';

/**
 * User endpoints. Mounted behind `authenticateToken`, so `req.user` is always present.
 *
 *   GET    /me                    own profile (with private fields such as email)
 *   PATCH  /me                    update profile
 *   POST   /me/change-password    change password (revokes other sessions)
 *   DELETE /me                    deactivate account (password confirmation)
 *   GET    /me/activity           recent activity feed
 *   GET    /me/settings, PATCH /me/settings
 *   GET    /                      search active users
 *   GET    /:userId               public profile (no email)
 *   GET    /:userId/snippets      that user's public snippets
 */
const router = Router();

const optionalUrl = z.string().url().max(500).or(z.literal('')).optional();

const profileBody = z
  .object({
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    bio: z.string().max(500).optional(),
    website: optionalUrl,
    location: z.string().max(100).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    avatarUrl: optionalUrl,
  })
  .strict();

const passwordRule = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, 'needs a lowercase letter')
  .regex(/[A-Z]/, 'needs an uppercase letter')
  .regex(/\d/, 'needs a digit');

const settingsBody = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.enum(['en', 'es', 'fr', 'de', 'zh']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    autoSave: z.boolean().optional(),
    codeCompletion: z.boolean().optional(),
  })
  .strict();

const userIdParam = z.object({ userId: z.string().min(1).max(64) });
const paging = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  website: true,
  location: true,
  skills: true,
  role: true,
  joinedAt: true,
} as const;

router.get(
  '/me',
  handle(async (req, res) => {
    res.json({ success: true, data: { user: await userService.getUserProfile(requireUserId(req)) } });
  })
);

router.patch(
  '/me',
  handle(async (req, res) => {
    const body = parse(profileBody, req.body);
    const user = await userService.updateProfile(requireUserId(req), stripUndefined(body));
    res.json({ success: true, data: { user } });
  })
);

router.post(
  '/me/change-password',
  handle(async (req, res) => {
    const { currentPassword, newPassword } = parse(
      z.object({ currentPassword: z.string().min(1), newPassword: passwordRule }),
      req.body
    );
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password must differ from the current one');
    }
    await userService.changePassword(requireUserId(req), currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed' });
  })
);

router.delete(
  '/me',
  handle(async (req, res) => {
    const { password, reason, feedback } = parse(
      z.object({
        password: z.string().min(1),
        reason: z.string().max(200).default('unspecified'),
        feedback: z.string().max(2000).optional(),
      }),
      req.body
    );
    await userService.deactivateAccount(requireUserId(req), password, reason, feedback);
    res.status(204).end();
  })
);

router.get(
  '/me/activity',
  handle(async (req, res) => {
    const { limit } = parse(paging, req.query);
    const activities = await prisma.userActivity.findMany({
      where: { userId: requireUserId(req) },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    res.json({ success: true, data: { activities } });
  })
);

router.get(
  '/me/settings',
  handle(async (req, res) => {
    res.json({ success: true, data: await userService.getUserSettings(requireUserId(req)) });
  })
);

router.patch(
  '/me/settings',
  handle(async (req, res) => {
    const body = parse(settingsBody, req.body);
    res.json({
      success: true,
      data: await userService.updateSettings(requireUserId(req), stripUndefined(body)),
    });
  })
);

router.get(
  '/',
  handle(async (req, res) => {
    const { q, limit, offset } = parse(paging.extend({ q: z.string().max(100).default('') }), req.query);
    res.json({ success: true, data: await userService.searchUsers(q, limit, offset) });
  })
);

router.get(
  '/:userId',
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        ...publicUserSelect,
        _count: { select: { codeSnippets: { where: { isPublic: true } }, forumPosts: true } },
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: { user } });
  })
);

router.get(
  '/:userId/snippets',
  handle(async (req, res) => {
    const { userId } = parse(userIdParam, req.params);
    const { limit, offset } = parse(paging, req.query);
    // Public snippets only, even for the owner; owners use GET /api/code/snippets/mine.
    const page = await prisma.$transaction([
      prisma.codeSnippet.findMany({
        where: { userId, isPublic: true },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.codeSnippet.count({ where: { userId, isPublic: true } }),
    ]);
    res.json({ success: true, data: { items: page[0], total: page[1], limit, offset } });
  })
);


export default router;
