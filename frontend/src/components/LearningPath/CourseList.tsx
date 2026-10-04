import { BookOpen, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Input } from '@/components/UI/Input';
import { apiService } from '@/services/api';
import { Course, CourseLevel, CourseCategory } from '@/types';

import { CourseCard } from './CourseCard';

interface CourseListProps {
  featured?: boolean;
  category?: CourseCategory;
  level?: CourseLevel;
  /** When provided, these courses are shown as-is and nothing is fetched. */
  courses?: Course[];
  /** Hide the built-in search / level / category / sort controls. */
  showFilters?: boolean;
}

export const CourseList: React.FC<CourseListProps> = ({
  featured = false,
  category,
  level,
  courses: providedCourses,
  showFilters = true,
}) => {
  const [fetchedCourses, setFetchedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(providedCourses === undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | 'all'>(level ?? 'all');
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>(
    category ?? 'all'
  );
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  useEffect(() => {
    if (providedCourses !== undefined) return;

    let cancelled = false;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await apiService.get<Course[]>('/api/courses', {
          params: {
            level: selectedLevel !== 'all' ? selectedLevel : undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            sort: sortBy,
            featured,
          },
        });
        if (!cancelled) setFetchedCourses(response.data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [providedCourses, selectedLevel, selectedCategory, sortBy, featured]);

  const courses = providedCourses ?? fetchedCourses;

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const levels: { value: CourseLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const categories: { value: CourseCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'basics', label: 'C++ Basics' },
    { value: 'oop', label: 'Object-Oriented Programming' },
    { value: 'algorithms', label: 'Algorithms & Data Structures' },
    { value: 'advanced', label: 'Advanced Topics' },
    { value: 'projects', label: 'Projects' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {['a', 'b', 'c', 'd', 'e', 'f'].map((slot) => (
            <div key={slot} className="animate-pulse">
              <div className="bg-muted rounded-lg h-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {showFilters && (
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
              {levels.map((level) => (
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
              {categories.map((category) => (
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
      )}

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  );
};
