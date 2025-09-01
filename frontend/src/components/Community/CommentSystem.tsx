// File: frontend/src/components/Community/CommentSystem.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Loading } from '../UI/Loading';
import { Badge } from '../UI/Badge';

interface User {
  id: string;
  username: string;
  avatar?: string;
  role: 'student' | 'instructor' | 'admin';
  reputation: number;
}

interface Comment {
  id: string;
  content: string;
  author: User;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  replies: Comment[];
  likes: number;
  dislikes: number;
  userVote?: 'like' | 'dislike' | null;
  isEditing?: boolean;
  depth: number;
  parentId?: string;
}

interface CommentSystemProps {
  postId: string;
  postType: 'forum' | 'lesson' | 'code' | 'course';
  initialComments?: Comment[];
  currentUser?: User;
  onCommentAdd: (content: string, parentId?: string) => Promise<Comment>;
  onCommentEdit: (commentId: string, content: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
  onVote: (commentId: string, vote: 'like' | 'dislike') => Promise<void>;
  allowNesting?: boolean;
  maxDepth?: number;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  postId,
  postType,
  initialComments = [],
  currentUser,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  onVote,
  allowNesting = true,
  maxDepth = 3
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('popular');

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const comment = await onCommentAdd(newComment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const reply = await onCommentAdd(replyContent, parentId);
      setComments(prev => addReplyToComment(prev, parentId, reply));
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addReplyToComment = (comments: Comment[], parentId: string, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return { ...comment, replies: [reply, ...comment.replies] };
      }
      if (comment.replies.length > 0) {
        return { ...comment, replies: addReplyToComment(comment.replies, parentId, reply) };
      }
      return comment;
    });
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await onCommentEdit(commentId, editContent);
      setComments(prev => updateCommentContent(prev, commentId, editContent));
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const updateCommentContent = (comments: Comment[], commentId: string, content: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, content, edited: true, editedAt: new Date().toISOString() };
      }
      if (comment.replies.length > 0) {
        return { ...comment, replies: updateCommentContent(comment.replies, commentId, content) };
      }
      return comment;
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await onCommentDelete(commentId);
      setComments(prev => removeComment(prev, commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const removeComment = (comments: Comment[], commentId: string): Comment[] => {
    return comments.filter(comment => {
      if (comment.id === commentId) return false;
      if (comment.replies.length > 0) {
        comment.replies = removeComment(comment.replies, commentId);
      }
      return true;
    });
  };

  const handleVote = async (commentId: string, vote: 'like' | 'dislike') => {
    try {
      await onVote(commentId, vote);
      setComments(prev => updateCommentVote(prev, commentId, vote));
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const updateCommentVote = (comments: Comment[], commentId: string, vote: 'like' | 'dislike'): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        const prevVote = comment.userVote;
        let likes = comment.likes;
        let dislikes = comment.dislikes;

        // Remove previous vote
        if (prevVote === 'like') likes--;
        if (prevVote === 'dislike') dislikes--;

        // Add new vote if different
        const newVote = prevVote === vote ? null : vote;
        if (newVote === 'like') likes++;
        if (newVote === 'dislike') dislikes++;

        return { ...comment, likes, dislikes, userVote: newVote };
      }
      if (comment.replies.length > 0) {
        return { ...comment, replies: updateCommentVote(comment.replies, commentId, vote) };
      }
      return comment;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'instructor': return 'warning';
      default: return 'secondary';
    }
  };

  const sortComments = (comments: Comment[]) => {
    const sorted = [...comments];
    
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case 'popular':
        return sorted.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
      default:
        return sorted;
    }
  };

  const renderComment = (comment: Comment) => {
    const canEdit = currentUser && (currentUser.id === comment.author.id || currentUser.role === 'admin');
    const canReply = allowNesting && comment.depth < maxDepth && currentUser;

    return (
      <div
        key={comment.id}
        className={`
          border-l-2 border-gray-200 pl-4 py-3
          ${comment.depth > 0 ? 'ml-6' : ''}
        `}
      >
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.author.avatar ? (
              <img
                src={comment.author.avatar}
                alt={comment.author.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">
                  {comment.author.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-gray-900">
                {comment.author.username}
              </span>
              <Badge variant={getRoleColor(comment.author.role)} size="sm">
                {comment.author.role}
              </Badge>
              <span className="text-sm text-gray-500">
                {formatTimestamp(comment.timestamp)}
              </span>
              {comment.edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {/* Content */}
            {editingComment === comment.id ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Edit your comment..."
                />
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id)}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-700 mb-3 whitespace-pre-wrap">
                {comment.content}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Voting */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleVote(comment.id, 'like')}
                  disabled={!currentUser}
                  className={`
                    p-1 rounded transition-colors
                    ${comment.userVote === 'like' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600">{comment.likes}</span>

                <button
                  onClick={() => handleVote(comment.id, 'dislike')}
                  disabled={!currentUser}
                  className={`
                    p-1 rounded transition-colors
                    ${comment.userVote === 'dislike' 
                      ? 'text-red-600 bg-red-50' 
                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10H9a2 2 0 00-2 2v6a2 2 0 002 2h2.5" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600">{comment.dislikes}</span>
              </div>

              {/* Reply button */}
              {canReply && (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Reply
                </button>
              )}

              {/* Edit button */}
              {canEdit && editingComment !== comment.id && (
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
                >
                  Edit
                </button>
              )}

              {/* Delete button */}
              {canEdit && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Write a reply..."
                />
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyContent.trim() || isSubmitting}
                    loading={isSubmitting}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map(reply => renderComment(reply))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sortedComments = sortComments(comments);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>
        
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* New comment form */}
      {currentUser ? (
        <div className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Share your thoughts..."
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              loading={isSubmitting}
            >
              Post Comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">Join the discussion!</p>
          <Button variant="primary" size="sm">
            Sign In to Comment
          </Button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {sortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          sortedComments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};