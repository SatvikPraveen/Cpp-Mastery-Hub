import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, Flag, Edit, Trash2, Award, Eye, Clock } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import TagList from '../../components/Common/TagList';
import UserAvatar from '../../components/Common/UserAvatar';
import CommentSection from '../../components/Community/CommentSection';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { communityService } from '../../services/api';
import type { ForumComment, ForumPost } from '../../types';
import { getUserDisplayName } from '../../utils/helpers';

interface PostPageProps {
  postId: string;
}

/** Post payload as returned to a signed-in viewer. */
type PostWithViewerState = ForumPost & {
  likes?: number;
  views?: number;
  isLikedByUser?: boolean;
  isBookmarkedByUser?: boolean;
};

const PostPage: React.FC<PostPageProps> = ({ postId }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchPostData = async () => {
      try {
        setLoading(true);
        const [postResponse, commentsResponse] = await Promise.all([
          communityService.getPost(postId),
          communityService.getComments(postId),
        ]);

        const postData = postResponse.data as PostWithViewerState;
        setPost(postData);
        setComments(commentsResponse.data as ForumComment[]);
        setLikeCount(postData.likes);
        setViewCount(postData.views);

        if (isAuthenticated) {
          setIsLiked(postData.isLikedByUser ?? false);
          setIsBookmarked(postData.isBookmarkedByUser ?? false);
        }
      } catch (err) {
        setError('Failed to load post');
        console.error('Error fetching post data:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPostData();
  }, [postId, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      void router.push('/auth/login');
      return;
    }

    try {
      if (isLiked) {
        await communityService.unlikePost(postId);
        setLikeCount(prev => prev - 1);
      } else {
        await communityService.likePost(postId);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      void router.push('/auth/login');
      return;
    }

    // Bookmarks are client-side only until the backend exposes a bookmark API.
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/${postId}`;
    
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: post?.title ?? 'C++ Mastery Hub',
          text: `${post?.content.substring(0, 100) ?? ''}...`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleEdit = () => {
    void router.push(`/community/edit/${postId}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await communityService.deletePost(postId);
      await router.push('/community');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await communityService.reportPost(postId, reason);
      setShowReportModal(false);
      toast.success('Post reported successfully');
    } catch (error) {
      console.error('Error reporting post:', error);
      toast.error('Failed to report post');
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      questions: 'bg-green-100 text-green-800',
      tutorials: 'bg-purple-100 text-purple-800',
      projects: 'bg-orange-100 text-orange-800',
      discussions: 'bg-indigo-100 text-indigo-800',
      jobs: 'bg-yellow-100 text-yellow-800',
      announcements: 'bg-red-100 text-red-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  if (error !== null || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Post Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error ?? 'The post you are looking for does not exist.'}
            </p>
            <button
              onClick={() => void router.push('/community')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Community
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => void router.push('/community')}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Community
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Post Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
            >
              {/* Post Meta */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {post.category && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(post.category.name.toLowerCase())}`}>
                      {post.category.name}
                    </span>
                  )}
                  {post.isPinned && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center">
                      <Award className="h-4 w-4 mr-1" />
                      Pinned
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {user && user.id === (post.user.id ?? post.userId) && (
                    <>
                      <button
                        onClick={handleEdit}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit post"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => void handleDelete()}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Report post"
                  >
                    <Flag className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Post Title */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {post.title}
              </h1>

              {/* Author Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <UserAvatar user={post.user ?? post.user} size="md" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getUserDisplayName(post.user)}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(post.createdAt)}</span>
                      {post.updatedAt !== post.createdAt && (
                        <span>• Edited {formatDate(post.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{viewCount}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span>{comments.length}</span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-1" />
                    <span>{likeCount}</span>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="prose dark:prose-invert max-w-none mb-6">
                {/* Rendered as text: post bodies are user content and no HTML sanitizer is bundled. */}
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mb-6">
                  <TagList tags={post.tags} />
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => void handleLike()}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isLiked
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{likeCount}</span>
                  </button>

                  <button
                    onClick={handleBookmark}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                    <span>Save</span>
                  </button>

                  <button
                    onClick={() => void handleShare()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Share className="h-5 w-5" />
                    <span>Share</span>
                  </button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  #{post.id}
                </div>
              </div>
            </motion.div>

            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CommentSection
                postId={postId}
                comments={comments}
                onCommentAdded={(comment) => setComments((prev) => [...prev, comment])}
                onCommentUpdated={(commentId, updatedComment) => {
                  setComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
                }}
                onCommentDeleted={(commentId) => {
                  setComments((prev) => prev.filter((c) => c.id !== commentId));
                }}
              />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Author Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Author</h3>
              <div className="text-center">
                <UserAvatar user={post.user ?? post.user} size="lg" className="mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {getUserDisplayName(post.user)}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{post.user.username}</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {post.likes ?? 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Likes</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {post.views ?? 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Views</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Related Posts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Related Posts</h3>
              <div className="space-y-3">
                {/* This would be populated with actual related posts */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No related posts found.
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Report Post
                </h3>
                <div className="space-y-3">
                  {['Spam', 'Inappropriate Content', 'Harassment', 'Copyright Violation', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => void handleReport(reason)}
                      className="w-full text-left px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<PostPageProps> = (context) => {
  const postId = context.params?.postId;

  return Promise.resolve(
    typeof postId === 'string' ? { props: { postId } } : { notFound: true as const }
  );
};

export default PostPage;