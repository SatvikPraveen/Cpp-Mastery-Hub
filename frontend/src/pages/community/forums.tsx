// File: frontend/src/pages/community/forums.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, MessageSquare, Users, Pin, Clock, TrendingUp, Filter, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import PostCard from '../../components/Community/PostCard';
import { useAuth } from '../../hooks/useAuth';
import { communityService } from '../../services/api';
import { ForumCategory, ForumPost } from '../../types';

interface ForumPageProps {}

const ForumPage: React.FC<ForumPageProps> = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { id: 'recent', name: 'Most Recent', icon: Clock },
    { id: 'popular', name: 'Most Popular', icon: TrendingUp },
    { id: 'replies', name: 'Most Replies', icon: MessageSquare },
    { id: 'unanswered', name: 'Unanswered', icon: MessageSquare }
  ];

  const defaultCategories: ForumCategory[] = [
    {
      id: 'all',
      name: 'All Categories',
      description: 'View all forum posts',
      icon: '💬',
      color: 'blue',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'questions',
      name: 'Questions & Help',
      description: 'Ask questions and get help from the community',
      icon: '❓',
      color: 'green',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'tutorials',
      name: 'Tutorials & Guides',
      description: 'Share and discover learning resources',
      icon: '📚',
      color: 'purple',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'projects',
      name: 'Show & Tell',
      description: 'Share your projects and get feedback',
      icon: '🚀',
      color: 'orange',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'discussions',
      name: 'General Discussion',
      description: 'General C++ and programming discussions',
      icon: '💭',
      color: 'indigo',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'jobs',
      name: 'Jobs & Career',
      description: 'Job opportunities and career advice',
      icon: '💼',
      color: 'yellow',
      postCount: 0,
      recentActivity: new Date()
    },
    {
      id: 'announcements',
      name: 'Announcements',
      description: 'Official announcements and updates',
      icon: '📢',
      color: 'red',
      postCount: 0,
      recentActivity: new Date()
    }
  ];

  useEffect(() => {
    fetchForumData();
  }, [selectedCategory, sortBy]);

  useEffect(() => {
    filterPosts();
  }, [searchQuery]);

  const fetchForumData = async () => {
    try {
      setLoading(true);
      const [postsResponse, pinnedResponse] = await Promise.all([
        communityService.getPosts({ 
          category: selectedCategory === 'all' ? undefined : selectedCategory, 
          sort: sortBy 
        }),
        communityService.getPosts({ pinned: true })
      ]);

      setPosts(postsResponse.data);
      setPinnedPosts(pinnedResponse.data);
      
      // Update categories with post counts (in real app, this would come from API)
      const updatedCategories = defaultCategories.map(cat => ({
        ...cat,
        postCount: cat.id === 'all' ? postsResponse.data.length : 
                  postsResponse.data.filter((p: ForumPost) => p.category === cat.id).length
      }));
      setCategories(updatedCategories);
    } catch (error) {
      console.error('Error fetching forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    // In real implementation, this would filter posts based on search query
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    router.push('/community/create');
  };

  const handlePostClick = (postId: string) => {
    router.push(`/community/${postId}`);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const getCategoryColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Community Forums
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Discuss, learn, and share with fellow C++ developers
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
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{category.icon}</span>
                        <div>
                          <p className={`text-sm font-medium ${
                            selectedCategory === category.id 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(category.color)}`}>
                        {category.postCount}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Forum Stats */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Forum Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Posts</span>
                  <span className="font-semibold text-gray-900 dark:text-white">12,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Members</span>
                  <span className="font-semibold text-gray-900 dark:text-white">3,421</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Posts Today</span>
                  <span className="font-semibold text-gray-900 dark:text-white">127</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Online Now</span>
                  <span className="font-semibold text-green-600">284</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Sort Options */}
                  <div className="flex gap-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                          sortBy === option.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <option.icon className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{option.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                      
                      <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">All Authors</option>
                        <option value="me">My Posts</option>
                        <option value="following">Following</option>
                      </select>
                      
                      <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">All Tags</option>
                        <option value="beginner">Beginner</option>
                        <option value="advanced">Advanced</option>
                        <option value="tutorial">Tutorial</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Pinned Posts */}
            {pinnedPosts.length > 0 && (
              <motion.div variants={itemVariants} className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Pin className="h-5 w-5 mr-2 text-yellow-500" />
                  Pinned Posts
                </h3>
                <div className="space-y-4">
                  {pinnedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => handlePostClick(post.id)}
                      isPinned={true}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Posts List */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCategory === 'all' 
                    ? 'All Posts' 
                    : categories.find(c => c.id === selectedCategory)?.name || 'Posts'
                  }
                </h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {posts.length} post{posts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    No posts found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchQuery 
                      ? 'Try adjusting your search criteria.' 
                      : 'Be the first to start a discussion in this category!'
                    }
                  </p>
                  <button
                    onClick={handleCreatePost}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create First Post
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PostCard
                        post={post}
                        onClick={() => handlePostClick(post.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {posts.length >= 20 && (
                <div className="text-center mt-8">
                  <button className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    Load More Posts
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Forum Guidelines */}
        <motion.div variants={itemVariants} className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Forum Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-2">✅ Do:</h4>
              <ul className="space-y-1">
                <li>• Be respectful and constructive</li>
                <li>• Search before posting duplicate questions</li>
                <li>• Use clear, descriptive titles</li>
                <li>• Include code examples when relevant</li>
                <li>• Mark helpful answers as solutions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">❌ Don't:</h4>
              <ul className="space-y-1">
                <li>• Post spam or promotional content</li>
                <li>• Use offensive or inappropriate language</li>
                <li>• Ask for homework solutions</li>
                <li>• Bump old threads unnecessarily</li>
                <li>• Share personal information</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default ForumPage;