// File: backend/src/services/auth/auth-service.ts
// Extension: .ts (TypeScript Service)

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface UserLoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface PasswordResetData {
  email: string;
  token: string;
  newPassword: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly BCRYPT_ROUNDS = 12;

  /**
   * Register a new user
   */
  async register(userData: UserRegistrationData): Promise<{ user: any; tokens: AuthTokens }> {
    const { username, email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (existingUser.username === username.toLowerCase()) {
        throw new Error('Username already taken');
      }
    }

    // Validate password strength
    this.validatePassword(password);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'STUDENT',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Generate email verification token
    const verificationToken = this.generateRandomToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Send verification email (implement email service)
    await this.sendVerificationEmail(user.email, verificationToken);

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(loginData: UserLoginData): Promise<{ user: any; tokens: AuthTokens }> {
    const { email, password } = loginData;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;

      // Check if refresh token exists in database
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt: { gt: new Date() }
        }
      });

      if (!tokenRecord) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user);

      // Revoke old refresh token
      await prisma.refreshToken.delete({
        where: { id: tokenRecord.id }
      });

      return newTokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user email verification status
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true }
    });

    // Delete verification token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id }
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = this.generateRandomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt
      }
    });

    // Send reset email
    await this.sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password
   */
  async resetPassword(resetData: PasswordResetData): Promise<void> {
    const { email, token, newPassword } = resetData;

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!resetToken || resetToken.user.email !== email.toLowerCase()) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Delete reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    // Revoke all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId }
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke all refresh tokens except current session
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isActive: true }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: any): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes
    };
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Generate random token
   */
  private generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Send verification email (implement with your email service)
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Implement email sending logic
    console.log(`Verification email sent to ${email} with token: ${token}`);
    // Example: await emailService.sendVerificationEmail(email, token);
  }

  /**
   * Send password reset email (implement with your email service)
   */
  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Implement email sending logic
    console.log(`Password reset email sent to ${email} with token: ${token}`);
    // Example: await emailService.sendPasswordResetEmail(email, token);
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return await prisma.refreshToken.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        // Add IP address and user agent if stored
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId: string, tokenId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        id: tokenId,
        userId
      }
    });
  }
}