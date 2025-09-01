// File: backend/src/services/notification/notification-service.ts
// Extension: .ts
// Location: backend/src/services/notification/notification-service.ts

import { EventEmitter } from 'events';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';
import nodemailer from 'nodemailer';
import WebSocket from 'ws';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  expiresAt?: Date;
}

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  MENTION = 'mention',
  FOLLOW = 'follow',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
  COURSE_UPDATE = 'course_update',
  NEW_LESSON = 'new_lesson',
  FORUM_REPLY = 'forum_reply',
  CODE_SHARED = 'code_shared',
  COLLABORATION_INVITE = 'collaboration_invite'
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class NotificationService extends EventEmitter {
  private emailTransporter: nodemailer.Transporter;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    super();
    this.initializeEmailTransporter();
    this.setupEventListeners();
  }

  private initializeEmailTransporter(): void {
    if (process.env.EMAIL_SERVICE === 'smtp') {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Mock transporter for development
      this.emailTransporter = nodemailer.createTransporter({
        jsonTransport: true,
      });
    }
  }

  private setupEventListeners(): void {
    this.on('notification', this.handleNotification.bind(this));
    this.on('email', this.handleEmailNotification.bind(this));
    this.on('realtime', this.handleRealtimeNotification.bind(this));
  }

  // WebSocket connection management
  public addConnection(userId: string, ws: WebSocket): void {
    this.wsConnections.set(userId, ws);
    
    ws.on('close', () => {
      this.wsConnections.delete(userId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      this.wsConnections.delete(userId);
    });

    logger.info(`WebSocket connection added for user ${userId}`);
  }

  public removeConnection(userId: string): void {
    const ws = this.wsConnections.get(userId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(userId);
      logger.info(`WebSocket connection removed for user ${userId}`);
    }
  }

  // Main notification sending method
  public async sendNotification(notification: NotificationData): Promise<void> {
    try {
      // Store notification in database
      await this.storeNotification(notification);

      // Emit notification event for processing
      this.emit('notification', notification);

      logger.info(`Notification sent to user ${notification.userId}`, {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Bulk notification sending
  public async sendBulkNotification(userIds: string[], notification: Omit<NotificationData, 'userId'>): Promise<void> {
    const notifications = userIds.map(userId => ({
      ...notification,
      userId
    }));

    const promises = notifications.map(notif => this.sendNotification(notif));
    await Promise.allSettled(promises);

    logger.info(`Bulk notification sent to ${userIds.length} users`, {
      type: notification.type,
      title: notification.title,
      userCount: userIds.length
    });
  }

  // Store notification in user's notification list
  private async storeNotification(notification: NotificationData): Promise<void> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error(`User not found: ${notification.userId}`);
      }

      user.notifications = user.notifications || [];
      user.notifications.unshift({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority || 'medium',
        isRead: false,
        createdAt: new Date(),
        expiresAt: notification.expiresAt
      });

      // Keep only the latest 100 notifications
      if (user.notifications.length > 100) {
        user.notifications = user.notifications.slice(0, 100);
      }

      await user.save();

    } catch (error) {
      logger.error('Failed to store notification:', error);
      throw error;
    }
  }

  // Handle notification processing
  private async handleNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user preferences
      const user = await User.findById(notification.userId).select('emailNotifications').lean();
      if (!user) {
        logger.warn(`User not found for notification: ${notification.userId}`);
        return;
      }

      // Send real-time notification if user is connected
      this.emit('realtime', notification);

      // Send email notification if enabled
      if (this.shouldSendEmail(notification.type, user.emailNotifications)) {
        this.emit('email', notification);
      }

    } catch (error) {
      logger.error('Failed to handle notification:', error);
    }
  }

  // Handle real-time WebSocket notifications
  private handleRealtimeNotification(notification: NotificationData): void {
    const ws = this.wsConnections.get(notification.userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          data: {
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            timestamp: new Date().toISOString()
          }
        }));

        logger.debug(`Real-time notification sent to user ${notification.userId}`);

      } catch (error) {
        logger.error(`Failed to send real-time notification to user ${notification.userId}:`, error);
        this.wsConnections.delete(notification.userId);
      }
    }
  }

  // Handle email notifications
  private async handleEmailNotification(notification: NotificationData): Promise<void> {
    try {
      const user = await User.findById(notification.userId).select('email firstName lastName').lean();
      if (!user || !user.email) {
        logger.warn(`User email not found for notification: ${notification.userId}`);
        return;
      }

      const emailTemplate = this.getEmailTemplate(notification);
      
      await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@cppmastery.com',
        to: user.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html
      });

      logger.info(`Email notification sent to ${user.email}`, {
        userId: notification.userId,
        type: notification.type
      });

    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }
  }

  // Check if email should be sent based on user preferences
  private shouldSendEmail(type: NotificationType, preferences: any): boolean {
    if (!preferences) return false;

    const typeMap: Record<NotificationType, string> = {
      [NotificationType.LIKE]: 'communityActivity',
      [NotificationType.COMMENT]: 'communityActivity',
      [NotificationType.MENTION]: 'communityActivity',
      [NotificationType.FOLLOW]: 'communityActivity',
      [NotificationType.FORUM_REPLY]: 'communityActivity',
      [NotificationType.CODE_SHARED]: 'communityActivity',
      [NotificationType.COLLABORATION_INVITE]: 'communityActivity',
      [NotificationType.ACHIEVEMENT]: 'achievements',
      [NotificationType.COURSE_UPDATE]: 'courseUpdates',
      [NotificationType.NEW_LESSON]: 'courseUpdates',
      [NotificationType.SYSTEM]: 'newsletter'
    };

    const preferenceKey = typeMap[type];
    return preferenceKey ? preferences[preferenceKey] === true : false;
  }

  // Generate email templates based on notification type
  private getEmailTemplate(notification: NotificationData): EmailTemplate {
    const baseUrl = process.env.FRONTEND_URL || 'https://cppmastery.com';

    switch (notification.type) {
      case NotificationType.LIKE:
        return {
          subject: '👍 Someone liked your content!',
          text: `${notification.title}\n\n${notification.message}\n\nView it at: ${baseUrl}`,
          html: this.generateEmailHTML(notification.title, notification.message, baseUrl, '👍')
        };

      case NotificationType.COMMENT:
        return {
          subject: '💬 New comment on your post',
          text: `${notification.title}\n\n${notification.message}\n\nView it at: ${baseUrl}`,
          html: this.generateEmailHTML(notification.title, notification.message, baseUrl, '💬')
        };

      case NotificationType.FOLLOW:
        return {
          subject: '🤝 You have a new follower!',
          text: `${notification.title}\n\n${notification.message}\n\nView your profile at: ${baseUrl}/profile`,
          html: this.generateEmailHTML(notification.title, notification.message, `${baseUrl}/profile`, '🤝')
        };

      case NotificationType.ACHIEVEMENT:
        return {
          subject: '🏆 Achievement Unlocked!',
          text: `${notification.title}\n\n${notification.message}\n\nView your achievements at: ${baseUrl}/achievements`,
          html: this.generateEmailHTML(notification.title, notification.message, `${baseUrl}/achievements`, '🏆')
        };

      case NotificationType.COURSE_UPDATE:
        return {
          subject: '📚 Course Update Available',
          text: `${notification.title}\n\n${notification.message}\n\nContinue learning at: ${baseUrl}/learn`,
          html: this.generateEmailHTML(notification.title, notification.message, `${baseUrl}/learn`, '📚')
        };

      default:
        return {
          subject: notification.title,
          text: `${notification.title}\n\n${notification.message}\n\nVisit: ${baseUrl}`,
          html: this.generateEmailHTML(notification.title, notification.message, baseUrl, '🔔')
        };
    }
  }

  // Generate HTML email template
  private generateEmailHTML(title: string, message: string, actionUrl: string, emoji: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .emoji { font-size: 48px; margin-bottom: 15px; }
            .title { font-size: 24px; margin: 0 0 20px 0; }
            .message { font-size: 16px; margin-bottom: 30px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="emoji">${emoji}</div>
                <h1 class="title">${title}</h1>
            </div>
            <div class="content">
                <p class="message">${message}</p>
                <a href="${actionUrl}" class="button">View Details</a>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} C++ Mastery Hub. All rights reserved.</p>
                <p>You received this email because you have notifications enabled in your account settings.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Get user notifications with pagination
  public async getUserNotifications(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const user = await User.findById(userId).select('notifications').lean();
      if (!user) {
        throw new Error('User not found');
      }

      const notifications = user.notifications || [];
      const skip = (page - 1) * limit;
      const paginatedNotifications = notifications.slice(skip, skip + limit);

      return {
        notifications: paginatedNotifications,
        total: notifications.length,
        unreadCount: notifications.filter(n => !n.isRead).length,
        page,
        limit,
        pages: Math.ceil(notifications.length / limit)
      };

    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  // Mark notifications as read
  public async markNotificationsAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.notifications) return;

      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        user.notifications.forEach(notification => {
          if (notificationIds.includes(notification._id.toString())) {
            notification.isRead = true;
          }
        });
      } else {
        // Mark all notifications as read
        user.notifications.forEach(notification => {
          notification.isRead = true;
        });
      }

      await user.save();

      logger.info(`Notifications marked as read for user ${userId}`, {
        userId,
        specificNotifications: !!notificationIds,
        count: notificationIds?.length || user.notifications.length
      });

    } catch (error) {
      logger.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  // Delete old notifications
  public async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      
      await User.updateMany(
        { 'notifications.expiresAt': { $lte: now } },
        { $pull: { notifications: { expiresAt: { $lte: now } } } }
      );

      logger.info('Expired notifications cleaned up');

    } catch (error) {
      logger.error('Failed to cleanup expired notifications:', error);
    }
  }

  // Send system-wide announcements
  public async sendSystemAnnouncement(
    title: string, 
    message: string, 
    targetUsers?: string[],
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      let userIds: string[];

      if (targetUsers && targetUsers.length > 0) {
        userIds = targetUsers;
      } else {
        // Send to all active users
        const users = await User.find({ status: 'active' }).select('_id').lean();
        userIds = users.map(user => user._id.toString());
      }

      await this.sendBulkNotification(userIds, {
        type: NotificationType.SYSTEM,
        title,
        message,
        priority,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      logger.info('System announcement sent', {
        title,
        userCount: userIds.length,
        priority
      });

    } catch (error) {
      logger.error('Failed to send system announcement:', error);
      throw error;
    }
  }
}