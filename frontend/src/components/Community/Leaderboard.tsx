// File: frontend/src/components/Community/Leaderboard.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Badge } from '../UI/Badge';
import { Loading } from '../UI/Loading';

interface LeaderboardUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rank: number;
  score: number;
  change: number; // Position change from last period
  stats: {
    coursesCompleted: number;
    lessonsCompleted: number;
    postsCount: number;
    likesReceived: number;
    reputation: number;
    achievementsCount: number;
    codeSnippetsShared: number;
    helpfulAnswers: number;
  };
  badges: string[];
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  period?: 'weekly' | 'monthly' | 'all-time';
  category?: 'overall' | 'learning' | 'community' | 'coding';
  limit?: number;
  showCurrentUser?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  period = 'weekly',
  category = 'overall',
  limit = 20,
  showCurrentUser = true
}) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedCategory, setSelectedCategory] = useState(category);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call
        const mockUsers: LeaderboardUser[] = [
          {
            id: '1',
            username: 'cpp_master_2024',
            firstName: 'Sarah',
            lastName: 'Chen',
            avatar: 'https://via.placeholder.com/40',
            rank: 1,
            score: 2850,
            change: 2,
            stats: {
              coursesCompleted: 25,
              lessonsCompleted: 450,
              postsCount: 89,
              likesReceived: 1205,
              reputation: 2850,
              achievementsCount: 34,
              codeSnippetsShared: 67,
              helpfulAnswers: 145
            },
            badges: ['🏆', '🎯', '💻'],
            isCurrentUser: false
          },
          {
            id: '2',
            username: 'algorithm_ninja',
            firstName: 'Alex',
            lastName: 'Johnson',
            avatar: 'https://via.placeholder.com/40',
            rank: 2,
            score: 2720,
            change: -1,
            stats: {
              coursesCompleted: 22,
              lessonsCompleted: 398,
              postsCount: 156,
              likesReceived: 987,
              reputation: 2720,
              achievementsCount: 28,
              codeSnippetsShared: 89,
              helpfulAnswers: 201
            },
            badges: ['🧠', '⚡', '🔥'],
            isCurrentUser: false
          },
          {
            id: '3',
            username: 'memory_manager',
            firstName: 'David',
            lastName: 'Wilson',
            avatar: 'https://via.placeholder.com/40',
            rank: 3,
            score: 2680,
            change: 1,
            stats: {
              coursesCompleted: 20,
              lessonsCompleted: 356,
              postsCount: 98,
              likesReceived: 876,
              reputation: 2680,
              achievementsCount: 31,
              codeSnippetsShared: 54,
              helpfulAnswers: 123
            },
            badges: ['🧬', '🎖️', '💡'],
            isCurrentUser: false
          },
          {
            id: '4',
            username: 'template_wizard',
            firstName: 'Emily',
            lastName: 'Rodriguez',
            avatar: 'https://via.placeholder.com/40',
            rank: 4,
            score: 2550,
            change: 0,
            stats: {
              coursesCompleted: 19,
              lessonsCompleted: 334,
              postsCount: 76,
              likesReceived: 743,
              reputation: 2550,
              achievementsCount: 26,
              codeSnippetsShared: 43,
              helpfulAnswers: 98
            },
            badges: ['🎭', '✨', '🔮'],
            isCurrentUser: false
          },
          {
            id: '5',
            username: 'concurrent_coder',
            firstName: 'Michael',
            lastName: 'Thompson',
            avatar: 'https://via.placeholder.com/40',
            rank: 5,
            score: 2480,
            change: 3,
            stats: {
              coursesCompleted: 18,
              lessonsCompleted: 312,
              postsCount: 67,
              likesReceived: 654,
              reputation: 2480,
              achievementsCount: 23,
              codeSnippetsShared: 38,
              helpfulAnswers: 87
            },
            badges: ['⚡', '🔗', '🎯'],
            isCurrentUser: true
          }
        ];

        // Add more mock users to fill the leaderboard
        for (let i = 6; i <= limit; i++) {
          mockUsers.push({
            id: i.toString(),
            username: `user_${i}`,
            firstName: `User`,
            lastName: `${i}`,
            rank: i,
            score: 2480 - (i - 5) * 50,
            change: Math.floor(Math.random() * 11) - 5, // -5 to +5
            stats: {
              coursesCompleted: Math.max(1, 18 - (i - 5)),
              lessonsCompleted: Math.max(10, 312 - (i - 5) * 15),
              postsCount: Math.max(5, 67 - (i - 5) * 3),
              likesReceived: Math.max(50, 654 - (i - 5) * 30),
              reputation: 2480 - (i - 5) * 50,
              achievementsCount: Math.max(1, 23 - (i - 5)),
              codeSnippetsShared: Math.max(5, 38 - (i - 5) * 2),
              helpfulAnswers: Math.max(10, 87 - (i - 5) * 4)
            },
            badges: ['🎯'],
            isCurrentUser: false
          });
        }

        setUsers(mockUsers);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedPeriod, selectedCategory, limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return { icon: '⬆️', color: 'text-green-600' };
    if (change < 0) return { icon: '⬇️', color: 'text-red-600' };
    return { icon: '➖', color: 'text-gray-500' };
  };

  const getScoreForCategory = (user: LeaderboardUser) => {
    switch (selectedCategory) {
      case 'learning':
        return user.stats.coursesCompleted * 10 + user.stats.lessonsCompleted;
      case 'community':
        return user.stats.postsCount * 5 + user.stats.likesReceived + user.stats.helpfulAnswers * 2;
      case 'coding':
        return user.stats.codeSnippetsShared * 10 + user.stats.achievementsCount * 5;
      default:
        return user.score;
    }
  };

  const getCategoryLabel = () => {
    switch (selectedCategory) {
      case 'learning': return 'Learning Points';
      case 'community': return 'Community Points';
      case 'coding': return 'Coding Points';
      default: return 'Total Score';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <Loading text="Loading leaderboard..." />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">🏆 Leaderboard</h2>
          <Badge variant="primary" size="sm">
            {users.length} participants
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="all-time">All Time</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="overall">Overall</option>
              <option value="learning">Learning</option>
              <option value="community">Community</option>
              <option value="coding">Coding</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {users.slice(0, 3).map((user, index) => {
            const positions = [1, 0, 2]; // Second place in middle for podium effect
            const actualIndex = positions[index];
            const podiumUser = users[actualIndex];
            const heights = ['h-20', 'h-24', 'h-16']; // Different heights for podium effect

            return (
              <div key={podiumUser.id} className="text-center">
                <div className={`${heights[index]} bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-lg flex items-end justify-center mb-2`}>
                  <span className="text-2xl pb-2">{getRankIcon(podiumUser.rank)}</span>
                </div>
                <div className="space-y-2">
                  {podiumUser.avatar ? (
                    <img
                      src={podiumUser.avatar}
                      alt={podiumUser.username}
                      className="w-12 h-12 rounded-full mx-auto object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600">
                        {podiumUser.firstName.charAt(0)}{podiumUser.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{podiumUser.firstName} {podiumUser.lastName}</p>
                    <p className="text-sm text-gray-600">@{podiumUser.username}</p>
                    <p className="text-lg font-bold text-blue-600">
                      {getScoreForCategory(podiumUser).toLocaleString()}
                    </p>
                    <div className="flex justify-center space-x-1">
                      {podiumUser.badges.map((badge, i) => (
                        <span key={i} className="text-lg">{badge}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="p-6">
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-2">{getCategoryLabel()}</div>
            <div className="col-span-2">Change</div>
            <div className="col-span-3">Quick Stats</div>
          </div>

          {/* User Rows */}
          {users.map((user) => {
            const changeIndicator = getChangeIcon(user.change);
            
            return (
              <div
                key={user.id}
                className={`
                  grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors
                  ${user.isCurrentUser 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  <span className="text-lg font-bold">
                    {getRankIcon(user.rank)}
                  </span>
                </div>

                {/* User Info */}
                <div className="col-span-4 flex items-center space-x-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.isCurrentUser && (
                        <Badge variant="primary" size="sm">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-2 flex items-center">
                  <span className="text-lg font-bold text-blue-600">
                    {getScoreForCategory(user).toLocaleString()}
                  </span>
                </div>

                {/* Change */}
                <div className="col-span-2 flex items-center space-x-2">
                  <span className={`text-sm ${changeIndicator.color}`}>
                    {changeIndicator.icon}
                  </span>
                  <span className={`text-sm font-medium ${changeIndicator.color}`}>
                    {Math.abs(user.change)}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="col-span-3 flex items-center space-x-4">
                  <div className="flex space-x-1">
                    {user.badges.map((badge, i) => (
                      <span key={i} className="text-sm">{badge}</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedCategory === 'learning' && `${user.stats.coursesCompleted} courses`}
                    {selectedCategory === 'community' && `${user.stats.postsCount} posts`}
                    {selectedCategory === 'coding' && `${user.stats.codeSnippetsShared} snippets`}
                    {selectedCategory === 'overall' && `${user.stats.achievementsCount} achievements`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show current user if not in top list */}
        {showCurrentUser && !users.some(u => u.isCurrentUser) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Your current position</p>
                <div className="flex items-center justify-center space-x-4">
                  <span className="text-lg font-bold">#47</span>
                  <span className="text-lg font-bold text-blue-600">1,250 points</span>
                  <Badge variant="warning" size="sm">
                    🔥 Keep going!
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};