import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'react-hot-toast';

// Request timing metadata attached by the request interceptor.
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: { requestStartedAt: number };
    _retry?: boolean;
  }
}

/** Query-string parameters forwarded to axios. */
type QueryParams = object;

interface ErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// API Response interfaces
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  errors?: Record<string, string[]>;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// Configuration
const API_CONFIG = {
  // NEXT_PUBLIC_API_URL is the backend origin (e.g. http://localhost:8000); routes live under /api.
  baseURL: `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')}/api`,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
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
        Accept: 'application/json',
      },
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
          const responseTime =
            Date.now() - (response.config.metadata?.requestStartedAt ?? Date.now());
          console.log(
            `API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${responseTime}ms`
          );
        }

        this.retryCount = 0;
        return response;
      },
      async (error: AxiosError<ErrorBody>) => {
        const originalRequest: InternalAxiosRequestConfig | undefined = error.config;
        if (!originalRequest) {
          this.handleApiError(error);
          return Promise.reject(error);
        }

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
          } catch {
            this.handleAuthError();
          }
        }

        // Handle network errors with retry
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
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

  private handleApiError(error: AxiosError<ErrorBody>): void {
    const status = error.response?.status;
    const body = error.response?.data;
    const apiError: ApiError = {
      message: body?.message ?? error.message ?? 'An unexpected error occurred',
    };
    if (status !== undefined) apiError.status = status;
    const code = body?.code ?? error.code;
    if (code !== undefined) apiError.code = code;
    if (body?.errors) apiError.errors = body.errors;

    // Show error toast for client errors (4xx) but not auth errors
    if (status !== undefined && status >= 400 && status < 500 && status !== 401) {
      toast.error(apiError.message);
    }

    // Show error toast for server errors (5xx)
    if (status !== undefined && status >= 500) {
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
    const response = await axios.post<{ token: string }>(`${API_CONFIG.baseURL}/auth/refresh`, {
      refreshToken,
    });
    return response.data.token;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      this.authToken = localStorage.getItem('authToken') ?? sessionStorage.getItem('authToken');
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

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload method
  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();

/*
 * Typed endpoint groups. Every path below exists in the backend (backend/src/app.ts mounts the
 * routers); keep the two in step. Responses use the envelope { success, data, message }.
 */

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Auth (session handling lives in services/auth.ts, which wraps these calls)
export const authService = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
    apiService.post('/auth/login', credentials),
  register: (data: { username: string; email: string; password: string; firstName?: string; lastName?: string }) =>
    apiService.post('/auth/register', data),
  logout: async () => {
    const response = await apiService.post('/auth/logout');
    apiService.clearAuth();
    return response;
  },
  logoutEverywhere: () => apiService.post('/auth/logout-all'),
  forgotPassword: (data: { email: string }) => apiService.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; password: string }) => apiService.post('/auth/reset-password', data),
  verifyEmail: (token: string) => apiService.post('/auth/verify-email', { token }),
  resendVerification: () => apiService.post('/auth/resend-verification'),
  refreshToken: (refreshToken: string) => apiService.post('/auth/refresh', { refreshToken }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiService.post('/auth/change-password', data),
};

// Users
export const userService = {
  getProfile: () => apiService.get('/users/me'),
  updateProfile: (data: Record<string, unknown>) => apiService.patch('/users/me', data),
  getActivity: (limit = 20) => apiService.get('/users/me/activity', { params: { limit } }),
  getSettings: () => apiService.get('/users/me/settings'),
  updatePreferences: (settings: Record<string, unknown>) => apiService.patch('/users/me/settings', settings),
  searchUsers: (q: string, params?: QueryParams) => apiService.get('/users', { params: { q, ...params } }),
  getUser: (userId: string) => apiService.get(`/users/${userId}`),
  getUserSnippets: (userId: string, params?: QueryParams) => apiService.get(`/users/${userId}/snippets`, { params }),
  deleteAccount: (password: string, reason?: string) =>
    apiService.delete('/users/me', { data: { password, reason } }),
};

// Learning
export const courseService = {
  getAllCourses: (params?: QueryParams) => apiService.get('/learning/courses', { params }),
  getCourse: (courseId: string) => apiService.get(`/learning/courses/${courseId}`),
  getCoursePrerequisites: (courseId: string) => apiService.get(`/learning/courses/${courseId}/prerequisites`),
  getLesson: (courseId: string, lessonId: string) =>
    apiService.get(`/learning/courses/${courseId}/lessons/${lessonId}`),
  getLessonQuiz: (courseId: string, lessonId: string) =>
    apiService.get(`/learning/courses/${courseId}/lessons/${lessonId}/quiz`),
  submitQuiz: (courseId: string, lessonId: string, answers: Record<string, number>, timeSpentSeconds = 0) =>
    apiService.post(`/learning/courses/${courseId}/lessons/${lessonId}/quiz/submit`, { answers, timeSpentSeconds }),
  enrollInCourse: (courseId: string) => apiService.post(`/learning/courses/${courseId}/enroll`),
  getUserProgress: () => apiService.get('/learning/progress'),
  getUserCourseProgress: (courseId: string) => apiService.get(`/learning/courses/${courseId}/progress`),
  markLessonComplete: (courseId: string, lessonId: string, minutesSpent = 0) =>
    apiService.post(`/learning/courses/${courseId}/lessons/${lessonId}/complete`, { minutesSpent }),
  getRecommendations: (limit = 5) => apiService.get('/learning/recommendations', { params: { limit } }),
  submitExercise: (exerciseId: string, code: string) =>
    apiService.post(`/learning/exercises/${exerciseId}/submissions`, { code }),
};

// Code editor: snippets, engine-backed analysis, templates
export const codeService = {
  /** Answers 501 until sandboxed execution exists; see docs/research/threat-model.md. */
  executeCode: (data: { code: string; language: string; input?: string }) => apiService.post('/code/execute', data),
  analyzeCode: (code: string) => apiService.post('/code/analyze', { code }),
  visualizeLayout: (code: string, abi: 'lp64' | 'llp64' | 'ilp32' = 'lp64') =>
    apiService.post('/code/visualize', { code, abi }),
  getTemplates: (difficulty?: 'beginner' | 'intermediate' | 'advanced') =>
    apiService.get('/code/templates', { params: difficulty ? { difficulty } : {} }),
  saveSnippet: (data: { title: string; code: string; language: string; description?: string; tags?: string[]; isPublic?: boolean }) =>
    apiService.post('/code/snippets', data),
  getPublicSnippets: (params?: QueryParams) => apiService.get('/code/snippets', { params }),
  getUserSnippets: (params?: QueryParams) => apiService.get('/code/snippets/mine', { params }),
  getSnippet: (snippetId: string) => apiService.get(`/code/snippets/${snippetId}`),
  updateSnippet: (snippetId: string, data: Record<string, unknown>) =>
    apiService.patch(`/code/snippets/${snippetId}`, data),
  deleteSnippet: (snippetId: string) => apiService.delete(`/code/snippets/${snippetId}`),
  getRecentSnippets: () => apiService.get('/code/snippets/recent'),
  getPopularSnippets: () => apiService.get('/code/snippets/popular'),
  likeSnippet: (snippetId: string) => apiService.post(`/code/snippets/${snippetId}/like`),
  unlikeSnippet: (snippetId: string) => apiService.delete(`/code/snippets/${snippetId}/like`),
};

// Static analysis (cppmastery engine)
export const analysisService = {
  analyze: (
    code: string,
    options?: { maxCyclomatic?: number; maxNesting?: number; maxFunctionLines?: number; disable?: string[] }
  ) => apiService.post('/analysis/analyze', options ? { code, options } : { code }),
  metrics: (code: string) => apiService.post('/analysis/metrics', { code }),
  layout: (code: string, abi: 'lp64' | 'llp64' | 'ilp32' = 'lp64', pack?: 1 | 2 | 4 | 8 | 16) =>
    apiService.post('/analysis/layout', pack === undefined ? { code, abi } : { code, abi, pack }),
  rules: () => apiService.get('/analysis/rules'),
};

// Community forum
export const communityService = {
  getCategories: () => apiService.get('/community/categories'),
  getPosts: (params?: QueryParams) => apiService.get('/community/posts', { params }),
  getPost: (postId: string) => apiService.get(`/community/posts/${postId}`),
  createPost: (data: { title: string; content: string; categoryId?: string; tags?: string[] }) =>
    apiService.post('/community/posts', data),
  updatePost: (postId: string, data: { title?: string; content?: string; tags?: string[] }) =>
    apiService.patch(`/community/posts/${postId}`, data),
  deletePost: (postId: string) => apiService.delete(`/community/posts/${postId}`),
  likePost: (postId: string) => apiService.post(`/community/posts/${postId}/like`),
  unlikePost: (postId: string) => apiService.delete(`/community/posts/${postId}/like`),
  getComments: (postId: string) => apiService.get(`/community/posts/${postId}/comments`),
  createComment: (postId: string, content: string, parentId?: string) =>
    apiService.post(`/community/posts/${postId}/comments`, parentId ? { content, parentId } : { content }),
  updateComment: (postId: string, commentId: string, content: string) =>
    apiService.patch(`/community/posts/${postId}/comments/${commentId}`, { content }),
  deleteComment: (postId: string, commentId: string) =>
    apiService.delete(`/community/posts/${postId}/comments/${commentId}`),
  getTrendingPosts: () => apiService.get('/community/posts/trending'),
  getLeaderboard: () => apiService.get('/community/leaderboard'),
  reportPost: (postId: string, reason: string) =>
    apiService.post(`/community/posts/${postId}/report`, { reason }),
};

/**
 * Real-time collaboration. EXPERIMENTAL: the backend does not implement collaboration sessions
 * yet, so the page that uses this is disabled unless NEXT_PUBLIC_ENABLE_COLLABORATION=true.
 */
export const collaborationService = {
  createSession: (data: Record<string, unknown>) => apiService.post('/collaboration/sessions', data),
  getSession: (sessionId: string) => apiService.get(`/collaboration/sessions/${sessionId}`),
  inviteUser: (sessionId: string, email: string) =>
    apiService.post(`/collaboration/sessions/${sessionId}/invite`, { email }),
};

// Notifications
export const notificationService = {
  getNotifications: (params?: { unread?: boolean; limit?: number; offset?: number }) =>
    apiService.get('/notifications', { params }),
  getUnreadCount: () => apiService.get('/notifications/unread-count'),
  markAsRead: (notificationId: string) => apiService.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => apiService.patch('/notifications/read-all'),
  deleteNotification: (notificationId: string) => apiService.delete(`/notifications/${notificationId}`),
};

// Administration (moderator / admin roles)
export const adminService = {
  getStats: () => apiService.get('/admin/stats'),
  getUsers: (params?: QueryParams) => apiService.get('/admin/users', { params }),
  getUser: (userId: string) => apiService.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: { role?: string; isActive?: boolean }) =>
    apiService.patch(`/admin/users/${userId}`, data),
  banUser: (userId: string, reason: string) => apiService.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => apiService.post(`/admin/users/${userId}/unban`),
  moderatePost: (postId: string, data: { isPinned?: boolean; isLocked?: boolean; status?: string }) =>
    apiService.patch(`/admin/posts/${postId}`, data),
  getSettings: () => apiService.get('/admin/settings'),
  putSetting: (key: string, value: unknown, description?: string) =>
    apiService.put(`/admin/settings/${key}`, description === undefined ? { value } : { value, description }),
};

// Health
export const healthService = {
  check: () => apiService.get('/health'),
};

export const apiUtils = {
  // Build query string from object
  buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v: unknown) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
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
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
  },
};

// Initialize auth token on service creation
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('authToken') ?? sessionStorage.getItem('authToken');
  if (token) {
    apiService.setAuthToken(token);
  }
}

// Export the main service instance and individual services
export { apiService, apiService as api };
export default apiService;
