import { createHash, randomBytes } from 'crypto';

import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { config, jwtConfig, securityConfig } from '../../config';
import { prisma } from '../../config/database';
import { toSafeUser, type SafeUser } from '../../types/user';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

import { generateTokens, verifyRefreshToken } from './jwt';

export interface AuthResult {
  user: SafeUser;
  token: string;
  refreshToken: string;
  /** Lifetime of `token` in seconds. */
  expiresIn: number;
}

export interface ClientInfo {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/** Parses Zeit/ms-style durations such as "15m", "7d", "3600" into seconds. */
export function durationSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) throw new Error(`Unsupported duration "${value}"`);
  const n = Number(match[1]);
  const unit = match[2] ?? '';
  const scale: Record<string, number> = { '': 1, s: 1, m: 60, h: 3600, d: 86400 };
  return n * (scale[unit] ?? 1);
}

// A real bcrypt hash of a random string, used so that login takes the same time whether or not
// the account exists (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

const RESET_PURPOSE = 'password-reset';
const RESET_TTL = '1h';
const VERIFY_PURPOSE = 'verify-email';
const VERIFY_TTL = '24h';

/**
 * Account lifecycle and session management. Every issued access token is bound to a
 * UserSession row; the auth middleware rejects tokens whose row is inactive or expired, which
 * is what makes logout, password change and bans take effect immediately.
 */
export class SessionService {
  async register(
    input: { username: string; email: string; password: string; firstName?: string; lastName?: string },
    client: ClientInfo
  ): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true },
    });
    if (existing) {
      throw new ApiError(409, existing.email === email ? 'Email already registered' : 'Username taken');
    }
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await bcrypt.hash(input.password, securityConfig.bcryptRounds),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
      },
    });
    logger.info('User registered', { userId: user.id });
    return this.openSession(user, client);
  }

  async login(identifier: string, password: string, client: ClientInfo): Promise<AuthResult> {
    const key = identifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: { OR: [{ email: key }, { username: key }] } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) {
      throw new ApiError(403, user.deactivationReason?.startsWith('banned:') ? 'Account suspended' : 'Account deactivated');
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return this.openSession(user, client);
  }

  /**
   * Rotates a refresh token. A refresh token that verifies but matches no active session has
   * already been used (or the session was revoked); that is treated as theft and every session
   * of the user is revoked (refresh-token reuse detection, RFC 6819 §5.2.2.3).
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const claims = verifyRefreshToken(refreshToken);
    if (!claims) throw new ApiError(401, 'Invalid refresh token');
    const session = await prisma.userSession.findFirst({
      where: { refreshToken, isActive: true, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!session || session.userId !== claims.userId) {
      await this.revokeAll(claims.userId);
      logger.warn('Refresh token reuse detected; all sessions revoked', { userId: claims.userId });
      throw new ApiError(401, 'Refresh token is no longer valid');
    }
    if (!session.user.isActive) throw new ApiError(403, 'Account deactivated');
    const tokens = this.issue(session.user.id);
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.refreshExpiresAt,
        lastUsedAt: new Date(),
      },
    });
    return { user: toSafeUser(session.user), token: tokens.token, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn };
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({ where: { id: sessionId }, data: { isActive: false } });
  }

  async revokeAll(userId: string): Promise<number> {
    const { count } = await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return count;
  }

  /**
   * Creates a single-use password-reset token. It is signed with a key derived from the current
   * password hash, so it stops verifying as soon as the password changes.
   */
  async createPasswordResetToken(email: string): Promise<{ token: string; user: User } | null> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) return null;
    const token = jwt.sign({ sub: user.id, purpose: RESET_PURPOSE }, resetKey(user.passwordHash), {
      expiresIn: RESET_TTL,
      issuer: jwtConfig.issuer,
    });
    return { token, user };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const unverified = jwt.decode(token);
    const userId = typeof unverified === 'object' && unverified !== null ? unverified.sub : undefined;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user) throw new ApiError(400, 'Invalid or expired reset token');
    try {
      const claims = jwt.verify(token, resetKey(user.passwordHash), { issuer: jwtConfig.issuer });
      if (typeof claims !== 'object' || claims['purpose'] !== RESET_PURPOSE) throw new Error('purpose');
    } catch {
      throw new ApiError(400, 'Invalid or expired reset token');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, securityConfig.bcryptRounds) },
    });
    await this.revokeAll(user.id);
    logger.info('Password reset', { userId: user.id });
  }

  /**
   * Creates an email-verification token bound to the user's current address: it stops
   * verifying if the email changes before it is used.
   */
  createEmailVerificationToken(user: Pick<User, 'id' | 'email'>): string {
    return jwt.sign({ sub: user.id, purpose: VERIFY_PURPOSE }, verifyKey(user.email), {
      expiresIn: VERIFY_TTL,
      issuer: jwtConfig.issuer,
    });
  }

  /** Marks the address as verified. Idempotent for an already verified user. */
  async verifyEmail(token: string): Promise<SafeUser> {
    const unverified = jwt.decode(token);
    const userId = typeof unverified === 'object' && unverified !== null ? unverified.sub : undefined;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user) throw new ApiError(400, 'Invalid or expired verification link');
    try {
      const claims = jwt.verify(token, verifyKey(user.email), { issuer: jwtConfig.issuer });
      if (typeof claims !== 'object' || claims['purpose'] !== VERIFY_PURPOSE) throw new Error('purpose');
    } catch {
      throw new ApiError(400, 'Invalid or expired verification link');
    }
    if (user.isVerified) return toSafeUser(user);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });
    logger.info('Email verified', { userId: user.id });
    return toSafeUser(updated);
  }

  private async openSession(user: User, client: ClientInfo): Promise<AuthResult> {
    const tokens = this.issue(user.id);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.refreshExpiresAt,
        ipAddress: client.ipAddress ?? null,
        userAgent: client.userAgent?.slice(0, 500) ?? null,
      },
    });
    return { user: toSafeUser(user), token: tokens.token, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn };
  }

  private issue(userId: string) {
    const { accessToken, refreshToken } = generateTokens(userId);
    return {
      token: accessToken,
      refreshToken,
      expiresIn: durationSeconds(jwtConfig.expiresIn),
      refreshExpiresAt: new Date(Date.now() + durationSeconds(jwtConfig.refreshExpiresIn) * 1000),
    };
  }
}

function verifyKey(email: string): string {
  return createHash('sha256').update(`${config.JWT_SECRET}:verify:${email.toLowerCase()}`).digest('hex');
}

function resetKey(passwordHash: string): string {
  return createHash('sha256').update(`${config.JWT_SECRET}:${passwordHash}`).digest('hex');
}

export const sessionService = new SessionService();
