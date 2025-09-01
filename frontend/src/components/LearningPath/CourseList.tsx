// File: frontend/src/components/LearningPath/CourseList.tsx
import React, { useState, useEffect } from 'react';
import { CourseCard } from './CourseCard';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Star,
  Users
} from 'lucide-react';
import { Course, CourseLevel, CourseCategory } from '@/types';
import { apiService } from '@/services/api';

interface CourseListProps {
  featured?: boolean;
  category?: CourseCategory;
  level?: CourseLevel;
}

export const CourseList: React.FC<CourseListProps> = ({
  featured = false,
  category,
  level
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  useEffect(() => {
    fetchCourses();
  }, [selectedLevel, selectedCategory, sortBy, featured]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/courses', {
        params: {
          level: selectedLevel !== 'all' ? selectedLevel : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          sort: sortBy,
          featured
        }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const levels: { value: CourseLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const categories: { value: CourseCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'basics', label: 'C++ Basics' },
    { value: 'oop', label: 'Object-Oriented Programming' },
    { value: 'algorithms', label: 'Algorithms & Data Structures' },
    { value: 'advanced', label: 'Advanced Topics' },
    { value: 'projects', label: 'Projects' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as CourseLevel | 'all')}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {levels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CourseCategory | 'all')}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'rating')}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="popular">Most Popular</option>
            <option value="recent">Recently Added</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};
