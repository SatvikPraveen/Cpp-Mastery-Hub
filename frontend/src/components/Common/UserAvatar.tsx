import React from 'react';

import { cn } from '@/utils/cn';

export interface AvatarUser {
  name?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string;
}

interface UserAvatarProps {
  user?: AvatarUser | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

const initialsFor = (user?: AvatarUser | null): string => {
  const source = user?.name ?? user?.username ?? '';
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className }) => {
  const src = user?.avatar ?? user?.avatarUrl;
  const label = user?.name ?? user?.username ?? 'User';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary hosts
      <img
        src={src}
        alt={label}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center font-medium text-white',
        'bg-gradient-to-r from-blue-500 to-purple-500',
        sizeClasses[size],
        className
      )}
    >
      {initialsFor(user)}
    </div>
  );
};

export default UserAvatar;
