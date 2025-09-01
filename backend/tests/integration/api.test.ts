// File: backend/tests/integration/api.test.ts
// Extension: .ts
// Location: backend/tests/integration/api.test.ts

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';

describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test database
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.user.deleteMany({});
    await prisma.codeSnippet.deleteMany({});
    await prisma.course.deleteMany({});
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register should create new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      // Store for other tests
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    test('POST /api/auth/register should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        username: 'user1'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, username: 'user2' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    test('POST /api/auth/login should authenticate user', async () => {
      // Register user first
      const userData = {
        email: 'login@example.com',
        password: 'password123',
        username: 'loginuser'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    test('POST /api/auth/login should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('POST /api/auth/refresh should refresh token', async () => {
      // Register and login first
      const userData = {
        email: 'refresh@example.com',
        password: 'password123',
        username: 'refreshuser'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const refreshToken = registerResponse.body.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(registerResponse.body.token);
    });
  });

  describe('Code Analysis Endpoints', () => {
    beforeEach(async () => {
      // Setup authenticated user
      const userData = {
        email: 'coder@example.com',
        password: 'password123',
        username: 'coder'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    test('POST /api/analysis/analyze should analyze valid C++ code', async () => {
      const code = `
        #include <iostream>
        int main() {
          std::cout << "Hello, World!" << std::endl;
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.errors.length).toBe(0);
      expect(response.body.warnings.length).toBe(0);
      expect(response.body.metrics).toBeDefined();
    });

    test('POST /api/analysis/analyze should detect syntax errors', async () => {
      const invalidCode = `
        #include <iostream>
        int main() {
          std::cout << "Missing semicolon"
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: invalidCode })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('semicolon');
    });

    test('POST /api/analysis/analyze should detect memory leaks', async () => {
      const codeWithLeak = `
        #include <iostream>
        int main() {
          int* ptr = new int(42);
          std::cout << *ptr << std::endl;
          // Missing delete
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/analysis/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: codeWithLeak })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warnings.length).toBeGreaterThan(0);
      
      const hasMemoryLeakWarning = response.body.warnings.some((w: any) =>
        w.message.includes('memory leak') || w.message.includes('delete')
      );
      expect(hasMemoryLeakWarning).toBe(true);
    });

    test('POST /api/analysis/analyze should require authentication', async () => {
      const code = `#include <iostream>\nint main() { return 0; }`;

      await request(app)
        .post('/api/analysis/analyze')
        .send({ code })
        .expect(401);
    });
  });

  describe('Code Execution Endpoints', () => {
    beforeEach(async () => {
      // Setup authenticated user
      const userData = {
        email: 'executor@example.com',
        password: 'password123',
        username: 'executor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    test('POST /api/code/execute should execute valid C++ code', async () => {
      const code = `
        #include <iostream>
        int main() {
          std::cout << "Hello, World!" << std::endl;
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/code/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.output).toContain('Hello, World!');
      expect(response.body.exitCode).toBe(0);
      expect(response.body.executionTime).toBeGreaterThan(0);
    });

    test('POST /api/code/execute should handle compilation errors', async () => {
      const invalidCode = `
        #include <iostream>
        int main() {
          std::cout << "Missing semicolon"
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/code/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: invalidCode })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.compilationError).toBeDefined();
      expect(response.body.compilationError).toContain('error');
    });

    test('POST /api/code/execute should handle timeout', async () => {
      const infiniteLoopCode = `
        #include <iostream>
        int main() {
          while(true) {
            std::cout << "Infinite loop" << std::endl;
          }
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/code/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          code: infiniteLoopCode,
          timeout: 1000 // 1 second timeout
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.timeout).toBe(true);
    });

    test('POST /api/code/execute should support input/output', async () => {
      const code = `
        #include <iostream>
        int main() {
          int x;
          std::cin >> x;
          std::cout << "Input was: " << x << std::endl;
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/code/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          code,
          input: "42\n"
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.output).toContain('Input was: 42');
    });
  });

  describe('User Management Endpoints', () => {
    beforeEach(async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    test('GET /api/users/profile should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.progress).toBeDefined();
    });

    test('PUT /api/users/profile should update user profile', async () => {
      const updateData = {
        username: 'updateduser',
        bio: 'I love C++ programming!'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe(updateData.username);
      expect(response.body.user.bio).toBe(updateData.bio);
    });

    test('GET /api/users/achievements should return user achievements', async () => {
      const response = await request(app)
        .get('/api/users/achievements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/users/snippets should return user code snippets', async () => {
      const response = await request(app)
        .get('/api/users/snippets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Learning Endpoints', () => {
    beforeEach(async () => {
      const userData = {
        email: 'learner@example.com',
        password: 'password123',
        username: 'learner'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    test('GET /api/learning/courses should return course catalog', async () => {
      const response = await request(app)
        .get('/api/learning/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0].id).toBeDefined();
        expect(response.body[0].title).toBeDefined();
        expect(response.body[0].description).toBeDefined();
      }
    });

    test('GET /api/learning/courses/:id should return course details', async () => {
      // First, get available courses
      const coursesResponse = await request(app)
        .get('/api/learning/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (coursesResponse.body.length > 0) {
        const courseId = coursesResponse.body[0].id;

        const response = await request(app)
          .get(`/api/learning/courses/${courseId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(courseId);
        expect(response.body.lessons).toBeDefined();
        expect(Array.isArray(response.body.lessons)).toBe(true);
      }
    });

    test('POST /api/learning/progress should update learning progress', async () => {
      const progressData = {
        courseId: 'cpp-basics',
        lessonId: 'variables',
        completed: true,
        timeSpent: 300,
        score: 95
      };

      const response = await request(app)
        .post('/api/learning/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.progress).toBeDefined();
    });

    test('GET /api/learning/recommendations should return personalized recommendations', async () => {
      const response = await request(app)
        .get('/api/learning/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0].type).toBeDefined();
        expect(response.body[0].content).toBeDefined();
        expect(response.body[0].reason).toBeDefined();
      }
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      const userData = {
        email: 'ratelimit@example.com',
        password: 'password123',
        username: 'ratelimiter'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      authToken = response.body.token;
    });

    test('should enforce rate limits on code execution', async () => {
      const code = `#include <iostream>\nint main() { return 0; }`;

      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/code/execute')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ code })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce rate limits on analysis requests', async () => {
      const code = `#include <iostream>\nint main() { return 0; }`;

      // Make multiple rapid requests
      const promises = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ code })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' }) // Missing password and username
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should handle invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          username: 'testuser'
        })
        .expect(400);

      expect(response.body.error).toContain('valid email');
    });

    test('should handle server errors gracefully', async () => {
      // This would require mocking database to throw errors
      // Implementation depends on specific error scenarios you want to test
    });
  });
});

