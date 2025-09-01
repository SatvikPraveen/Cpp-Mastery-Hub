// File: backend/src/models/ForumPost.ts
// Extension: .ts (TypeScript Model)

import { z } from 'zod';

// Enums
export enum PostCategory {
  QUESTIONS = 'QUESTIONS',
  TUTORIALS = 'TUTORIALS',
  PROJECTS = 'PROJECTS',
  DISCUSSIONS = 'DISCUSSIONS',
  HELP = 'HELP',
  ANNOUNCEMENTS = 'ANNOUNCEMENTS',
  JOBS = 'JOBS',
  NEWS = 'NEWS'
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  FLAGGED = 'FLAGGED'
}

export enum PostType {
  QUESTION = 'QUESTION',
  DISCUSSION = 'DISCUSSION',
  TUTORIAL = 'TUTORIAL',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  POLL = 'POLL',
  SHOWCASE = 'SHOWCASE'
}

export enum VoteType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE'
}

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  COPYRIGHT = 'COPYRIGHT',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER'
}

// Validation schemas
export const CreateForumPostSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must be less than 150 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be less than 50,000 characters'),
  category: z.nativeEnum(PostCategory),
  type: z.nativeEnum(PostType).default(PostType.DISCUSSION),
  tags: z.array(z.string().min(1).max(30)).max(10, 'Maximum 10 tags allowed').optional(),
  codeSnippets: z.array(z.object({
    title: z.string().optional(),
    code: z.string(),
    language: z.string(),
    description: z.string().optional()
  })).optional(),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedReadTime: z.number().min(1).max(60).optional(), // in minutes
  isDraft: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  isPinned: z.boolean().default(false).optional(),
  expiresAt: z.date().optional(),
  pollOptions: z.array(z.string()).min(2).max(10).optional(), // for poll posts
  relatedCourseId: z.string().optional(),
  relatedLessonId: z.string().optional()
});

export const UpdateForumPostSchema = CreateForumPostSchema.partial();

export const CreateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(10000, 'Comment must be less than 10,000 characters'),
  parentId: z.string().optional(),
  codeSnippets: z.array(z.object({
    code: z.string(),
    language: z.string(),
    description: z.string().optional()
  })).optional(),
  images: z.array(z.string().url()).max(3, 'Maximum 3 images allowed').optional()
});

export const UpdateCommentSchema = CreateCommentSchema.partial();

export const VoteSchema = z.object({
  type: z.nativeEnum(VoteType)
});

export const ReportSchema = z.object({
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

// Type definitions
export type CreateForumPostInput = z.infer<typeof CreateForumPostSchema>;
export type UpdateForumPostInput = z.infer<typeof UpdateForumPostSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type VoteInput = z.infer<typeof VoteSchema>;
export type ReportInput = z.infer<typeof ReportSchema>;

// Main interfaces
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  type: PostType;
  status: PostStatus;
  authorId: string;
  author: PostAuthor;
  tags: string[];
  codeSnippets: CodeSnippet[];
  images: PostImage[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number;
  views: number;
  likes: number;
  dislikes: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  score: number; // Calculated based on votes, engagement, etc.
  hotScore: number; // For trending algorithm
  isLikedByUser?: boolean;
  isDislikedByUser?: boolean;
  isBookmarkedByUser?: boolean;
  isFollowedByUser?: boolean;
  userVote?: VoteType;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  solvedAt?: Date;
  bestAnswerId?: string;
  bestAnswer?: Comment;
  allowComments: boolean;
  expiresAt?: Date;
  pollOptions?: PollOption[];
  pollVotes?: PollVote[];
  totalPollVotes?: number;
  relatedCourseId?: string;
  relatedLessonId?: string;
  relatedCourse?: RelatedCourse;
  relatedLesson?: RelatedLesson;
  comments: Comment[];
  followers: PostFollower[];
  reports: PostReport[];
  editHistory: PostEdit[];
  lastActivityAt: Date;
  featuredAt?: Date;
  trendingRank?: number;
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface PostAuthor {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  reputation: number;
  badgeCount: number;
  isVerified: boolean;
  isOnline: boolean;
  lastActiveAt?: Date;
  joinedAt: Date;
  postCount: number;
  helpfulAnswerCount: number;
}

export interface CodeSnippet {
  id: string;
  title?: string;
  code: string;
  language: string;
  description?: string;
  lineNumbers?: boolean;
  highlightLines?: number[];
  runnable?: boolean;
  expectedOutput?: string;
}

export interface PostImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  size: number; // file size in bytes
  format: string;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  parentId?: string;
  replies: Comment[];
  replyCount: number;
  codeSnippets: CodeSnippet[];
  images: PostImage[];
  likes: number;
  dislikes: number;
  score: number;
  isLikedByUser?: boolean;
  isDislikedByUser?: boolean;
  userVote?: VoteType;
  isBestAnswer: boolean;
  isModeratorResponse: boolean;
  isAuthorResponse: boolean; // Response from the post author
  editHistory: CommentEdit[];
  reports: CommentReport[];
  mentionedUsers: string[];
  depth: number; // Nesting level
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOption {
  id: string;
  text: string;
  order: number;
  votes: number;
  percentage: number;
}

export interface PollVote {
  id: string;
  postId: string;
  optionId: string;
  userId: string;
  createdAt: Date;
}

export interface PostVote {
  id: string;
  postId: string;
  userId: string;
  type: VoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentVote {
  id: string;
  commentId: string;
  userId: string;
  type: VoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostBookmark {
  id: string;
  postId: string;
  userId: string;
  collectionId?: string;
  notes?: string;
  tags: string[];
  createdAt: Date;
}

export interface PostFollower {
  id: string;
  postId: string;
  userId: string;
  user: PostAuthor;
  notificationEnabled: boolean;
  createdAt: Date;
}

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reporter: PostAuthor;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reporterId: string;
  reporter: PostAuthor;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

export interface PostEdit {
  id: string;
  postId: string;
  editorId: string;
  editor: PostAuthor;
  previousTitle?: string;
  previousContent?: string;
  newTitle?: string;
  newContent?: string;
  editReason?: string;
  changesSummary: string;
  createdAt: Date;
}

export interface CommentEdit {
  id: string;
  commentId: string;
  editorId: string;
  editor: PostAuthor;
  previousContent: string;
  newContent: string;
  editReason?: string;
  createdAt: Date;
}

export interface PostView {
  id: string;
  postId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  timeSpent?: number; // in seconds
  scrollDepth?: number; // percentage
  viewedAt: Date;
}

export interface RelatedCourse {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  thumbnail?: string;
}

export interface RelatedLesson {
  id: string;
  title: string;
  courseId: string;
  order: number;
  type: string;
}

export interface PostStatistics {
  totalViews: number;
  uniqueViews: number;
  averageTimeSpent: number;
  averageScrollDepth: number;
  engagementRate: number;
  conversionRate: number; // if related to course/lesson
  peakViewingTime: Date;
  geographicDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  referrerDistribution: Record<string, number>;
}

// Repository interfaces
export interface ForumPostRepository {
  create(data: CreateForumPostInput, authorId: string): Promise<ForumPost>;
  findById(id: string, userId?: string): Promise<ForumPost | null>;
  findByAuthor(authorId: string, filters?: PostFilters): Promise<{ posts: ForumPost[]; total: number }>;
  findMany(filters: PostFilters): Promise<{ posts: ForumPost[]; total: number }>;
  update(id: string, data: UpdateForumPostInput, userId: string): Promise<ForumPost>;
  delete(id: string, userId: string): Promise<void>;
  vote(id: string, userId: string, type: VoteType): Promise<void>;
  removeVote(id: string, userId: string): Promise<void>;
  bookmark(id: string, userId: string, collectionId?: string): Promise<PostBookmark>;
  removeBookmark(id: string, userId: string): Promise<void>;
  follow(id: string, userId: string): Promise<void>;
  unfollow(id: string, userId: string): Promise<void>;
  addComment(id: string, data: CreateCommentInput, userId: string): Promise<Comment>;
  updateComment(commentId: string, data: UpdateCommentInput, userId: string): Promise<Comment>;
  deleteComment(commentId: string, userId: string): Promise<void>;
  voteComment(commentId: string, userId: string, type: VoteType): Promise<void>;
  removeCommentVote(commentId: string, userId: string): Promise<void>;
  markAsBestAnswer(commentId: string, userId: string): Promise<void>;
  unmarkAsBestAnswer(commentId: string, userId: string): Promise<void>;
  incrementViews(id: string, userId?: string, metadata?: any): Promise<void>;
  report(id: string, userId: string, data: ReportInput): Promise<PostReport>;
  reportComment(commentId: string, userId: string, data: ReportInput): Promise<CommentReport>;
  pin(id: string, userId: string): Promise<void>;
  unpin(id: string, userId: string): Promise<void>;
  lock(id: string, userId: string, reason?: string): Promise<void>;
  unlock(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<void>;
  feature(id: string, userId: string): Promise<void>;
  unfeature(id: string, userId: string): Promise<void>;
  getStatistics(id: string): Promise<PostStatistics>;
  getTrending(timeframe: 'hour' | 'day' | 'week' | 'month', limit?: number): Promise<ForumPost[]>;
  getPopular(timeframe: 'week' | 'month' | 'all', limit?: number): Promise<ForumPost[]>;
  getRecent(limit?: number): Promise<ForumPost[]>;
  getFeatured(limit?: number): Promise<ForumPost[]>;
  search(query: string, filters?: PostFilters): Promise<ForumPost[]>;
  getByTag(tag: string, filters?: PostFilters): Promise<ForumPost[]>;
  getRelated(id: string, limit?: number): Promise<ForumPost[]>;
  getUserBookmarks(userId: string): Promise<PostBookmark[]>;
  getUserFollowing(userId: string): Promise<ForumPost[]>;
  getUserDrafts(userId: string): Promise<ForumPost[]>;
  bulkUpdateStatus(ids: string[], status: PostStatus, userId: string): Promise<void>;
  getModeratorQueue(filters?: any): Promise<{ posts: ForumPost[]; reports: PostReport[] }>;
}

export interface PostFilters {
  category?: PostCategory;
  type?: PostType;
  status?: PostStatus;
  authorId?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  hasCodeSnippets?: boolean;
  isSolved?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  minScore?: number;
  minViews?: number;
  minComments?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'score' | 'hotScore' | 'views' | 'likes' | 'commentCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Service interfaces
export interface ForumPostService {
  createPost(data: CreateForumPostInput, authorId: string): Promise<ForumPost>;
  getPost(id: string, userId?: string): Promise<ForumPost>;
  getPosts(filters: PostFilters): Promise<{ posts: ForumPost[]; total: number }>;
  updatePost(id: string, data: UpdateForumPostInput, userId: string): Promise<ForumPost>;
  deletePost(id: string, userId: string): Promise<void>;
  votePost(id: string, userId: string, type: VoteType): Promise<void>;
  bookmarkPost(id: string, userId: string): Promise<void>;
  followPost(id: string, userId: string): Promise<void>;
  addComment(id: string, data: CreateCommentInput, userId: string): Promise<Comment>;
  getComments(id: string, sortBy?: 'createdAt' | 'score'): Promise<Comment[]>;
  getTrendingPosts(timeframe?: 'day' | 'week' | 'month', limit?: number): Promise<ForumPost[]>;
  getPopularPosts(timeframe?: 'week' | 'month' | 'all', limit?: number): Promise<ForumPost[]>;
  getFeaturedPosts(limit?: number): Promise<ForumPost[]>;
  searchPosts(query: string, filters?: PostFilters): Promise<ForumPost[]>;
  getPostsByCategory(category: PostCategory, filters?: PostFilters): Promise<ForumPost[]>;
  getPostsByTag(tag: string, filters?: PostFilters): Promise<ForumPost[]>;
  getUserPosts(userId: string, filters?: PostFilters): Promise<ForumPost[]>;
  getUserBookmarks(userId: string): Promise<PostBookmark[]>;
  reportPost(id: string, userId: string, data: ReportInput): Promise<void>;
  moderatePost(id: string, action: 'pin' | 'lock' | 'feature' | 'archive', userId: string): Promise<void>;
  getPostStatistics(id: string): Promise<PostStatistics>;
  getRelatedPosts(id: string, limit?: number): Promise<ForumPost[]>;
  notifyFollowers(postId: string, event: string, data?: any): Promise<void>;
}

// DTOs for API responses
export interface ForumPostDto {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  type: PostType;
  author: {
    id: string;
    username: string;
    avatar?: string;
    reputation: number;
    role: string;
  };
  tags: string[];
  views: number;
  likes: number;
  commentCount: number;
  score: number;
  isPinned: boolean;
  isSolved: boolean;
  estimatedReadTime?: number;
  isLikedByUser?: boolean;
  isBookmarkedByUser?: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ForumPostDetailDto extends ForumPostDto {
  codeSnippets: CodeSnippet[];
  images: PostImage[];
  bestAnswer?: Comment;
  relatedCourse?: RelatedCourse;
  relatedLesson?: RelatedLesson;
  canEdit?: boolean;
  canDelete?: boolean;
  canModerate?: boolean;
  editHistory: PostEdit[];
}

// Error types
export class PostNotFoundError extends Error {
  constructor(postId: string) {
    super(`Forum post not found: ${postId}`);
    this.name = 'PostNotFoundError';
  }
}

export class PostAccessDeniedError extends Error {
  constructor(action: string) {
    super(`Access denied: ${action}`);
    this.name = 'PostAccessDeniedError';
  }
}

export class PostValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation error in ${field}: ${message}`);
    this.name = 'PostValidationError';
  }
}

export class PostModerationError extends Error {
  constructor(action: string, reason: string) {
    super(`Moderation action '${action}' failed: ${reason}`);
    this.name = 'PostModerationError';
  }
}

export class PostSpamError extends Error {
  constructor() {
    super('Post rejected due to spam detection');
    this.name = 'PostSpamError';
  }
}

export class PostRateLimitError extends Error {
  constructor(timeRemaining: number) {
    super(`Rate limit exceeded. Try again in ${timeRemaining} seconds`);
    this.name = 'PostRateLimitError';
  }
}