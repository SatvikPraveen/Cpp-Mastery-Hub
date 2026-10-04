import React from 'react';

import { cn } from '@/utils/cn';

interface ProgressProps {
  /** Current value, clamped to [0, max]. */
  value: number;
  max?: number | undefined;
  className?: string | undefined;
  barClassName?: string | undefined;
  label?: string | undefined;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  barClassName,
  label,
}) => {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : (clamped / max) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label ?? 'Progress'}
      className={cn('w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden', className)}
    >
      <div
        className={cn('h-full rounded-full bg-blue-600 transition-all duration-300', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

export default Progress;
