// File: frontend/src/types/index.ts
// Extension: .ts

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  linkedinUsername?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  profile?: UserProfile;
  progress?: number; // Overall progress percentage
}

export interface UserProfile {
  id: string;
  userId: string;
  skillLevel: SkillLevel;
  learningGoals: string[];
  preferredTopics: string[];
  studyTimeGoal?: number;
  totalPoints: number;
  streak: number;
  longestStreak: number;
  lastStudyDate?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  publicProfile: boolean;
  showProgress: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  name: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

// Learning Content Types
export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail?: string;
  difficulty: SkillLevel;
  estimatedTime: number; // minutes
  isPublished: boolean;
  order: number;
  overview: string;
  objectives: string[];
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
  progress?: LearningProgress;
  completionRate?: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  slug: string;
  content: string; // Markdown content
  codeExample?: string;
  videoUrl?: string;
  order: number;
  isPublished: boolean;
  estimatedTime: number;
  difficulty: SkillLevel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  exercises: Exercise[];
  progress?: LessonProgress;
}

export interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  instructions: string;
  starterCode: string;
  solutionCode: string;
  testCases: TestCase[];
  difficulty: SkillLevel;
  points: number;
  order: number;
  timeLimit?: number; // seconds
  memoryLimit?: number; // MB
  allowedIncludes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  description?: string;
}

export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  status: ProgressStatus;
  completedAt?: string;
  lastAccessedAt?: string;
  timeSpent: number; // minutes
  pointsEarned: number;
  lessonProgress: LessonProgress[];
}

export interface LessonProgress {
  id: string;
  learningProgressId: string;
  lessonId: string;
  status: ProgressStatus;
  completedAt?: string;
  lastAccessedAt?: string;
  timeSpent: number; // minutes
}

// Code Editor and Execution Types
export interface CodeSnippet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  tags: string[];
  isPublic: boolean;
  isFavorite: boolean;
  lastExecuted?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CodeSubmission {
  id: string;
  userId: string;
  exerciseId?: string;
  snippetId?: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  output?: string;
  errorOutput?: string;
  executionTime?: number; // milliseconds
  memoryUsage?: number; // bytes
  testResults?: TestResult[];
  codeMetrics?: CodeMetrics;
  suggestions?: CodeSuggestion[];
  createdAt: string;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  executionTime: number;
  memoryUsage: number;
  error?: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: CodeSmell[];
  duplicatedLines: number;
  testCoverage?: number;
}

export interface CodeSmell {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface CodeSuggestion {
  type: 'performance' | 'style' | 'best-practice' | 'modernization';
  title: string;
  description: string;
  code?: string;
  line?: number;
  column?: number;
  severity: 'info' | 'warning' | 'error';
}

export interface ExecutionResult {
  status: SubmissionStatus;
  output: string;
  errorOutput: string;
  executionTime: number;
  memoryUsage: number;
  exitCode: number;
  compilationOutput?: string;
  testResults?: TestResult[];
}

// Memory Visualization Types
export interface MemoryState {
  timestamp: number;
  stackFrames: StackFrame[];
  heapObjects: HeapObject[];
  globalVariables: Variable[];
  registers?: Register[];
}

export interface StackFrame {
  id: string;
  functionName: string;
  line: number;
  variables: Variable[];
  returnAddress?: string;
}

export interface HeapObject {
  id: string;
  address: string;
  type: string;
  size: number;
  value: any;
  references: string[];
  isAllocated: boolean;
}

export interface Variable {
  name: string;
  type: string;
  value: any;
  address?: string;
  size: number;
  scope: 'local' | 'global' | 'parameter';
  isPointer: boolean;
  pointsTo?: string;
}

export interface Register {
  name: string;
  value: string;
  type: string;
}

// Community and Forum Types
export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
  postCount?: number;
}

export interface ForumPost {
  id: string;
  userId: string;
  user: User;
  categoryId: string;
  category: ForumCategory;
  title: string;
  content: string;
  slug: string;
  tags: string[];
  isPublished: boolean;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
  comments: ForumComment[];
  commentCount?: number;
}

export interface ForumComment {
  id: string;
  userId: string;
  user: User;
  postId: string;
  parentId?: string;
  content: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  replies: ForumComment[];
  voteScore: number;
}

export interface Vote {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  type: VoteType;
  createdAt: string;
}

// Collaboration Types
export interface Collaboration {
  id: string;
  ownerId: string;
  owner: User;
  snippetId: string;
  snippet: CodeSnippet;
  title: string;
  description?: string;
  isActive: boolean;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
  participants: CollaborationParticipant[];
}

export interface CollaborationParticipant {
  id: string;
  collaborationId: string;
  userId: string;
  user: User;
  role: CollaborationRole;
  joinedAt: string;
  lastActiveAt?: string;
}

// Achievement and Gamification Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  condition: any; // Achievement unlock conditions
  isActive: boolean;
  unlockedAt?: string;
  progress?: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
  progress: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Search Types
export interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'exercise' | 'post' | 'comment' | 'user' | 'snippet';
  title: string;
  description: string;
  url: string;
  relevance: number;
  highlights?: string[];
}

export interface SearchFilters {
  type?: string[];
  difficulty?: SkillLevel[];
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  author?: string;
  category?: string;
}

// Editor Configuration Types
export interface EditorSettings {
  theme: string;
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  lineNumbers: boolean;
  minimap: boolean;
  folding: boolean;
  highlightActiveGuide: boolean;
  bracketPairColorization: boolean;
  autoIndent: 'none' | 'keep' | 'brackets' | 'advanced' | 'full';
  formatOnPaste: boolean;
  formatOnType: boolean;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
}

// Enums
export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
}

export enum VoteType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export enum CollaborationRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  PARTICIPANT = 'PARTICIPANT',
}

export enum AchievementCategory {
  LEARNING = 'LEARNING',
  CODING = 'CODING',
  COMMUNITY = 'COMMUNITY',
  STREAK = 'STREAK',
  MILESTONE = 'MILESTONE',
}

export enum NotificationType {
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  LESSON_COMPLETED = 'LESSON_COMPLETED',
  NEW_COMMENT = 'NEW_COMMENT',
  NEW_REPLY = 'NEW_REPLY',
  VOTE_RECEIVED = 'VOTE_RECEIVED',
  COLLABORATION_INVITE = 'COLLABORATION_INVITE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

// Theme Types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  syntax: {
    keyword: string;
    string: string;
    comment: string;
    number: string;
    function: string;
    type: string;
    variable: string;
    operator: string;
  };
}

// WebSocket Event Types
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface CodeExecutionEvent extends SocketEvent {
  type: 'code_execution';
  data: {
    sessionId: string;
    status: SubmissionStatus;
    output?: string;
    error?: string;
    progress?: number;
  };
}

export interface CollaborationEvent extends SocketEvent {
  type: 'collaboration';
  data: {
    collaborationId: string;
    userId: string;
    action: 'join' | 'leave' | 'code_change' | 'cursor_move';
    payload: any;
  };
}

export interface LearningProgressEvent extends SocketEvent {
  type: 'learning_progress';
  data: {
    userId: string;
    courseId: string;
    lessonId?: string;
    progress: number;
    action: 'started' | 'completed' | 'updated';
  };
}