// File: frontend/tests/hooks/useAuth.test.ts
// Extension: .ts
// Location: frontend/tests/hooks/useAuth.test.ts

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import { api } from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with no user when no token in localStorage', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should initialize with loading state when token exists', () => {
    localStorageMock.getItem.mockReturnValue('mock-token');
    mockApi.get.mockResolvedValueOnce({
      data: {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      }
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    const mockLoginResponse = {
      data: {
        user: mockUser,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      }
    };

    mockApi.post.mockResolvedValueOnce(mockLoginResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
  });

  it('should handle login failure', async () => {
    const mockError = new Error('Invalid credentials');
    mockApi.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should register successfully', async () => {
    const mockUser = {
      id: '1',
      username: 'newuser',
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User'
    };

    const mockRegisterResponse = {
      data: {
        user: mockUser,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      }
    };

    mockApi.post.mockResolvedValueOnce(mockRegisterResponse);

    const { result } = renderHook(() => useAuth());

    const userData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User'
    };

    await act(async () => {
      await result.current.register(userData);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', userData);
  });

  it('should logout successfully', async () => {
    // First login
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com'
    };

    localStorageMock.getItem.mockReturnValue('mock-token');
    mockApi.get.mockResolvedValueOnce({ data: { user: mockUser } });
    mockApi.post.mockResolvedValueOnce({ data: { message: 'Logout successful' } });

    const { result } = renderHook(() => useAuth());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should update user profile', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    const updatedUser = {
      ...mockUser,
      firstName: 'Updated',
      bio: 'Updated bio'
    };

    // Setup initial authenticated state
    localStorageMock.getItem.mockReturnValue('mock-token');
    mockApi.get.mockResolvedValueOnce({ data: { user: mockUser } });
    mockApi.patch.mockResolvedValueOnce({ data: { user: updatedUser } });

    const { result } = renderHook(() => useAuth());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Update profile
    await act(async () => {
      await result.current.updateProfile({
        firstName: 'Updated',
        bio: 'Updated bio'
      });
    });

    expect(result.current.user).toEqual(updatedUser);
    expect(mockApi.patch).toHaveBeenCalledWith('/users/me', {
      firstName: 'Updated',
      bio: 'Updated bio'
    });
  });

  it('should change password', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com'
    };

    // Setup initial authenticated state
    localStorageMock.getItem.mockReturnValue('mock-token');
    mockApi.get.mockResolvedValueOnce({ data: { user: mockUser } });
    mockApi.post.mockResolvedValueOnce({ data: { message: 'Password changed successfully' } });

    const { result } = renderHook(() => useAuth());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Change password
    await act(async () => {
      await result.current.changePassword('oldPassword', 'newPassword');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/users/me/change-password', {
      currentPassword: 'oldPassword',
      newPassword: 'newPassword',
      confirmPassword: 'newPassword'
    });
  });

  it('should handle forgot password', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Password reset email sent' }
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.forgotPassword('test@example.com');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'test@example.com'
    });
  });

  it('should handle reset password', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Password reset successful' }
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.resetPassword('reset-token', 'newPassword');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-token',
      password: 'newPassword',
      confirmPassword: 'newPassword'
    });
  });

  it('should handle token refresh', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com'
    };

    localStorageMock.getItem
      .mockReturnValueOnce('mock-token')
      .mockReturnValueOnce('mock-refresh-token');

    // Mock initial load failure (expired token)
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    
    // Mock successful token refresh
    mockApi.post.mockResolvedValueOnce({
      data: {
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      }
    });

    // Mock user fetch after refresh
    mockApi.get.mockResolvedValueOnce({ data: { user: mockUser } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'mock-refresh-token'
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
  });

  it('should handle token refresh failure', async () => {
    localStorageMock.getItem
      .mockReturnValueOnce('mock-token')
      .mockReturnValueOnce('mock-refresh-token');

    // Mock initial load failure (expired token)
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    
    // Mock failed token refresh
    mockApi.post.mockRejectedValueOnce({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should verify email', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { message: 'Email verified successfully' }
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.verifyEmail('verification-token');
    });

    expect(mockApi.get).toHaveBeenCalledWith('/auth/verify-email/verification-token');
  });

  it('should resend verification email', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Verification email sent' }
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.resendVerification('test@example.com');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'test@example.com'
    });
  });

  it('should check authentication status', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com'
    };

    localStorageMock.getItem.mockReturnValue('mock-token');
    mockApi.get.mockResolvedValueOnce({ data: { user: mockUser } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockError = {
      response: {
        status: 500,
        data: { message: 'Internal server error' }
      }
    };

    mockApi.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'password123');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should clear errors when performing new actions', async () => {
    // First, create an error state
    const mockError = new Error('Login failed');
    mockApi.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.error).toBe(mockError);

    // Now perform a successful action
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Password reset email sent' }
    });

    await act(async () => {
      await result.current.forgotPassword('test@example.com');
    });

    expect(result.current.error).toBeNull();
  });
});