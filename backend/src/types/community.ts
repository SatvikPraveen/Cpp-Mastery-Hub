// File: backend/src/types/community.ts
// Extension: .ts
// Location: backend/src/types/community.ts

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: Partial<User>;
  category: PostCategory;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  commentCount?: number;
  lastActivity?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PostCategory {
  GENERAL = 'GENERAL',
  QUESTIONS = 'QUESTIONS',
  TUTORIALS = 'TUTORIALS',
  PROJECTS = 'PROJECTS',
  JOBS = 'JOBS',
  ANNOUNCEMENTS = 'ANNOUNCEMENTS'
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author?: Partial<User>;
  postId: string;
  parentId?: string;
  replies?: Comment[];
  upvotes: number;
  downvotes: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vote {
  id: string;
  userId: string;
  targetId: string; // Post or Comment ID
  targetType: 'post' | 'comment';
  type: VoteType;
  createdAt: Date;
}

export enum VoteType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE'
}

export interface ForumStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  activeUsers: number;
  topContributors: UserStats[];
  popularTags: TagStats[];
  categoryStats: CategoryStats[];
}

export interface UserStats {
  userId: string;
  username: string;
  avatar?: string;
  postCount: number;
  commentCount: number;
  reputation: number;
  achievements: number;
}

export interface TagStats {
  tag: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryStats {
  category: PostCategory;
  postCount: number;
  activeUsers: number;
  averageResponseTime: number;
}

export interface ForumFilter {
  category?: PostCategory;
  tags?: string[];
  author?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending' | 'unanswered';
  hasAnswers?: boolean;
  isPinned?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  COURSE_UPDATE = 'COURSE_UPDATE',
  EXERCISE_GRADED = 'EXERCISE_GRADED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  FORUM_REPLY = 'FORUM_REPLY',
  FORUM_MENTION = 'FORUM_MENTION',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  COLLABORATION_INVITE = 'COLLABORATION_INVITE'
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  achievements: boolean;
  courseUpdates: boolean;
  forumActivity: boolean;
  mentions: boolean;
  systemAnnouncements: boolean;
  collaborationInvites: boolean;
}
