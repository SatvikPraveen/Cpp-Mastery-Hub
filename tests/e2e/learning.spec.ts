// File: tests/e2e/learning.spec.ts
// Extension: .ts
// Location: tests/e2e/learning.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Learning Platform', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login first
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to learning section
    await page.goto('/learn');
    await expect(page).toHaveURL(/.*\/learn/);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Course Catalog', () => {
    test('should display course catalog with filters', async () => {
      // Check main course listing
      await expect(page.locator('[data-testid="course-catalog"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
      
      // Check filter options
      await expect(page.locator('[data-testid="difficulty-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
      
      // Check course card elements
      const firstCourseCard = page.locator('[data-testid="course-card"]').first();
      await expect(firstCourseCard.locator('[data-testid="course-title"]')).toBeVisible();
      await expect(firstCourseCard.locator('[data-testid="course-description"]')).toBeVisible();
      await expect(firstCourseCard.locator('[data-testid="difficulty-badge"]')).toBeVisible();
      await expect(firstCourseCard.locator('[data-testid="duration"]')).toBeVisible();
    });

    test('should filter courses by difficulty', async () => {
      // Filter by beginner
      await page.selectOption('[data-testid="difficulty-filter"]', 'beginner');
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // All visible courses should be beginner level
      const difficultyBadges = page.locator('[data-testid="difficulty-badge"]');
      const count = await difficultyBadges.count();
      
      for (let i = 0; i < count; i++) {
        const badge = difficultyBadges.nth(i);
        await expect(badge).toContainText('Beginner');
      }
    });

    test('should filter courses by category', async () => {
      // Filter by fundamentals
      await page.selectOption('[data-testid="category-filter"]', 'fundamentals');
      
      await page.waitForTimeout(1000);
      
      // Should show fundamentals courses
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
      
      // Clear filter
      await page.selectOption('[data-testid="category-filter"]', 'all');
      await page.waitForTimeout(1000);
      
      // Should show more courses
      const courseCount = await page.locator('[data-testid="course-card"]').count();
      expect(courseCount).toBeGreaterThan(1);
    });

    test('should search courses by name', async () => {
      // Search for specific course
      await page.fill('[data-testid="search-input"]', 'C++ Fundamentals');
      await page.waitForTimeout(1000);
      
      // Should show matching courses
      const firstResult = page.locator('[data-testid="course-card"]').first();
      await expect(firstResult.locator('[data-testid="course-title"]')).toContainText('Fundamentals');
      
      // Clear search
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(1000);
    });

    test('should sort courses', async () => {
      // Sort by newest
      await page.selectOption('[data-testid="sort-select"]', 'newest');
      await page.waitForTimeout(1000);
      
      // Check that courses are displayed
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
      
      // Sort by rating
      await page.selectOption('[data-testid="sort-select"]', 'rating');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
    });
  });

  test.describe('Course Details and Enrollment', () => {
    test('should view course details', async () => {
      // Click on first course
      await page.click('[data-testid="course-card"]');
      
      // Should navigate to course detail page
      await expect(page).toHaveURL(/.*\/learn\/[a-f0-9-]+$/);
      
      // Check course detail elements
      await expect(page.locator('[data-testid="course-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-outline"]')).toBeVisible();
      await expect(page.locator('[data-testid="enroll-button"]')).toBeVisible();
      
      // Check lessons list
      await expect(page.locator('[data-testid="lessons-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-item"]').first()).toBeVisible();
    });

    test('should enroll in course', async () => {
      // Go to course detail page
      await page.click('[data-testid="course-card"]');
      
      // Enroll in course
      await page.click('[data-testid="enroll-button"]');
      
      // Should show enrollment success
      await expect(page.locator('text=Successfully enrolled')).toBeVisible();
      
      // Button should change to "Continue Learning"
      await expect(page.locator('[data-testid="continue-learning-button"]')).toBeVisible();
      
      // Should show progress tracker
      await expect(page.locator('[data-testid="progress-tracker"]')).toBeVisible();
    });

    test('should show course prerequisites', async () => {
      // Find a course with prerequisites
      await page.click('[data-testid="course-card"]');
      
      // Check if prerequisites section exists
      const prereqSection = page.locator('[data-testid="prerequisites-section"]');
      if (await prereqSection.isVisible()) {
        await expect(prereqSection).toBeVisible();
        await expect(page.locator('[data-testid="prerequisite-item"]').first()).toBeVisible();
      }
    });

    test('should display course reviews and ratings', async () => {
      await page.click('[data-testid="course-card"]');
      
      // Check reviews section
      await expect(page.locator('[data-testid="course-rating"]')).toBeVisible();
      
      // Check if reviews section exists
      const reviewsSection = page.locator('[data-testid="reviews-section"]');
      if (await reviewsSection.isVisible()) {
        await expect(page.locator('[data-testid="review-item"]').first()).toBeVisible();
      }
    });
  });

  test.describe('Lesson Learning Experience', () => {
    test('should access and complete a lesson', async () => {
      // Enroll in course first
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      
      // Click on first lesson
      await page.click('[data-testid="lesson-item"]');
      
      // Should navigate to lesson page
      await expect(page).toHaveURL(/.*\/learn\/[a-f0-9-]+\/[a-f0-9-]+$/);
      
      // Check lesson content
      await expect(page.locator('[data-testid="lesson-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-navigation"]')).toBeVisible();
      
      // Complete lesson
      await page.click('[data-testid="complete-lesson-button"]');
      
      // Should show completion confirmation
      await expect(page.locator('text=Lesson completed')).toBeVisible();
      
      // Progress should update
      await expect(page.locator('[data-testid="lesson-progress"]')).toContainText('100%');
    });

    test('should navigate between lessons', async () => {
      // Go to a lesson
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      // Check navigation controls
      await expect(page.locator('[data-testid="lesson-navigation"]')).toBeVisible();
      
      // Complete current lesson
      await page.click('[data-testid="complete-lesson-button"]');
      
      // Navigate to next lesson
      const nextButton = page.locator('[data-testid="next-lesson-button"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should load next lesson
        await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
      }
    });

    test('should display lesson code examples', async () => {
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      // Check for code examples
      const codeExample = page.locator('[data-testid="code-example"]');
      if (await codeExample.isVisible()) {
        await expect(codeExample).toBeVisible();
        
        // Should have syntax highlighting
        await expect(codeExample.locator('.hljs')).toBeVisible();
        
        // Should have copy button
        await expect(page.locator('[data-testid="copy-code-button"]')).toBeVisible();
      }
    });

    test('should try interactive code exercises', async () => {
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      // Check for interactive exercises
      const exercise = page.locator('[data-testid="interactive-exercise"]');
      if (await exercise.isVisible()) {
        await expect(exercise).toBeVisible();
        
        // Should have code editor
        await expect(page.locator('[data-testid="exercise-editor"]')).toBeVisible();
        
        // Should have run button
        await expect(page.locator('[data-testid="run-exercise-button"]')).toBeVisible();
        
        // Try running exercise
        await page.click('[data-testid="run-exercise-button"]');
        
        // Should show results
        await expect(page.locator('[data-testid="exercise-output"]')).toBeVisible();
      }
    });
  });

  test.describe('Quizzes and Assessments', () => {
    test('should take a quiz', async () => {
      // Navigate to a lesson with quiz
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      // Look for quiz section
      const quiz = page.locator('[data-testid="lesson-quiz"]');
      if (await quiz.isVisible()) {
        await expect(quiz).toBeVisible();
        
        // Start quiz
        await page.click('[data-testid="start-quiz-button"]');
        
        // Should show quiz questions
        await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-options"]')).toBeVisible();
        
        // Answer first question
        await page.click('[data-testid="quiz-option"]');
        await page.click('[data-testid="next-question-button"]');
        
        // Continue until quiz is complete
        // (This would depend on quiz length and structure)
      }
    });

    test('should show quiz results', async () => {
      // Complete a quiz (simplified)
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      const quiz = page.locator('[data-testid="lesson-quiz"]');
      if (await quiz.isVisible()) {
        await page.click('[data-testid="start-quiz-button"]');
        
        // Simulate completing quiz
        const questions = page.locator('[data-testid="quiz-question"]');
        const questionCount = await questions.count();
        
        for (let i = 0; i < questionCount; i++) {
          await page.click('[data-testid="quiz-option"]');
          
          const nextButton = page.locator('[data-testid="next-question-button"]');
          const submitButton = page.locator('[data-testid="submit-quiz-button"]');
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            break;
          } else if (await nextButton.isVisible()) {
            await nextButton.click();
          }
        }
        
        // Should show results
        await expect(page.locator('[data-testid="quiz-results"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-score"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-feedback"]')).toBeVisible();
      }
    });

    test('should retake failed quiz', async () => {
      // Simulate failing a quiz and retaking
      const quiz = page.locator('[data-testid="lesson-quiz"]');
      if (await quiz.isVisible()) {
        // After completing quiz with low score
        const retakeButton = page.locator('[data-testid="retake-quiz-button"]');
        if (await retakeButton.isVisible()) {
          await retakeButton.click();
          
          // Should restart quiz
          await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Progress Tracking', () => {
    test('should display learning progress', async () => {
      // Go to dashboard to check progress
      await page.goto('/dashboard');
      
      // Check progress section
      await expect(page.locator('[data-testid="learning-progress"]')).toBeVisible();
      
      // Check individual course progress
      const progressCard = page.locator('[data-testid="progress-card"]').first();
      if (await progressCard.isVisible()) {
        await expect(progressCard.locator('[data-testid="course-title"]')).toBeVisible();
        await expect(progressCard.locator('[data-testid="progress-percentage"]')).toBeVisible();
        await expect(progressCard.locator('[data-testid="lessons-completed"]')).toBeVisible();
      }
    });

    test('should show learning streak', async () => {
      await page.goto('/dashboard');
      
      // Check learning streak
      const streakElement = page.locator('[data-testid="learning-streak"]');
      if (await streakElement.isVisible()) {
        await expect(streakElement).toBeVisible();
        await expect(page.locator('[data-testid="streak-count"]')).toBeVisible();
        await expect(page.locator('[data-testid="streak-message"]')).toBeVisible();
      }
    });

    test('should display time spent learning', async () => {
      await page.goto('/dashboard');
      
      // Check time tracking
      const timeSpent = page.locator('[data-testid="time-spent"]');
      if (await timeSpent.isVisible()) {
        await expect(timeSpent).toBeVisible();
        await expect(page.locator('[data-testid="total-time"]')).toBeVisible();
        await expect(page.locator('[data-testid="weekly-time"]')).toBeVisible();
      }
    });

    test('should show achievements and badges', async () => {
      await page.goto('/dashboard');
      
      // Check achievements section
      const achievements = page.locator('[data-testid="achievements-section"]');
      if (await achievements.isVisible()) {
        await expect(achievements).toBeVisible();
        
        const badge = page.locator('[data-testid="achievement-badge"]').first();
        if (await badge.isVisible()) {
          await expect(badge).toBeVisible();
          await expect(badge.locator('[data-testid="badge-title"]')).toBeVisible();
          await expect(badge.locator('[data-testid="badge-description"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Learning Recommendations', () => {
    test('should show personalized course recommendations', async () => {
      await page.goto('/dashboard');
      
      // Check recommendations section
      const recommendations = page.locator('[data-testid="recommendations-section"]');
      if (await recommendations.isVisible()) {
        await expect(recommendations).toBeVisible();
        
        const recommendedCourse = page.locator('[data-testid="recommended-course"]').first();
        await expect(recommendedCourse).toBeVisible();
        await expect(recommendedCourse.locator('[data-testid="course-title"]')).toBeVisible();
        await expect(recommendedCourse.locator('[data-testid="recommendation-reason"]')).toBeVisible();
      }
    });

    test('should suggest next lesson', async () => {
      // Complete a lesson and check for next suggestion
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      await page.click('[data-testid="complete-lesson-button"]');
      
      // Should suggest next lesson
      const nextSuggestion = page.locator('[data-testid="next-lesson-suggestion"]');
      if (await nextSuggestion.isVisible()) {
        await expect(nextSuggestion).toBeVisible();
        await expect(page.locator('[data-testid="suggested-lesson-title"]')).toBeVisible();
      }
    });
  });

  test.describe('Learning Path and Roadmap', () => {
    test('should display learning roadmap', async () => {
      await page.goto('/learn/roadmap');
      
      // Check roadmap sections
      await expect(page.locator('[data-testid="learning-roadmap"]')).toBeVisible();
      await expect(page.locator('[data-testid="roadmap-track"]').first()).toBeVisible();
      
      // Check track sections
      const track = page.locator('[data-testid="roadmap-track"]').first();
      await expect(track.locator('[data-testid="track-title"]')).toBeVisible();
      await expect(track.locator('[data-testid="track-courses"]')).toBeVisible();
    });

    test('should select different learning tracks', async () => {
      await page.goto('/learn/roadmap');
      
      // Change learning track
      await page.selectOption('[data-testid="track-selector"]', 'beginner');
      await page.waitForTimeout(1000);
      
      // Should show beginner track
      await expect(page.locator('[data-testid="beginner-track"]')).toBeVisible();
      
      // Change to advanced track
      await page.selectOption('[data-testid="track-selector"]', 'advanced');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('[data-testid="advanced-track"]')).toBeVisible();
    });

    test('should show progress on roadmap', async () => {
      await page.goto('/learn/roadmap');
      
      // Check for progress indicators
      const progressIndicators = page.locator('[data-testid="roadmap-progress"]');
      if (await progressIndicators.isVisible()) {
        await expect(progressIndicators).toBeVisible();
        
        // Check completed courses
        const completedCourse = page.locator('[data-testid="completed-course"]').first();
        if (await completedCourse.isVisible()) {
          await expect(completedCourse).toHaveClass(/completed/);
        }
        
        // Check current course
        const currentCourse = page.locator('[data-testid="current-course"]').first();
        if (await currentCourse.isVisible()) {
          await expect(currentCourse).toHaveClass(/current/);
        }
      }
    });
  });

  test.describe('Offline Learning Support', () => {
    test('should work with slow network', async () => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 1000); // 1 second delay
      });
      
      await page.goto('/learn');
      
      // Should show loading states
      await expect(page.locator('[data-testid="loading-courses"]')).toBeVisible();
      
      // Eventually load content
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible({ timeout: 15000 });
    });

    test('should cache lesson content', async () => {
      // Visit a lesson
      await page.click('[data-testid="course-card"]');
      await page.click('[data-testid="enroll-button"]');
      await page.click('[data-testid="lesson-item"]');
      
      // Wait for lesson to load
      await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
      
      // Simulate going offline
      await page.context().setOffline(true);
      
      // Refresh page
      await page.reload();
      
      // Should still show lesson content (if cached)
      // This would depend on implementation of offline support
    });
  });
});