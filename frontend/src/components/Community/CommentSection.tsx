import { formatDistanceToNow } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

import UserAvatar from '@/components/Common/UserAvatar';
import { Button } from '@/components/UI/Button';
import { useAuth } from '@/hooks/useAuth';
import { communityService } from '@/services/api';
import type { ForumComment } from '@/types';
import { getErrorMessage } from '@/utils/errors';

interface CommentSectionProps {
  postId: string;
  comments: ForumComment[];
  onCommentAdded: (comment: ForumComment) => void;
  onCommentUpdated?: (commentId: string, comment: ForumComment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

const timeAgo = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : formatDistanceToNow(parsed, { addSuffix: true });
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  comments,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const response = await communityService.createComment(postId, content);
      onCommentAdded(response.data as ForumComment);
      setDraft('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to post comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (comment: ForumComment) => {
    const content = editDraft.trim();
    if (!content) return;

    try {
      await communityService.updateComment(postId, comment.id, content);
      onCommentUpdated?.(comment.id, { ...comment, content, updatedAt: new Date().toISOString() });
      setEditingId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update comment'));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await communityService.deleteComment(postId, commentId);
      onCommentDeleted?.(commentId);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete comment'));
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Comments ({comments.length})
      </h2>

      {isAuthenticated ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mb-6 space-y-3">
          <label htmlFor="new-comment" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="new-comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Share your thoughts..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex justify-end">
            <Button
              type="submit" variant="primary" loading={submitting}
              disabled={!draft.trim()}
            >
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Sign in to join the discussion.</p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const isOwner = user?.id === comment.userId;
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="flex space-x-3">
                <UserAvatar user={comment.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.user?.username ?? 'Anonymous'}
                      </span>
                      <span className="ml-2 text-gray-500">{timeAgo(comment.createdAt)}</span>
                      {comment.updatedAt !== comment.createdAt && (
                        <span className="ml-1 text-gray-400">(edited)</span>
                      )}
                    </div>
                    {isOwner && !isEditing && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          aria-label="Edit comment"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditDraft(comment.content);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete comment"
                          onClick={() => void handleDelete(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`edit-${comment.id}`} className="sr-only">
                        Edit comment
                      </label>
                      <textarea
                        id={`edit-${comment.id}`}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => void handleSaveEdit(comment)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CommentSection;
