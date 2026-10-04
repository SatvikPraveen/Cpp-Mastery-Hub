import type { ForumPost } from '@/types';
import { getUserDisplayName } from '@/utils/helpers';

/** Display name for a post's author, falling back to the owning user record. */
export const getAuthorName = (post: Pick<ForumPost, 'user'>): string =>
  getUserDisplayName(post.user);

/** Up to two initials for avatar placeholders. */
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
