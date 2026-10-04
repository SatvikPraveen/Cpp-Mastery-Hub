import { Router } from 'express';
import { z } from 'zod';

import { config } from '../../config';
import { sessionService } from '../../services/auth/session-service';
import { userService } from '../../services/user-service';
import { sendEmail } from '../../utils/email';
import { ApiError, getErrorMessage } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { handle, parse, requireUserId } from '../http';
import { authenticateToken } from '../middleware/auth';
import { createIPRateLimit } from '../middleware/ratelimit';

/**
 *   POST /register          create account, returns tokens          (rate limited)
 *   POST /login             email or username + password            (rate limited)
 *   POST /refresh           rotate refresh token
 *   POST /logout            revoke the current session
 *   POST /logout-all        revoke every session of the user
 *   GET  /me                current user
 *   POST /forgot-password   always 200; emails a single-use link    (rate limited)
 *   POST /reset-password    set a new password from the emailed token
 *   POST /verify-email      confirm the address from the emailed token
 *   POST /resend-verification  (auth) send a new verification email
 *   POST /change-password   alias of /api/users/me/change-password
 */
const router = Router();

const credentialsLimiter = createIPRateLimit({
  windowMs: 15 * 60_000,
  maxRequests: config.NODE_ENV === 'test' ? 1000 : 10,
  skipSuccessfulRequests: true,
  message: 'Too many attempts, try again later',
});
const resetLimiter = createIPRateLimit({ windowMs: 60 * 60_000, maxRequests: config.NODE_ENV === 'test' ? 1000 : 5 });

export const passwordSchema = z
  .string()
  .min(8, 'at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'needs a lowercase letter')
  .regex(/[A-Z]/, 'needs an uppercase letter')
  .regex(/\d/, 'needs a digit');

const registerBody = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'letters, digits, _ and - only'),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
});

const client = (req: { ip?: string | undefined; get(name: string): string | undefined }) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

router.post(
  '/register',
  credentialsLimiter,
  handle(async (req, res) => {
    const body = parse(registerBody, req.body);
    const input = {
      username: body.username,
      email: body.email,
      password: body.password,
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
    };
    const result = await sessionService.register(input, client(req));
    await sendVerificationEmail(result.user);
    res.status(201).json({ success: true, data: result });
  })
);

router.post(
  '/login',
  credentialsLimiter,
  handle(async (req, res) => {
    const body = parse(
      z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) }),
      req.body
    );
    res.json({ success: true, data: await sessionService.login(body.email, body.password, client(req)) });
  })
);

router.post(
  '/refresh',
  handle(async (req, res) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string().min(1) }), req.body);
    res.json({ success: true, data: await sessionService.refresh(refreshToken) });
  })
);

router.post(
  '/logout',
  authenticateToken,
  handle(async (req, res) => {
    if (req.sessionId) await sessionService.logout(req.sessionId);
    res.json({ success: true });
  })
);

router.post(
  '/logout-all',
  authenticateToken,
  handle(async (req, res) => {
    const revoked = await sessionService.revokeAll(requireUserId(req));
    res.json({ success: true, data: { revoked } });
  })
);

router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.post(
  '/forgot-password',
  resetLimiter,
  handle(async (req, res) => {
    const { email } = parse(z.object({ email: z.string().trim().email() }), req.body);
    const reset = await sessionService.createPasswordResetToken(email);
    if (reset) {
      const link = `${config.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(reset.token)}`;
      try {
        await sendEmail({
          to: reset.user.email,
          subject: 'Reset your C++ Mastery Hub password',
          text: `Use this link within one hour to choose a new password:\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
        });
      } catch (error) {
        logger.error('Password reset email failed', { userId: reset.user.id, error: getErrorMessage(error) });
      }
    }
    // Same response whether or not the account exists, to prevent enumeration.
    res.json({ success: true, message: 'If that address is registered, a reset link has been sent.' });
  })
);

router.post(
  '/reset-password',
  resetLimiter,
  handle(async (req, res) => {
    const body = parse(z.object({ token: z.string().min(1), password: passwordSchema }), req.body);
    await sessionService.resetPassword(body.token, body.password);
    res.json({ success: true, message: 'Password updated. Please sign in again.' });
  })
);

router.post(
  '/verify-email',
  handle(async (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(1) }), req.body);
    res.json({ success: true, data: { user: await sessionService.verifyEmail(token) } });
  })
);

router.post(
  '/resend-verification',
  resetLimiter,
  authenticateToken,
  handle(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (req.user.isVerified) {
      res.json({ success: true, message: 'Email address already verified.' });
      return;
    }
    await sendVerificationEmail(req.user);
    res.json({ success: true, message: 'Verification email sent.' });
  })
);

router.post(
  '/change-password',
  authenticateToken,
  handle(async (req, res) => {
    const body = parse(
      z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }),
      req.body
    );
    await userService.changePassword(requireUserId(req), body.currentPassword, body.newPassword);
    res.json({ success: true, message: 'Password changed. Please sign in again.' });
  })
);

/** Best effort: failure to send must not fail registration. */
async function sendVerificationEmail(user: { id: string; email: string; username: string }): Promise<void> {
  const token = sessionService.createEmailVerificationToken(user);
  const link = `${config.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Confirm your C++ Mastery Hub email address',
      text: `Hi ${user.username},\n\nConfirm your address within 24 hours:\n\n${link}\n`,
    });
  } catch (error) {
    logger.error('Verification email failed', { userId: user.id, error: getErrorMessage(error) });
  }
}

export default router;
