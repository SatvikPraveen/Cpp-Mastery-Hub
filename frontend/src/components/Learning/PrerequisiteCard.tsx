import { ArrowRight, BookOpen, CheckCircle } from 'lucide-react';
import React from 'react';

import type { Prerequisite } from '@/types';

interface PrerequisiteCardProps {
  prerequisite: Prerequisite;
  onClick?: () => void;
}

export const PrerequisiteCard: React.FC<PrerequisiteCardProps> = ({ prerequisite, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
  >
    {prerequisite.isCompleted ? (
      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
    ) : (
      <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm text-gray-900 dark:text-white">{prerequisite.title}</p>
      {prerequisite.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{prerequisite.description}</p>
      )}
    </div>
    <ArrowRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
  </button>
);

export default PrerequisiteCard;
