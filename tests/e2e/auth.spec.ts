// File: tests/e2e/auth.spec.ts
// Extension: .ts
// Location: tests/e2e/auth.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      // Navigate to registration page
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*\/auth\/register/);

      // Fill registration form
      await page.fill('[data-testid="username-input"]', 'testuser123');
      await page.fill('[data-testid="email-input"]', 'testuser123@example.com');
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');

      // Submit form
      await page.click('[data-testid="register-button"]');

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Should show welcome message
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should show validation errors for invalid input', async () => {
      await page.click('text=Sign Up');
      
      // Try to submit empty form
      await page.click('[data-testid="register-button"]');

      // Should show validation errors
      await expect(page.locator('text=Username is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should show error for weak password', async () => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should show error for mismatched passwords', async () => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should handle registration with existing email', async () => {
      await page.click('text=Sign Up');
      
      // Fill form with existing email
      await page.fill('[data-testid="username-input"]', 'anotheruser');
      await page.fill('[data-testid="email-input"]', 'existing@example.com');
      await page.fill('[data-testid="first-name-input"]', 'Another');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');

      await page.click('[data-testid="register-button"]');

      await expect(page.locator('text=Email already registered')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async () => {
      // Navigate to login page
      await page.click('text=Sign In');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      // Fill login form
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Should show user info in header
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async () => {
      await page.click('text=Sign In');
      
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');

      await page.click('[data-testid="login-button"]');

      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });

    test('should show validation errors for empty fields', async () => {
      await page.click('text=Sign In');
      
      await page.click('[data-testid="login-button"]');

      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should handle rate limiting for multiple failed attempts', async () => {
      await page.click('text=Sign In');
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', 'testuser@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');
        
        if (i < 5) {
          await expect(page.locator('text=Invalid credentials')).toBeVisible();
        }
      }

      // Should show rate limit error
      await expect(page.locator('text=Too many login attempts')).toBeVisible();
    });

    test('should remember login with "Remember Me" checkbox', async () => {
      await page.click('text=Sign In');
      
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.check('[data-testid="remember-me-checkbox"]');

      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL(/.*\/dashboard/);

      // Close and reopen browser to test persistence
      await page.close();
      page = await page.context().newPage();
      await page.goto('/');

      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async () => {
      await page.click('text=Sign In');
      await page.click('text=Forgot Password?');
      
      await expect(page).toHaveURL(/.*\/auth\/forgot-password/);

      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.click('[data-testid="reset-button"]');

      await expect(page.locator('text=Password reset email sent')).toBeVisible();
    });

    test('should reset password with valid token', async () => {
      // Navigate directly to reset page with token (simulating email link)
      await page.goto('/auth/reset-password?token=valid-reset-token');

      await page.fill('[data-testid="password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewPassword123!');

      await page.click('[data-testid="reset-password-button"]');

      await expect(page.locator('text=Password reset successful')).toBeVisible();
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });

    test('should show error for invalid reset token', async () => {
      await page.goto('/auth/reset-password?token=invalid-token');

      await page.fill('[data-testid="password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewPassword123!');

      await page.click('[data-testid="reset-password-button"]');

      await expect(page.locator('text=Invalid or expired reset token')).toBeVisible();
    });

    test('should validate password requirements during reset', async () => {
      await page.goto('/auth/reset-password?token=valid-reset-token');

      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');

      await page.click('[data-testid="reset-password-button"]');

      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });
  });

  test.describe('Email Verification', () => {
    test('should verify email with valid token', async () => {
      await page.goto('/auth/verify-email?token=valid-verification-token');

      await expect(page.locator('text=Email verified successfully')).toBeVisible();
      await expect(page.locator('text=Continue to Dashboard')).toBeVisible();

      await page.click('text=Continue to Dashboard');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should show error for invalid verification token', async () => {
      await page.goto('/auth/verify-email?token=invalid-token');

      await expect(page.locator('text=Invalid verification token')).toBeVisible();
    });

    test('should resend verification email', async () => {
      // First register a user (which would need verification)
      await page.click('text=Sign Up');
      await page.fill('[data-testid="username-input"]', 'unverifieduser');
      await page.fill('[data-testid="email-input"]', 'unverified@example.com');
      await page.fill('[data-testid="first-name-input"]', 'Unverified');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
      await page.click('[data-testid="register-button"]');

      // Should show verification notice
      await expect(page.locator('text=Please verify your email')).toBeVisible();

      // Click resend verification
      await page.click('[data-testid="resend-verification-button"]');

      await expect(page.locator('text=Verification email sent')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async () => {
      // First login
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL(/.*\/dashboard/);

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to home page
      await expect(page).toHaveURL('/');
      
      // Should not show user menu
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
      
      // Should show login/signup buttons
      await expect(page.locator('text=Sign In')).toBeVisible();
      await expect(page.locator('text=Sign Up')).toBeVisible();
    });

    test('should logout from all devices', async () => {
      // Login
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Go to account settings
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Account Settings');

      // Logout from all devices
      await page.click('[data-testid="logout-all-devices-button"]');

      // Confirm action
      await page.click('[data-testid="confirm-logout-all-button"]');

      // Should be logged out and redirected
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Logged out from all devices')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle expired session gracefully', async () => {
      // Login
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Simulate token expiration by clearing localStorage
      await page.evaluate(() => localStorage.removeItem('token'));

      // Try to access a protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await expect(page.locator('text=Session expired')).toBeVisible();
    });

    test('should auto-refresh token before expiration', async () => {
      // Login
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Wait on dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Wait for token refresh (if implemented with short expiry for testing)
      await page.waitForTimeout(5000);

      // Should still be authenticated
      await page.reload();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async () => {
      // Try to access protected route directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });

    test('should allow access to protected routes when authenticated', async () => {
      // Login first
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Should be able to access protected routes
      await page.goto('/code');
      await expect(page).toHaveURL(/.*\/code/);

      await page.goto('/learn');
      await expect(page).toHaveURL(/.*\/learn/);

      await page.goto('/community');
      await expect(page).toHaveURL(/.*\/community/);
    });

    test('should preserve intended route after login', async () => {
      // Try to access protected route
      await page.goto('/code/snippets');

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/.*\/auth\/login.*returnUrl=/);

      // Login
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Should redirect to originally intended route
      await expect(page).toHaveURL(/.*\/code\/snippets/);
    });
  });

  test.describe('Account Security', () => {
    test('should change password successfully', async () => {
      // Login and go to account settings
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      await page.click('[data-testid="user-menu"]');
      await page.click('text=Account Settings');
      await page.click('text=Change Password');

      // Fill password change form
      await page.fill('[data-testid="current-password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password-input"]', 'NewPassword123!');

      await page.click('[data-testid="change-password-button"]');

      await expect(page.locator('text=Password changed successfully')).toBeVisible();
    });

    test('should require correct current password for change', async () => {
      // Login and go to password change
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      await page.click('[data-testid="user-menu"]');
      await page.click('text=Account Settings');
      await page.click('text=Change Password');

      // Enter wrong current password
      await page.fill('[data-testid="current-password-input"]', 'WrongPassword123!');
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password-input"]', 'NewPassword123!');

      await page.click('[data-testid="change-password-button"]');

      await expect(page.locator('text=Current password is incorrect')).toBeVisible();
    });
  });
});