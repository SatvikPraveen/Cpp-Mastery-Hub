// File: frontend/src/components/Dashboard/QuickActions.tsx
// Extension: .tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  BookOpen,
  Users,
  FileText,
  Play,
  Search,
  Plus,
  Zap,
  Target,
  MessageSquare,
} from 'lucide-react';
import { useRouter } from 'next/router';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  href: string;
  external?: boolean;
  badge?: string;
}

const QuickActions: React.FC = () => {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: 'code-playground',
      title: 'Code Playground',
      description: 'Start coding instantly',
      icon: Code,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      href: '/code',
    },
    {
      id: 'continue-learning',
      title: 'Continue Learning',
      description: 'Resume your last lesson',
      icon: BookOpen,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      href: '/learn',
      badge: 'New',
    },
    {
      id: 'join-community',
      title: 'Join Discussion',
      description: 'Connect with other learners',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      href: '/community',
    },
    {
      id: 'create-snippet',
      title: 'Create Snippet',
      description: 'Share your code',
      icon: FileText,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      href: '/code/snippets',
    },
    {
      id: 'practice-exercise',
      title: 'Practice Exercise',
      description: 'Solve coding challenges',
      icon: Target,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      href: '/learn/exercises',
    },
    {
      id: 'ask-question',
      title: 'Ask Question',
      description: 'Get help from experts',
      icon: MessageSquare,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
      href: '/community/ask',
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    if (action.external) {
      window.open(action.href, '_blank');
    } else {
      router.push(action.href);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Quick Actions
        </h3>
        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
          Customize
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick(action)}
              className="relative p-4 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
            >
              {/* Badge */}
              {action.badge && (
                <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  {action.badge}
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Additional Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          More Actions
        </h4>
        
        <div className="space-y-2">
          <button
            onClick={() => router.push('/search')}
            className="w-full flex items-center space-x-3 p-2 text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search Courses & Content</span>
          </button>
          
          <button
            onClick={() => router.push('/code/new')}
            className="w-full flex items-center space-x-3 p-2 text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Project</span>
          </button>
          
          <button
            onClick={() => router.push('/learn/quiz')}
            className="w-full flex items-center space-x-3 p-2 text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm">Take Quiz</span>
          </button>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <h4 className="text-sm font-medium mb-1">Ready for a Challenge?</h4>
          <p className="text-xs opacity-90 mb-3">
            Try our daily coding challenge and compete with others!
          </p>
          <button
            onClick={() => router.push('/challenges/daily')}
            className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Start Daily Challenge
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;