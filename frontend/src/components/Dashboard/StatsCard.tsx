// File: frontend/src/components/Dashboard/StatsCard.tsx
// Extension: .tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  unit?: string;
  total?: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  percentage?: number;
  isLoading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  unit,
  total,
  icon: Icon,
  color,
  bgColor,
  change,
  changeType,
  percentage,
  isLoading = false,
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const getChangeColor = () => {
    if (!change) return '';
    return changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getChangeIcon = () => {
    if (!change) return null;
    return changeType === 'increase' ? TrendingUp : TrendingDown;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    );
  }

  const ChangeIcon = getChangeIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline space-x-1">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {formatValue(value)}
            </motion.span>
            {unit && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {unit}
              </span>
            )}
            {total && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / {formatValue(total)}
              </span>
            )}
          </div>

          {/* Progress bar for percentage values */}
          {percentage !== undefined && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {percentage}% complete
              </span>
            </div>
          )}

          {/* Change indicator */}
          {change && ChangeIcon && (
            <div className={`flex items-center mt-2 ${getChangeColor()}`}>
              <ChangeIcon className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium">
                {Math.abs(change)} {changeType === 'increase' ? 'increase' : 'decrease'}
              </span>
            </div>
          )}
        </div>

        {/* Additional visual indicator */}
        {percentage !== undefined && (
          <div className="text-right">
            <div className={`text-lg font-semibold ${color}`}>
              {percentage}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              completion
            </div>
          </div>
        )}
      </div>

      {/* Sparkline or mini chart could go here */}
      {change && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              vs last period
            </span>
            <div className={`flex items-center ${getChangeColor()}`}>
              {ChangeIcon && <ChangeIcon className="w-3 h-3 mr-1" />}
              <span className="text-xs font-medium">
                {changeType === 'increase' ? '+' : '-'}{Math.abs(change)}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StatsCard;