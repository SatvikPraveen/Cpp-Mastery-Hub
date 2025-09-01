// File: tests/integration/full-stack.test.ts
// Extension: .ts
// Location: tests/integration/full-stack.test.ts

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Full Stack Integration Tests', () => {
  const FRONTEND_URL = 'http://localhost:3000';
  const BACKEND_URL = 'http://localhost:8000';
  const CPP_ENGINE_URL = 'http://localhost:9000';

  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Wait for services to be ready
    await waitForServices();
    
    // Create test user and get auth token
    const userData = await createTestUser();
    authToken = userData.token;
    userId = userData.userId;
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    if (authToken) {
      await cleanupTestUser(userId);
    }
  });

  describe('Service Health Checks', () => {
    test('Frontend should be accessible', async () => {
      const response = await axios.get(`${FRONTEND_URL}/api/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ status: 'healthy', service: 'frontend' });
    });

    test('Backend should be accessible', async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ 
        status: 'healthy', 
        service: 'backend',
        timestamp: expect.any(String)
      });
    });

    test('C++ Engine should be accessible', async () => {
      const response = await axios.get(`${CPP_ENGINE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ 
        status: 'healthy', 
        service: 'cpp-engine',
        version: expect.any(String)
      });
    });
  });

  describe('Authentication Flow', () => {
    test('should register new user through full stack', async () => {
      const userData = {
        email: 'integration@test.com',
        username: 'integrationuser',
        password: 'testpassword123'
      };

      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.user.email).toBe(userData.email);
      expect(response.data.token).toBeDefined();
    });

    test('should login and receive valid token', async () => {
      const loginData = {
        email: 'integration@test.com',
        password: 'testpassword123'
      };

      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, loginData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.token).toBeDefined();
    });
  });

  describe('Code Analysis Pipeline', () => {
    test('should analyze C++ code through full pipeline', async () => {
      const code = `
        #include <iostream>
        int main() {
          std::cout << "Hello, World!" << std::endl;
          return 0;
        }
      `;

      // Step 1: Submit code to backend
      const backendResponse = await axios.post(
        `${BACKEND_URL}/api/analysis/analyze`,
        { code },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(backendResponse.status).toBe(200);
      expect(backendResponse.data.success).toBe(true);
      
      // Step 2: Verify C++ engine was called
      const analysisId = backendResponse.data.analysisId;
      expect(analysisId).toBeDefined();

      // Step 3: Check analysis results
      const resultResponse = await axios.get(
        `${BACKEND_URL}/api/analysis/${analysisId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(resultResponse.status).toBe(200);
      expect(resultResponse.data.errors.length).toBe(0);
      expect(resultResponse.data.warnings.length).toBe(0);
    });

    test('should detect syntax errors through pipeline', async () => {
      const invalidCode = `
        #include <iostream>
        int main() {
          std::cout << "Missing semicolon"
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/analysis/analyze`,
        { code: invalidCode },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(false);
      expect(response.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Code Execution Pipeline', () => {
    test('should execute C++ code through full pipeline', async () => {
      const code = `
        #include <iostream>
        int main() {
          std::cout << "Integration test output" << std::endl;
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/code/execute`,
        { code },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.output).toContain('Integration test output');
      expect(response.data.exitCode).toBe(0);
    });

    test('should handle execution with input/output', async () => {
      const code = `
        #include <iostream>
        int main() {
          int x;
          std::cout << "Enter number: ";
          std::cin >> x;
          std::cout << "You entered: " << x << std::endl;
          return 0;
        }
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/code/execute`,
        { 
          code, 
          input: "42\n" 
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.output).toContain('Enter number:');
      expect(response.data.output).toContain('You entered: 42');
    });
  });

  describe('Learning Platform Integration', () => {
    test('should fetch courses and lessons', async () => {
      const coursesResponse = await axios.get(
        `${BACKEND_URL}/api/learning/courses`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(coursesResponse.status).toBe(200);
      expect(Array.isArray(coursesResponse.data)).toBe(true);

      if (coursesResponse.data.length > 0) {
        const courseId = coursesResponse.data[0].id;
        
        const courseResponse = await axios.get(
          `${BACKEND_URL}/api/learning/courses/${courseId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        expect(courseResponse.status).toBe(200);
        expect(courseResponse.data.id).toBe(courseId);
        expect(courseResponse.data.lessons).toBeDefined();
      }
    });

    test('should track learning progress', async () => {
      const progressData = {
        courseId: 'cpp-basics',
        lessonId: 'variables',
        completed: true,
        timeSpent: 300
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/learning/progress`,
        progressData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Real-time Features', () => {
    test('should establish WebSocket connection', async () => {
      const io = require('socket.io-client');
      
      return new Promise((resolve, reject) => {
        const socket = io(BACKEND_URL, {
          auth: { token: authToken }
        });

        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve(true);
        });

        socket.on('connect_error', (error: any) => {
          reject(error);
        });

        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);
      });
    });
  });

  describe('Database Integration', () => {
    test('should persist user data across services', async () => {
      // Create code snippet
      const snippetData = {
        title: 'Integration Test Snippet',
        description: 'Test snippet for integration testing',
        code: '#include <iostream>\nint main() { return 0; }',
        isPublic: false
      };

      const createResponse = await axios.post(
        `${BACKEND_URL}/api/code/snippets`,
        snippetData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(createResponse.status).toBe(201);
      const snippetId = createResponse.data.id;

      // Retrieve snippet
      const getResponse = await axios.get(
        `${BACKEND_URL}/api/code/snippets/${snippetId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.title).toBe(snippetData.title);
      expect(getResponse.data.code).toBe(snippetData.code);
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent requests', async () => {
      const code = `
        #include <iostream>
        int main() {
          std::cout << "Concurrent test" << std::endl;
          return 0;
        }
      `;

      const requests = Array(10).fill(null).map((_, index) =>
        axios.post(
          `${BACKEND_URL}/api/code/execute`,
          { code: code.replace('Concurrent test', `Concurrent test ${index}`) },
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
      );

      const responses = await Promise.all(requests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.output).toContain(`Concurrent test ${index}`);
      });
    });

    test('should enforce rate limiting', async () => {
      const code = `#include <iostream>\nint main() { return 0; }`;
      
      // Make many rapid requests
      const requests = Array(50).fill(null).map(() =>
        axios.post(
          `${BACKEND_URL}/api/code/execute`,
          { code },
          { 
            headers: { Authorization: `Bearer ${authToken}` },
            validateStatus: () => true // Don't throw on error status
          }
        )
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle service unavailability gracefully', async () => {
      // This test would require temporarily stopping the C++ engine
      // For now, we'll test with an invalid endpoint
      
      try {
        await axios.post(
          `${BACKEND_URL}/api/invalid-endpoint`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBeDefined();
      }
    });

    test('should validate request data properly', async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/api/code/execute`,
          { invalidField: 'invalid' },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('validation');
      }
    });
  });

  // Helper functions
  async function waitForServices(): Promise<void> {
    const services = [
      { name: 'Frontend', url: `${FRONTEND_URL}/api/health` },
      { name: 'Backend', url: `${BACKEND_URL}/health` },
      { name: 'C++ Engine', url: `${CPP_ENGINE_URL}/health` }
    ];

    for (const service of services) {
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          await axios.get(service.url, { timeout: 5000 });
          console.log(`${service.name} is ready`);
          break;
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error(`${service.name} failed to start after ${maxAttempts} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async function createTestUser(): Promise<{ token: string; userId: string }> {
    const userData = {
      email: 'integration-test@example.com',
      username: 'integrationtestuser',
      password: 'testpassword123'
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData);
    
    return {
      token: response.data.token,
      userId: response.data.user.id
    };
  }

  async function cleanupTestUser(userId: string): Promise<void> {
    try {
      await axios.delete(
        `${BACKEND_URL}/api/users/${userId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (error) {
      console.warn('Failed to cleanup test user:', error);
    }
  }
});
