// File: backend/src/api/routes/admin.ts
// Extension: .ts
// Location: backend/src/api/routes/admin.ts

import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ValidationMiddleware, schemas } from '../middleware/validation';
import { generalRateLimit } from '../middleware/ratelimit';
import { User } from '../../models/User';
import { CodeSnippet } from '../../models/CodeSnippet';
import { ForumPost } from '../../models/ForumPost';
import { logger } from '../../utils/logger';
import Joi from 'joi';

const router = Router();

// Apply rate limiting and authentication to all admin routes
router.use(generalRateLimit);
router.use(authenticateToken);
router.use(requireRole(['admin', 'moderator']));

// Admin dashboard statistics
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCodeSnippets,
      totalForumPosts,
      pendingReports
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      CodeSnippet.countDocuments(),
      ForumPost.countDocuments(),
      ForumPost.countDocuments({ status: 'reported' })
    ]);

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalCodeSnippets,
        totalForumPosts,
        pendingReports
      },
      userGrowth
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// User management
const userManagementSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  role: Joi.string().valid('user', 'premium', 'moderator', 'admin').optional(),
  sortBy: Joi.string().valid('createdAt', 'lastLoginAt', 'username', 'email').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

router.get('/users', 
  ValidationMiddleware.validateQuery(userManagementSchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, search, status, role, sortBy, sortOrder } = req.query;
      
      const filter: any = {};
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) filter.status = status;
      if (role) filter.role = role;

      const skip = ((page as number) - 1) * (limit as number);
      const sort = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshTokens')
          .sort(sort)
          .skip(skip)
          .limit(limit as number)
          .lean(),
        User.countDocuments(filter)
      ]);

      res.json({
        users,
        pagination: {
          page: page as number,
          limit: limit as number,
          total,
          pages: Math.ceil(total / (limit as number))
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

// Get specific user details
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's activity stats
    const [codeSnippets, forumPosts, comments] = await Promise.all([
      CodeSnippet.countDocuments({ author: userId }),
      ForumPost.countDocuments({ author: userId }),
      ForumPost.countDocuments({ 'comments.author': userId })
    ]);

    res.json({
      user,
      activity: {
        codeSnippets,
        forumPosts,
        comments
      }
    });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user status/role
const updateUserSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  role: Joi.string().valid('user', 'premium', 'moderator', 'admin').optional(),
  reason: Joi.string().max(500).optional()
});

router.patch('/users/:userId',
  ValidationMiddleware.validate(updateUserSchema),
  requireRole(['admin']), // Only admins can modify users
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, role, reason } = req.body;
      const adminId = (req as any).user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent modification of other admins (unless super admin)
      if (user.role === 'admin' && (req as any).user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Cannot modify admin users' });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (role) updateData.role = role;
      updateData.updatedAt = new Date();

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, select: '-password -refreshTokens' }
      );

      // Log the admin action
      logger.info(`Admin action: User ${userId} modified by ${adminId}`, {
        adminId,
        userId,
        changes: updateData,
        reason
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Content moderation - Get reported content
router.get('/moderation/reports', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = ((page as number) - 1) * (limit as number);

    const [reportedPosts, reportedSnippets] = await Promise.all([
      ForumPost.find({ status: 'reported' })
        .populate('author', 'username email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit as number)
        .lean(),
      CodeSnippet.find({ isReported: true })
        .populate('author', 'username email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit as number)
        .lean()
    ]);

    res.json({
      reports: {
        posts: reportedPosts,
        snippets: reportedSnippets
      }
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Moderate content
const moderateContentSchema = Joi.object({
  action: Joi.string().valid('approve', 'remove', 'warn').required(),
  reason: Joi.string().max(500).optional(),
  type: Joi.string().valid('post', 'snippet').required(),
  itemId: Joi.string().required()
});

router.post('/moderation/action',
  ValidationMiddleware.validate(moderateContentSchema),
  async (req: Request, res: Response) => {
    try {
      const { action, reason, type, itemId } = req.body;
      const moderatorId = (req as any).user.id;

      let result;
      
      if (type === 'post') {
        const updateData: any = { status: action === 'approve' ? 'published' : 'removed' };
        if (action === 'remove') {
          updateData.removedAt = new Date();
          updateData.removedBy = moderatorId;
          updateData.removalReason = reason;
        }
        
        result = await ForumPost.findByIdAndUpdate(itemId, updateData, { new: true });
      } else if (type === 'snippet') {
        const updateData: any = { 
          isReported: false,
          isPublic: action === 'approve'
        };
        if (action === 'remove') {
          updateData.removedAt = new Date();
          updateData.removedBy = moderatorId;
          updateData.removalReason = reason;
        }
        
        result = await CodeSnippet.findByIdAndUpdate(itemId, updateData, { new: true });
      }

      if (!result) {
        return res.status(404).json({ error: 'Content not found' });
      }

      // Log moderation action
      logger.info(`Moderation action: ${type} ${itemId} ${action} by ${moderatorId}`, {
        moderatorId,
        type,
        itemId,
        action,
        reason
      });

      res.json({
        message: `Content ${action} successfully`,
        item: result
      });
    } catch (error) {
      logger.error('Error moderating content:', error);
      res.status(500).json({ error: 'Failed to moderate content' });
    }
  }
);

// System settings
router.get('/settings', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // This would typically come from a settings collection or config
    const settings = {
      maintenance: {
        enabled: false,
        message: '',
        scheduledAt: null
      },
      features: {
        registrationOpen: true,
        codeExecutionEnabled: true,
        forumEnabled: true,
        collaborationEnabled: true
      },
      limits: {
        maxCodeExecutionsPerDay: 100,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxCodeLength: 10000
      }
    };

    res.json({ settings });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update system settings
const updateSettingsSchema = Joi.object({
  maintenance: Joi.object({
    enabled: Joi.boolean(),
    message: Joi.string().max(500),
    scheduledAt: Joi.date().optional()
  }).optional(),
  features: Joi.object({
    registrationOpen: Joi.boolean(),
    codeExecutionEnabled: Joi.boolean(),
    forumEnabled: Joi.boolean(),
    collaborationEnabled: Joi.boolean()
  }).optional(),
  limits: Joi.object({
    maxCodeExecutionsPerDay: Joi.number().integer().min(1).max(1000),
    maxFileSize: Joi.number().integer().min(1024).max(100 * 1024 * 1024),
    maxCodeLength: Joi.number().integer().min(100).max(100000)
  }).optional()
});

router.patch('/settings',
  requireRole(['admin']),
  ValidationMiddleware.validate(updateSettingsSchema),
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const updates = req.body;

      // In a real application, you would save these to a database
      // For now, we'll just log the changes
      logger.info(`System settings updated by admin ${adminId}`, {
        adminId,
        updates
      });

      res.json({
        message: 'Settings updated successfully',
        settings: updates
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// System logs
router.get('/logs', 
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { level = 'all', limit = 100, offset = 0 } = req.query;
      
      // This would typically read from your logging system
      // For demonstration, returning mock data
      const logs = [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'User login successful',
          metadata: { userId: '123', ip: '192.168.1.1' }
        },
        {
          timestamp: new Date(Date.now() - 60000),
          level: 'error',
          message: 'Code execution failed',
          metadata: { userId: '456', error: 'Compilation error' }
        }
      ];

      res.json({
        logs: logs.slice(offset as number, (offset as number) + (limit as number)),
        total: logs.length
      });
    } catch (error) {
      logger.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

export default router;