// File: frontend/src/components/Dashboard/Dashboard.tsx
// Extension: .tsx
// Location: frontend/src/components/Dashboard/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Code, 
  Trophy, 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { ProgressCard } from './ProgressCard';
import { StatsCard } from './StatsCard';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { formatRelativeTime, formatDuration } from '../../utils/formatting';

interface DashboardStats {
  coursesInProgress: number;
  coursesCompleted: number;
  codeSnippets: number;
  forumPosts: number;
  totalTimeSpent: number;
  currentStreak: number;
  achievements: number;
  communityRank: number;
}

interface RecentActivity {
  id: string;
  type: 'course_progress' | 'code_execution' | 'forum_post' | 'achievement' | 'snippet_created';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface LearningProgress {
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
  lastAccessedAt: string;
  nextLessonTitle: string;
  estimatedTimeToComplete: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        userResponse,
        progressResponse,
        recommendationsResponse,
        activityResponse
      ] = await Promise.all([
        api.get('/users/me'),
        api.get('/learning/progress'),
        api.get('/learning/recommendations'),
        api.get('/users/me/activity')
      ]);

      const userData = userResponse.data.user;
      
      // Extract stats from user data
      const dashboardStats: DashboardStats = {
        coursesInProgress: userData.statistics?.coursesInProgress || 0,
        coursesCompleted: userData.statistics?.coursesCompleted || 0,
        codeSnippets: userData.statistics?.codeSnippets || 0,
        forumPosts: userData.statistics?.forumPosts || 0,
        totalTimeSpent: userData.statistics?.totalTimeSpent || 0,
        currentStreak: userData.currentStreak || 0,
        achievements: userData.achievements?.length || 0,
        communityRank: userData.communityRank || 0
      };

      setStats(dashboardStats);
      
      // Process learning progress
      const progress = progressResponse.data.progress?.map((p: any) => ({
        courseId: p.courseId._id,
        courseTitle: p.courseId.title,
        progressPercentage: p.progressPercentage,
        lastAccessedAt: p.lastAccessedAt,
        nextLessonTitle: p.nextLessonTitle || 'Continue Learning',
        estimatedTimeToComplete: p.estimatedTimeToComplete || 0
      })) || [];

      setLearningProgress(progress);
      setRecommendations(recommendationsResponse.data.recommendations || []);
      setRecentActivity(activityResponse.data.activities || []);

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
            
            {/* Stats grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow h-64"></div>
                <div className="bg-white p-6 rounded-lg shadow h-64"></div>
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow h-64"></div>
                <div className="bg-white p-6 rounded-lg shadow h-64"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getGreeting()}, {user?.firstName || user?.username}! 👋
          </h1>
          <p className="text-gray-600">
            Ready to continue your C++ mastery journey? Here's your progress overview.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={itemVariants}
        >
          <StatsCard
            title="Courses in Progress"
            value={stats?.coursesInProgress || 0}
            icon={<BookOpen className="w-6 h-6" />}
            color="blue"
            trend={stats?.coursesInProgress ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Code Snippets"
            value={stats?.codeSnippets || 0}
            icon={<Code className="w-6 h-6" />}
            color="green"
            trend={stats?.codeSnippets ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Achievements"
            value={stats?.achievements || 0}
            icon={<Trophy className="w-6 h-6" />}
            color="yellow"
            trend={stats?.achievements ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Learning Time"
            value={formatDuration(stats?.totalTimeSpent || 0)}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
            trend="up"
            subtitle="Total hours"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning Progress */}
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Learning Progress
                </h2>
                <button
                  onClick={() => window.location.href = '/learn'}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  View All →
                </button>
              </div>
              
              {learningProgress.length > 0 ? (
                <div className="space-y-4">
                  {learningProgress.slice(0, 3).map((progress) => (
                    <ProgressCard
                      key={progress.courseId}
                      title={progress.courseTitle}
                      progress={progress.progressPercentage}
                      nextAction={progress.nextLessonTitle}
                      lastActivity={formatRelativeTime(progress.lastAccessedAt)}
                      estimatedTime={progress.estimatedTimeToComplete}
                      courseId={progress.courseId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Your Learning Journey
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Begin with our fundamentals course to master C++ programming.
                  </p>
                  <button
                    onClick={() => window.location.href = '/learn'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Courses
                  </button>
                </div>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-600" />
                  Recent Activity
                </h2>
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors"
                >
                  View All →
                </button>
              </div>
              
              <ActivityFeed activities={recentActivity} />
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6"
              variants={itemVariants}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Quick Actions
              </h2>
              <QuickActions />
            </motion.div>

            {/* Community Stats */}
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6"
              variants={itemVariants}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Community
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-600">Forum Posts</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {stats?.forumPosts || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-600">Community Rank</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    #{stats?.communityRank || 'Unranked'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-600">Current Streak</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {stats?.currentStreak || 0} days
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/community'}
                className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Join Discussions
              </button>
            </motion.div>

            {/* Recommended Courses */}
            <motion.div
              className="bg-white rounded-lg shadow-lg p-6"
              variants={itemVariants}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Recommended for You
              </h2>
              
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.slice(0, 2).map((course) => (
                    <div
                      key={course._id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/learn/${course._id}`}
                    >
                      <h3 className="font-medium text-gray-900 mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {course.difficulty}
                        </span>
                        <span className="text-gray-500">
                          {course.estimatedHours}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Complete more courses to get personalized recommendations.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};