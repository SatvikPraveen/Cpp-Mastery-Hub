// File: frontend/src/components/LearningPath/ProgressTracker.tsx
// Extension: .tsx
import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/UI/Progress';
import { Badge } from '@/components/UI/Badge';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle,
  BookOpen,
  Code,
  Brain,
  TrendingUp
} from 'lucide-react';
import { UserProgress, Achievement, LearningStats } from '@/types';
import { apiService } from '@/services/api';

interface ProgressTrackerProps {
  userId?: string;
  courseId?: string;
  compact?: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  userId,
  courseId,
  compact = false
}) => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, [userId, courseId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const [progressRes, achievementsRes, statsRes] = await Promise.all([
        apiService.get('/api/user/progress', { params: { courseId } }),
        apiService.get('/api/user/achievements'),
        apiService.get('/api/user/stats')
      ]);
      
      setProgress(progressRes.data);
      setAchievements(achievementsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (!progress || !stats) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No progress data available</h3>
        <p className="text-muted-foreground">Start learning to track your progress!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-background border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Your Progress</h3>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress.overallProgress)}% complete
          </span>
        </div>
        
        <Progress value={progress.overallProgress} className="h-3 mb-3" />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">
              {stats.completedLessons}
            </div>
            <div className="text-xs text-muted-foreground">Lessons</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {stats.completedExercises}
            </div>
            <div className="text-xs text-muted-foreground">Exercises</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {achievements.length}
            </div>
            <div className="text-xs text-muted-foreground">Achievements</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Learning Progress</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress.overallProgress)}% complete
              </span>
            </div>
            <Progress value={progress.overallProgress} className="h-3" />
          </div>

          {progress.courseProgress && Object.entries(progress.courseProgress).map(([courseId, courseProgress]) => (
            <div key={courseId}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{courseProgress.title}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(courseProgress.progress)}% complete
                </span>
              </div>
              <Progress value={courseProgress.progress} className="h-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.completedLessons}
              </div>
              <div className="text-sm text-muted-foreground">
                Lessons Completed
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Code className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.completedExercises}
              </div>
              <div className="text-sm text-muted-foreground">
                Exercises Solved
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(stats.totalStudyTime / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">
                Study Time
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {achievements.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Achievements
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <div className="bg-background border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Recent Achievements</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.slice(0, 6).map(achievement => (
              <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="text-2xl">{achievement.icon}</div>
                <div>
                  <div className="font-medium text-sm">{achievement.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {achievement.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak & Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Learning Streak</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              days in a row
            </div>
            <div className="text-xs text-muted-foreground">
              Best streak: {stats.longestStreak} days
            </div>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Goal</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Study Time</span>
              <span className="text-sm font-medium">
                {Math.round(stats.weeklyStudyTime / 60)}h / {stats.weeklyGoal}h
              </span>
            </div>
            <Progress 
              value={(stats.weeklyStudyTime / 60) / stats.weeklyGoal * 100} 
              className="h-2" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};