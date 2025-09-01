// File: backend/src/api/routes/auth.ts
// Extension: .ts

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { generateTokens, verifyRefreshToken } from '../../services/auth/jwt';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';
import config from '../../config';

const router = Router();
const prisma = new PrismaClient();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: 'Too many password reset attempts, please try again later.',
});

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('name').isLength({ min: 1, max: 100 }).trim().withMessage('Name is required and must be less than 100 characters'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').isLength({ min: 1 }).withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),
];

const changePasswordValidation = [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.mapped(),
    });
  }
  return null;
};

// POST /api/auth/register
router.post('/register', authLimiter, registerValidation, async (req: Request, res: Response) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, username, name, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists',
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken',
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        password: hashedPassword,
        profile: {
          create: {
            skillLevel: 'BEGINNER',
            totalPoints: 0,
            streak: 0,
            longestStreak: 0,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`New user registered: ${user.email}`, { userId: user.id });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, async (req: Request, res: Response) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, password, rememberMe = false } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.',
      });
    }

    // Check if user is banned
    if (user.isBanned && (!user.banExpires || user.banExpires > new Date())) {
      return res.status(401).json({
        success: false,
        message: user.banReason || 'Account has been suspended',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokenExpiry = rememberMe ? '30d' : '7d';
    const { accessToken, refreshToken } = generateTokens(user.id, tokenExpiry);

    // Store refresh token
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.email}`, { userId: user.id });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
        isActive: true,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found or expired',
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.userId);

    // Update session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = session.user;

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Invalidate session
      await prisma.userSession.updateMany({
        where: {
          token,
          userId: (req as any).user.id,
        },
        data: {
          isActive: false,
        },
      });
    }

    logger.info(`User logged out: ${(req as any).user.email}`, { userId: (req as any).user.id });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, async (req: Request, res: Response) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Store reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - C++ Mastery Hub',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your C++ Mastery Hub account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>C++ Mastery Hub Team</p>
      `,
    });

    logger.info(`Password reset requested: ${user.email}`, { userId: user.id });

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordValidation, async (req: Request, res: Response) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { token, password } = req.body;

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all existing sessions
    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    logger.info(`Password reset completed: ${user.email}`, { userId: user.id });

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, changePasswordValidation, async (req: Request, res: Response) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed: ${user.email}`, { userId: user.id });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;