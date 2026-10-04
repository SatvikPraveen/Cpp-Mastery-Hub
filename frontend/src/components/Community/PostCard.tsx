import { formatDistanceToNow } from 'date-fns';
import { Eye, Heart, MessageSquare, Pin, TrendingUp } from 'lucide-react';
import React from 'react';

import TagList from '@/components/Common/TagList';
import UserAvatar from '@/components/Common/UserAvatar';
import type { ForumPost } from '@/types';
import { cn } from '@/utils/cn';

import { getAuthorName } from './forumHelpers';

interface PostCardProps {
  post: ForumPost;
  onClick?: () => void;
  onUserClick?: () => void;
  showTrendingBadge?: boolean;
  /** Forces the pinned styling even if `post.isPinned` is false. */
  isPinned?: boolean;
  className?: string;
}

const relativeTime = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : formatDistanceToNow(parsed, { addSuffix: true });
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onClick,
  onUserClick,
  showTrendingBadge = false,
  isPinned,
  className,
}) => {
  const pinned = isPinned ?? post.isPinned;
  const authorName = getAuthorName(post);
  const replies =(post._count?.comments ?? 0);
  const views = post.views;
  const score =post.likes;

  return (
    <article
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5 transition-shadow hover:shadow-md',
        pinned
          ? 'border-yellow-300 dark:border-yellow-700'
          : 'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-start space-x-4">
        <button
          type="button"
          onClick={onUserClick}
          disabled={!onUserClick}
          aria-label={`View ${authorName}'s profile`}
          className="flex-shrink-0 rounded-full disabled:cursor-default"
        >
          <UserAvatar user={post.user ?? post.user} size="md" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {pinned && <Pin className="h-4 w-4 text-yellow-600" aria-label="Pinned" />}
            {showTrendingBadge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </span>
            )}
          </div>

          <button type="button" onClick={onClick} className="block text-left w-full group">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
              {post.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {post.content}
            </p>
          </button>

          {post.tags.length > 0 && <TagList tags={post.tags} max={4} className="mt-3" />}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{authorName}</span>
            <span>{relativeTime(post.createdAt)}</span>
            <span className="flex items-center">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              {replies}
            </span>
            <span className="flex items-center">
              <Eye className="h-3.5 w-3.5 mr-1" />
              {views}
            </span>
            <span className="flex items-center">
              <Heart className="h-3.5 w-3.5 mr-1" />
              {score}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
