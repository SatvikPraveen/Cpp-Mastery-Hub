// File: frontend/src/components/Dashboard/ActivityFeed.tsx
// Extension: .tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BookOpen,
  Code,
  Trophy,
  Share,
  MessageCircle,
  Heart,
  Star,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'lesson_completed' | 'exercise_completed' | 'achievement_unlocked' | 'code_shared' | 'comment_posted' | 'code_liked';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  metadata?: {
    courseTitle?: string;
    exerciseTitle?: string;
    achievementName?: string;
    codeSnippetTitle?: string;
    likes?: number;
    comments?: number;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  showFilters?: boolean;
  maxItems?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  showFilters = true,
  maxItems = 10,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const filterOptions = [
    { value: 'all', label: 'All Activities', icon: Activity },
    { value: 'lesson_completed', label: 'Lessons', icon: BookOpen },
    { value: 'exercise_completed', label: 'Exercises', icon: Code },
    { value: 'achievement_unlocked', label: 'Achievements', icon: Trophy },
    { value: 'code_shared', label: 'Code Shared', icon: Share },
    { value: 'comment_posted', label: 'Comments', icon: MessageCircle },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return BookOpen;
      case 'exercise_completed':
        return Code;
      case 'achievement_unlocked':
        return Trophy;
      case 'code_shared':
        return Share;
      case 'comment_posted':
        return MessageCircle;
      case 'code_liked':
        return Heart;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
      case 'exercise_completed':
        return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      case 'achievement_unlocked':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'code_shared':
        return 'text-purple-500 bg-purple-100 dark:bg-purple-900/20';
      case 'comment_posted':
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900/20';
      case 'code_liked':
        return 'text-pink-500 bg-pink-100 dark:bg-pink-900/20';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredActivities = activities.filter(activity => 
    selectedFilter === 'all' || activity.type === selectedFilter
  );

  const displayedActivities = showAll 
    ? filteredActivities 
    : filteredActivities.slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Recent Activity
        </h2>
        
        {showFilters && (
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {displayedActivities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No activities found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {displayedActivities.map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.type);
              const isExpanded = expandedItems.has(activity.id);
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    <ActivityIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {activity.description}
                        </p>
                        
                        {/* Metadata */}
                        {activity.metadata && (
                          <div className="flex items-center space-x-4 mt-2">
                            {activity.metadata.courseTitle && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                {activity.metadata.courseTitle}
                              </span>
                            )}
                            
                            {activity.metadata.likes !== undefined && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Heart className="w-3 h-3" />
                                <span>{activity.metadata.likes}</span>
                              </div>
                            )}
                            
                            {activity.metadata.comments !== undefined && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <MessageCircle className="w-3 h-3" />
                                <span>{activity.metadata.comments}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Expandable content */}
                        {isExpanded && activity.metadata && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
                          >
                            <div className="space-y-2">
                              {activity.metadata.exerciseTitle && (
                                <div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Exercise: 
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                                    {activity.metadata.exerciseTitle}
                                  </span>
                                </div>
                              )}
                              
                              {activity.metadata.achievementName && (
                                <div className="flex items-center space-x-2">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                    {activity.metadata.achievementName}
                                  </span>
                                </div>
                              )}
                              
                              {activity.metadata.codeSnippetTitle && (
                                <div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Code Snippet: 
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                                    {activity.metadata.codeSnippetTitle}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        
                        {activity.metadata && (
                          <button
                            onClick={() => toggleExpanded(activity.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Load more button */}
          {filteredActivities.length > maxItems && (
            <div className="text-center pt-4">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 inline mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 inline mr-1" />
                    Show {filteredActivities.length - maxItems} More
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;