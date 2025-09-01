// File: frontend/src/services/auth.ts
// Extension: .ts (TypeScript Service)

import { apiService } from './api';
import { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface PasswordResetData {
  token: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'userData';
  
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    // Initialize user from storage on service creation
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const userData = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
      const token = localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
      
      if (userData && token) {
        this.currentUser = JSON.parse(userData);
        apiService.setAuthToken(token);
        this.notifyAuthListeners();
      }
    } catch (error) {
      console.error('Error initializing auth from storage:', error);
      this.clearAuthData();
    }
  }

  private storeAuthData(authResponse: AuthResponse, rememberMe: boolean = false): void {
    if (typeof window === 'undefined') return;

    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(this.TOKEN_KEY, authResponse.token);
    storage.setItem(this.USER_KEY, JSON.stringify(authResponse.user));
    
    if (authResponse.refreshToken) {
      storage.setItem(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
    }

    // Set token in API service
    apiService.setAuthToken(authResponse.token);
    
    // Update current user
    this.currentUser = authResponse.user;
    this.notifyAuthListeners();
  }

  private clearAuthData(): void {
    if (typeof window === 'undefined') return;

    // Clear from both storage types
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);

    // Clear from API service
    apiService.clearAuth();
    
    // Update current user
    this.currentUser = null;
    this.notifyAuthListeners();
  }

  private notifyAuthListeners(): void {
    this.authListeners.forEach(listener => listener(this.currentUser));
  }

  // Public methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', credentials);
      
      if (response.success && response.data) {
        this.storeAuthData(response.data, credentials.rememberMe);
        return response.data;
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/register', userData);
      
      if (response.success && response.data) {
        this.storeAuthData(response.data, false); // Don't remember on register
        return response.data;
      }
      
      throw new Error(response.message || 'Registration failed');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server call fails
    } finally {
      this.clearAuthData();
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await apiService.post('/auth/forgot-password', { email });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to send reset email');
    }
  }

  async resetPassword(data: PasswordResetData): Promise<void> {
    try {
      const response = await apiService.post('/auth/reset-password', data);
      
      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      const response = await apiService.post('/auth/change-password', data);
      
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || 'Password change failed');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await apiService.post('/auth/verify-email', { token });
      
      if (response.success && response.data) {
        // Update user data if verification changes user status
        this.currentUser = { ...this.currentUser!, ...response.data };
        this.updateStoredUser();
      }
      
      if (!response.success) {
        throw new Error(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const response = await apiService.post('/auth/resend-verification', { email });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      throw new Error(error.response?.data?.message || 'Failed to resend verification email');
    }
  }

  async refreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await apiService.post<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken
      });

      if (response.success && response.data) {
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Update stored tokens
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, newRefreshToken);
        
        // Update API service
        apiService.setAuthToken(token);
        
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuthData();
      return null;
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await apiService.patch<User>('/users/profile', userData);
      
      if (response.success && response.data) {
        // Update current user
        this.currentUser = { ...this.currentUser!, ...response.data };
        this.updateStoredUser();
        this.notifyAuthListeners();
        return this.currentUser;
      }
      
      throw new Error(response.message || 'Profile update failed');
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  }

  private updateStoredUser(): void {
    if (typeof window === 'undefined' || !this.currentUser) return;

    const userData = JSON.stringify(this.currentUser);
    
    // Update in the same storage type that was used
    if (localStorage.getItem(this.USER_KEY)) {
      localStorage.setItem(this.USER_KEY, userData);
    } else if (sessionStorage.getItem(this.USER_KEY)) {
      sessionStorage.setItem(this.USER_KEY, userData);
    }
  }

  // Getters
  get user(): User | null {
    return this.currentUser;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null && this.getToken() !== null;
  }

  get isEmailVerified(): boolean {
    return this.currentUser?.isEmailVerified ?? false;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Auth state management
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  // Utility methods
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isInstructor(): boolean {
    return this.hasAnyRole(['INSTRUCTOR', 'ADMIN']);
  }

  isModerator(): boolean {
    return this.hasAnyRole(['MODERATOR', 'ADMIN']);
  }

  // Check if user can access a resource
  canAccess(requiredRole?: string, resourceOwnerId?: string): boolean {
    if (!this.isAuthenticated) return false;
    
    // If no role required, just need to be authenticated
    if (!requiredRole) return true;
    
    // Check if user has the required role
    if (!this.hasRole(requiredRole) && !this.isAdmin()) {
      // Check if user owns the resource
      if (resourceOwnerId && this.currentUser?.id === resourceOwnerId) {
        return true;
      }
      return false;
    }
    
    return true;
  }

  // Token expiration check
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Decode JWT to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Auto-refresh token
  async ensureValidToken(): Promise<string | null> {
    const token = this.getToken();
    
    if (!token) return null;
    
    if (this.isTokenExpired()) {
      return await this.refreshToken();
    }
    
    return token;
  }

  // Social auth methods
  async initiateSocialAuth(provider: 'google' | 'github'): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const authUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/${provider}`;
    const returnUrl = window.location.href;
    
    // Store return URL for redirect after auth
    sessionStorage.setItem('authReturnUrl', returnUrl);
    
    // Redirect to social auth
    window.location.href = `${authUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  async handleSocialAuthCallback(token: string, user: User): Promise<void> {
    const authResponse: AuthResponse = {
      user,
      token,
      expiresIn: 3600 // 1 hour default
    };
    
    this.storeAuthData(authResponse, true); // Remember social auth
    
    // Clear return URL
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('authReturnUrl');
    }
  }

  getSocialAuthReturnUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('authReturnUrl');
  }
}

// Create and export singleton instance
export const authService = new AuthService();
export default authService;