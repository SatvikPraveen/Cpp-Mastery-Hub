// File: frontend/src/components/Community/PostView.tsx
// Extension: .tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { CommentSystem } from './CommentSystem';
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
import { ForumPost, PostReply } from '@/types';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

interface PostViewProps {
  postId: string;
}

export const PostView: React.FC<PostViewProps> = ({ postId }) => {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchPost();
    markAsViewed();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const [postRes, repliesRes] = await Promise.all([
        apiService.get(`/api/forum/posts/${postId}`),
        apiService.get(`/api/forum/posts/${postId}/replies`)
      ]);
      
      setPost(postRes.data);
      setReplies(repliesRes.data);
      setUserVote(postRes.data.userVote);
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

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) return;
    
    try {
      const response = await apiService.post(`/api/forum/posts/${postId}/vote`, {
        type: userVote === voteType ? null : voteType
      });
      
      setPost(prev => prev ? { ...prev, ...response.data } : null);
      setUserVote(userVote === voteType ? null : voteType);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Show toast notification
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Post not found</h3>
        <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;

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
                onClick={() => handleVote('up')}
                className={`h-8 w-8 p-0 ${userVote === 'up' ? 'text-green-600' : ''}`}
                disabled={!user}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium">
                {post.upvotes - post.downvotes}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('down')}
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
                      <div className="h-6 w-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {post.author.firstName[0]}{post.author.lastName[0]}
                      </div>
                      <span>{post.author.firstName} {post.author.lastName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.viewsCount} views</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
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
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSystem
        postId={postId}
        replies={replies}
        onReplyAdded={(reply) => setReplies(prev => [...prev, reply])}
      />
    </div>
  );
};