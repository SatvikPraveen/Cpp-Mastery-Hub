import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { jwtConfig } from '../../config';
import { prisma } from '../../config/database';
import { toSafeUser, type SafeUser, type UserRole } from '../../types/user';
import { getErrorMessage } from '../../utils/errors';
import { logger } from '../../utils/logger';

interface AccessTokenClaims {
  userId: string;
  type?: string;
}

/** A request that has passed `authMiddleware`. */
export interface AuthenticatedRequest extends Request {
  user: SafeUser;
}

const BEARER_PREFIX = 'Bearer ';
const AUTH_REQUIRED_MESSAGE = 'Authentication required';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = authHeader.substring(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

function isAccessTokenClaims(value: unknown): value is AccessTokenClaims {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { userId?: unknown }).userId === 'string'
  );
}

/**
 * Require a valid access token backed by an active session for an active user.
 * On success `req.user` (without the password hash) and `req.sessionId` are populated.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    // Verify JWT token
    let decoded: unknown;
    try {
      decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
        return;
      }
      throw error;
    }

    if (!isAccessTokenClaims(decoded) || (decoded.type && decoded.type !== 'access')) {
      res.status(401).json({
        success: false,
        message: 'Invalid access token',
        code: 'INVALID_TOKEN',
      });
      return;
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
        user: true,
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

    // Check if user is still active
    if (!session.user.isActive) {
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

    req.user = toSafeUser(session.user);
    req.userId = session.user.id;
    req.sessionId = session.id;

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: getErrorMessage(error) });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Authenticate when a bearer token is present; requests without one continue anonymously.
 * A token that is present but invalid is still rejected.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!extractBearerToken(req)) {
    next();
    return;
  }
  await authMiddleware(req, res, next);
};

/** Express-compatible (non-promise-returning) wrappers for use in route definitions. */
export const authenticateToken: RequestHandler = (req, res, next) => {
  void authMiddleware(req, res, next);
};
export const auth = authenticateToken;
export const optionalAuth: RequestHandler = (req, res, next) => {
  void optionalAuthMiddleware(req, res, next);
};

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

function normalizeRole(role: string): UserRole | null {
  const upper = role.toUpperCase();
  return upper in ROLE_RANK ? (upper as UserRole) : null;
}

/**
 * Role-based access control. Roles are matched case-insensitively against the
 * `UserRole` enum; SUPER_ADMIN satisfies every role requirement.
 */
export const requireRole = (roles: string[]): RequestHandler => {
  const allowed = new Set(roles.map(normalizeRole).filter((role): role is UserRole => role !== null));

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: AUTH_REQUIRED_MESSAGE,
      });
      return;
    }

    if (!allowed.has(user.role) && user.role !== 'SUPER_ADMIN') {
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

/** Whether the user's role is at least `role`. */
export function hasRoleAtLeast(user: Pick<SafeUser, 'role'>, role: UserRole): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[role];
}

// Check if user owns resource or is admin
export const requireOwnershipOrAdmin = (
  getResourceUserId: (req: Request) => string | undefined
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: AUTH_REQUIRED_MESSAGE,
      });
      return;
    }

    const isOwner = user.id === getResourceUserId(req);
    if (!isOwner && !hasRoleAtLeast(user, 'ADMIN')) {
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

// Rate limiting per user (in-process; use the Redis-backed limiter in ratelimit.ts for multi-instance)
export const userRateLimit = (windowMs: number, maxRequests: number): RequestHandler => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      next();
      return;
    }

    const now = Date.now();
    const userRequests = requests.get(user.id);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(user.id, {
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

    userRequests.count += 1;
    next();
  };
};

// Verify email middleware
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: AUTH_REQUIRED_MESSAGE,
    });
    return;
  }

  if (!user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  next();
};
