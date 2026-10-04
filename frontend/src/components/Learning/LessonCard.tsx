import { CheckCircle, Clock, Lock, PlayCircle } from 'lucide-react';
import React from 'react';

import type { Lesson } from '@/types';

interface LessonCardProps {
  lesson: Lesson;
  /** 1-based position of the lesson within its course. */
  index: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  index,
  isCompleted = false,
  isLocked = false,
  onClick,
}) => {
  const minutes = lesson.estimatedMinutes ?? lesson.estimatedTime;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className="w-full text-left flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          isCompleted
            ? 'bg-green-100 text-green-600 dark:bg-green-900/40'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
        }`}
      >
        {isCompleted ? <CheckCircle className="h-5 w-5" /> : index}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{lesson.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {lesson.description}
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {minutes} min
        </span>
        {isLocked ? (
          <Lock className="h-5 w-5" aria-label="Locked" />
        ) : (
          <PlayCircle className="h-5 w-5 text-blue-600" aria-label="Start lesson" />
        )}
      </div>
    </button>
  );
};

export default LessonCard;
