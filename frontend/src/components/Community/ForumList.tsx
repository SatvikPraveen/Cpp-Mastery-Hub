// File: frontend/src/components/Community/ForumList.tsx
// Extension: .tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Badge } from '@/components/UI/Badge';
import { 
  MessageCircle, 
  Users, 
  Plus, 
  Search, 
  TrendingUp,
  Clock,
  Pin,
  Lock
} from 'lucide-react';
import { ForumCategory, ForumPost } from '@/types';
import { apiService } from '@/services/api';

interface ForumListProps {
  categoryId?: string;
}

export const ForumList: React.FC<ForumListProps> = ({ categoryId }) => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'replies'>('recent');

  useEffect(() => {
    fetchForumData();
  }, [categoryId, sortBy]);

  const fetchForumData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, postsRes] = await Promise.all([
        apiService.get('/api/forum/categories'),
        apiService.get('/api/forum/posts', {
          params: { categoryId, sort: sortBy }
        })
      ]);
      
      setCategories(categoriesRes.data);
      setPosts(postsRes.data);
    } catch (error) {
      console.error('Failed to fetch forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-24"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Community Forum</h1>
          <p className="text-muted-foreground">
            Connect with fellow C++ developers and get help
          </p>
        </div>
        
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          asChild
        >
          <Link href="/community/new-post">Create Post</Link>
        </Button>
      </div>

      {/* Categories */}
      {!categoryId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <Link
              key={category.id}
              href={`/community/category/${category.id}`}
              className="group"
            >
              <div className="bg-background border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">{category.icon}</div>
                    <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                  </div>
                  {category.isLocked && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{category.postsCount} posts</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{category.membersCount} members</span>
                    </div>
                  </div>
                  
                  {category.latestPost && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(category.latestPost.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'replies')}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
          <option value="replies">Most Replies</option>
        </select>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map(post => (
          <Link key={post.id} href={`/community/post/${post.id}`}>
            <div className="bg-background border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Author Avatar */}
                <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {post.author.firstName[0]}{post.author.lastName[0]}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {post.isPinned && (
                          <Pin className="h-4 w-4 text-blue-600" />
                        )}
                        <h3 className="font-semibold text-foreground hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{post.author.firstName} {post.author.lastName}</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.repliesCount} replies</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{post.viewsCount} views</span>
                        </div>
                      </div>
                    </div>
                    
                    {post.lastReply && (
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Last reply by</div>
                        <div className="font-medium">{post.lastReply.author.firstName}</div>
                        <div>{new Date(post.lastReply.createdAt).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No posts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try different search terms' : 'Be the first to start a discussion!'}
          </p>
          <Button asChild>
            <Link href="/community/new-post">Create First Post</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
