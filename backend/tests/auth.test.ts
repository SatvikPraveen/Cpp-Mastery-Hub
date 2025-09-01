// File: backend/tests/auth.test.ts
// Extension: .ts
// Location: backend/tests/auth.test.ts

import request from 'supertest';
import { app } from '../src/server';
import { User } from '../src/models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Authentication Endpoints', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      status: 'active'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.details[0].field).toBe('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.details[0].field).toBe('password');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        username: 'anotheruser',
        email: 'test@example.com', // Same as existing user
        password: 'TestPassword123!',
        firstName: 'Another',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should reject registration with duplicate username', async () => {
      const userData = {
        username: 'testuser', // Same as existing user
        email: 'different@example.com',
        password: 'TestPassword123!',
        firstName: 'Different',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Username already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      await User.findByIdAndUpdate(testUser._id, { status: 'inactive' });

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Account is inactive');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Generate refresh token
      refreshToken = jwt.sign(
        { id: testUser._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '7d' }
      );

      // Add refresh token to user
      testUser.refreshTokens = [refreshToken];
      await testUser.save();
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });

    it('should reject refresh with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '-1d' } // Expired
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      resetToken = jwt.sign(
        { id: testUser._id, type: 'reset' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      testUser.resetPasswordToken = resetToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await testUser.save();
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset successful');

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isNewPasswordValid = await bcrypt.compare('NewPassword123!', updatedUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid or expired reset token');
    });

    it('should reject reset with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    let verificationToken: string;

    beforeEach(async () => {
      verificationToken = jwt.sign(
        { id: testUser._id, type: 'verify' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      testUser.emailVerificationToken = verificationToken;
      testUser.isEmailVerified = false;
      await testUser.save();
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Email verified successfully');

      // Verify email status was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.isEmailVerified).toBe(true);
    });

    it('should reject verification with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid verification token');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Too many/i);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize input data', async () => {
      const userData = {
        username: '<script>alert("xss")</script>testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: '<img src=x onerror=alert("xss")>Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verify that malicious scripts are sanitized
      expect(response.body.user.username).not.toContain('<script>');
      expect(response.body.user.firstName).not.toContain('<img');
    });
  });
});