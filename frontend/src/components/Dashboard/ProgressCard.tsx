// File: frontend/src/components/Dashboard/ProgressCard.tsx
// Extension: .tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, TrendingUp, Target } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  progress: number;
  lastAccessed: string;
  thumbnail: string;
  difficulty: string;
}

interface ProgressCardProps {
  title: string;
  courses: Course[];
  totalLessons: number;
  completedLessons: number;
  studyTimeMinutes: number;
}

const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  courses,
  totalLessons,
  completedLessons,
  studyTimeMinutes,
}) => {
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const studyHours = Math.round(studyTimeMinutes / 60);
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          {title}
        </h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {overallProgress}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Complete
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Progress
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedLessons}/{totalLessons} lessons
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <BookOpen className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {courses.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Active Courses
          </div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {studyHours}h
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Study Time
          </div>
        </div>
      </div>

      {/* Course Progress List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Target className="w-4 h-4 mr-2 text-purple-500" />
          Recent Courses
        </h3>
        
        {courses.slice(0, 3).map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-medium">
              {course.title.charAt(0)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {course.title}
                </h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(course.difficulty)}`}>
                  {course.difficulty}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last accessed: {new Date(course.lastAccessed).toLocaleDateString()}
                </span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {course.progress}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${course.progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
        
        {courses.length > 3 && (
          <button className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
            View All Courses ({courses.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressCard;