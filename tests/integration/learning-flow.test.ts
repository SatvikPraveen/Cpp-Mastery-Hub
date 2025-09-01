// File: tests/integration/learning-flow.test.ts
// Extension: .ts
// Location: tests/integration/learning-flow.test.ts

/**
 * C++ Mastery Hub - Learning Flow Integration Tests
 * End-to-end tests for complete learning workflows
 */

import { test, expect } from './setup';
import { PageHelpers, CodeEditorHelpers } from './setup';

test.describe('Complete Learning Flow', () => {
  test.describe('Course Discovery and Enrollment', () => {
    test('should discover and enroll in a beginner course', async ({ authenticatedPage, testData }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      const course = testData.getCourse(0); // C++ Fundamentals

      // Navigate to course catalog
      await authenticatedPage.goto('/courses');
      
      // Filter by beginner level
      await authenticatedPage.selectOption('[data-testid="difficulty-filter"]', 'beginner');
      await pageHelpers.clickButton('[data-testid="apply-filters"]');

      // Find and click on the course
      await expect(authenticatedPage.locator(`[data-testid="course-${course.id}"]`)).toBeVisible();
      await pageHelpers.clickButton(`[data-testid="course-${course.id}"]`);

      // Verify course details page
      await expect(authenticatedPage).toHaveURL(`/courses/${course.slug}`);
      await expect(authenticatedPage.locator('[data-testid="course-title"]')).toContainText(course.title);
      await expect(authenticatedPage.locator('[data-testid="course-description"]')).toContainText(course.description);

      // Enroll in course
      await pageHelpers.clickButton('[data-testid="enroll-button"]');
      
      // Verify enrollment success
      await pageHelpers.expectSuccessMessage('Successfully enrolled in course');
      await expect(authenticatedPage.locator('[data-testid="start-learning-button"]')).toBeVisible();
    });

    test('should handle premium course enrollment', async ({ authenticatedPage, testData }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      const premiumCourse = testData.getCourse(1); // Advanced C++ (premium)

      await authenticatedPage.goto(`/courses/${premiumCourse.slug}`);

      // Should show premium upgrade prompt
      await pageHelpers.clickButton('[data-testid="enroll-button"]');
      await expect(authenticatedPage.locator('[data-testid="premium-required-modal"]')).toBeVisible();

      // Mock premium subscription
      await pageHelpers.mockAPIResponse('/api/user/upgrade-premium', {
        success: true,
        data: { subscriptionStatus: 'active' }
      });

      await pageHelpers.clickButton('[data-testid="upgrade-to-premium"]');
      await pageHelpers.expectSuccessMessage('Premium subscription activated');
      
      // Should now be able to enroll
      await pageHelpers.clickButton('[data-testid="enroll-button"]');
      await pageHelpers.expectSuccessMessage('Successfully enrolled in course');
    });
  });

  test.describe('Interactive Learning Experience', () => {
    test('should complete a full lesson with theory and practice', async ({ authenticatedPage, testData }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);
      
      // Start first lesson in enrolled course
      await authenticatedPage.goto('/courses/cpp-fundamentals/lessons/hello-world');

      // Read theory content
      await expect(authenticatedPage.locator('[data-testid="lesson-content"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="theory-section"]')).toContainText('Hello World');

      // Scroll through content to mark as read
      await authenticatedPage.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Complete interactive code example
      await expect(authenticatedPage.locator('[data-testid="interactive-example"]')).toBeVisible();
      await pageHelpers.clickButton('[data-testid="try-example"]');

      const helloWorldCode = testData.getCodeExample(0);
      await codeEditorHelpers.enterCode(helloWorldCode.code);
      await codeEditorHelpers.runCode();
      await codeEditorHelpers.expectOutput(helloWorldCode.expectedOutput);

      // Complete practice exercise
      await pageHelpers.clickButton('[data-testid="start-exercise"]');
      
      await expect(authenticatedPage.locator('[data-testid="exercise-description"]')).toBeVisible();
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        int main() {
            std::cout << "Hello, C++ Mastery Hub!" << std::endl;
            return 0;
        }
      `);

      await pageHelpers.clickButton('[data-testid="submit-exercise"]');
      
      // Wait for automated grading
      await authenticatedPage.waitForSelector('[data-testid="exercise-graded"]', { timeout: 15000 });
      await expect(authenticatedPage.locator('[data-testid="exercise-score"]')).toContainText('100%');
      
      // Mark lesson as complete
      await pageHelpers.clickButton('[data-testid="mark-complete"]');
      await pageHelpers.expectSuccessMessage('Lesson completed!');

      // Verify progress update
      await expect(authenticatedPage.locator('[data-testid="lesson-completed"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="next-lesson-button"]')).toBeVisible();
    });

    test('should track learning progress across multiple lessons', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      
      // Complete multiple lessons and track progress
      const lessons = ['hello-world', 'variables-data-types', 'control-structures'];
      
      for (let i = 0; i < lessons.length; i++) {
        await authenticatedPage.goto(`/courses/cpp-fundamentals/lessons/${lessons[i]}`);
        
        // Simulate lesson completion
        await pageHelpers.mockAPIResponse(`/api/lessons/${lessons[i]}/complete`, {
          success: true,
          data: { 
            completed: true,
            progress: Math.round(((i + 1) / lessons.length) * 100)
          }
        });

        await pageHelpers.clickButton('[data-testid="mark-complete"]');
        
        // Check progress bar update
        const expectedProgress = Math.round(((i + 1) / lessons.length) * 100);
        await expect(authenticatedPage.locator('[data-testid="course-progress"]'))
          .toContainText(`${expectedProgress}%`);
      }

      // Verify course completion
      if (lessons.length === 3) {
        await expect(authenticatedPage.locator('[data-testid="course-completed"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="completion-certificate"]')).toBeVisible();
      }
    });
  });

  test.describe('Assessment and Evaluation', () => {
    test('should complete a quiz with immediate feedback', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      await authenticatedPage.goto('/courses/cpp-fundamentals/quizzes/basics-quiz');

      // Start quiz
      await pageHelpers.clickButton('[data-testid="start-quiz"]');
      await expect(authenticatedPage.locator('[data-testid="quiz-timer"]')).toBeVisible();

      // Answer multiple choice question
      await expect(authenticatedPage.locator('[data-testid="question-1"]')).toBeVisible();
      await authenticatedPage.click('[data-testid="option-b"]'); // Assume B is correct
      await pageHelpers.clickButton('[data-testid="next-question"]');

      // Answer true/false question  
      await expect(authenticatedPage.locator('[data-testid="question-2"]')).toBeVisible();
      await authenticatedPage.click('[data-testid="option-true"]');
      await pageHelpers.clickButton('[data-testid="next-question"]');

      // Answer code completion question
      await expect(authenticatedPage.locator('[data-testid="question-3"]')).toBeVisible();
      await authenticatedPage.fill('[data-testid="code-input"]', 'std::cout');
      await pageHelpers.clickButton('[data-testid="submit-quiz"]');

      // Review results
      await authenticatedPage.waitForSelector('[data-testid="quiz-results"]');
      await expect(authenticatedPage.locator('[data-testid="quiz-score"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="passed-indicator"]')).toBeVisible();

      // Review wrong answers with explanations
      await pageHelpers.clickButton('[data-testid="review-answers"]');
      await expect(authenticatedPage.locator('[data-testid="answer-explanation"]')).toBeVisible();
    });

    test('should handle quiz retake with improved score', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      // Mock previous attempt with low score
      await pageHelpers.mockAPIResponse('/api/quizzes/basics-quiz/attempts', {
        success: true,
        data: {
          attempts: [{
            score: 60,
            passed: false,
            submittedAt: '2024-01-14T10:00:00Z'
          }],
          attemptsAllowed: 3,
          attemptsRemaining: 2
        }
      });

      await authenticatedPage.goto('/courses/cpp-fundamentals/quizzes/basics-quiz');
      
      // Should show previous attempt and retake option
      await expect(authenticatedPage.locator('[data-testid="previous-score"]')).toContainText('60%');
      await expect(authenticatedPage.locator('[data-testid="retake-button"]')).toBeVisible();

      await pageHelpers.clickButton('[data-testid="retake-button"]');
      
      // Complete quiz with better answers
      await pageHelpers.clickButton('[data-testid="start-quiz"]');
      
      // Answer all questions correctly this time
      for (let i = 1; i <= 3; i++) {
        await authenticatedPage.click(`[data-testid="correct-option-${i}"]`);
        if (i < 3) {
          await pageHelpers.clickButton('[data-testid="next-question"]');
        }
      }
      
      await pageHelpers.clickButton('[data-testid="submit-quiz"]');
      
      // Should show improved score
      await expect(authenticatedPage.locator('[data-testid="quiz-score"]')).toContainText('100%');
      await expect(authenticatedPage.locator('[data-testid="score-improved"]')).toBeVisible();
    });
  });

  test.describe('Project-Based Learning', () => {
    test('should complete a multi-step coding project', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);

      await authenticatedPage.goto('/courses/cpp-fundamentals/projects/calculator');

      // Review project requirements
      await expect(authenticatedPage.locator('[data-testid="project-description"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="requirements-list"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="acceptance-criteria"]')).toBeVisible();

      // Start project
      await pageHelpers.clickButton('[data-testid="start-project"]');
      
      // Implement calculator functionality
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        
        class Calculator {
        public:
            double add(double a, double b) {
                return a + b;
            }
            
            double subtract(double a, double b) {
                return a - b;
            }
            
            double multiply(double a, double b) {
                return a * b;
            }
            
            double divide(double a, double b) {
                if (b == 0) {
                    throw std::invalid_argument("Division by zero");
                }
                return a / b;
            }
        };
        
        int main() {
            Calculator calc;
            std::cout << "5 + 3 = " << calc.add(5, 3) << std::endl;
            std::cout << "10 - 4 = " << calc.subtract(10, 4) << std::endl;
            std::cout << "6 * 7 = " << calc.multiply(6, 7) << std::endl;
            std::cout << "15 / 3 = " << calc.divide(15, 3) << std::endl;
            return 0;
        }
      `);

      // Run automated tests
      await pageHelpers.clickButton('[data-testid="run-tests"]');
      await authenticatedPage.waitForSelector('[data-testid="test-results"]');
      
      // Should pass all tests
      await expect(authenticatedPage.locator('[data-testid="tests-passed"]')).toContainText('4/4');
      await expect(authenticatedPage.locator('[data-testid="all-tests-passed"]')).toBeVisible();

      // Submit project for grading
      await pageHelpers.fillFormField('[data-testid="submission-notes"]', 
        'Implemented all required calculator operations with error handling for division by zero.');
      
      await pageHelpers.clickButton('[data-testid="submit-project"]');
      
      // Wait for automated grading
      await authenticatedPage.waitForSelector('[data-testid="project-graded"]', { timeout: 30000 });
      
      // Check grade and feedback
      await expect(authenticatedPage.locator('[data-testid="project-grade"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="automated-feedback"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="code-quality-score"]')).toBeVisible();
    });
  });

  test.describe('Social Learning Features', () => {
    test('should participate in study group discussions', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      await authenticatedPage.goto('/community/study-groups');
      
      // Join a study group
      await pageHelpers.clickButton('[data-testid="join-group-cpp-beginners"]');
      await pageHelpers.expectSuccessMessage('Joined study group successfully');

      // Navigate to group discussion
      await authenticatedPage.goto('/community/study-groups/cpp-beginners/discussions');
      
      // Start a new discussion
      await pageHelpers.clickButton('[data-testid="new-discussion"]');
      await pageHelpers.fillFormField('[data-testid="discussion-title"]', 
        'Help with pointer arithmetic');
      await pageHelpers.fillFormField('[data-testid="discussion-content"]', 
        'I\'m having trouble understanding how pointer arithmetic works. Can someone explain?');
      
      await pageHelpers.clickButton('[data-testid="post-discussion"]');
      
      // Verify discussion created
      await expect(authenticatedPage.locator('[data-testid="discussion-posted"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="discussion-title"]')).toContainText('Help with pointer arithmetic');

      // Mock responses from other group members
      await pageHelpers.mockAPIResponse('/api/discussions/*/replies', {
        success: true,
        data: {
          replies: [{
            id: 'reply_123',
            content: 'Pointer arithmetic allows you to navigate through memory...',
            author: { name: 'Helpful Member', avatar: '/avatars/member.jpg' },
            upvotes: 5,
            createdAt: '2024-01-15T11:00:00Z'
          }]
        }
      });

      // Check for helpful responses
      await authenticatedPage.reload();
      await expect(authenticatedPage.locator('[data-testid="reply-reply_123"]')).toBeVisible();
      
      // Upvote helpful response
      await pageHelpers.clickButton('[data-testid="upvote-reply_123"]');
      await expect(authenticatedPage.locator('[data-testid="upvotes-reply_123"]')).toContainText('6');
    });

    test('should share code and receive feedback', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);
      const codeEditorHelpers = new CodeEditorHelpers(authenticatedPage);

      await authenticatedPage.goto('/playground');
      
      // Write some code to share
      await codeEditorHelpers.enterCode(`
        #include <iostream>
        #include <vector>
        #include <algorithm>
        
        int main() {
            std::vector<int> numbers = {5, 2, 8, 1, 9};
            std::sort(numbers.begin(), numbers.end());
            
            for (int num : numbers) {
                std::cout << num << " ";
            }
            std::cout << std::endl;
            return 0;
        }
      `);

      // Share code for review
      await pageHelpers.clickButton('[data-testid="share-for-review"]');
      await pageHelpers.fillFormField('[data-testid="review-request-title"]', 
        'Review my sorting implementation');
      await pageHelpers.fillFormField('[data-testid="review-request-description"]', 
        'Please review my vector sorting code. Is this the best approach?');
      
      await pageHelpers.clickButton('[data-testid="submit-for-review"]');
      
      // Verify review request submitted
      await pageHelpers.expectSuccessMessage('Code submitted for community review');
      await expect(authenticatedPage.locator('[data-testid="review-link"]')).toBeVisible();

      // Navigate to review page
      await pageHelpers.clickButton('[data-testid="view-review"]');
      
      // Mock community feedback
      await pageHelpers.mockAPIResponse('/api/code-reviews/*/feedback', {
        success: true,
        data: {
          feedback: [{
            reviewer: { name: 'Expert Reviewer', level: 'advanced' },
            rating: 8,
            comments: 'Good use of STL algorithms! Consider using const auto& in the range-based for loop.',
            suggestions: ['Use const auto& for better performance', 'Add input validation'],
            createdAt: '2024-01-15T12:00:00Z'
          }]
        }
      });

      await authenticatedPage.reload();
      await expect(authenticatedPage.locator('[data-testid="review-feedback"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="reviewer-suggestions"]')).toContainText('const auto&');
    });
  });

  test.describe('Achievement and Gamification', () => {
    test('should earn achievements through learning activities', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      // Mock achievement earning for completing first lesson
      await pageHelpers.mockAPIResponse('/api/achievements/earned', {
        success: true,
        data: {
          achievement: {
            id: 'first_lesson',
            name: 'First Steps',
            description: 'Complete your first lesson',
            icon: '/icons/first-steps.svg',
            points: 50,
            rarity: 'common'
          }
        }
      });

      // Complete an action that triggers achievement
      await authenticatedPage.goto('/courses/cpp-fundamentals/lessons/hello-world');
      await pageHelpers.clickButton('[data-testid="mark-complete"]');

      // Should show achievement notification
      await expect(authenticatedPage.locator('[data-testid="achievement-notification"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="achievement-name"]')).toContainText('First Steps');
      await expect(authenticatedPage.locator('[data-testid="achievement-points"]')).toContainText('50 XP');

      // Check achievement in profile
      await authenticatedPage.goto('/profile/achievements');
      await expect(authenticatedPage.locator('[data-testid="achievement-first_lesson"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="total-achievements"]')).toContainText('1');
    });

    test('should track learning streaks and milestones', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      // Mock 7-day learning streak
      await pageHelpers.mockAPIResponse('/api/user/stats', {
        success: true,
        data: {
          currentStreak: 7,
          longestStreak: 15,
          totalTimeSpent: 2400, // 40 hours
          problemsSolved: 45,
          xpPoints: 3250
        }
      });

      await authenticatedPage.goto('/dashboard');
      
      // Verify streak display
      await expect(authenticatedPage.locator('[data-testid="current-streak"]')).toContainText('7 days');
      await expect(authenticatedPage.locator('[data-testid="streak-icon"]')).toBeVisible();

      // Check for streak milestone achievement
      await expect(authenticatedPage.locator('[data-testid="milestone-week-streak"]')).toBeVisible();
      
      // Verify overall progress stats
      await expect(authenticatedPage.locator('[data-testid="total-time"]')).toContainText('40 hours');
      await expect(authenticatedPage.locator('[data-testid="problems-solved"]')).toContainText('45');
      await expect(authenticatedPage.locator('[data-testid="xp-points"]')).toContainText('3,250 XP');
    });
  });

  test.describe('Adaptive Learning Path', () => {
    test('should recommend next learning steps based on progress', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      // Mock completed beginner content
      await pageHelpers.mockAPIResponse('/api/learning-path/recommendations', {
        success: true,
        data: {
          recommendations: [
            {
              type: 'course',
              title: 'Object-Oriented Programming in C++',
              reason: 'Based on your progress in C++ Fundamentals',
              difficulty: 'intermediate',
              estimatedTime: '15 hours'
            },
            {
              type: 'practice',
              title: 'Algorithm Implementation Challenges',
              reason: 'Strengthen your problem-solving skills',
              difficulty: 'intermediate',
              estimatedTime: '5 hours'
            }
          ]
        }
      });

      await authenticatedPage.goto('/learning-path');
      
      // Verify personalized recommendations
      await expect(authenticatedPage.locator('[data-testid="recommendations"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="rec-oop-course"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="rec-algorithm-practice"]')).toBeVisible();

      // Accept recommendation
      await pageHelpers.clickButton('[data-testid="accept-rec-oop-course"]');
      await pageHelpers.expectSuccessMessage('Added to your learning path');
      
      // Verify learning path updated
      await expect(authenticatedPage.locator('[data-testid="learning-path-updated"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="next-course"]')).toContainText('Object-Oriented Programming');
    });
  });
});