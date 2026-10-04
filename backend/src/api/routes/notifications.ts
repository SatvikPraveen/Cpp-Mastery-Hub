import { Router } from 'express';
import { z } from 'zod';

import { notificationService } from '../../services/notification/notification-service';
import { handle, parse, requireUserId } from '../http';

/** Mounted at /api/notifications behind `authenticateToken`. */
const router = Router();
const idParam = z.object({ id: z.string().min(1).max(64) });

router.get(
  '/',
  handle(async (req, res) => {
    const q = parse(
      z.object({
        unread: z.enum(['true', 'false']).default('false'),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query
    );
    const data = await notificationService.list(requireUserId(req), {
      unreadOnly: q.unread === 'true',
      limit: q.limit,
      offset: q.offset,
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/unread-count',
  handle(async (req, res) => {
    res.json({ success: true, data: { count: await notificationService.unreadCount(requireUserId(req)) } });
  })
);

router.patch(
  '/read-all',
  handle(async (req, res) => {
    res.json({ success: true, data: { updated: await notificationService.markAllRead(requireUserId(req)) } });
  })
);

router.patch(
  '/:id/read',
  handle(async (req, res) => {
    const { id } = parse(idParam, req.params);
    await notificationService.markRead(requireUserId(req), id);
    res.json({ success: true });
  })
);

router.delete(
  '/:id',
  handle(async (req, res) => {
    const { id } = parse(idParam, req.params);
    await notificationService.remove(requireUserId(req), id);
    res.status(204).end();
  })
);

export default router;
