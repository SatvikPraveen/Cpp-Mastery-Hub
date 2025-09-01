// File: frontend/src/utils/constants.ts
// Extension: .ts
export const APP_CONFIG = {
  name: 'C++ Mastery Hub',
  version: '1.0.0',
  description: 'Master C++ programming with interactive lessons and real-time analysis',
  author: 'C++ Mastery Hub Team',
  repository: 'https://github.com/cpp-mastery-hub/platform',
  
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 30000,
    retries: 3
  },

  // WebSocket Configuration
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    reconnectAttempts: 5,
    reconnectInterval: 3000
  },

  // Storage keys
  storage: {
    authToken: 'cpp_hub_auth_token',
    refreshToken: 'cpp_hub_refresh_token',
    theme: 'cpp_hub_theme',
    editorSettings: 'cpp_hub_editor_settings',
    userPreferences: 'cpp_hub_user_preferences'
  },

  // Theme configuration
  themes: {
    light: 'light',
    dark: 'dark',
    system: 'system'
  },

  // Editor configuration
  editor: {
    defaultTheme: 'vs-dark',
    defaultFontSize: 14,
    defaultTabSize: 4,
    supportedLanguages: ['cpp', 'c', 'javascript', 'typescript', 'python'],
    maxFileSize: 1024 * 1024, // 1MB
    autoSaveDelay: 2000 // 2 seconds
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },

  // File upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.cpp', '.c', '.h', '.hpp', '.txt', '.md'],
    allowedMimeTypes: [
      'text/plain',
      'text/x-c',
      'text/x-c++',
      'application/octet-stream'
    ]
  },

  // Code execution limits
  execution: {
    timeout: 10000, // 10 seconds
    memoryLimit: 128 * 1024 * 1024, // 128MB
    outputLimit: 1024 * 1024 // 1MB
  },

  // Learning path configuration
  learning: {
    streakGracePeriod: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    weeklyGoalDefault: 300, // 5 hours in minutes
    achievementTypes: [
      'first_lesson',
      'first_exercise',
      'course_completion',
      'streak_milestone',
      'community_contribution'
    ]
  }
} as const;

export const COURSE_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
} as const;

export const COURSE_CATEGORIES = {
  BASICS: 'basics',
  OOP: 'oop',
  ALGORITHMS: 'algorithms',
  ADVANCED: 'advanced',
  PROJECTS: 'projects'
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export const POST_TYPES = {
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  SHOWCASE: 'showcase',
  ANNOUNCEMENT: 'announcement'
} as const;

export const NOTIFICATION_TYPES = {
  ACHIEVEMENT: 'achievement',
  COURSE_COMPLETION: 'course_completion',
  REMINDER: 'reminder',
  FORUM_REPLY: 'forum_reply',
  SYSTEM: 'system'
} as const;