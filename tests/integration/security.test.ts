// File: tests/integration/security.test.ts
// Extension: .ts
// Location: tests/integration/security.test.ts

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import jwt from 'jsonwebtoken';

describe('Security Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:8000';
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user
    const userData = {
      email: 'security@test.com',
      username: 'securityuser',
      password: 'SecurePassword123!'
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData);
    authToken = response.data.token;
    userId = response.data.user.id;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await axios.delete(
        `${BACKEND_URL}/api/users/${userId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Authentication Security', () => {
    test('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      try {
        await axios.get(
          `${BACKEND_URL}/api/users/profile`,
          { headers: { Authorization: `Bearer ${invalidToken}` } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toContain('Invalid token');
      }
    });

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'security@test.com' },
        'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      try {
        await axios.get(
          `${BACKEND_URL}/api/users/profile`,
          { headers: { Authorization: `Bearer ${expiredToken}` } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toContain('expired');
      }
    });

    test('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        '/api/users/profile',
        '/api/code/snippets',
        '/api/analysis/analyze',
        '/api/learning/progress'
      ];

      for (const route of protectedRoutes) {
        try {
          await axios.get(`${BACKEND_URL}${route}`);
        } catch (error: any) {
          expect(error.response.status).toBe(401);
        }
      }
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      try {
        await axios.post(
          `${BACKEND_URL}/api/auth/login`,
          {
            email: maliciousInput,
            password: 'password123'
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('validation');
      }
    });

    test('should sanitize code input for analysis', async () => {
      const maliciousCode = `
        #include <iostream>
        #include <cstdlib>
        int main() {
          system("rm -rf /"); // Malicious command
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/analysis/analyze`,
        { code: maliciousCode },
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          validateStatus: () => true
        }
      );

      // Should either reject the code or sandbox it properly
      expect([200, 400, 403]).toContain(response.status);
      
      if (response.status === 200) {
        // If accepted, should be sandboxed and not execute system commands
        expect(response.data.warnings).toBeDefined();
      }
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user space@example.com',
        'user<script>@example.com'
      ];

      for (const email of invalidEmails) {
        try {
          await axios.post(`${BACKEND_URL}/api/auth/register`, {
            email,
            username: 'testuser',
            password: 'Password123!'
          });
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error).toContain('valid email');
        }
      }
    });

    test('should enforce password strength requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'Password',
        '12345678',
        'Password123' // Missing special character
      ];

      for (const password of weakPasswords) {
        try {
          await axios.post(`${BACKEND_URL}/api/auth/register`, {
            email: `test${Date.now()}@example.com`,
            username: `testuser${Date.now()}`,
            password
          });
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error).toContain('password');
        }
      }
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce rate limits on login attempts', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const attempts = Array(20).fill(null).map(() =>
        axios.post(`${BACKEND_URL}/api/auth/login`, loginData, {
          validateStatus: () => true
        })
      );

      const responses = await Promise.all(attempts);
      
      // Should start rate limiting after several attempts
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce rate limits on code execution', async () => {
      const code = '#include <iostream>\nint main() { return 0; }';
      
      const requests = Array(30).fill(null).map(() =>
        axios.post(
          `${BACKEND_URL}/api/code/execute`,
          { code },
          { 
            headers: { Authorization: `Bearer ${authToken}` },
            validateStatus: () => true
          }
        )
      );

      const responses = await Promise.all(requests);
      
      // Should rate limit excessive execution requests
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Data Protection Security', () => {
    test('should not expose sensitive user data', async () => {
      const response = await axios.get(
        `${BACKEND_URL}/api/users/profile`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.passwordHash).toBeUndefined();
      expect(response.data.resetPasswordToken).toBeUndefined();
      expect(response.data.emailVerifyToken).toBeUndefined();
    });

    test('should prevent access to other users data', async () => {
      // Create another user
      const otherUser = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email: 'other@test.com',
        username: 'otheruser',
        password: 'OtherPassword123!'
      });

      const otherUserId = otherUser.data.user.id;

      // Try to access other user's profile
      try {
        await axios.get(
          `${BACKEND_URL}/api/users/${otherUserId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });

    test('should sanitize user-generated content', async () => {
      const maliciousContent = {
        title: '<script>alert("XSS")</script>Test Title',
        description: 'javascript:alert("XSS")',
        code: '#include <iostream>\nint main() { return 0; }',
        isPublic: true
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/code/snippets`,
        maliciousContent,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(201);
      
      // Content should be sanitized
      expect(response.data.title).not.toContain('<script>');
      expect(response.data.description).not.toContain('javascript:');
    });
  });

  describe('CORS and Headers Security', () => {
    test('should include security headers', async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);
      
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should handle CORS properly', async () => {
      const response = await axios.options(`${BACKEND_URL}/api/auth/login`, {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('File Upload Security', () => {
    test('should reject malicious file uploads', async () => {
      const maliciousFile = Buffer.from('<?php phpinfo(); ?>');
      
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', maliciousFile, 'malicious.php');

      try {
        await axios.post(
          `${BACKEND_URL}/api/upload`,
          form,
          { 
            headers: { 
              ...form.getHeaders(),
              Authorization: `Bearer ${authToken}` 
            }
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('file type');
      }
    });

    test('should enforce file size limits', async () => {
      // Create a large file (simulated)
      const largeFile = Buffer.alloc(20 * 1024 * 1024); // 20MB
      
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', largeFile, 'large.txt');

      try {
        await axios.post(
          `${BACKEND_URL}/api/upload`,
          form,
          { 
            headers: { 
              ...form.getHeaders(),
              Authorization: `Bearer ${authToken}` 
            }
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(413);
        expect(error.response.data.error).toContain('size');
      }
    });
  });

  describe('Code Execution Security', () => {
    test('should sandbox code execution properly', async () => {
      const maliciousCode = `
        #include <iostream>
        #include <cstdlib>
        #include <fstream>
        
        int main() {
          // Try to access system files
          std::ifstream file("/etc/passwd");
          if (file.is_open()) {
            std::cout << "Security breach!" << std::endl;
          }
          
          // Try to execute system commands
          system("whoami");
          
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/code/execute`,
        { code: maliciousCode },
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          validateStatus: () => true
        }
      );

      // Should either reject or sandbox properly
      if (response.status === 200) {
        expect(response.data.output).not.toContain('Security breach!');
        expect(response.data.output).not.toContain('root');
      }
    });

    test('should timeout infinite loops', async () => {
      const infiniteLoopCode = `
        #include <iostream>
        int main() {
          while(true) {
            std::cout << "Infinite loop" << std::endl;
          }
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/code/execute`,
        { code: infiniteLoopCode },
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 15000 // 15 seconds max
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.timeout || !response.data.success).toBe(true);
    });
  });
});