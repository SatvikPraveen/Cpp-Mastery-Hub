// File: tests/integration/auth.test.ts
// Extension: .ts
// Location: tests/integration/auth.test.ts

/**
 * C++ Mastery Hub - Authentication Integration Tests
 * Comprehensive tests for user authentication flows
 */

import { test, expect } from './setup';
import { AuthHelpers, PageHelpers } from './setup';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page, testData }) => {
      const authHelpers = new AuthHelpers(page);
      const pageHelpers = new PageHelpers(page);

      const userData = {
        email: testData.generateUniqueEmail(),
        username: testData.generateUniqueUsername(),
        firstName: 'John',
        lastName: 'Doe',
        experienceLevel: 'beginner'
      };

      await page.goto('/register');

      // Fill registration form
      await pageHelpers.fillFormField('[data-testid="email-input"]', userData.email);
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="username-input"]', userData.username);
      await pageHelpers.fillFormField('[data-testid="first-name-input"]', userData.firstName);
      await pageHelpers.fillFormField('[data-testid="last-name-input"]', userData.lastName);
      
      await page.selectOption('[data-testid="experience-level-select"]', userData.experienceLevel);
      await page.check('[data-testid="terms-checkbox"]');

      // Submit registration
      await pageHelpers.clickButton('[data-testid="register-button"]');

      // Verify success
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
      await pageHelpers.expectSuccessMessage('Registration successful! Please check your email to verify your account.');
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/register');

      // Try to submit with invalid email
      await pageHelpers.fillFormField('[data-testid="email-input"]', 'invalid-email');
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'weak');
      await pageHelpers.clickButton('[data-testid="register-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
    });

    test('should prevent registration with existing email', async ({ page, testData }) => {
      const pageHelpers = new PageHelpers(page);
      const existingUser = testData.getUser('student');

      await page.goto('/register');

      // Try to register with existing email
      await pageHelpers.fillFormField('[data-testid="email-input"]', existingUser.email);
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="username-input"]', testData.generateUniqueUsername());
      await pageHelpers.fillFormField('[data-testid="first-name-input"]', 'John');
      await pageHelpers.fillFormField('[data-testid="last-name-input"]', 'Doe');
      
      await page.selectOption('[data-testid="experience-level-select"]', 'beginner');
      await page.check('[data-testid="terms-checkbox"]');
      await pageHelpers.clickButton('[data-testid="register-button"]');

      // Verify error message
      await pageHelpers.expectErrorMessage('An account with this email already exists');
    });

    test('should require terms and conditions acceptance', async ({ page, testData }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/register');

      // Fill form but don't check terms
      await pageHelpers.fillFormField('[data-testid="email-input"]', testData.generateUniqueEmail());
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'Test123!@#');
      await pageHelpers.fillFormField('[data-testid="username-input"]', testData.generateUniqueUsername());
      await pageHelpers.fillFormField('[data-testid="first-name-input"]', 'John');
      await pageHelpers.fillFormField('[data-testid="last-name-input"]', 'Doe');
      
      await page.selectOption('[data-testid="experience-level-select"]', 'beginner');
      await pageHelpers.clickButton('[data-testid="register-button"]');

      // Verify terms error
      await expect(page.locator('[data-testid="terms-error"]')).toContainText('You must accept the terms and conditions');
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page, testData }) => {
      const authHelpers = new AuthHelpers(page);
      const student = testData.getUser('student');

      await page.goto('/login');

      // Login
      await authHelpers.login('student');

      // Verify successful login
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(`Welcome back, ${student.firstName}!`);
    });

    test('should reject invalid credentials', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/login');

      // Try invalid credentials
      await pageHelpers.fillFormField('[data-testid="email-input"]', 'invalid@email.com');
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'wrongpassword');
      await pageHelpers.clickButton('[data-testid="login-button"]');

      // Verify error
      await pageHelpers.expectErrorMessage('Invalid email or password');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should handle account not verified', async ({ page, apiContext }) => {
      const pageHelpers = new PageHelpers(page);

      // Mock unverified account response
      await pageHelpers.mockAPIResponse('/auth/login', {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before logging in'
        }
      });

      await page.goto('/login');

      await pageHelpers.fillFormField('[data-testid="email-input"]', 'unverified@test.com');
      await pageHelpers.fillFormField('[data-testid="password-input"]', 'Test123!@#');
      await pageHelpers.clickButton('[data-testid="login-button"]');

      // Verify verification prompt
      await expect(page.locator('[data-testid="verification-prompt"]')).toBeVisible();
      await expect(page.locator('[data-testid="resend-verification-button"]')).toBeVisible();
    });

    test('should remember user when "Remember Me" is checked', async ({ page, testData }) => {
      const student = testData.getUser('student');
      const pageHelpers = new PageHelpers(page);

      await page.goto('/login');

      await pageHelpers.fillFormField('[data-testid="email-input"]', student.email);
      await pageHelpers.fillFormField('[data-testid="password-input"]', student.password);
      await page.check('[data-testid="remember-me-checkbox"]');
      await pageHelpers.clickButton('[data-testid="login-button"]');

      // Verify login and check for remember me cookie
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Close browser and create new context to simulate browser restart
      await page.context().close();
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();

      // Should still be logged in due to remember me
      await newPage.goto('/dashboard');
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
      
      await newContext.close();
    });
  });

  test.describe('OAuth Authentication', () => {
    test('should login with Google OAuth', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/login');

      // Mock OAuth flow
      await pageHelpers.mockAPIResponse('/auth/oauth/google/callback', {
        success: true,
        data: {
          user: {
            id: 'oauth-user-001',
            email: 'oauth@gmail.com',
            firstName: 'OAuth',
            lastName: 'User'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        }
      });

      await pageHelpers.clickButton('[data-testid="google-login-button"]');

      // In a real test, this would handle the OAuth popup
      // For now, we'll simulate the callback
      await page.goto('/auth/oauth/google/callback?code=mock-auth-code');

      // Verify successful OAuth login
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should login with GitHub OAuth', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/login');

      // Mock GitHub OAuth flow
      await pageHelpers.mockAPIResponse('/auth/oauth/github/callback', {
        success: true,
        data: {
          user: {
            id: 'github-user-001',
            email: 'github@example.com',
            username: 'githubuser',
            firstName: 'GitHub',
            lastName: 'User'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        }
      });

      await pageHelpers.clickButton('[data-testid="github-login-button"]');
      await page.goto('/auth/oauth/github/callback?code=mock-auth-code');

      // Verify successful GitHub login
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should send password reset email', async ({ page, testData }) => {
      const pageHelpers = new PageHelpers(page);
      const student = testData.getUser('student');

      await page.goto('/forgot-password');

      await pageHelpers.fillFormField('[data-testid="email-input"]', student.email);
      await pageHelpers.clickButton('[data-testid="send-reset-button"]');

      // Verify success message
      await pageHelpers.expectSuccessMessage('Password reset instructions have been sent to your email');
    });

    test('should reset password with valid token', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      // Simulate clicking reset link from email
      await page.goto('/reset-password?token=valid-reset-token');

      await pageHelpers.fillFormField('[data-testid="new-password-input"]', 'NewPassword123!');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await pageHelpers.clickButton('[data-testid="reset-password-button"]');

      // Verify success and redirect to login
      await pageHelpers.expectSuccessMessage('Password reset successfully');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should reject invalid reset token', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await pageHelpers.mockAPIResponse('/auth/reset-password', {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        }
      });

      await page.goto('/reset-password?token=invalid-token');

      await pageHelpers.fillFormField('[data-testid="new-password-input"]', 'NewPassword123!');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await pageHelpers.clickButton('[data-testid="reset-password-button"]');

      // Verify error message
      await pageHelpers.expectErrorMessage('Invalid or expired reset token');
    });
  });

  test.describe('Email Verification', () => {
    test('should verify email with valid token', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/verify-email?token=valid-verification-token');

      // Verify success message and redirect
      await pageHelpers.expectSuccessMessage('Email verified successfully');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should handle expired verification token', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await pageHelpers.mockAPIResponse('/auth/verify-email', {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Verification token has expired'
        }
      });

      await page.goto('/verify-email?token=expired-token');

      // Verify error and resend option
      await pageHelpers.expectErrorMessage('Verification token has expired');
      await expect(page.locator('[data-testid="resend-verification-button"]')).toBeVisible();
    });

    test('should resend verification email', async ({ page, testData }) => {
      const pageHelpers = new PageHelpers(page);
      const student = testData.getUser('student');

      await page.goto('/resend-verification');

      await pageHelpers.fillFormField('[data-testid="email-input"]', student.email);
      await pageHelpers.clickButton('[data-testid="resend-button"]');

      // Verify success message
      await pageHelpers.expectSuccessMessage('Verification email sent successfully');
    });
  });

  test.describe('Session Management', () => {
    test('should logout successfully', async ({ authenticatedPage }) => {
      const authHelpers = new AuthHelpers(authenticatedPage);

      // User should be logged in
      await expect(authenticatedPage.locator('[data-testid="user-menu"]')).toBeVisible();

      // Logout
      await authHelpers.logout();

      // Verify logout
      await expect(authenticatedPage).toHaveURL(/.*\/login/);
      await expect(authenticatedPage.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should handle expired session', async ({ page, testData }) => {
      const pageHelpers = new PageHelpers(page);

      // Mock expired token response
      await pageHelpers.mockAPIResponse('/auth/refresh', {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Session expired'
        }
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*\/login/);
      await pageHelpers.expectToastMessage('Your session has expired. Please log in again.');
    });

    test('should refresh token automatically', async ({ authenticatedPage, apiContext }) => {
      // Mock successful token refresh
      await authenticatedPage.route('**/api/auth/refresh', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token'
            }
          })
        });
      });

      // Make a request that triggers token refresh
      await authenticatedPage.goto('/profile');

      // Should still be authenticated
      await expect(authenticatedPage.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(authenticatedPage).toHaveURL(/.*\/profile/);
    });

    test('should handle concurrent login sessions', async ({ page, testData }) => {
      const authHelpers = new AuthHelpers(page);
      const student = testData.getUser('student');

      // Login in first browser context
      await authHelpers.login('student');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Create second browser context
      const secondContext = await page.context().browser()!.newContext();
      const secondPage = await secondContext.newPage();
      const secondAuthHelpers = new AuthHelpers(secondPage);

      // Login in second context with same user
      await secondAuthHelpers.login('student');
      await expect(secondPage.locator('[data-testid="user-menu"]')).toBeVisible();

      // Both sessions should remain active
      await page.reload();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      await secondPage.reload();
      await expect(secondPage.locator('[data-testid="user-menu"]')).toBeVisible();

      await secondContext.close();
    });
  });

  test.describe('Account Security', () => {
    test('should require current password for sensitive changes', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      await authenticatedPage.goto('/profile/security');

      // Try to change password without current password
      await pageHelpers.fillFormField('[data-testid="new-password-input"]', 'NewPassword123!');
      await pageHelpers.fillFormField('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await pageHelpers.clickButton('[data-testid="change-password-button"]');

      // Should require current password
      await expect(authenticatedPage.locator('[data-testid="current-password-error"]')).toContainText('Current password is required');
    });

    test('should show login history', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/profile/security');

      // Verify login history section exists
      await expect(authenticatedPage.locator('[data-testid="login-history"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="login-entry"]').first()).toBeVisible();
    });

    test('should allow account deletion with confirmation', async ({ authenticatedPage }) => {
      const pageHelpers = new PageHelpers(authenticatedPage);

      await authenticatedPage.goto('/profile/security');

      // Click delete account
      await pageHelpers.clickButton('[data-testid="delete-account-button"]');

      // Should show confirmation modal
      await expect(authenticatedPage.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();

      // Type DELETE to confirm
      await pageHelpers.fillFormField('[data-testid="delete-confirmation-input"]', 'DELETE');
      await pageHelpers.clickButton('[data-testid="confirm-delete-button"]');

      // Should redirect to goodbye page
      await expect(authenticatedPage).toHaveURL(/.*\/goodbye/);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should rate limit login attempts', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/login');

      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await pageHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
        await pageHelpers.fillFormField('[data-testid="password-input"]', 'wrongpassword');
        await pageHelpers.clickButton('[data-testid="login-button"]');
        
        if (i < 5) {
          await pageHelpers.expectErrorMessage('Invalid email or password');
        }
      }

      // Should be rate limited after 5 attempts
      await pageHelpers.expectErrorMessage('Too many login attempts. Please try again later.');
      await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
    });

    test('should rate limit password reset requests', async ({ page }) => {
      const pageHelpers = new PageHelpers(page);

      await page.goto('/forgot-password');

      // Simulate multiple reset requests
      for (let i = 0; i < 4; i++) {
        await pageHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
        await pageHelpers.clickButton('[data-testid="send-reset-button"]');
        
        if (i < 3) {
          await pageHelpers.expectSuccessMessage('Password reset instructions have been sent to your email');
        }
      }

      // Should be rate limited after 3 attempts
      await pageHelpers.expectErrorMessage('Too many reset requests. Please wait before trying again.');
    });
  });
});