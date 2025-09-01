// File: backend/src/services/auth/jwt.ts
// Extension: .ts

import jwt from 'jsonwebtoken';
import config from '../../config';
import { logger } from '../../utils/logger';

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access and refresh tokens for a user
 */
export const generateTokens = (userId: string, expiresIn: string = '7d'): TokenPair => {
  try {
    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId, 
        type: 'access' 
      } as TokenPayload,
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        issuer: 'cpp-mastery-hub',
        audience: 'cpp-mastery-users',
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { 
        userId, 
        type: 'refresh' 
      } as TokenPayload,
      config.jwt.secret,
      { 
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: 'cpp-mastery-hub',
        audience: 'cpp-mastery-users',
      }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Error generating tokens:', error);
    throw new Error('Failed to generate authentication tokens');
  }
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-users',
    }) as jwt.JwtPayload;

    if (decoded.type !== 'access') {
      return null;
    }

    return {
      userId: decoded.userId,
      type: decoded.type,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token');
    } else {
      logger.error('Error verifying access token:', error);
    }
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-users',
    }) as jwt.JwtPayload;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return {
      userId: decoded.userId,
      type: decoded.type,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token:', error);
    }
    return null;
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    logger.error('Error getting token expiration:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return new Date() > expiration;
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  try {
    return jwt.sign(
      { 
        userId, 
        email,
        type: 'email_verification' 
      },
      config.jwt.secret,
      { 
        expiresIn: '24h',
        issuer: 'cpp-mastery-hub',
        audience: 'cpp-mastery-users',
      }
    );
  } catch (error) {
    logger.error('Error generating email verification token:', error);
    throw new Error('Failed to generate email verification token');
  }
};

/**
 * Verify email verification token
 */
export const verifyEmailVerificationToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-users',
    }) as jwt.JwtPayload;

    if (decoded.type !== 'email_verification') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Email verification token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid email verification token');
    } else {
      logger.error('Error verifying email verification token:', error);
    }
    return null;
  }
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  try {
    return jwt.sign(
      { 
        userId, 
        email,
        type: 'password_reset' 
      },
      config.jwt.secret,
      { 
        expiresIn: '1h',
        issuer: 'cpp-mastery-hub',
        audience: 'cpp-mastery-users',
      }
    );
  } catch (error) {
    logger.error('Error generating password reset token:', error);
    throw new Error('Failed to generate password reset token');
  }
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): { userId: string; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-users',
    }) as jwt.JwtPayload;

    if (decoded.type !== 'password_reset') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Password reset token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid password reset token');
    } else {
      logger.error('Error verifying password reset token:', error);
    }
    return null;
  }
};

/**
 * Generate API key token (long-lived)
 */
export const generateApiKeyToken = (userId: string, keyName: string): string => {
  try {
    return jwt.sign(
      { 
        userId, 
        keyName,
        type: 'api_key' 
      },
      config.jwt.secret,
      { 
        expiresIn: '1y', // API keys last 1 year
        issuer: 'cpp-mastery-hub',
        audience: 'cpp-mastery-api',
      }
    );
  } catch (error) {
    logger.error('Error generating API key token:', error);
    throw new Error('Failed to generate API key token');
  }
};

/**
 * Verify API key token
 */
export const verifyApiKeyToken = (token: string): { userId: string; keyName: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-api',
    }) as jwt.JwtPayload;

    if (decoded.type !== 'api_key') {
      return null;
    }

    return {
      userId: decoded.userId,
      keyName: decoded.keyName,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('API key token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid API key token');
    } else {
      logger.error('Error verifying API key token:', error);
    }
    return null;
  }
};

/**
 * Extract user ID from any valid token
 */
export const extractUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    return decoded?.userId || null;
  } catch (error) {
    logger.error('Error extracting user ID from token:', error);
    return null;
  }
};

/**
 * Get time until token expires (in seconds)
 */
export const getTokenTimeToExpiry = (token: string): number | null => {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.exp) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
  } catch (error) {
    logger.error('Error getting token time to expiry:', error);
    return null;
  }
};

/**
 * Refresh tokens if access token is close to expiring
 */
export const shouldRefreshToken = (accessToken: string, thresholdMinutes: number = 15): boolean => {
  const timeToExpiry = getTokenTimeToExpiry(accessToken);
  if (timeToExpiry === null) {
    return true; // Refresh if we can't determine expiry
  }
  return timeToExpiry < (thresholdMinutes * 60);
};

export default {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateApiKeyToken,
  verifyApiKeyToken,
  extractUserIdFromToken,
  getTokenTimeToExpiry,
  shouldRefreshToken,
};