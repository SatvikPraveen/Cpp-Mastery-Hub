import React from 'react';

import { cn } from '@/utils/cn';

interface TagListProps {
  tags: string[];
  /** When provided, tags render as buttons (e.g. to filter by tag). */
  onTagClick?: (tag: string) => void;
  max?: number;
  className?: string;
}

const tagClasses =
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';

export const TagList: React.FC<TagListProps> = ({ tags, onTagClick, max, className }) => {
  const visible = max !== undefined ? tags.slice(0, max) : tags;
  const hidden = tags.length - visible.length;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {visible.map((tag) =>
        onTagClick ? (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className={cn(tagClasses, 'hover:bg-blue-100 dark:hover:bg-blue-900/50')}
          >
            #{tag}
          </button>
        ) : (
          <span key={tag} className={tagClasses}>
            #{tag}
          </span>
        )
      )}
      {hidden > 0 && <span className="text-xs text-gray-500">+{hidden} more</span>}
    </div>
  );
};

export default TagList;
