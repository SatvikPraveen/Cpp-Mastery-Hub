// File: frontend/src/components/Community/UserProfile.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { Loading } from '../UI/Loading';

interface UserStats {
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
  reputation: number;
  joinDate: string;
  lastActive: string;
  coursesCompleted: number;
  lessonsCompleted: number;
  codeSnippetsShared: number;
  achievementsCount: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserActivity {
  id: string;
  type: 'post' | 'comment' | 'achievement' | 'course_completion' | 'code_share';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface UserProfileData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  role: 'student' | 'instructor' | 'admin';
  isEmailVerified: boolean;
  stats: UserStats;
  achievements: Achievement[];
  recentActivity: UserActivity[];
  skills: string[];
  interests: string[];
}

interface UserProfileProps {
  userId: string;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
  isFollowing?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  isOwnProfile = false,
  onEdit,
  onFollow,
  onUnfollow,
  isFollowing = false
}) => {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'stats'>('overview');

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        // Mock API call - replace with actual implementation
        const mockUser: UserProfileData = {
          id: userId,
          username: 'john_cpp_master',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          avatar: 'https://via.placeholder.com/150',
          bio: 'Passionate C++ developer with 5+ years of experience. Love teaching and helping others learn programming.',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          githubUsername: 'johndoe',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          role: 'instructor',
          isEmailVerified: true,
          stats: {
            postsCount: 127,
            commentsCount: 543,
            likesReceived: 1205,
            reputation: 2840,
            joinDate: '2023-01-15',
            lastActive: '2024-08-18',
            coursesCompleted: 15,
            lessonsCompleted: 230,
            codeSnippetsShared: 89,
            achievementsCount: 24
          },
          achievements: [
            {
              id: '1',
              name: 'C++ Master',
              description: 'Completed all advanced C++ courses',
              icon: '🏆',
              earnedAt: '2024-07-15',
              rarity: 'legendary'
            },
            {
              id: '2',
              name: 'Community Helper',
              description: 'Helped 100+ users with their questions',
              icon: '🤝',
              earnedAt: '2024-06-20',
              rarity: 'epic'
            },
            {
              id: '3',
              name: 'Code Reviewer',
              description: 'Reviewed 50+ code submissions',
              icon: '👀',
              earnedAt: '2024-05-10',
              rarity: 'rare'
            }
          ],
          recentActivity: [
            {
              id: '1',
              type: 'post',
              title: 'Best practices for memory management in C++',
              description: 'Started a discussion about smart pointers',
              timestamp: '2024-08-17T10:30:00Z'
            },
            {
              id: '2',
              type: 'achievement',
              title: 'Earned Code Reviewer badge',
              description: 'Reviewed 50+ code submissions',
              timestamp: '2024-08-15T14:20:00Z'
            },
            {
              id: '3',
              type: 'course_completion',
              title: 'Completed Advanced Templates course',
              description: 'Finished all lessons with 95% score',
              timestamp: '2024-08-10T16:45:00Z'
            }
          ],
          skills: ['C++', 'STL', 'Template Metaprogramming', 'Memory Management', 'Concurrency'],
          interests: ['System Programming', 'Game Development', 'Performance Optimization']
        };

        setUser(mockUser);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'comment': return '💬';
      case 'achievement': return '🏆';
      case 'course_completion': return '📚';
      case 'code_share': return '💻';
      default: return '📌';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'epic': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'rare': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Loading size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
        <p className="text-gray-600">The requested user profile could not be found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-600 font-bold">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h1>
                  <Badge variant={user.role === 'instructor' ? 'warning' : user.role === 'admin' ? 'error' : 'secondary'}>
                    {user.role}
                  </Badge>
                  {user.isEmailVerified && (
                    <Badge variant="success" size="sm">
                      ✓ Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xl text-gray-600 mb-2">@{user.username}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📍 {user.location}</span>
                  <span>📅 Joined {formatDate(user.stats.joinDate)}</span>
                  <span>🔥 {user.stats.reputation} reputation</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {isOwnProfile ? (
                  <Button onClick={onEdit} variant="primary">
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    onClick={() => isFollowing ? onUnfollow?.(userId) : onFollow?.(userId)}
                    variant={isFollowing ? 'secondary' : 'primary'}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-700 mb-4">{user.bio}</p>
            )}

            {/* Links */}
            <div className="flex items-center space-x-4">
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center"
                >
                  🌐 Website
                </a>
              )}
              {user.githubUsername && (
                <a
                  href={`https://github.com/${user.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center"
                >
                  🐙 GitHub
                </a>
              )}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center"
                >
                  💼 LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{user.stats.postsCount}</div>
          <div className="text-sm text-gray-600">Posts</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{user.stats.coursesCompleted}</div>
          <div className="text-sm text-gray-600">Courses</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{user.stats.achievementsCount}</div>
          <div className="text-sm text-gray-600">Achievements</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{user.stats.likesReceived}</div>
          <div className="text-sm text-gray-600">Likes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'activity', label: 'Activity' },
              { id: 'achievements', label: 'Achievements' },
              { id: 'stats', label: 'Statistics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map(skill => (
                    <Badge key={skill} variant="primary" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map(interest => (
                    <Badge key={interest} variant="secondary" size="sm">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              {user.recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-gray-600 text-sm">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg text-white ${getRarityColor(achievement.rarity)}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div>
                        <h4 className="font-bold">{achievement.name}</h4>
                        <p className="text-sm opacity-90">{achievement.description}</p>
                        <p className="text-xs opacity-75 mt-1">
                          Earned {formatDate(achievement.earnedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Community Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Forum Posts</span>
                      <span className="font-medium">{user.stats.postsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comments</span>
                      <span className="font-medium">{user.stats.commentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Likes Received</span>
                      <span className="font-medium">{user.stats.likesReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reputation</span>
                      <span className="font-medium">{user.stats.reputation}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Learning Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Courses Completed</span>
                      <span className="font-medium">{user.stats.coursesCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lessons Completed</span>
                      <span className="font-medium">{user.stats.lessonsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Code Snippets Shared</span>
                      <span className="font-medium">{user.stats.codeSnippetsShared}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Achievements Earned</span>
                      <span className="font-medium">{user.stats.achievementsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};