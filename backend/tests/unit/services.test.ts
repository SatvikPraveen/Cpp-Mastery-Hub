// File: backend/tests/unit/services.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AnalysisService } from '../../src/services/analyzer/analysis-service';
import { ExecutionService } from '../../src/services/compiler/execution-service';
import { AuthService } from '../../src/services/auth/auth-service';
import { UserService } from '../../src/services/user-service';
import { LearningService } from '../../src/services/learning/learning-service';
import { NotificationService } from '../../src/services/notification/notification-service';

describe('AnalysisService', () => {
  let analysisService: AnalysisService;

  beforeEach(() => {
    analysisService = new AnalysisService();
  });

  test('should analyze valid C++ code', async () => {
    const code = `
      #include <iostream>
      int main() {
        std::cout << "Hello World" << std::endl;
        return 0;
      }
    `;

    const result = await analysisService.analyzeCode(code);

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.length).toBe(0);
    expect(result.suggestions).toBeDefined();
  });

  test('should detect syntax errors', async () => {
    const invalidCode = `
      #include <iostream>
      int main() {
        std::cout << "Missing semicolon"
        return 0;
      }
    `;

    const result = await analysisService.analyzeCode(invalidCode);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('semicolon');
  });

  test('should detect memory leaks', async () => {
    const codeWithLeak = `
      #include <iostream>
      int main() {
        int* ptr = new int(42);
        std::cout << *ptr << std::endl;
        // Missing delete
        return 0;
      }
    `;

    const result = await analysisService.analyzeCode(codeWithLeak);

    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    const hasMemoryLeakWarning = result.warnings.some(
      warning => warning.message.includes('memory leak') || warning.message.includes('delete')
    );
    expect(hasMemoryLeakWarning).toBe(true);
  });

  test('should detect buffer overflow vulnerabilities', async () => {
    const vulnerableCode = `
      #include <cstring>
      int main() {
        char buffer[10];
        char input[100];
        strcpy(buffer, input);
        return 0;
      }
    `;

    const result = await analysisService.analyzeCode(vulnerableCode);

    expect(result.securityIssues.length).toBeGreaterThan(0);
    
    const hasBufferOverflow = result.securityIssues.some(
      issue => issue.type === 'buffer_overflow'
    );
    expect(hasBufferOverflow).toBe(true);
  });

  test('should calculate complexity metrics', async () => {
    const complexCode = `
      #include <iostream>
      int fibonacci(int n) {
        if (n <= 1) return n;
        if (n % 2 == 0) {
          for (int i = 0; i < n; i++) {
            if (i % 3 == 0) continue;
          }
        }
        return fibonacci(n-1) + fibonacci(n-2);
      }
    `;

    const result = await analysisService.analyzeCode(complexCode);

    expect(result.metrics).toBeDefined();
    expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(1);
    expect(result.metrics.cognitiveComplexity).toBeGreaterThan(1);
    expect(result.metrics.linesOfCode).toBeGreaterThan(5);
  });

  test('should handle analysis configuration', async () => {
    const code = `
      #include <iostream>
      int main() {
        int unused = 42;
        std::cout << "Hello" << std::endl;
        return 0;
      }
    `;

    const config = {
      enableUnusedVariableCheck: false,
      enableStyleCheck: true,
      enableSecurityCheck: true
    };

    const result = await analysisService.analyzeCode(code, config);

    // Should not report unused variable due to config
    const hasUnusedWarning = result.warnings.some(
      warning => warning.message.includes('unused')
    );
    expect(hasUnusedWarning).toBe(false);
  });
});

describe('ExecutionService', () => {
  let executionService: ExecutionService;

  beforeEach(() => {
    executionService = new ExecutionService();
  });

  test('should execute valid C++ code', async () => {
    const code = `
      #include <iostream>
      int main() {
        std::cout << "Hello World" << std::endl;
        return 0;
      }
    `;

    const result = await executionService.executeCode(code);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Hello World');
    expect(result.exitCode).toBe(0);
    expect(result.executionTime).toBeGreaterThan(0);
  });

  test('should handle compilation errors', async () => {
    const invalidCode = `
      #include <iostream>
      int main() {
        std::cout << "Missing semicolon"
        return 0;
      }
    `;

    const result = await executionService.executeCode(invalidCode);

    expect(result.success).toBe(false);
    expect(result.compilationError).toBeDefined();
    expect(result.compilationError).toContain('error');
  });

  test('should handle runtime errors', async () => {
    const codeWithRuntimeError = `
      #include <iostream>
      int main() {
        int* ptr = nullptr;
        *ptr = 42; // Segfault
        return 0;
      }
    `;

    const result = await executionService.executeCode(codeWithRuntimeError);

    expect(result.success).toBe(false);
    expect(result.runtimeError).toBeDefined();
  });

  test('should enforce execution timeout', async () => {
    const infiniteLoopCode = `
      #include <iostream>
      int main() {
        while(true) {
          std::cout << "Infinite loop" << std::endl;
        }
        return 0;
      }
    `;

    const result = await executionService.executeCode(infiniteLoopCode, { timeout: 1000 });

    expect(result.success).toBe(false);
    expect(result.timeout).toBe(true);
  });

  test('should handle memory visualization', async () => {
    const code = `
      #include <iostream>
      int main() {
        int arr[5] = {1, 2, 3, 4, 5};
        int* ptr = new int(42);
        delete ptr;
        return 0;
      }
    `;

    const result = await executionService.executeCode(code, { enableMemoryVisualization: true });

    expect(result.memoryVisualization).toBeDefined();
    expect(result.memoryVisualization.stackFrames).toBeDefined();
    expect(result.memoryVisualization.heapAllocations).toBeDefined();
  });

  test('should support input/output testing', async () => {
    const code = `
      #include <iostream>
      int main() {
        int x;
        std::cin >> x;
        std::cout << "Input was: " << x << std::endl;
        return 0;
      }
    `;

    const input = "42\n";
    const result = await executionService.executeCode(code, { input });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Input was: 42');
  });
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  test('should register new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'securePassword123',
      username: 'testuser'
    };

    const result = await authService.register(userData);

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(userData.email);
    expect(result.user.username).toBe(userData.username);
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  test('should not register user with existing email', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'password123',
      username: 'testuser'
    };

    // First registration
    await authService.register(userData);

    // Second registration with same email
    const result = await authService.register(userData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  test('should login with valid credentials', async () => {
    const userData = {
      email: 'login@example.com',
      password: 'password123',
      username: 'loginuser'
    };

    // Register user first
    await authService.register(userData);

    // Login
    const result = await authService.login({
      email: userData.email,
      password: userData.password
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  test('should not login with invalid credentials', async () => {
    const result = await authService.login({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid credentials');
  });

  test('should refresh JWT token', async () => {
    const userData = {
      email: 'refresh@example.com',
      password: 'password123',
      username: 'refreshuser'
    };

    const registerResult = await authService.register(userData);
    const refreshToken = registerResult.refreshToken;

    const result = await authService.refreshToken(refreshToken);

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token).not.toBe(registerResult.token);
  });

  test('should validate JWT token', async () => {
    const userData = {
      email: 'validate@example.com',
      password: 'password123',
      username: 'validateuser'
    };

    const registerResult = await authService.register(userData);
    const token = registerResult.token;

    const result = await authService.validateToken(token);

    expect(result.valid).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe(registerResult.user.id);
  });

  test('should handle password reset', async () => {
    const userData = {
      email: 'reset@example.com',
      password: 'password123',
      username: 'resetuser'
    };

    await authService.register(userData);

    const result = await authService.requestPasswordReset(userData.email);

    expect(result.success).toBe(true);
    expect(result.resetToken).toBeDefined();
  });
});

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  test('should get user profile', async () => {
    const userId = 'test-user-id';
    
    const profile = await userService.getUserProfile(userId);

    expect(profile).toBeDefined();
    expect(profile.id).toBe(userId);
    expect(profile.username).toBeDefined();
    expect(profile.email).toBeDefined();
    expect(profile.progress).toBeDefined();
  });

  test('should update user profile', async () => {
    const userId = 'test-user-id';
    const updateData = {
      username: 'newusername',
      bio: 'Updated bio',
      avatar: 'new-avatar-url'
    };

    const result = await userService.updateProfile(userId, updateData);

    expect(result.success).toBe(true);
    expect(result.user.username).toBe(updateData.username);
    expect(result.user.bio).toBe(updateData.bio);
  });

  test('should track user progress', async () => {
    const userId = 'test-user-id';
    const progressData = {
      courseId: 'cpp-basics',
      lessonId: 'variables',
      completed: true,
      score: 95
    };

    const result = await userService.updateProgress(userId, progressData);

    expect(result.success).toBe(true);
    expect(result.progress).toBeDefined();
  });

  test('should get user achievements', async () => {
    const userId = 'test-user-id';

    const achievements = await userService.getUserAchievements(userId);

    expect(Array.isArray(achievements)).toBe(true);
    achievements.forEach(achievement => {
      expect(achievement.id).toBeDefined();
      expect(achievement.name).toBeDefined();
      expect(achievement.description).toBeDefined();
      expect(achievement.earnedAt).toBeDefined();
    });
  });

  test('should get user code snippets', async () => {
    const userId = 'test-user-id';

    const snippets = await userService.getUserCodeSnippets(userId);

    expect(Array.isArray(snippets)).toBe(true);
    snippets.forEach(snippet => {
      expect(snippet.id).toBeDefined();
      expect(snippet.title).toBeDefined();
      expect(snippet.code).toBeDefined();
      expect(snippet.language).toBe('cpp');
    });
  });
});

describe('LearningService', () => {
  let learningService: LearningService;

  beforeEach(() => {
    learningService = new LearningService();
  });

  test('should get course catalog', async () => {
    const courses = await learningService.getCourses();

    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThan(0);
    
    courses.forEach(course => {
      expect(course.id).toBeDefined();
      expect(course.title).toBeDefined();
      expect(course.description).toBeDefined();
      expect(course.difficulty).toBeDefined();
      expect(course.lessons).toBeDefined();
    });
  });

  test('should get course details', async () => {
    const courseId = 'cpp-basics';
    
    const course = await learningService.getCourse(courseId);

    expect(course).toBeDefined();
    expect(course.id).toBe(courseId);
    expect(course.lessons).toBeDefined();
    expect(Array.isArray(course.lessons)).toBe(true);
  });

  test('should get lesson content', async () => {
    const courseId = 'cpp-basics';
    const lessonId = 'variables';

    const lesson = await learningService.getLesson(courseId, lessonId);

    expect(lesson).toBeDefined();
    expect(lesson.id).toBe(lessonId);
    expect(lesson.title).toBeDefined();
    expect(lesson.content).toBeDefined();
    expect(lesson.exercises).toBeDefined();
  });

  test('should validate exercise solution', async () => {
    const exerciseId = 'variable-declaration';
    const userCode = `
      #include <iostream>
      int main() {
        int x = 42;
        std::cout << x << std::endl;
        return 0;
      }
    `;

    const result = await learningService.validateExercise(exerciseId, userCode);

    expect(result.correct).toBeDefined();
    expect(result.feedback).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });

  test('should track learning progress', async () => {
    const userId = 'test-user-id';
    const progressData = {
      courseId: 'cpp-basics',
      lessonId: 'variables',
      exerciseId: 'variable-declaration',
      completed: true,
      timeSpent: 300, // 5 minutes
      attempts: 2
    };

    const result = await learningService.updateProgress(userId, progressData);

    expect(result.success).toBe(true);
    expect(result.nextRecommendation).toBeDefined();
  });

  test('should generate personalized recommendations', async () => {
    const userId = 'test-user-id';

    const recommendations = await learningService.getRecommendations(userId);

    expect(Array.isArray(recommendations)).toBe(true);
    recommendations.forEach(rec => {
      expect(rec.type).toBeDefined(); // course, lesson, exercise, practice
      expect(rec.content).toBeDefined();
      expect(rec.reason).toBeDefined();
      expect(rec.priority).toBeDefined();
    });
  });
});

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  test('should send email notification', async () => {
    const notification = {
      type: 'email',
      recipient: 'test@example.com',
      subject: 'Test Notification',
      content: 'This is a test notification',
      template: 'welcome'
    };

    const result = await notificationService.send(notification);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  test('should send push notification', async () => {
    const notification = {
      type: 'push',
      userId: 'test-user-id',
      title: 'New Achievement',
      message: 'You have unlocked a new achievement!',
      data: { achievementId: 'first-program' }
    };

    const result = await notificationService.send(notification);

    expect(result.success).toBe(true);
  });

  test('should get user notifications', async () => {
    const userId = 'test-user-id';

    const notifications = await notificationService.getUserNotifications(userId);

    expect(Array.isArray(notifications)).toBe(true);
    notifications.forEach(notification => {
      expect(notification.id).toBeDefined();
      expect(notification.type).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.createdAt).toBeDefined();
    });
  });

  test('should mark notification as read', async () => {
    const userId = 'test-user-id';
    const notificationId = 'test-notification-id';

    const result = await notificationService.markAsRead(userId, notificationId);

    expect(result.success).toBe(true);
  });

  test('should handle notification preferences', async () => {
    const userId = 'test-user-id';
    const preferences = {
      email: true,
      push: false,
      achievements: true,
      courseUpdates: false,
      communityActivity: true
    };

    const result = await notificationService.updatePreferences(userId, preferences);

    expect(result.success).toBe(true);
    
    const savedPreferences = await notificationService.getPreferences(userId);
    expect(savedPreferences.email).toBe(preferences.email);
    expect(savedPreferences.push).toBe(preferences.push);
  });
});