// File: tests/e2e/community.spec.ts
// Extension: .ts
// Location: tests/e2e/community.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Community Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('[data-testid=email-input]', 'community@example.com');
    await page.fill('[data-testid=password-input]', 'password123');
    await page.click('[data-testid=login-button]');
  });

  test('should display forum categories', async ({ page }) => {
    await page.goto('/community');
    
    await expect(page.locator('h1')).toContainText('Community');
    await expect(page.locator('[data-testid=forum-category]')).toHaveCount.greaterThan(0);
    
    // Check category content
    const firstCategory = page.locator('[data-testid=forum-category]').first();
    await expect(firstCategory.locator('[data-testid=category-title]')).toBeVisible();
    await expect(firstCategory.locator('[data-testid=category-description]')).toBeVisible();
    await expect(firstCategory.locator('[data-testid=post-count]')).toBeVisible();
  });

  test('should navigate to forum posts', async ({ page }) => {
    await page.goto('/community/forums');
    
    await expect(page.locator('[data-testid=forum-post]')).toHaveCount.greaterThan(0);
    
    const firstPost = page.locator('[data-testid=forum-post]').first();
    const postTitle = await firstPost.locator('[data-testid=post-title]').textContent();
    
    await firstPost.click();
    
    // Should navigate to post details
    await expect(page).toHaveURL(/\/community\/[^\/]+$/);
    await expect(page.locator('h1')).toContainText(postTitle || '');
    await expect(page.locator('[data-testid=post-content]')).toBeVisible();
  });

  test('should create new forum post', async ({ page }) => {
    await page.goto('/community/forums');
    
    await page.click('[data-testid=new-post-button]');
    
    // Fill out post form
    await page.fill('[data-testid=post-title-input]', 'My Test Post');
    await page.selectOption('[data-testid=category-select]', 'general');
    await page.fill('[data-testid=post-content-editor]', 'This is the content of my test post.');
    
    await page.click('[data-testid=publish-post]');
    
    // Should redirect to new post
    await expect(page).toHaveURL(/\/community\/[^\/]+$/);
    await expect(page.locator('h1')).toContainText('My Test Post');
  });

  test('should comment on posts', async ({ page }) => {
    await page.goto('/community/forums');
    
    // Go to a post
    await page.click('[data-testid=forum-post]');
    
    // Add a comment
    await page.fill('[data-testid=comment-editor]', 'This is my comment on this post.');
    await page.click('[data-testid=submit-comment]');
    
    // Should show the comment
    await expect(page.locator('text=This is my comment on this post.')).toBeVisible();
    await expect(page.locator('[data-testid=comment-item]')).toHaveCount.greaterThan(0);
  });

  test('should upvote and downvote posts', async ({ page }) => {
    await page.goto('/community/forums');
    await page.click('[data-testid=forum-post]');
    
    const initialScore = await page.locator('[data-testid=post-score]').textContent();
    
    // Upvote the post
    await page.click('[data-testid=upvote-button]');
    
    const newScore = await page.locator('[data-testid=post-score]').textContent();
    expect(parseInt(newScore || '0')).toBeGreaterThan(parseInt(initialScore || '0'));
    
    // Check that upvote button is active
    await expect(page.locator('[data-testid=upvote-button]')).toHaveClass(/active/);
  });

  test('should display user leaderboard', async ({ page }) => {
    await page.goto('/community');
    
    await expect(page.locator('[data-testid=leaderboard-section]')).toBeVisible();
    await expect(page.locator('[data-testid=leaderboard-item]')).toHaveCount.greaterThan(0);
    
    const firstUser = page.locator('[data-testid=leaderboard-item]').first();
    await expect(firstUser.locator('[data-testid=user-username]')).toBeVisible();
    await expect(firstUser.locator('[data-testid=user-score]')).toBeVisible();
    await expect(firstUser.locator('[data-testid=user-rank]')).toBeVisible();
  });

  test('should search forum posts', async ({ page }) => {
    await page.goto('/community/forums');
    
    await page.fill('[data-testid=forum-search]', 'C++ templates');
    await page.press('[data-testid=forum-search]', 'Enter');
    
    // Should filter posts
    const posts = page.locator('[data-testid=forum-post]');
    const count = await posts.count();
    
    if (count > 0) {
      const firstPostTitle = await posts.first().locator('[data-testid=post-title]').textContent();
      expect(firstPostTitle?.toLowerCase()).toContain('template');
    }
  });

  test('should filter posts by category', async ({ page }) => {
    await page.goto('/community/forums');
    
    await page.click('[data-testid=category-filter]');
    await page.click('[data-testid=category-beginners]');
    
    // Should show only beginner posts
    const posts = page.locator('[data-testid=forum-post]');
    const count = await posts.count();
    
    for (let i = 0; i < count; i++) {
      const category = await posts.nth(i).locator('[data-testid=post-category]').textContent();
      expect(category).toBe('Beginners');
    }
  });

  test('should display user profile', async ({ page }) => {
    await page.goto('/community/forums');
    
    // Click on a username
    await page.click('[data-testid=post-author]');
    
    // Should navigate to user profile
    await expect(page).toHaveURL(/\/community\/users\/[^\/]+$/);
    await expect(page.locator('[data-testid=user-profile]')).toBeVisible();
    await expect(page.locator('[data-testid=user-avatar]')).toBeVisible();
    await expect(page.locator('[data-testid=user-bio]')).toBeVisible();
    await expect(page.locator('[data-testid=user-stats]')).toBeVisible();
  });

  test('should handle real-time notifications', async ({ page }) => {
    // This would require WebSocket testing
    await page.goto('/community/forums');
    
    // Create a post that should trigger notifications
    await page.click('[data-testid=new-post-button]');
    await page.fill('[data-testid=post-title-input]', 'Real-time Test Post');
    await page.fill('[data-testid=post-content-editor]', 'Testing notifications');
    await page.click('[data-testid=publish-post]');
    
    // Check if notification appears
    await expect(page.locator('[data-testid=notification-toast]')).toBeVisible();
    await expect(page.locator('text=Post published successfully')).toBeVisible();
  });
});