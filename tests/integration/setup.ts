// File: tests/integration/setup.ts
// Extension: .ts
// Location: tests/integration/setup.ts

/**
 * C++ Mastery Hub - Integration Tests Setup
 * Comprehensive test environment configuration and utilities
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import jwt from 'jsonwebtoken';

// ===== TEST CONFIGURATION =====

export interface TestFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  instructorPage: Page;
  studentPage: Page;
  apiContext: APIContext;
  testData: TestDataManager;
}

export interface APIContext {
  baseURL: string;
  request: (endpoint: string, options?: RequestOptions) => Promise<Response>;
  authenticate: (userType: UserType) => Promise<string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

export type UserType = 'admin' | 'instructor' | 'student' | 'mentor';

// ===== TEST DATA MANAGER =====

export class TestDataManager {
  private testUsers: Record<UserType, TestUser> = {
    admin: {
      id: 'test-admin-001',
      email: 'admin@test.cppmastery.hub',
      password: 'Test123!@#',
      username: 'test_admin',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      experienceLevel: 'expert'
    },
    instructor: {
      id: 'test-instructor-001',
      email: 'instructor@test.cppmastery.hub',
      password: 'Test123!@#',
      username: 'test_instructor',
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'instructor',
      experienceLevel: 'advanced'
    },
    student: {
      id: 'test-student-001',
      email: 'student@test.cppmastery.hub',
      password: 'Test123!@#',
      username: 'test_student',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      experienceLevel: 'beginner'
    },
    mentor: {
      id: 'test-mentor-001',
      email: 'mentor@test.cppmastery.hub',
      password: 'Test123!@#',
      username: 'test_mentor',
      firstName: 'Test',
      lastName: 'Mentor',
      role: 'mentor',
      experienceLevel: 'advanced'
    }
  };

  private testCourses: TestCourse[] = [
    {
      id: 'test-course-001',
      title: 'C++ Fundamentals',
      slug: 'cpp-fundamentals',
      description: 'Learn the basics of C++ programming',
      difficulty: 'beginner',
      estimatedHours: 20,
      isPublished: true,
      isFree: true,
      modules: [
        {
          id: 'test-module-001',
          title: 'Getting Started',
          order: 1,
          lessons: [
            {
              id: 'test-lesson-001',
              title: 'Hello World',
              type: 'interactive',
              order: 1,
              estimatedMinutes: 30
            },
            {
              id: 'test-lesson-002',
              title: 'Variables and Data Types',
              type: 'theory',
              order: 2,
              estimatedMinutes: 45
            }
          ]
        }
      ]
    },
    {
      id: 'test-course-002',
      title: 'Advanced C++ Concepts',
      slug: 'advanced-cpp',
      description: 'Master advanced C++ programming techniques',
      difficulty: 'advanced',
      estimatedHours: 40,
      isPublished: true,
      isFree: false,
      modules: [
        {
          id: 'test-module-002',
          title: 'Memory Management',
          order: 1,
          lessons: [
            {
              id: 'test-lesson-003',
              title: 'Smart Pointers',
              type: 'practical',
              order: 1,
              estimatedMinutes: 60
            }
          ]
        }
      ]
    }
  ];

  private testCodeExamples: TestCodeExample[] = [
    {
      id: 'test-code-001',
      title: 'Basic Hello World',
      code: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
      language: 'cpp',
      expectedOutput: 'Hello, World!\n',
      difficulty: 'beginner'
    },
    {
      id: 'test-code-002',
      title: 'Fibonacci Sequence',
      code: '#include <iostream>\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n-1) + fibonacci(n-2);\n}\n\nint main() {\n    for (int i = 0; i < 10; i++) {\n        std::cout << fibonacci(i) << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      expectedOutput: '0 1 1 2 3 5 8 13 21 34 ',
      difficulty: 'intermediate'
    }
  ];

  getUser(userType: UserType): TestUser {
    return this.testUsers[userType];
  }

  getCourse(index: number = 0): TestCourse {
    return this.testCourses[index];
  }

  getCodeExample(index: number = 0): TestCodeExample {
    return this.testCodeExamples[index];
  }

  getAllUsers(): TestUser[] {
    return Object.values(this.testUsers);
  }

  getAllCourses(): TestCourse[] {
    return this.testCourses;
  }

  getAllCodeExamples(): TestCodeExample[] {
    return this.testCodeExamples;
  }

  generateUniqueEmail(): string {
    const timestamp = Date.now();
    return `test-${timestamp}@test.cppmastery.hub`;
  }

  generateUniqueUsername(): string {
    const timestamp = Date.now();
    return `test_user_${timestamp}`;
  }
}

// ===== TEST INTERFACES =====

interface TestUser {
  id: string;
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  experienceLevel: string;
}

interface TestCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  isPublished: boolean;
  isFree: boolean;
  modules: TestModule[];
}

interface TestModule {
  id: string;
  title: string;
  order: number;
  lessons: TestLesson[];
}

interface TestLesson {
  id: string;
  title: string;
  type: string;
  order: number;
  estimatedMinutes: number;
}

interface TestCodeExample {
  id: string;
  title: string;
  code: string;
  language: string;
  expectedOutput: string;
  difficulty: string;
}

// ===== API UTILITIES =====

class APIContextImpl implements APIContext {
  public baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    const {
      method = 'GET',
      headers = {},
      body,
      token
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders
    };

    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);
    return response;
  }

  async authenticate(userType: UserType): Promise<string> {
    const testData = new TestDataManager();
    const user = testData.getUser(userType);

    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: {
        email: user.email,
        password: user.password
      }
    });

    if (!response.ok) {
      throw new Error(`Authentication failed for ${userType}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.accessToken;
  }
}

// ===== PAGE UTILITIES =====

export class PageHelpers {
  constructor(private page: Page) {}

  async waitForNetworkIdle(timeout: number = 30000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async waitForHydration(): Promise<void> {
    await this.page.waitForFunction(() => window.document.readyState === 'complete');
    await this.page.waitForTimeout(1000); // Allow for React hydration
  }

  async fillFormField(selector: string, value: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.fill(selector, value);
  }

  async clickButton(selector: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.click(selector);
  }

  async expectToastMessage(message: string): Promise<void> {
    await expect(this.page.locator('[data-testid="toast"]')).toContainText(message);
  }

  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
  }

  async expectSuccessMessage(message: string): Promise<void> {
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText(message);
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async mockAPIResponse(endpoint: string, response: unknown): Promise<void> {
    await this.page.route(`**/api${endpoint}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async interceptAPIRequest(endpoint: string): Promise<Request[]> {
    const requests: Request[] = [];
    
    await this.page.route(`**/api${endpoint}`, route => {
      requests.push(route.request());
      route.continue();
    });

    return requests;
  }
}

// ===== AUTHENTICATION HELPERS =====

export class AuthHelpers {
  constructor(private page: Page) {}

  async login(userType: UserType): Promise<void> {
    const testData = new TestDataManager();
    const user = testData.getUser(userType);

    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await this.page.waitForURL('**/dashboard');
    await this.page.waitForSelector('[data-testid="user-menu"]');
  }

  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('**/login');
  }

  async register(userData?: Partial<TestUser>): Promise<void> {
    const testData = new TestDataManager();
    const defaultUser = testData.getUser('student');
    
    const user = {
      ...defaultUser,
      email: testData.generateUniqueEmail(),
      username: testData.generateUniqueUsername(),
      ...userData
    };

    await this.page.goto('/register');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.fill('[data-testid="username-input"]', user.username);
    await this.page.fill('[data-testid="first-name-input"]', user.firstName);
    await this.page.fill('[data-testid="last-name-input"]', user.lastName);
    await this.page.selectOption('[data-testid="experience-level-select"]', user.experienceLevel);
    await this.page.check('[data-testid="terms-checkbox"]');
    await this.page.click('[data-testid="register-button"]');
    
    // Wait for successful registration
    await this.page.waitForSelector('[data-testid="registration-success"]');
  }
}

// ===== CODE EDITOR HELPERS =====

export class CodeEditorHelpers {
  constructor(private page: Page) {}

  async enterCode(code: string): Promise<void> {
    const editor = this.page.locator('[data-testid="code-editor"]');
    await editor.waitFor({ state: 'visible' });
    
    // Clear existing content
    await editor.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Delete');
    
    // Type new code
    await editor.type(code);
  }

  async runCode(): Promise<void> {
    await this.page.click('[data-testid="run-button"]');
    await this.page.waitForSelector('[data-testid="execution-complete"]', { timeout: 30000 });
  }

  async getOutput(): Promise<string> {
    const outputElement = this.page.locator('[data-testid="code-output"]');
    await outputElement.waitFor({ state: 'visible' });
    return await outputElement.textContent() || '';
  }

  async expectOutput(expectedOutput: string): Promise<void> {
    const actualOutput = await this.getOutput();
    expect(actualOutput.trim()).toBe(expectedOutput.trim());
  }

  async expectError(): Promise<void> {
    await expect(this.page.locator('[data-testid="error-output"]')).toBeVisible();
  }

  async expectCompilationError(): Promise<void> {
    await expect(this.page.locator('[data-testid="compilation-error"]')).toBeVisible();
  }

  async getAnalysisResults(): Promise<unknown> {
    const analysisElement = this.page.locator('[data-testid="analysis-results"]');
    await analysisElement.waitFor({ state: 'visible' });
    const analysisText = await analysisElement.textContent();
    return JSON.parse(analysisText || '{}');
  }
}

// ===== DATABASE HELPERS =====

export class DatabaseHelpers {
  private connectionString: string;

  constructor() {
    this.connectionString = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/cpp_mastery_test';
  }

  async cleanDatabase(): Promise<void> {
    // This would typically use a database connection to clean up test data
    // For now, we'll use a mock implementation
    console.log('Cleaning test database...');
  }

  async seedTestData(): Promise<void> {
    // This would typically seed the database with test data
    console.log('Seeding test database...');
  }

  async createTestUser(userType: UserType): Promise<string> {
    const testData = new TestDataManager();
    const user = testData.getUser(userType);
    
    // Mock implementation - in reality, this would create a user in the database
    console.log(`Creating test user: ${user.email}`);
    return user.id;
  }

  async deleteTestUser(userId: string): Promise<void> {
    console.log(`Deleting test user: ${userId}`);
  }
}

// ===== TEST FIXTURES =====

export const test = base.extend<TestFixtures>({
  testData: async ({}, use) => {
    const testData = new TestDataManager();
    await use(testData);
  },

  apiContext: async ({}, use) => {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
    const apiContext = new APIContextImpl(baseURL);
    await use(apiContext);
  },

  authenticatedPage: async ({ browser, testData }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const authHelpers = new AuthHelpers(page);
    await authHelpers.login('student');
    
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser, testData }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const authHelpers = new AuthHelpers(page);
    await authHelpers.login('admin');
    
    await use(page);
    await context.close();
  },

  instructorPage: async ({ browser, testData }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const authHelpers = new AuthHelpers(page);
    await authHelpers.login('instructor');
    
    await use(page);
    await context.close();
  },

  studentPage: async ({ browser, testData }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const authHelpers = new AuthHelpers(page);
    await authHelpers.login('student');
    
    await use(page);
    await context.close();
  }
});

// ===== GLOBAL SETUP =====

export async function globalSetup(): Promise<void> {
  const dbHelpers = new DatabaseHelpers();
  
  console.log('🧹 Cleaning test database...');
  await dbHelpers.cleanDatabase();
  
  console.log('🌱 Seeding test data...');
  await dbHelpers.seedTestData();
  
  console.log('✅ Test environment setup complete');
}

export async function globalTeardown(): Promise<void> {
  const dbHelpers = new DatabaseHelpers();
  
  console.log('🧹 Cleaning up test environment...');
  await dbHelpers.cleanDatabase();
  
  console.log('✅ Test environment cleanup complete');
}

// ===== CUSTOM MATCHERS =====

expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid email`
        : `Expected ${received} to be a valid email`
    };
  },

  toBeValidPassword(received: string) {
    const minLength = received.length >= 8;
    const hasUppercase = /[A-Z]/.test(received);
    const hasLowercase = /[a-z]/.test(received);
    const hasNumber = /\d/.test(received);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(received);
    
    const pass = minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
    
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid password`
        : `Expected ${received} to be a valid password (8+ chars, uppercase, lowercase, number, special char)`
    };
  },

  toHaveSuccessStatus(received: Response) {
    const pass = received.status >= 200 && received.status < 300;
    
    return {
      pass,
      message: () => pass
        ? `Expected response not to have success status, but got ${received.status}`
        : `Expected response to have success status, but got ${received.status}`
    };
  }
});

// Export helper classes for use in tests
export { PageHelpers, AuthHelpers, CodeEditorHelpers, DatabaseHelpers };