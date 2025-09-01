// File: frontend/src/services/api.ts
// Extension: .ts (TypeScript Service)

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';

// API Response interfaces
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: Record<string, string[]>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// Configuration
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private retryCount = 0;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request timestamp for caching
        config.metadata = { requestStartedAt: Date.now() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response time in development
        if (process.env.NODE_ENV === 'development') {
          const responseTime = Date.now() - response.config.metadata.requestStartedAt;
          console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${responseTime}ms`);
        }

        this.retryCount = 0;
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const newToken = await this.refreshAuthToken(refreshToken);
              this.setAuthToken(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
          }
        }

        // Handle network errors with retry
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          if (this.retryCount < API_CONFIG.retryAttempts) {
            this.retryCount++;
            await this.delay(API_CONFIG.retryDelay * this.retryCount);
            return this.client(originalRequest);
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: any): void {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
      code: error.response?.data?.code || error.code
    };

    if (error.response?.data) {
      apiError.message = error.response.data.message || apiError.message;
      apiError.errors = error.response.data.errors;
    } else if (error.message) {
      apiError.message = error.message;
    }

    // Show error toast for client errors (4xx) but not auth errors
    if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 401) {
      toast.error(apiError.message);
    }

    // Show error toast for server errors (5xx)
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', apiError);
    }
  }

  private handleAuthError(): void {
    this.clearAuth();
    toast.error('Session expired. Please sign in again.');
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }

  private async refreshAuthToken(refreshToken: string): Promise<string> {
    const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh`, {
      refreshToken
    });
    return response.data.token;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Auth methods
  setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  getAuthToken(): string | null {
    if (this.authToken) return this.authToken;
    
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    
    return this.authToken;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  clearAuth(): void {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('authToken');
    }
  }

  // Generic API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload method
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();

// Auth service
export const authService = {
  async login(credentials: { email: string; password: string; rememberMe?: boolean }) {
    return apiService.post('/auth/login', credentials);
  },

  async register(userData: { username: string; email: string; password: string }) {
    return apiService.post('/auth/register', userData);
  },

  async logout() {
    const response = await apiService.post('/auth/logout');
    apiService.clearAuth();
    return response;
  },

  async forgotPassword(data: { email: string }) {
    return apiService.post('/auth/forgot-password', data);
  },

  async resetPassword(data: { token: string; password: string }) {
    return apiService.post('/auth/reset-password', data);
  },

  async verifyEmail(token: string) {
    return apiService.post('/auth/verify-email', { token });
  },

  async resendVerification(email: string) {
    return apiService.post('/auth/resend-verification', { email });
  },

  async refreshToken(refreshToken: string) {
    return apiService.post('/auth/refresh', { refreshToken });
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return apiService.post('/auth/change-password', data);
  }
};

// User service
export const userService = {
  async getProfile() {
    return apiService.get('/users/profile');
  },

  async updateProfile(data: any) {
    return apiService.patch('/users/profile', data);
  },

  async uploadAvatar(file: File, onProgress?: (progress: number) => void) {
    return apiService.upload('/users/avatar', file, onProgress);
  },

  async getUsers(params?: any) {
    return apiService.get('/users', { params });
  },

  async getUser(userId: string) {
    return apiService.get(`/users/${userId}`);
  },

  async deleteAccount(password: string) {
    return apiService.delete('/users/account', { data: { password } });
  },

  async getStats() {
    return apiService.get('/users/stats');
  },

  async getLeaderboard(type: string = 'points', limit: number = 10) {
    return apiService.get('/users/leaderboard', { params: { type, limit } });
  }
};

// Course service
export const courseService = {
  async getAllCourses(params?: any) {
    return apiService.get('/courses', { params });
  },

  async getCourse(courseId: string) {
    return apiService.get(`/courses/${courseId}`);
  },

  async getCourseLessons(courseId: string) {
    return apiService.get(`/courses/${courseId}/lessons`);
  },

  async getLesson(courseId: string, lessonId: string) {
    return apiService.get(`/courses/${courseId}/lessons/${lessonId}`);
  },

  async getLessonContent(courseId: string, lessonId: string) {
    return apiService.get(`/courses/${courseId}/lessons/${lessonId}/content`);
  },

  async getLessonQuiz(courseId: string, lessonId: string) {
    return apiService.get(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  },

  async enrollInCourse(courseId: string) {
    return apiService.post(`/courses/${courseId}/enroll`);
  },

  async getUserProgress() {
    return apiService.get('/courses/progress');
  },

  async getUserCourseProgress(courseId: string) {
    return apiService.get(`/courses/${courseId}/progress`);
  },

  async markLessonComplete(courseId: string, lessonId: string) {
    return apiService.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
  },

  async saveLessonCode(courseId: string, lessonId: string, code: string) {
    return apiService.post(`/courses/${courseId}/lessons/${lessonId}/code`, { code });
  },

  async getUserLessonCode(courseId: string, lessonId: string) {
    return apiService.get(`/courses/${courseId}/lessons/${lessonId}/code`);
  },

  async executeCode(data: { code: string; language: string; input?: string }) {
    return apiService.post('/code/execute', data);
  },

  async getCoursePrerequisites(courseId: string) {
    return apiService.get(`/courses/${courseId}/prerequisites`);
  },

  async submitQuiz(courseId: string, lessonId: string, answers: any[]) {
    return apiService.post(`/courses/${courseId}/lessons/${lessonId}/quiz/submit`, { answers });
  }
};

// Code service
export const codeService = {
  async executeCode(data: { code: string; language: string; input?: string }) {
    return apiService.post('/code/execute', data);
  },

  async saveSnippet(data: { title: string; code: string; language: string; description?: string; isPublic?: boolean }) {
    return apiService.post('/code/snippets', data);
  },

  async getSnippets(params?: any) {
    return apiService.get('/code/snippets', { params });
  },

  async getUserSnippets() {
    return apiService.get('/code/snippets/mine');
  },

  async getSnippet(snippetId: string) {
    return apiService.get(`/code/snippets/${snippetId}`);
  },

  async updateSnippet(snippetId: string, data: any) {
    return apiService.patch(`/code/snippets/${snippetId}`, data);
  },

  async deleteSnippet(snippetId: string) {
    return apiService.delete(`/code/snippets/${snippetId}`);
  },

  async getRecentSnippets() {
    return apiService.get('/code/snippets/recent');
  },

  async getPopularSnippets() {
    return apiService.get('/code/snippets/popular');
  },

  async shareCode(data: { code: string; language: string }) {
    return apiService.post('/code/share', data);
  },

  async getSharedCode(shareId: string) {
    return apiService.get(`/code/shared/${shareId}`);
  },

  async likeSnippet(snippetId: string) {
    return apiService.post(`/code/snippets/${snippetId}/like`);
  },

  async unlikeSnippet(snippetId: string) {
    return apiService.delete(`/code/snippets/${snippetId}/like`);
  }
};

// Community service
export const communityService = {
  async getPosts(params?: any) {
    return apiService.get('/community/posts', { params });
  },

  async getPost(postId: string) {
    return apiService.get(`/community/posts/${postId}`);
  },

  async createPost(data: { title: string; content: string; category: string; tags?: string[] }) {
    return apiService.post('/community/posts', data);
  },

  async updatePost(postId: string, data: any) {
    return apiService.patch(`/community/posts/${postId}`, data);
  },

  async deletePost(postId: string) {
    return apiService.delete(`/community/posts/${postId}`);
  },

  async likePost(postId: string) {
    return apiService.post(`/community/posts/${postId}/like`);
  },

  async unlikePost(postId: string) {
    return apiService.delete(`/community/posts/${postId}/like`);
  },

  async getComments(postId: string) {
    return apiService.get(`/community/posts/${postId}/comments`);
  },

  async createComment(postId: string, content: string, parentId?: string) {
    return apiService.post(`/community/posts/${postId}/comments`, { content, parentId });
  },

  async updateComment(postId: string, commentId: string, content: string) {
    return apiService.patch(`/community/posts/${postId}/comments/${commentId}`, { content });
  },

  async deleteComment(postId: string, commentId: string) {
    return apiService.delete(`/community/posts/${postId}/comments/${commentId}`);
  },

  async getTrendingPosts() {
    return apiService.get('/community/posts/trending');
  },

  async getLeaderboard() {
    return apiService.get('/community/leaderboard');
  },

  async followUser(userId: string) {
    return apiService.post(`/community/users/${userId}/follow`);
  },

  async unfollowUser(userId: string) {
    return apiService.delete(`/community/users/${userId}/follow`);
  },

  async reportPost(postId: string, reason: string) {
    return apiService.post(`/community/posts/${postId}/report`, { reason });
  }
};

// Collaboration service
export const collaborationService = {
  async createSession(data: { title: string; code: string; language: string; isPublic?: boolean }) {
    return apiService.post('/collaboration/sessions', data);
  },

  async getSession(sessionId: string) {
    return apiService.get(`/collaboration/sessions/${sessionId}`);
  },

  async getSessions(params?: any) {
    return apiService.get('/collaboration/sessions', { params });
  },

  async updateSession(sessionId: string, data: any) {
    return apiService.patch(`/collaboration/sessions/${sessionId}`, data);
  },

  async deleteSession(sessionId: string) {
    return apiService.delete(`/collaboration/sessions/${sessionId}`);
  },

  async joinSession(sessionId: string) {
    return apiService.post(`/collaboration/sessions/${sessionId}/join`);
  },

  async leaveSession(sessionId: string) {
    return apiService.post(`/collaboration/sessions/${sessionId}/leave`);
  },

  async inviteUser(sessionId: string, email: string) {
    return apiService.post(`/collaboration/sessions/${sessionId}/invite`, { email });
  },

  async kickUser(sessionId: string, userId: string) {
    return apiService.post(`/collaboration/sessions/${sessionId}/kick`, { userId });
  }
};

// Analytics service
export const analyticsService = {
  async trackEvent(event: string, properties?: Record<string, any>) {
    return apiService.post('/analytics/events', { event, properties });
  },

  async getAnalytics(params?: any) {
    return apiService.get('/analytics', { params });
  },

  async getDashboardStats() {
    return apiService.get('/analytics/dashboard');
  },

  async getLearningProgress() {
    return apiService.get('/analytics/learning-progress');
  },

  async getCodeMetrics() {
    return apiService.get('/analytics/code-metrics');
  }
};

// Notification service
export const notificationService = {
  async getNotifications(params?: any) {
    return apiService.get('/notifications', { params });
  },

  async markAsRead(notificationId: string) {
    return apiService.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead() {
    return apiService.patch('/notifications/read-all');
  },

  async deleteNotification(notificationId: string) {
    return apiService.delete(`/notifications/${notificationId}`);
  },

  async getUnreadCount() {
    return apiService.get('/notifications/unread-count');
  },

  async updatePreferences(preferences: any) {
    return apiService.patch('/notifications/preferences', preferences);
  }
};

// Search service
export const searchService = {
  async search(query: string, filters?: any) {
    return apiService.get('/search', { params: { q: query, ...filters } });
  },

  async searchCourses(query: string, filters?: any) {
    return apiService.get('/search/courses', { params: { q: query, ...filters } });
  },

  async searchPosts(query: string, filters?: any) {
    return apiService.get('/search/posts', { params: { q: query, ...filters } });
  },

  async searchUsers(query: string, filters?: any) {
    return apiService.get('/search/users', { params: { q: query, ...filters } });
  },

  async searchCode(query: string, filters?: any) {
    return apiService.get('/search/code', { params: { q: query, ...filters } });
  },

  async getSearchSuggestions(query: string) {
    return apiService.get('/search/suggestions', { params: { q: query } });
  }
};

// Admin service
export const adminService = {
  async getStats() {
    return apiService.get('/admin/stats');
  },

  async getUsers(params?: any) {
    return apiService.get('/admin/users', { params });
  },

  async updateUser(userId: string, data: any) {
    return apiService.patch(`/admin/users/${userId}`, data);
  },

  async banUser(userId: string, reason: string) {
    return apiService.post(`/admin/users/${userId}/ban`, { reason });
  },

  async unbanUser(userId: string) {
    return apiService.post(`/admin/users/${userId}/unban`);
  },

  async getCourses(params?: any) {
    return apiService.get('/admin/courses', { params });
  },

  async createCourse(data: any) {
    return apiService.post('/admin/courses', data);
  },

  async updateCourse(courseId: string, data: any) {
    return apiService.patch(`/admin/courses/${courseId}`, data);
  },

  async deleteCourse(courseId: string) {
    return apiService.delete(`/admin/courses/${courseId}`);
  },

  async getReports(params?: any) {
    return apiService.get('/admin/reports', { params });
  },

  async resolveReport(reportId: string, action: string) {
    return apiService.post(`/admin/reports/${reportId}/resolve`, { action });
  },

  async getSystemLogs(params?: any) {
    return apiService.get('/admin/logs', { params });
  }
};

// Health service
export const healthService = {
  async checkHealth() {
    return apiService.get('/health');
  },

  async checkDatabase() {
    return apiService.get('/health/database');
  },

  async checkRedis() {
    return apiService.get('/health/redis');
  },

  async getMetrics() {
    return apiService.get('/health/metrics');
  }
};

// Utility functions
export const apiUtils = {
  // Build query string from object
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    return searchParams.toString();
  },

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate file type
  isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  },

  // Validate file size
  isValidFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  },

  // Download file from blob
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

// Initialize auth token on service creation
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    apiService.setAuthToken(token);
  }
}

// Export the main service instance and individual services
export { apiService };
export default apiService;