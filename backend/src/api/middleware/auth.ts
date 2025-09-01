// File: backend/src/api/middleware/auth.ts
// Extension: .ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import config from '../../config';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    isActive: boolean;
    profile?: any;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
        return;
      } else {
        throw error;
      }
    }

    // Check if session exists and is active
    const session = await prisma.userSession.findFirst({
      where: {
        token,
        userId: decoded.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
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
      res.status(401).json({
        success: false,
        message: 'Session not found or expired',
        code: 'SESSION_INVALID',
      });
      return;
    }

    // Check if user still exists and is active
    if (!session.user || !session.user.isActive) {
      // Invalidate session if user is inactive
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      res.status(401).json({
        success: false,
        message: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
      return;
    }

    // Check if user is banned
    if (session.user.isBanned && (!session.user.banExpires || session.user.banExpires > new Date())) {
      res.status(403).json({
        success: false,
        message: session.user.banReason || 'Account has been suspended',
        code: 'USER_BANNED',
      });
      return;
    }

    // Attach user to request object
    const { password: _, ...userWithoutPassword } = session.user;
    (req as AuthenticatedRequest).user = userWithoutPassword;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    // Use regular auth middleware if token is provided
    await authMiddleware(req, res, next);
  } catch (error) {
    // If auth fails, continue without user (don't block request)
    next();
  }
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Check if user has required role
    const userRoles = user.profile?.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
};

// Admin access middleware
export const requireAdmin = requireRole(['admin']);

// Moderator access middleware
export const requireModerator = requireRole(['admin', 'moderator']);

// Check if user owns resource or is admin
export const requireOwnershipOrAdmin = (getResourceUserId: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const resourceUserId = getResourceUserId(req);
    const userRoles = user.profile?.roles || [];
    const isAdmin = userRoles.includes('admin');
    const isOwner = user.id === resourceUserId;

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    next();
  };
};

// Rate limiting per user
export const userRateLimit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      next();
      return;
    }

    const now = Date.now();
    const userId = user.id;
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize user's request count
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    // Increment request count
    userRequests.count += 1;
    next();
  };
};

// Verify email middleware
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  next();
};

// Check if user can perform action based on subscription/plan
export const requireSubscription = (requiredPlan: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userPlan = user.profile?.subscriptionPlan || 'free';
    const planHierarchy = ['free', 'pro', 'premium'];
    
    const userPlanLevel = planHierarchy.indexOf(userPlan);
    const requiredPlanLevel = planHierarchy.indexOf(requiredPlan);

    if (userPlanLevel < requiredPlanLevel) {
      res.status(403).json({
        success: false,
        message: `${requiredPlan} subscription required`,
        code: 'SUBSCRIPTION_REQUIRED',
      });
      return;
    }

    next();
  };
};

export { AuthenticatedRequest };