// File: backend/src/models/Course.ts
// Extension: .ts (TypeScript Model)

import { z } from 'zod';

// Enums
export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  INTERACTIVE = 'INTERACTIVE',
  QUIZ = 'QUIZ',
  PROJECT = 'PROJECT',
  CODING_EXERCISE = 'CODING_EXERCISE'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
  CODE_COMPLETION = 'CODE_COMPLETION',
  ESSAY = 'ESSAY'
}

// Validation schemas
export const CreateCourseSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.nativeEnum(CourseLevel),
  estimatedHours: z.number()
    .min(0.5, 'Estimated hours must be at least 0.5')
    .max(100, 'Estimated hours must be less than 100'),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string())
    .min(1, 'At least one learning objective is required'),
  tags: z.array(z.string()).optional(),
  price: z.number().min(0, 'Price must be non-negative').optional(),
  isPremium: z.boolean().default(false),
  isPublic: z.boolean().default(true)
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const CreateLessonSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(300, 'Description must be less than 300 characters')
    .optional(),
  type: z.nativeEnum(LessonType),
  content: z.string().min(1, 'Content is required'),
  estimatedMinutes: z.number()
    .min(1, 'Estimated minutes must be at least 1')
    .max(180, 'Estimated minutes must be less than 180'),
  order: z.number().min(0, 'Order must be non-negative'),
  objectives: z.array(z.string()).optional(),
  codeTemplate: z.string().optional(),
  codeInstructions: z.string().optional(),
  expectedOutput: z.string().optional(),
  codeInput: z.string().optional(),
  videoUrl: z.string().url('Invalid video URL').optional(),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    type: z.enum(['link', 'download', 'reference'])
  })).optional(),
  hasQuiz: z.boolean().default(false),
  isPreview: z.boolean().default(false)
});

export const UpdateLessonSchema = CreateLessonSchema.partial();

export const CreateQuizSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  timeLimit: z.number().min(30, 'Time limit must be at least 30 seconds').optional(),
  passingScore: z.number()
    .min(0, 'Passing score must be non-negative')
    .max(100, 'Passing score must be at most 100')
    .default(70),
  maxAttempts: z.number().min(1, 'Max attempts must be at least 1').default(3),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  questions: z.array(z.object({
    question: z.string().min(1, 'Question text is required'),
    type: z.nativeEnum(QuestionType),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]),
    explanation: z.string().optional(),
    points: z.number().min(1, 'Points must be at least 1').default(1),
    codeSnippet: z.string().optional()
  })).min(1, 'At least one question is required')
});

// Type definitions
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;

// Main interfaces
export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: CourseLevel;
  status: CourseStatus;
  estimatedHours: number;
  thumbnail?: string;
  instructorId: string;
  instructor: Instructor;
  prerequisites: string[];
  learningObjectives: string[];
  tags: string[];
  price?: number;
  isPremium: boolean;
  isPublic: boolean;
  enrollmentCount: number;
  completionCount: number;
  rating: number;
  reviewCount: number;
  lessons: Lesson[];
  totalLessons: number;
  publishedAt?: Date;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Instructor {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  name: string;
  avatar?: string;
  bio?: string;
  title?: string;
  website?: string;
  social?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  stats: {
    coursesCreated: number;
    studentsEnrolled: number;
    averageRating: number;
    totalReviews: number;
  };
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: LessonType;
  content: string;
  estimatedMinutes: number;
  order: number;
  objectives?: string[];
  isCompleted?: boolean;
  hasQuiz: boolean;
  isPreview: boolean;
  quiz?: Quiz;
  resources?: LessonResource[];
  codeExample?: CodeExample;
  videoData?: VideoData;
  nextLessonId?: string;
  previousLessonId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonContent {
  id: string;
  lessonId: string;
  content: string;
  codeTemplate?: string;
  codeInstructions?: string;
  expectedOutput?: string;
  codeInput?: string;
  codeExamples?: CodeExample[];
  videoUrl?: string;
  resources?: LessonResource[];
}

export interface CodeExample {
  id: string;
  title: string;
  code: string;
  language: string;
  explanation?: string;
  runnable: boolean;
  expectedOutput?: string;
}

export interface VideoData {
  url: string;
  duration: number; // in seconds
  thumbnail?: string;
  subtitles?: string;
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'download' | 'reference';
  description?: string;
  size?: number; // file size in bytes
  format?: string; // file format
}

export interface Quiz {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  timeLimit?: number; // in seconds
  passingScore: number; // percentage
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  questions: QuizQuestion[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  order: number;
  codeSnippet?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
  certificateUrl?: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessedAt: Date;
  currentLessonId?: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessedAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
  score?: number;
  completedLessons: string[];
  completedQuizzes: string[];
  bookmarkedLessons: string[];
  notes: CourseNote[];
  quizAttempts: QuizAttempt[];
  nextLessonId?: string;
  previousLessonId?: string;
  totalLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseNote {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  content: string;
  position?: number; // Position in lesson content
  isPrivate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number; // in seconds
  answers: QuizAnswer[];
  passed: boolean;
  completedAt: Date;
  attemptNumber: number;
  feedback?: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // in seconds
  explanation?: string;
}

export interface CourseReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reportedCount: number;
  instructorResponse?: string;
  instructorResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prerequisite {
  id: string;
  courseId: string;
  requiredCourseId?: string;
  skillName?: string;
  description: string;
  isRequired: boolean;
  order: number;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateUrl: string;
  verificationCode: string;
  issuedAt: Date;
  expiresAt?: Date;
  metadata: {
    courseName: string;
    instructorName: string;
    completionDate: Date;
    finalScore?: number;
    totalHours: number;
  };
}

// Repository interfaces
export interface CourseRepository {
  create(data: CreateCourseInput, instructorId: string): Promise<Course>;
  findById(id: string): Promise<Course | null>;
  findByInstructor(instructorId: string): Promise<Course[]>;
  findMany(filters: CourseFilters): Promise<{ courses: Course[]; total: number }>;
  update(id: string, data: UpdateCourseInput): Promise<Course>;
  delete(id: string): Promise<void>;
  publish(id: string): Promise<Course>;
  archive(id: string): Promise<Course>;
  addLesson(courseId: string, lessonData: CreateLessonInput): Promise<Lesson>;
  updateLesson(courseId: string, lessonId: string, data: UpdateLessonInput): Promise<Lesson>;
  deleteLesson(courseId: string, lessonId: string): Promise<void>;
  reorderLessons(courseId: string, lessonOrders: { lessonId: string; order: number }[]): Promise<void>;
  addQuiz(lessonId: string, quizData: CreateQuizInput): Promise<Quiz>;
  updateQuiz(quizId: string, data: Partial<CreateQuizInput>): Promise<Quiz>;
  deleteQuiz(quizId: string): Promise<void>;
  enrollUser(courseId: string, userId: string): Promise<CourseEnrollment>;
  unenrollUser(courseId: string, userId: string): Promise<void>;
  updateProgress(userId: string, courseId: string, progress: Partial<CourseProgress>): Promise<CourseProgress>;
  getProgress(userId: string, courseId?: string): Promise<CourseProgress[]>;
  addReview(courseId: string, userId: string, review: Omit<CourseReview, 'id' | 'courseId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CourseReview>;
  updateReview(reviewId: string, data: Partial<CourseReview>): Promise<CourseReview>;
  deleteReview(reviewId: string): Promise<void>;
  issueCertificate(userId: string, courseId: string): Promise<Certificate>;
}

export interface CourseFilters {
  category?: string;
  difficulty?: CourseLevel;
  status?: CourseStatus;
  isPremium?: boolean;
  isPublic?: boolean;
  instructorId?: string;
  search?: string; // Search in title, description
  tags?: string[];
  minRating?: number;
  maxPrice?: number;
  hasFreeLessons?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'rating' | 'enrollmentCount' | 'title' | 'price';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Service interfaces
export interface CourseService {
  createCourse(data: CreateCourseInput, instructorId: string): Promise<Course>;
  getCourse(id: string, userId?: string): Promise<Course>;
  getCourses(filters: CourseFilters): Promise<{ courses: Course[]; total: number }>;
  updateCourse(id: string, data: UpdateCourseInput, instructorId: string): Promise<Course>;
  deleteCourse(id: string, instructorId: string): Promise<void>;
  publishCourse(id: string, instructorId: string): Promise<Course>;
  enrollInCourse(courseId: string, userId: string): Promise<CourseEnrollment>;
  unenrollFromCourse(courseId: string, userId: string): Promise<void>;
  getEnrollments(userId: string): Promise<CourseEnrollment[]>;
  getCourseProgress(courseId: string, userId: string): Promise<CourseProgress>;
  updateProgress(courseId: string, userId: string, lessonId: string, data: any): Promise<CourseProgress>;
  markLessonComplete(courseId: string, lessonId: string, userId: string): Promise<void>;
  submitQuiz(quizId: string, userId: string, answers: QuizAnswer[]): Promise<QuizAttempt>;
  addCourseReview(courseId: string, userId: string, review: any): Promise<CourseReview>;
  getCourseReviews(courseId: string, filters?: any): Promise<{ reviews: CourseReview[]; total: number }>;
  issueCertificate(courseId: string, userId: string): Promise<Certificate>;
  getRecommendations(userId: string, limit?: number): Promise<Course[]>;
  searchCourses(query: string, filters?: CourseFilters): Promise<Course[]>;
}

// DTOs for API responses
export interface CourseDto {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: CourseLevel;
  status: CourseStatus;
  estimatedHours: number;
  thumbnail?: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  price?: number;
  isPremium: boolean;
  totalLessons: number;
  tags: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface CourseDetailDto extends CourseDto {
  learningObjectives: string[];
  prerequisites: Prerequisite[];
  lessons: LessonDto[];
  reviews: CourseReview[];
  isEnrolled?: boolean;
  progress?: CourseProgress;
  canAccess?: boolean;
}

export interface LessonDto {
  id: string;
  title: string;
  description?: string;
  type: LessonType;
  estimatedMinutes: number;
  order: number;
  isPreview: boolean;
  isCompleted?: boolean;
  hasQuiz: boolean;
}

export interface LessonDetailDto extends LessonDto {
  content?: string;
  objectives?: string[];
  resources?: LessonResource[];
  codeExample?: CodeExample;
  videoData?: VideoData;
  quiz?: Quiz;
  nextLessonId?: string;
  previousLessonId?: string;
  canAccess?: boolean;
}

// Error types
export class CourseNotFoundError extends Error {
  constructor(courseId: string) {
    super(`Course not found: ${courseId}`);
    this.name = 'CourseNotFoundError';
  }
}

export class LessonNotFoundError extends Error {
  constructor(lessonId: string) {
    super(`Lesson not found: ${lessonId}`);
    this.name = 'LessonNotFoundError';
  }
}

export class AccessDeniedError extends Error {
  constructor(resource: string) {
    super(`Access denied to ${resource}`);
    this.name = 'AccessDeniedError';
  }
}

export class AlreadyEnrolledError extends Error {
  constructor(courseId: string) {
    super(`Already enrolled in course: ${courseId}`);
    this.name = 'AlreadyEnrolledError';
  }
}

export class NotEnrolledError extends Error {
  constructor(courseId: string) {
    super(`Not enrolled in course: ${courseId}`);
    this.name = 'NotEnrolledError';
  }
}

export class QuizAttemptLimitExceededError extends Error {
  constructor(quizId: string) {
    super(`Quiz attempt limit exceeded: ${quizId}`);
    this.name = 'QuizAttemptLimitExceededError';
  }
}

export class PrerequisiteNotMetError extends Error {
  constructor(prerequisite: string) {
    super(`Prerequisite not met: ${prerequisite}`);
    this.name = 'PrerequisiteNotMetError';
  }
}