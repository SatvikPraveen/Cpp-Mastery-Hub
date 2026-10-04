import type { ForumPost } from '@/types';

/** Display name for a post's author, falling back to the owning user record. */
export const getAuthorName = (post: Pick<ForumPost, 'author' | 'user'>): string =>
  post.author?.name ?? post.author?.username ?? post.user?.name ?? 'Anonymous';

/** Up to two initials for avatar placeholders. */
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
