// File: frontend/src/components/LearningPath/CourseCard.tsx
import Link from 'next/link';
import { Badge } from '@/components/UI/Badge';
import { Progress } from '@/components/UI/Progress';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const {
    id,
    title,
    description,
    level,
    category,
    duration,
    lessonsCount,
    rating,
    studentsCount,
    progress,
    thumbnail,
    instructor,
    tags,
    isPremium
  } = course;

  const levelColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  return (
    <Link href={`/learn/${id}`}>
      <div className="group bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          )}
          
          {isPremium && (
            <div className="absolute top-2 right-2">
              <Badge variant="premium">Premium</Badge>
            </div>
          )}
          
          <div className="absolute bottom-2 left-2">
            <Badge className={levelColors[level]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>

          {/* Progress */}
          {progress !== undefined && progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{duration}h