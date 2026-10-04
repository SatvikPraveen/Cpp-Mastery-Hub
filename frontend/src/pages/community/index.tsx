import { motion } from 'framer-motion';
import { Search, TrendingUp, MessageSquare, Users, Award, Plus, Clock, Star } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';

import UserAvatar from '../../components/Common/UserAvatar';
import Leaderboard from '../../components/Community/Leaderboard';
import PostCard from '../../components/Community/PostCard';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { communityService } from '../../services/api';
import type { ForumPost, LeaderboardEntry } from '../../types';
import { getUserDisplayName } from '../../utils/helpers';

type CommunityHubProps = Record<string, never>;

const CommunityHub: React.FC<CommunityHubProps> = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  const categories = [
    { id: 'all', name: 'All Topics', icon: '💬' },
    { id: 'questions', name: 'Questions', icon: '❓' },
    { id: 'tutorials', name: 'Tutorials', icon: '📚' },
    { id: 'projects', name: 'Show & Tell', icon: '🚀' },
    { id: 'discussions', name: 'Discussions', icon: '💭' },
    { id: 'help', name: 'Help & Support', icon: '🆘' },
    { id: 'announcements', name: 'Announcements', icon: '📢' }
  ];

  const sortOptions = [
    { id: 'recent', name: 'Most Recent' },
    { id: 'popular', name: 'Most Popular' },
    { id: 'trending', name: 'Trending' },
    { id: 'unanswered', name: 'Unanswered' }
  ];

  const tabs = [
    { id: 'feed', name: 'Feed', icon: MessageSquare },
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'leaderboard', name: 'Leaderboard', icon: Award }
  ];

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        const [postsResponse, trendingResponse, leaderboardResponse] = await Promise.all([
          communityService.getPosts({ category: selectedCategory, sort: sortBy }),
          communityService.getTrendingPosts(),
          communityService.getLeaderboard(),
        ]);

        setPosts(postsResponse.data as ForumPost[]);
        setTrendingPosts(trendingResponse.data as ForumPost[]);
        setTopUsers(leaderboardResponse.data as LeaderboardEntry[]);
      } catch (error) {
        console.error('Error fetching community data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchCommunityData();
  }, [selectedCategory, sortBy]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visiblePosts = normalizedQuery
    ? posts.filter(
        (post) =>
          post.title.toLowerCase().includes(normalizedQuery) ||
          post.content.toLowerCase().includes(normalizedQuery)
      )
    : posts;

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      void router.push('/auth/login');
      return;
    }
    void router.push('/community/create');
  };

  const handlePostClick = (postId: string) => {
    void router.push(`/community/${postId}`);
  };

  const handleUserClick = (userId: string) => {
    void router.push(`/community/users/${userId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 py-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Community Hub
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Connect, learn, and share with fellow C++ developers
              </p>
            </div>
            
            <button
              onClick={handleCreatePost}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </button>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="flex items-center">
                <Users className="h-10 w-10 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Members</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12,847</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="flex items-center">
                <MessageSquare className="h-10 w-10 text-green-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">45,283</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="flex items-center">
                <TrendingUp className="h-10 w-10 text-purple-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="flex items-center">
                <Award className="h-10 w-10 text-yellow-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Contributors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">284</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3">
            {/* Tabs */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>

            {/* Filters (for Feed tab) */}
            {activeTab === 'feed' && (
              <motion.div variants={itemVariants} className="mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {/* Sort Filter */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {sortOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'feed' && (
              <motion.div variants={itemVariants}>
                <div className="space-y-6">
                  {visiblePosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PostCard
                        post={post}
                        onClick={() => handlePostClick(post.id)}
                        onUserClick={() => handleUserClick(post.user.id ?? post.userId)}
                      />
                    </motion.div>
                  ))}
                  
                  {visiblePosts.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        No posts found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Be the first to start a discussion in this category!
                      </p>
                      <button
                        onClick={handleCreatePost}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create First Post
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'trending' && (
              <motion.div variants={itemVariants}>
                <div className="space-y-6">
                  {trendingPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PostCard
                        post={post}
                        onClick={() => handlePostClick(post.id)}
                        onUserClick={() => handleUserClick(post.user.id ?? post.userId)}
                        showTrendingBadge
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div variants={itemVariants}>
                <Leaderboard period="weekly" limit={20} />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* User Profile Card */}
            {isAuthenticated && (
              <motion.div
                variants={itemVariants}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                {user && (
                  <button
                    type="button"
                    onClick={() => void router.push('/profile')}
                    className="flex items-center space-x-3 w-full text-left"
                  >
                    <UserAvatar user={user} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                    </div>
                  </button>
                )}
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCreatePost}
                  className="w-full text-left px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  Ask a Question
                </button>
                
                <button
                  onClick={() => void router.push('/community/forums')}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Browse Forums
                </button>
                
                <button
                  onClick={() => void router.push('/community/guidelines')}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Community Guidelines
                </button>
              </div>
            </motion.div>

            {/* Top Contributors */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Top Contributors
              </h3>
              <div className="space-y-3">
                {topUsers.slice(0, 5).map((entry, index) => (
                  <button
                    type="button"
                    key={entry.user.id}
                    className="flex items-center space-x-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                    onClick={() => handleUserClick(entry.user.id)}
                  >
                    <UserAvatar user={entry.user} size="sm" className="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {entry.user.username}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.points} points
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      New tutorial: &ldquo;Modern C++ Best Practices&rdquo;
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      Weekly coding challenge posted
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">1 day ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      Community meetup announced
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">3 days ago</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default CommunityHub;