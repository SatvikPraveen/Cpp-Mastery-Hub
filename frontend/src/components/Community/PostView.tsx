import { 
  ArrowUp, 
  ArrowDown, 
  MessageCircle, 
  Share2, 
  Flag,
  Edit,
  Trash2,
  Clock,
  Eye
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import TagList from '@/components/Common/TagList';
import UserAvatar from '@/components/Common/UserAvatar';
import { Button } from '@/components/UI/Button';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';
import type { ForumComment, ForumPost } from '@/types';

import { CommentSection } from './CommentSection';
import { getAuthorName } from './forumHelpers';

interface PostViewProps {
  postId: string;
}

export const PostView: React.FC<PostViewProps> = ({ postId }) => {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const [postRes, repliesRes] = await Promise.all([
          apiService.get<ForumPost & { userVote?: 'up' | 'down' | null }>(
            `/api/forum/posts/${postId}`
          ),
          apiService.get<ForumComment[]>(`/api/forum/posts/${postId}/replies`),
        ]);

        setPost(postRes.data);
        setReplies(repliesRes.data);
        setUserVote(postRes.data.userVote ?? null);
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };

    const markAsViewed = async () => {
      try {
        await apiService.post(`/api/forum/posts/${postId}/view`);
      } catch (error) {
        console.error('Failed to mark post as viewed:', error);
      }
    };

    void fetchPost();
    void markAsViewed();
  }, [postId]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) return;
    
    try {
      const response = await apiService.post<Partial<ForumPost>>(`/api/forum/posts/${postId}/vote`, {
        type: userVote === voteType ? null : voteType
      });
      
      setPost(prev => prev ? { ...prev, ...response.data } : null);
      setUserVote(userVote === voteType ? null : voteType);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: post?.title ?? 'C++ Mastery Hub', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Post not found</h3>
        <p className="text-muted-foreground">The post you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const isAuthor = user?.id === (post.user.id ?? post.userId);
  const authorName = getAuthorName(post);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Post Content */}
      <div className="bg-background border rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            {/* Voting */}
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleVote('up')}
                className={`h-8 w-8 p-0 ${userVote === 'up' ? 'text-green-600' : ''}`}
                disabled={!user}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium">
                {post.likes}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleVote('down')}
                className={`h-8 w-8 p-0 ${userVote === 'down' ? 'text-red-600' : ''}`}
                disabled={!user}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {post.title}
                  </h1>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <UserAvatar user={post.user} size="sm" />
                      <span>{authorName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleShare()}
                    aria-label="Share post"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  
                  {isAuthor && (
                    <>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {!isAuthor && (
                    <Button variant="ghost" size="sm">
                      <Flag className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                {/* Rendered as text: post bodies are user content and no HTML sanitizer is bundled. */}
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-4">
                  <TagList tags={post.tags} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSection
        postId={postId}
        comments={replies}
        onCommentAdded={(reply) => setReplies((prev) => [...prev, reply])}
        onCommentUpdated={(id, updated) =>
          setReplies((prev) => prev.map((r) => (r.id === id ? updated : r)))
        }
        onCommentDeleted={(id) => setReplies((prev) => prev.filter((r) => r.id !== id))}
      />
    </div>
  );
};