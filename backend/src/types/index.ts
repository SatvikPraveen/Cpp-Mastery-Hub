// File: backend/src/types/index.ts
// Extension: .ts
// Location: backend/src/types/index.ts

/**
 * C++ Mastery Hub - Backend Type Definitions
 * Comprehensive type system for the backend API
 */

// ===== CORE DOMAIN TYPES =====

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  experienceLevel: ExperienceLevel;
  learningGoals: string[];
  preferredTopics: string[];
  timezone: string;
  language: string;
  emailVerified: boolean;
  isActive: boolean;
  isPremium: boolean;
  role: UserRole;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  editorTheme: string;
  fontSize: number;
  tabSize: number;
  autoSave: boolean;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  learningReminders: boolean;
  weeklyGoal: number; // minutes per week
  dailyGoal: number; // minutes per day
}

export interface NotificationPreferences {
  email: {
    marketing: boolean;
    courseUpdates: boolean;
    achievements: boolean;
    reminders: boolean;
    community: boolean;
  };
  push: {
    achievements: boolean;
    reminders: boolean;
    messages: boolean;
  };
  inApp: {
    all: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showProgress: boolean;
  showAchievements: boolean;
  allowMessages: boolean;
  showOnlineStatus: boolean;
}

export interface UserStats {
  totalCodeSubmissions: number;
  totalLinesOfCode: number;
  totalTimeSpent: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  problemsSolved: number;
  averageScore: number;
  rank: number;
  xpPoints: number;
  level: number;
  lastActivityAt: Date;
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate', 
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  MENTOR = 'mentor',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// ===== LEARNING CONTENT TYPES =====

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  slug: string;
  thumbnail: string;
  bannerImage?: string;
  difficulty: ExperienceLevel;
  estimatedHours: number;
  tags: string[];
  categories: string[];
  prerequisites: string[];
  learningObjectives: string[];
  syllabus: CourseSyllabus;
  instructorId: string;
  instructor: User;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  isPublished: boolean;
  isFree: boolean;
  price?: number;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CourseSyllabus {
  modules: CourseModule[];
  totalLessons: number;
  totalQuizzes: number;
  totalProjects: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  quiz?: Quiz;
  project?: Project;
  estimatedHours: number;
  prerequisites: string[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: LessonContent;
  order: number;
  estimatedMinutes: number;
  type: LessonType;
  difficulty: ExperienceLevel;
  tags: string[];
  resources: LessonResource[];
  codeExamples: CodeExample[];
  exercises: Exercise[];
  isCompleted?: boolean; // User-specific
  completedAt?: Date; // User-specific
}

export enum LessonType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
  INTERACTIVE = 'interactive',
  VIDEO = 'video',
  QUIZ = 'quiz',
  PROJECT = 'project'
}

export interface LessonContent {
  markdown?: string;
  html?: string;
  videoUrl?: string;
  audioUrl?: string;
  slides?: Slide[];
  interactiveElements?: InteractiveElement[];
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  order: number;
  duration?: number;
  notes?: string;
}

export interface InteractiveElement {
  id: string;
  type: 'code-editor' | 'visualization' | 'quiz' | 'diagram';
  config: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface LessonResource {
  id: string;
  title: string;
  description?: string;
  type: 'link' | 'file' | 'book' | 'video' | 'documentation';
  url: string;
  isExternal: boolean;
}

// ===== CODE & PROGRAMMING TYPES =====

export interface CodeExample {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: ProgrammingLanguage;
  expectedOutput?: string;
  explanation?: string;
  difficulty: ExperienceLevel;
  tags: string[];
  concepts: string[];
  isRunnable: boolean;
  isEditable: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  instructions: string;
  starterCode?: string;
  solutionCode?: string;
  testCases: TestCase[];
  hints: Hint[];
  difficulty: ExperienceLevel;
  estimatedMinutes: number;
  concepts: string[];
  tags: string[];
  maxAttempts?: number;
  isOptional: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  timeout?: number;
}

export interface Hint {
  id: string;
  content: string;
  order: number;
  cost: number; // XP points deducted for using hint
}

export enum ProgrammingLanguage {
  CPP = 'cpp',
  C = 'c',
  PYTHON = 'python',
  JAVA = 'java',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript'
}

// ===== CODE ANALYSIS TYPES =====

export interface CodeSubmission {
  id: string;
  userId: string;
  exerciseId?: string;
  projectId?: string;
  code: string;
  language: ProgrammingLanguage;
  status: SubmissionStatus;
  result?: ExecutionResult;
  analysis?: CodeAnalysis;
  feedback?: CodeFeedback;
  score?: number;
  submittedAt: Date;
  processedAt?: Date;
}

export enum SubmissionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number; // milliseconds
  memoryUsage: number; // bytes
  compilationOutput?: string;
  compilationTime?: number;
  testResults?: TestResult[];
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

export interface CodeAnalysis {
  complexity: ComplexityAnalysis;
  quality: QualityAnalysis;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
  memory: MemoryAnalysis;
  style: StyleAnalysis;
  suggestions: CodeSuggestion[];
}

export interface ComplexityAnalysis {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  nestingDepth: number;
  functionCount: number;
  classCount: number;
}

export interface QualityAnalysis {
  score: number; // 0-100
  issues: QualityIssue[];
  metrics: {
    duplicatedCode: number;
    testCoverage?: number;
    codeSmells: number;
    technicalDebt: number;
  };
}

export interface QualityIssue {
  id: string;
  type: 'bug' | 'vulnerability' | 'code_smell' | 'duplication';
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  message: string;
  line: number;
  column?: number;
  rule: string;
  effort?: number; // minutes to fix
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number; // 0-100
  categories: SecurityCategory[];
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  line: number;
  column?: number;
  cwe?: string; // Common Weakness Enumeration
  recommendation: string;
}

export interface SecurityCategory {
  name: string;
  score: number;
  issues: number;
}

export interface PerformanceAnalysis {
  timeComplexity?: string;
  spaceComplexity?: string;
  benchmarks?: Benchmark[];
  optimizations: OptimizationSuggestion[];
  bottlenecks: PerformanceBottleneck[];
}

export interface Benchmark {
  name: string;
  executionTime: number;
  memoryUsage: number;
  inputSize: number;
}

export interface OptimizationSuggestion {
  type: 'algorithm' | 'data_structure' | 'memory' | 'computation';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  line?: number;
}

export interface PerformanceBottleneck {
  location: string;
  type: string;
  description: string;
  impact: number; // percentage
  suggestion: string;
}

export interface MemoryAnalysis {
  leaks: MemoryLeak[];
  usage: MemoryUsage;
  visualization: MemoryVisualization;
}

export interface MemoryLeak {
  location: string;
  type: 'definite' | 'possible' | 'reachable';
  size: number;
  description: string;
}

export interface MemoryUsage {
  heapUsage: number;
  stackUsage: number;
  totalAllocated: number;
  peakUsage: number;
  allocations: number;
  deallocations: number;
}

export interface MemoryVisualization {
  stackFrames: StackFrame[];
  heapObjects: HeapObject[];
  references: Reference[];
}

export interface StackFrame {
  id: string;
  function: string;
  variables: Variable[];
  line: number;
}

export interface HeapObject {
  id: string;
  type: string;
  size: number;
  address: string;
  references: string[];
}

export interface Variable {
  name: string;
  type: string;
  value: string;
  size: number;
  address?: string;
}

export interface Reference {
  from: string;
  to: string;
  type: 'pointer' | 'reference' | 'ownership';
}

export interface StyleAnalysis {
  score: number; // 0-100
  violations: StyleViolation[];
  metrics: {
    indentationConsistency: number;
    namingConventions: number;
    commentCoverage: number;
  };
}

export interface StyleViolation {
  rule: string;
  message: string;
  line: number;
  column?: number;
  severity: 'info' | 'warning' | 'error';
  fix?: string;
}

export interface CodeSuggestion {
  type: 'improvement' | 'best_practice' | 'optimization' | 'modernization';
  title: string;
  description: string;
  before?: string;
  after?: string;
  line?: number;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface CodeFeedback {
  overallScore: number; // 0-100
  comments: FeedbackComment[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  isAiGenerated: boolean;
  reviewerId?: string;
  reviewedAt: Date;
}

export interface FeedbackComment {
  id: string;
  line?: number;
  type: 'positive' | 'negative' | 'suggestion' | 'question';
  message: string;
  category: string;
  severity?: 'info' | 'warning' | 'error';
}

// ===== ASSESSMENT TYPES =====

export interface Quiz {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  questions: QuizQuestion[];
  timeLimit?: number; // minutes
  attemptsAllowed: number;
  passingScore: number; // percentage
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  isPublished: boolean;
  tags: string[];
  difficulty: ExperienceLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  options?: QuizOption[];
  correctAnswers: string[];
  codeSnippet?: string;
  language?: ProgrammingLanguage;
  hints: string[];
  tags: string[];
  difficulty: ExperienceLevel;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECT = 'multiple_select',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  CODE_COMPLETION = 'code_completion',
  CODE_OUTPUT = 'code_output',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay'
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  answers: QuizAnswer[];
  score: number;
  percentage: number;
  timeSpent: number; // minutes
  passed: boolean;
  startedAt: Date;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswers: string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // seconds
}

export interface Project {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  requirements: ProjectRequirement[];
  specifications: ProjectSpecification;
  starterCode?: string;
  resources: LessonResource[];
  estimatedHours: number;
  difficulty: ExperienceLevel;
  concepts: string[];
  tags: string[];
  rubric: GradingRubric;
  dueDate?: Date;
  isGroupProject: boolean;
  maxGroupSize?: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRequirement {
  id: string;
  description: string;
  type: 'functional' | 'non_functional' | 'technical' | 'documentation';
  priority: 'must' | 'should' | 'could' | 'wont';
  acceptanceCriteria: string[];
}

export interface ProjectSpecification {
  architecture?: string;
  technologies: string[];
  constraints: string[];
  deliverables: string[];
  testingRequirements: string[];
  documentationRequirements: string[];
}

export interface GradingRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
  gradingScale: GradingScale;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number;
}

export interface GradingScale {
  A: number; // minimum percentage for A
  B: number;
  C: number;
  D: number;
  F: number;
}

export interface ProjectSubmission {
  id: string;
  userId: string;
  projectId: string;
  groupId?: string;
  code: string;
  documentation?: string;
  files: SubmittedFile[];
  status: SubmissionStatus;
  score?: number;
  grade?: string;
  feedback?: ProjectFeedback;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: string;
}

export interface SubmittedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  mimeType: string;
  checksum: string;
}

export interface ProjectFeedback {
  overallComments: string;
  criteriaScores: CriteriaScore[];
  suggestions: string[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  isAiGenerated: boolean;
  reviewerId?: string;
  reviewedAt: Date;
}

export interface CriteriaScore {
  criterionId: string;
  score: number;
  comments: string;
}

// ===== COMMUNITY TYPES =====

export interface Discussion {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  category: DiscussionCategory;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DiscussionCategory {
  GENERAL = 'general',
  HELP = 'help',
  SHOWCASE = 'showcase',
  FEEDBACK = 'feedback',
  ANNOUNCEMENTS = 'announcements',
  STUDY_GROUPS = 'study_groups',
  JOB_BOARD = 'job_board',
  EVENTS = 'events'
}

export interface Reply {
  id: string;
  content: string;
  authorId: string;
  author: User;
  discussionId: string;
  parentReplyId?: string;
  upvotes: number;
  downvotes: number;
  isAcceptedAnswer: boolean;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vote {
  id: string;
  userId: string;
  targetId: string; // discussionId or replyId
  targetType: 'discussion' | 'reply';
  type: 'upvote' | 'downvote';
  createdAt: Date;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creator: User;
  members: StudyGroupMember[];
  maxMembers: number;
  isPrivate: boolean;
  meetingSchedule?: MeetingSchedule;
  topics: string[];
  currentCourse?: string;
  level: ExperienceLevel;
  timezone: string;
  language: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGroupMember {
  userId: string;
  user: User;
  role: 'member' | 'moderator' | 'creator';
  joinedAt: Date;
  isActive: boolean;
}

export interface MeetingSchedule {
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  time: string; // HH:mm format
  duration: number; // minutes
  timezone: string;
  recurring: boolean;
}

// ===== ACHIEVEMENT & GAMIFICATION TYPES =====

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  type: AchievementType;
  criteria: AchievementCriteria;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AchievementCategory {
  LEARNING = 'learning',
  CODING = 'coding',
  SOCIAL = 'social',
  STREAK = 'streak',
  MILESTONE = 'milestone',
  SPECIAL = 'special'
}

export enum AchievementType {
  PROGRESS = 'progress',
  COMPLETION = 'completion',
  MASTERY = 'mastery',
  PARTICIPATION = 'participation',
  CONTRIBUTION = 'contribution'
}

export interface AchievementCriteria {
  metric: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  conditions?: Record<string, unknown>;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: number; // 0-100
  isCompleted: boolean;
  completedAt?: Date;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badge: Badge;
  earnedAt: Date;
  isDisplayed: boolean;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'points' | 'streak' | 'problems' | 'time' | 'custom';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  scope: 'global' | 'course' | 'group';
  scopeId?: string;
  isActive: boolean;
  refreshInterval: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  user: User;
  rank: number;
  score: number;
  change: number; // rank change from previous period
  updatedAt: Date;
}

// ===== NOTIFICATION TYPES =====

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  isArchived: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: NotificationCategory;
  actionUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  readAt?: Date;
}

export enum NotificationType {
  ACHIEVEMENT_EARNED = 'achievement_earned',
  COURSE_COMPLETED = 'course_completed',
  ASSIGNMENT_DUE = 'assignment_due',
  ASSIGNMENT_GRADED = 'assignment_graded',
  MESSAGE_RECEIVED = 'message_received',
  MENTION_RECEIVED = 'mention_received',
  FOLLOW_REQUEST = 'follow_request',
  STUDY_GROUP_INVITE = 'study_group_invite',
  COURSE_UPDATE = 'course_update',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  STREAK_REMINDER = 'streak_reminder',
  WEEKLY_REPORT = 'weekly_report'
}

export enum NotificationCategory {
  LEARNING = 'learning',
  SOCIAL = 'social',
  SYSTEM = 'system',
  ACHIEVEMENT = 'achievement',
  REMINDER = 'reminder'
}

// ===== API TYPES =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  documentation?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: string | number | boolean | string[] | number[];
}

export interface SearchOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

// ===== AUTH TYPES =====

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  experienceLevel: ExperienceLevel;
  agreeToTerms: boolean;
  subscribeToNewsletter?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface EmailVerification {
  token: string;
}

export interface OAuthProfile {
  provider: 'google' | 'github' | 'microsoft';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  username?: string;
}

// ===== SYSTEM TYPES =====

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  uptime: number;
  version: string;
  timestamp: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  lastCheck: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface Feature {
  name: string;
  enabled: boolean;
  description?: string;
  config?: Record<string, unknown>;
}

export interface Configuration {
  features: Feature[];
  limits: SystemLimits;
  settings: SystemSettings;
}

export interface SystemLimits {
  maxCodeLength: number;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxFileSize: number;
  maxFilesPerSubmission: number;
  rateLimits: RateLimit[];
}

export interface RateLimit {
  endpoint: string;
  requests: number;
  window: number; // seconds
  scope: 'ip' | 'user' | 'global';
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  defaultExperienceLevel: ExperienceLevel;
  supportedLanguages: string[];
  maxConcurrentExecutions: number;
  backupRetentionDays: number;
}

// ===== ANALYTICS TYPES =====

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  event: string;
  category: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface UserActivity {
  userId: string;
  date: Date;
  timeSpent: number;
  actionsPerformed: number;
  codesSubmitted: number;
  lessonsCompleted: number;
  achievementsEarned: number;
}

export interface CourseAnalytics {
  courseId: string;
  enrollments: number;
  completions: number;
  averageRating: number;
  averageTimeToComplete: number;
  dropoffPoints: DropoffPoint[];
  engagement: EngagementMetrics;
}

export interface DropoffPoint {
  lessonId: string;
  lessonTitle: string;
  dropoffRate: number;
  averageTimeSpent: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  retentionRate: Record<string, number>; // day -> rate
}

// ===== FILE & MEDIA TYPES =====

export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  isPublic: boolean;
  expiresAt?: Date;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  duration?: number; // for video/audio
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ===== ERROR TYPES =====

export class ValidationError extends Error {
  public field: string;
  public code: string;
  
  constructor(message: string, field: string, code: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  public code: string;
  
  constructor(message: string, code: string = 'AUTH_FAILED') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  public code: string;
  public requiredPermission?: string;
  
  constructor(message: string, code: string = 'FORBIDDEN', requiredPermission?: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.requiredPermission = requiredPermission;
  }
}

export class NotFoundError extends Error {
  public resource: string;
  public resourceId?: string;
  
  constructor(message: string, resource: string, resourceId?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = resourceId;
  }
}

export class RateLimitError extends Error {
  public retryAfter: number;
  public limit: number;
  
  constructor(message: string, retryAfter: number, limit: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
  }
}

// ===== UTILITY TYPES =====

export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type CreateRequest<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRequest<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// ===== CONSTANTS =====

export const SUPPORTED_LANGUAGES = ['cpp', 'c', 'python', 'java', 'javascript'] as const;
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export const USER_ROLES = ['student', 'instructor', 'mentor', 'admin', 'moderator'] as const;
export const LESSON_TYPES = ['theory', 'practical', 'interactive', 'video', 'quiz', 'project'] as const;
export const SUBMISSION_STATUSES = ['pending', 'processing', 'completed', 'failed', 'timeout'] as const;