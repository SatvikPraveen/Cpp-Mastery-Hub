// File: backend/src/types/learning.ts
// Extension: .ts
// Location: backend/src/types/learning.ts

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  thumbnail?: string;
  tags: string[];
  isPublished: boolean;
  lessons: Lesson[];
  enrollmentCount?: number;
  rating?: number;
  instructorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  content: LessonContent;
  order: number;
  duration?: number;
  exercises: Exercise[];
  prerequisites?: string[];
  objectives: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonContent {
  type: 'markdown' | 'video' | 'interactive' | 'mixed';
  content: string;
  resources?: Resource[];
  codeExamples?: CodeExample[];
  quiz?: Quiz;
}

export interface Resource {
  type: 'link' | 'file' | 'image' | 'video';
  title: string;
  url: string;
  description?: string;
}

export interface CodeExample {
  title: string;
  description?: string;
  code: string;
  language: string;
  explanation?: string;
  runnable?: boolean;
}

export interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  instruction: string;
  starterCode?: string;
  solution?: string;
  testCases: TestCase[];
  difficulty: Difficulty;
  points: number;
  hints?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden: boolean;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
  attempts: number;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  codeSnippet?: string;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  CODE_COMPLETION = 'CODE_COMPLETION',
  CODE_OUTPUT = 'CODE_OUTPUT'
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export interface UserProgress {
  userId: string;
  courseId?: string;
  lessonId?: string;
  exerciseId?: string;
  progress: number;
  timeSpent: number;
  isCompleted: boolean;
  score?: number;
  attempts: number;
  lastAttempt?: Date;
  startedAt: Date;
  completedAt?: Date;
}

export interface ExerciseSubmission {
  id: string;
  userId: string;
  exerciseId: string;
  code: string;
  isCorrect: boolean;
  score: number;
  feedback?: string;
  executionResult?: CodeExecutionResponse;
  testResults: TestResult[];
  submittedAt: Date;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  courses: string[]; // Course IDs
  prerequisites?: string[];
  objectives: string[];
  tags: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  criteria: AchievementCriteria;
  createdAt: Date;
  updatedAt: Date;
}

export enum AchievementCategory {
  LEARNING = 'LEARNING',
  CODING = 'CODING',
  COMMUNITY = 'COMMUNITY',
  SPECIAL = 'SPECIAL'
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export interface AchievementCriteria {
  type: 'count' | 'percentage' | 'streak' | 'time' | 'score' | 'custom';
  target: number;
  metric: string;
  conditions?: Record<string, any>;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  progress: number;
  isCompleted: boolean;
  unlockedAt?: Date;
  createdAt: Date;
}

export interface LearningAnalytics {
  userId: string;
  totalTimeSpent: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  lessonsCompleted: number;
  exercisesSolved: number;
  averageScore: number;
  streakDays: number;
  skillLevels: Record<string, number>;
  strongAreas: string[];
  improvementAreas: string[];
  recommendations: string[];
}