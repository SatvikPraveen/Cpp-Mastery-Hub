import { NotificationType, Prisma, type Notification } from '@prisma/client';

import { prisma } from '../../config/database';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export { NotificationType };

export interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonObject;
}

/** Delivers a stored notification in real time (Socket.IO in production, a spy in tests). */
export type NotificationPublisher = (userId: string, notification: Notification) => void;

/**
 * Persistent per-user notifications. Creation never throws into the caller's flow: a failure to
 * notify must not fail the lesson completion or comment that triggered it.
 */
export class NotificationService {
  private publisher: NotificationPublisher | null = null;

  setPublisher(publisher: NotificationPublisher | null): void {
    this.publisher = publisher;
  }

  async notify(input: NewNotification): Promise<Notification | null> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          ...(input.data !== undefined ? { data: input.data } : {}),
        },
      });
      this.publisher?.(input.userId, notification);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification', { userId: input.userId, type: input.type, error });
      return null;
    }
  }

  async list(userId: string, opts: { unreadOnly: boolean; limit: number; offset: number }) {
    const where: Prisma.NotificationWhereInput = { userId, ...(opts.unreadOnly ? { read: false } : {}) };
    const [items, total, unread] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: opts.offset, take: opts.limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, total, unread, limit: opts.limit, offset: opts.offset };
  }

  unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true, readAt: new Date() },
    });
    if (count === 0) throw new ApiError(404, 'Notification not found');
  }

  async markAllRead(userId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return count;
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await prisma.notification.deleteMany({ where: { id, userId } });
    if (count === 0) throw new ApiError(404, 'Notification not found');
  }

  /** Deletes read notifications older than `days`; intended for a periodic job. */
  async purgeRead(days = 90): Promise<number> {
    const { count } = await prisma.notification.deleteMany({
      where: { read: true, createdAt: { lt: new Date(Date.now() - days * 86_400_000) } },
    });
    return count;
  }
}

export const notificationService = new NotificationService();
