// File: backend/src/models/CodeSnippet.ts
// Extension: .ts (TypeScript Model)

import { z } from 'zod';

// Enums
export enum CodeLanguage {
  CPP = 'cpp',
  C = 'c',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JAVA = 'java',
  RUST = 'rust',
  GO = 'go'
}

export enum SnippetType {
  EXAMPLE = 'EXAMPLE',
  EXERCISE = 'EXERCISE',
  SOLUTION = 'SOLUTION',
  PROJECT = 'PROJECT',
  TEMPLATE = 'TEMPLATE',
  UTILITY = 'UTILITY'
}

export enum SnippetVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SHARED = 'SHARED',
  COURSE_ONLY = 'COURSE_ONLY'
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

// Zod schemas for validation
export const CodeFileSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  content: z.string(),
  language: z.nativeEnum(CodeLanguage),
  isMain: z.boolean().default(false),
  description: z.string().optional()
});

export const CompilationResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  errors: z.array(z.object({
    line: z.number(),
    column: z.number(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info'])
  })).default([]),
  warnings: z.array(z.string()).default([]),
  executionTime: z.number().optional(), // in milliseconds
  memoryUsage: z.number().optional(), // in bytes
  compiledAt: z.string().datetime()
});

export const AnalysisResultSchema = z.object({
  complexity: z.object({
    cyclomatic: z.number(),
    cognitive: z.number(),
    lines: z.number(),
    functions: z.number()
  }),
  metrics: z.object({
    linesOfCode: z.number(),
    blankLines: z.number(),
    commentLines: z.number(),
    codeToCommentRatio: z.number()
  }),
  issues: z.array(z.object({
    type: z.enum(['error', 'warning', 'suggestion', 'style']),
    line: z.number(),
    column: z.number(),
    message: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    category: z.string(),
    rule: z.string().optional()
  })).default([]),
  suggestions: z.array(z.object({
    type: z.enum(['performance', 'readability', 'best_practice', 'security']),
    line: z.number(),
    message: z.string(),
    before: z.string(),
    after: z.string(),
    confidence: z.number().min(0).max(1)
  })).default([]),
  score: z.number().min(0).max(100),
  analyzedAt: z.string().datetime()
});

export const SnippetMetadataSchema = z.object({
  difficulty: z.nativeEnum(DifficultyLevel),
  estimatedTime: z.number().min(0).optional(), // in minutes
  concepts: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    description: z.string().optional(),
    isHidden: z.boolean().default(false)
  })).default([]),
  referenceLinks: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    type: z.enum(['documentation', 'tutorial', 'article', 'video'])
  })).default([])
});

export const SnippetStatsSchema = z.object({
  views: z.number().default(0),
  likes: z.number().default(0),
  dislikes: z.number().default(0),
  forks: z.number().default(0),
  downloads: z.number().default(0),
  comments: z.number().default(0),
  executions: z.number().default(0),
  successfulExecutions: z.number().default(0),
  averageExecutionTime: z.number().default(0),
  lastExecuted: z.string().datetime().optional()
});

export const CreateCodeSnippetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000),
  authorId: z.string().uuid(),
  type: z.nativeEnum(SnippetType),
  visibility: z.nativeEnum(SnippetVisibility).default(SnippetVisibility.PUBLIC),
  files: z.array(CodeFileSchema).min(1, 'At least one file is required'),
  metadata: SnippetMetadataSchema,
  tags: z.array(z.string()).default([]),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  parentSnippetId: z.string().uuid().optional() // For forks
});

export const UpdateCodeSnippetSchema = CreateCodeSnippetSchema.partial().omit({ authorId: true });

export const CodeSnippetResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  type: z.nativeEnum(SnippetType),
  visibility: z.nativeEnum(SnippetVisibility),
  files: z.array(CodeFileSchema),
  metadata: SnippetMetadataSchema,
  tags: z.array(z.string()),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  parentSnippetId: z.string().uuid().optional(),
  compilation: CompilationResultSchema.optional(),
  analysis: AnalysisResultSchema.optional(),
  stats: SnippetStatsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastExecutedAt: z.string().datetime().optional()
});

// TypeScript interfaces
export type CodeFile = z.infer<typeof CodeFileSchema>;
export type CompilationResult = z.infer<typeof CompilationResultSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type SnippetMetadata = z.infer<typeof SnippetMetadataSchema>;
export type SnippetStats = z.infer<typeof SnippetStatsSchema>;
export type CreateCodeSnippetRequest = z.infer<typeof CreateCodeSnippetSchema>;
export type UpdateCodeSnippetRequest = z.infer<typeof UpdateCodeSnippetSchema>;
export type CodeSnippetResponse = z.infer<typeof CodeSnippetResponseSchema>;

// Database entity interface
export interface CodeSnippetEntity {
  id: string;
  title: string;
  description: string;
  authorId: string;
  type: SnippetType;
  visibility: SnippetVisibility;
  files: CodeFile[];
  metadata: SnippetMetadata;
  tags: string[];
  courseId?: string;
  lessonId?: string;
  parentSnippetId?: string;
  compilation?: CompilationResult;
  analysis?: AnalysisResult;
  stats: SnippetStats;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  deletedAt?: Date;
}

// User interaction with snippet
export interface SnippetInteraction {
  id: string;
  userId: string;
  snippetId: string;
  type: 'view' | 'like' | 'dislike' | 'fork' | 'download' | 'execute';
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Code execution request
export interface ExecutionRequest {
  snippetId: string;
  userId: string;
  input?: string;
  customFiles?: CodeFile[];
  compilerOptions?: {
    optimization: 'O0' | 'O1' | 'O2' | 'O3';
    standard: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
    warnings: boolean;
    debug: boolean;
  };
}

// Code snippet class with business logic
export class CodeSnippet {
  private data: CodeSnippetEntity;

  constructor(data: CodeSnippetEntity) {
    this.data = data;
  }

  // Getters
  get id(): string { return this.data.id; }
  get title(): string { return this.data.title; }
  get description(): string { return this.data.description; }
  get authorId(): string { return this.data.authorId; }
  get type(): SnippetType { return this.data.type; }
  get visibility(): SnippetVisibility { return this.data.visibility; }
  get files(): CodeFile[] { return this.data.files; }
  get metadata(): SnippetMetadata { return this.data.metadata; }
  get tags(): string[] { return this.data.tags; }
  get courseId(): string | undefined { return this.data.courseId; }
  get lessonId(): string | undefined { return this.data.lessonId; }
  get parentSnippetId(): string | undefined { return this.data.parentSnippetId; }
  get compilation(): CompilationResult | undefined { return this.data.compilation; }
  get analysis(): AnalysisResult | undefined { return this.data.analysis; }
  get stats(): SnippetStats { return this.data.stats; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get lastExecutedAt(): Date | undefined { return this.data.lastExecutedAt; }

  // Business logic methods
  isPublic(): boolean {
    return this.data.visibility === SnippetVisibility.PUBLIC;
  }

  isPrivate(): boolean {
    return this.data.visibility === SnippetVisibility.PRIVATE;
  }

  isFork(): boolean {
    return this.data.parentSnippetId !== undefined;
  }

  canUserView(userId: string, userRole: string): boolean {
    if (this.data.authorId === userId) return true;
    if (this.data.visibility === SnippetVisibility.PUBLIC) return true;
    if (this.data.visibility === SnippetVisibility.PRIVATE) return false;
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') return true;
    return false;
  }

  canUserEdit(userId: string, userRole: string): boolean {
    if (this.data.authorId === userId) return true;
    if (userRole === 'ADMIN') return true;
    return false;
  }

  getMainFile(): CodeFile | undefined {
    return this.data.files.find(file => file.isMain) || this.data.files[0];
  }

  getFilesByLanguage(language: CodeLanguage): CodeFile[] {
    return this.data.files.filter(file => file.language === language);
  }

  addFile(file: CodeFile): void {
    // If this is the first file, make it main
    if (this.data.files.length === 0) {
      file.isMain = true;
    }
    this.data.files.push(file);
    this.updateTimestamp();
  }

  updateFile(filename: string, updates: Partial<CodeFile>): boolean {
    const fileIndex = this.data.files.findIndex(f => f.filename === filename);
    if (fileIndex === -1) return false;

    this.data.files[fileIndex] = { ...this.data.files[fileIndex], ...updates };
    this.updateTimestamp();
    return true;
  }

  removeFile(filename: string): boolean {
    const initialLength = this.data.files.length;
    if (initialLength <= 1) return false; // Don't allow removing the last file

    const removingMain = this.data.files.find(f => f.filename === filename)?.isMain;
    this.data.files = this.data.files.filter(f => f.filename !== filename);

    // If we removed the main file, make the first remaining file main
    if (removingMain && this.data.files.length > 0) {
      this.data.files[0].isMain = true;
    }

    if (this.data.files.length < initialLength) {
      this.updateTimestamp();
      return true;
    }
    return false;
  }

  setMainFile(filename: string): boolean {
    const file = this.data.files.find(f => f.filename === filename);
    if (!file) return false;

    // Remove main flag from all files
    this.data.files.forEach(f => f.isMain = false);
    // Set main flag on target file
    file.isMain = true;
    this.updateTimestamp();
    return true;
  }

  updateCompilation(result: CompilationResult): void {
    this.data.compilation = result;
    this.data.lastExecutedAt = new Date();
    this.data.stats.executions++;
    if (result.success) {
      this.data.stats.successfulExecutions++;
    }
    if (result.executionTime) {
      this.data.stats.averageExecutionTime = 
        (this.data.stats.averageExecutionTime * (this.data.stats.executions - 1) + result.executionTime) 
        / this.data.stats.executions;
    }
    this.updateTimestamp();
  }

  updateAnalysis(result: AnalysisResult): void {
    this.data.analysis = result;
    this.updateTimestamp();
  }

  incrementView(): void {
    this.data.stats.views++;
    this.updateTimestamp();
  }

  incrementLike(): void {
    this.data.stats.likes++;
    this.updateTimestamp();
  }

  decrementLike(): void {
    this.data.stats.likes = Math.max(0, this.data.stats.likes - 1);
    this.updateTimestamp();
  }

  incrementDislike(): void {
    this.data.stats.dislikes++;
    this.updateTimestamp();
  }

  decrementDislike(): void {
    this.data.stats.dislikes = Math.max(0, this.data.stats.dislikes - 1);
    this.updateTimestamp();
  }

  incrementFork(): void {
    this.data.stats.forks++;
    this.updateTimestamp();
  }

  incrementDownload(): void {
    this.data.stats.downloads++;
    this.updateTimestamp();
  }

  incrementComment(): void {
    this.data.stats.comments++;
    this.updateTimestamp();
  }

  decrementComment(): void {
    this.data.stats.comments = Math.max(0, this.data.stats.comments - 1);
    this.updateTimestamp();
  }

  updateMetadata(updates: Partial<SnippetMetadata>): void {
    this.data.metadata = { ...this.data.metadata, ...updates };
    this.updateTimestamp();
  }

  addTag(tag: string): void {
    if (!this.data.tags.includes(tag)) {
      this.data.tags.push(tag);
      this.updateTimestamp();
    }
  }

  removeTag(tag: string): void {
    const initialLength = this.data.tags.length;
    this.data.tags = this.data.tags.filter(t => t !== tag);
    if (this.data.tags.length < initialLength) {
      this.updateTimestamp();
    }
  }

  clone(): CreateCodeSnippetRequest {
    return {
      title: `Fork of ${this.data.title}`,
      description: this.data.description,
      authorId: '', // Will be set by the calling code
      type: this.data.type,
      visibility: SnippetVisibility.PUBLIC,
      files: [...this.data.files],
      metadata: { ...this.data.metadata },
      tags: [...this.data.tags],
      parentSnippetId: this.data.id
    };
  }

  calculateComplexityScore(): number {
    if (!this.data.analysis) return 0;
    
    const { complexity } = this.data.analysis;
    const complexityScore = Math.min(100, (complexity.cyclomatic * 2 + complexity.cognitive) / 2);
    return Math.round(complexityScore);
  }

  getQualityScore(): number {
    if (!this.data.analysis) return 0;
    return this.data.analysis.score;
  }

  isExecutable(): boolean {
    return this.data.files.some(file => 
      [CodeLanguage.CPP, CodeLanguage.C, CodeLanguage.PYTHON, CodeLanguage.JAVASCRIPT].includes(file.language)
    );
  }

  private updateTimestamp(): void {
    this.data.updatedAt = new Date();
  }

  // Convert to response format
  toResponse(authorName: string): CodeSnippetResponse {
    return {
      id: this.data.id,
      title: this.data.title,
      description: this.data.description,
      authorId: this.data.authorId,
      authorName,
      type: this.data.type,
      visibility: this.data.visibility,
      files: this.data.files,
      metadata: this.data.metadata,
      tags: this.data.tags,
      courseId: this.data.courseId,
      lessonId: this.data.lessonId,
      parentSnippetId: this.data.parentSnippetId,
      compilation: this.data.compilation,
      analysis: this.data.analysis,
      stats: this.data.stats,
      createdAt: this.data.createdAt.toISOString(),
      updatedAt: this.data.updatedAt.toISOString(),
      lastExecutedAt: this.data.lastExecutedAt?.toISOString()
    };
  }

  // Convert to public preview format
  toPreview(authorName: string): Partial<CodeSnippetResponse> {
    return {
      id: this.data.id,
      title: this.data.title,
      description: this.data.description,
      authorName,
      type: this.data.type,
      files: this.data.files.map(file => ({
        ...file,
        content: file.content.length > 500 ? file.content.substring(0, 500) + '...' : file.content
      })),
      metadata: {
        difficulty: this.data.metadata.difficulty,
        concepts: this.data.metadata.concepts,
        topics: this.data.metadata.topics,
        estimatedTime: this.data.metadata.estimatedTime
      },
      tags: this.data.tags,
      stats: {
        views: this.data.stats.views,
        likes: this.data.stats.likes,
        forks: this.data.stats.forks,
        comments: this.data.stats.comments,
        dislikes: this.data.stats.dislikes,
        downloads: this.data.stats.downloads,
        executions: this.data.stats.executions,
        successfulExecutions: this.data.stats.successfulExecutions,
        averageExecutionTime: this.data.stats.averageExecutionTime,
        lastExecuted: this.data.stats.lastExecuted
      },
      createdAt: this.data.createdAt.toISOString()
    };
  }

  // Static factory methods
  static fromEntity(entity: CodeSnippetEntity): CodeSnippet {
    return new CodeSnippet(entity);
  }

  static validate(data: unknown): CreateCodeSnippetRequest {
    return CreateCodeSnippetSchema.parse(data);
  }

  static validateUpdate(data: unknown): UpdateCodeSnippetRequest {
    return UpdateCodeSnippetSchema.parse(data);
  }
}