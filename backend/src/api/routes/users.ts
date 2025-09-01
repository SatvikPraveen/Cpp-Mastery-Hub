// File: backend/src/api/routes/users.ts
// Extension: .ts
// Location: backend/src/api/routes/users.ts

import { Router, Request, Response } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { generalRateLimit, uploadRateLimit } from '../middleware/ratelimit';
import { validateFileUpload } from '../middleware/validation';
import { User } from '../../models/User';
import { CodeSnippet } from '../../models/CodeSnippet';
import { ForumPost } from '../../models/ForumPost';
import { logger } from '../../utils/logger';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import multer from 'multer';

const router = Router();

// Apply rate limiting
router.use(generalRateLimit);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Schema definitions
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(100).optional(),
  website: Joi.string().uri().optional(),
  githubUsername: Joi.string().alphanum().max(39).optional(),
  linkedinUrl: Joi.string().uri().optional(),
  programmingLanguages: Joi.array().items(Joi.string().max(30)).max(20).optional(),
  interests: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  experience: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
  isPublicProfile: Joi.boolean().optional(),
  emailNotifications: Joi.object({
    courseUpdates: Joi.boolean(),
    communityActivity: Joi.boolean(),
    achievements: Joi.boolean(),
    newsletter: Joi.boolean()
  }).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

const getUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  search: Joi.string().max(100).optional(),
  experience: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
  sortBy: Joi.string().valid('createdAt', 'lastLoginAt', 'username').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const user = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const [codeSnippets, forumPosts, totalTimeSpent] = await Promise.all([
      CodeSnippet.countDocuments({ author: userId }),
      ForumPost.countDocuments({ author: userId }),
      User.aggregate([
        { $match: { _id: userId } },
        { $unwind: { path: '$progress', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, totalTime: { $sum: '$progress.totalTimeSpent' } } }
      ])
    ]);

    const userWithStats = {
      ...user,
      statistics: {
        codeSnippets,
        forumPosts,
        totalTimeSpent: totalTimeSpent[0]?.totalTime || 0,
        coursesCompleted: user.progress?.filter(p => p.progressPercentage === 100).length || 0,
        coursesInProgress: user.progress?.filter(p => p.progressPercentage > 0 && p.progressPercentage < 100).length || 0
      }
    };

    res.json({ user: userWithStats });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.patch('/me',
  authenticateToken,
  ValidationMiddleware.validate(updateProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;

      // Remove empty values
      Object.keys(updates).forEach(key => {
        if (updates[key] === '' || updates[key] === null) {
          delete updates[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, select: '-password -refreshTokens' }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info(`User profile updated: ${userId}`, {
        userId,
        updatedFields: Object.keys(updates)
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Upload profile avatar
router.post('/me/avatar',
  authenticateToken,
  uploadRateLimit,
  upload.single('avatar'),
  validateFileUpload(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 5 * 1024 * 1024),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // In a real application, you would upload this to a cloud storage service
      // For now, we'll simulate saving the file and return a URL
      const avatarUrl = `https://api.example.com/avatars/${userId}_${Date.now()}.${file.mimetype.split('/')[1]}`;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl, updatedAt: new Date() },
        { new: true, select: '-password -refreshTokens' }
      );

      logger.info(`Avatar uploaded for user: ${userId}`, {
        userId,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user: updatedUser
      });

    } catch (error) {
      logger.error('Error uploading avatar:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }
);

// Change password
router.post('/me/change-password',
  authenticateToken,
  ValidationMiddleware.validate(changePasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        updatedAt: new Date(),
        // Invalidate all refresh tokens to force re-login on all devices
        refreshTokens: []
      });

      logger.info(`Password changed for user: ${userId}`, { userId });

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Delete user account
router.delete('/me',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { confirmDelete } = req.body;

      if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
        return res.status(400).json({ 
          error: 'Account deletion not confirmed. Please provide the exact confirmation text.' 
        });
      }

      // Soft delete - mark as deleted but keep data for potential recovery
      await User.findByIdAndUpdate(userId, {
        status: 'deleted',
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${userId}@example.com`, // Anonymize email
        refreshTokens: []
      });

      // Also anonymize or delete related content
      await Promise.all([
        CodeSnippet.updateMany(
          { author: userId },
          { isPublic: false, deletedAt: new Date() }
        ),
        ForumPost.updateMany(
          { author: userId },
          { status: 'deleted', deletedAt: new Date() }
        )
      ]);

      logger.info(`User account deleted: ${userId}`, { userId });

      res.json({ message: 'Account deleted successfully' });

    } catch (error) {
      logger.error('Error deleting user account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
);

// Get public user profile
router.get('/:userId',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requesterId = (req as any).user?.id;

      const user = await User.findOne({
        _id: userId,
        status: 'active',
        isPublicProfile: true
      })
        .select('username firstName lastName bio location website githubUsername linkedinUrl programmingLanguages interests experience avatar createdAt')
        .lean();

      if (!user) {
        return res.status(404).json({ error: 'User not found or profile is private' });
      }

      // Get public statistics
      const [publicSnippets, publicPosts, achievements] = await Promise.all([
        CodeSnippet.countDocuments({ author: userId, isPublic: true }),
        ForumPost.countDocuments({ author: userId, status: 'published' }),
        User.findById(userId).select('achievements').lean()
      ]);

      const publicProfile = {
        ...user,
        statistics: {
          publicSnippets,
          publicPosts,
          achievements: achievements?.achievements || []
        },
        isOwnProfile: requesterId === userId
      };

      res.json({ user: publicProfile });

    } catch (error) {
      logger.error('Error fetching public profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }
);

// Get user's public code snippets
router.get('/:userId/snippets',
  optionalAuth,
  ValidationMiddleware.validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { page, limit } = req.query;

      // Verify user exists and has public profile
      const user = await User.findOne({
        _id: userId,
        status: 'active',
        isPublicProfile: true
      }).lean();

      if (!user) {
        return res.status(404).json({ error: 'User not found or profile is private' });
      }

      const skip = ((page as number) - 1) * (limit as number);

      const [snippets, total] = await Promise.all([
        CodeSnippet.find({ 
          author: userId, 
          isPublic: true 
        })
          .populate('author', 'username firstName lastName avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit as number)
          .lean(),
        CodeSnippet.countDocuments({ 
          author: userId, 
          isPublic: true 
        })
      ]);

      res.json({
        snippets,
        pagination: {
          page: page as number,
          limit: limit as number,
          total,
          pages: Math.ceil(total / (limit as number))
        }
      });

    } catch (error) {
      logger.error('Error fetching user snippets:', error);
      res.status(500).json({ error: 'Failed to fetch user snippets' });
    }
  }
);

// Get user's public forum posts
router.get('/:userId/posts',
  optionalAuth,
  ValidationMiddleware.validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { page, limit } = req.query;

      // Verify user exists and has public profile
      const user = await User.findOne({
        _id: userId,
        status: 'active',
        isPublicProfile: true
      }).lean();

      if (!user) {
        return res.status(404).json({ error: 'User not found or profile is private' });
      }

      const skip = ((page as number) - 1) * (limit as number);

      const [posts, total] = await Promise.all([
        ForumPost.find({ 
          author: userId, 
          status: 'published' 
        })
          .populate('author', 'username firstName lastName avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit as number)
          .select('-content') // Don't include full content
          .lean(),
        ForumPost.countDocuments({ 
          author: userId, 
          status: 'published' 
        })
      ]);

      res.json({
        posts,
        pagination: {
          page: page as number,
          limit: limit as number,
          total,
          pages: Math.ceil(total / (limit as number))
        }
      });

    } catch (error) {
      logger.error('Error fetching user posts:', error);
      res.status(500).json({ error: 'Failed to fetch user posts' });
    }
  }
);

// Browse/search users
router.get('/',
  optionalAuth,
  ValidationMiddleware.validateQuery(getUsersSchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, search, experience, sortBy, sortOrder } = req.query;

      // Build query filter
      const filter: any = { 
        status: 'active',
        isPublicProfile: true 
      };
      
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (experience) filter.experience = experience;

      const skip = ((page as number) - 1) * (limit as number);
      const sort = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('username firstName lastName bio avatar experience programmingLanguages createdAt lastLoginAt')
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
      logger.error('Error browsing users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

// Follow/unfollow user
router.post('/:userId/follow',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const followerId = (req as any).user.id;

      if (userId === followerId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
      }

      const [targetUser, followerUser] = await Promise.all([
        User.findById(userId),
        User.findById(followerId)
      ]);

      if (!targetUser || !followerUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if already following
      const isFollowing = followerUser.following?.includes(userId) || false;

      if (isFollowing) {
        // Unfollow
        followerUser.following = followerUser.following?.filter(id => id.toString() !== userId) || [];
        targetUser.followers = targetUser.followers?.filter(id => id.toString() !== followerId) || [];
      } else {
        // Follow
        followerUser.following = followerUser.following || [];
        followerUser.following.push(userId);
        targetUser.followers = targetUser.followers || [];
        targetUser.followers.push(followerId);
      }

      await Promise.all([
        targetUser.save(),
        followerUser.save()
      ]);

      logger.info(`User ${followerId} ${isFollowing ? 'unfollowed' : 'followed'} user ${userId}`, {
        followerId,
        userId,
        action: isFollowing ? 'unfollow' : 'follow'
      });

      res.json({
        message: isFollowing ? 'User unfollowed successfully' : 'User followed successfully',
        isFollowing: !isFollowing
      });

    } catch (error) {
      logger.error('Error following/unfollowing user:', error);
      res.status(500).json({ error: 'Failed to follow/unfollow user' });
    }
  }
);

export default router;