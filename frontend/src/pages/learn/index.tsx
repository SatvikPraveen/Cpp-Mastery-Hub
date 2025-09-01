// File: frontend/src/pages/learn/index.tsx
// Extension: .tsx (TypeScript Next.js Page)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CourseList } from '../../components/LearningPath/CourseList';
import { ProgressTracker } from '../../components/LearningPath/ProgressTracker';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Loading } from '../../components/UI/Loading';

interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: number;
  enrolled: boolean;
  progress: number;
  rating: number;
  students: number;
  instructor: string;
  tags: string[];
  thumbnail?: string;
  estimatedHours: number;
}

interface LearningStats {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalHours: number;
  currentStreak: number;
  achievements: number;
}

const LearnPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fundamentals' | 'advanced' | 'specialization'>('all');

  useEffect(() => {
    const fetchLearningData = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API calls
        const mockCourses: Course[] = [
          {
            id: 'cpp-fundamentals',
            title: 'C++ Fundamentals',
            description: 'Master the basics of C++ programming from variables to functions',
            level: 'beginner',
            duration: '6 weeks',
            lessons: 24,
            enrolled: true,
            progress: 65,
            rating: 4.8,
            students: 12500,
            instructor: 'Dr. Sarah Chen',
            tags: ['Variables', 'Functions', 'Control Flow', 'Arrays'],
            estimatedHours: 18,
            thumbnail: 'https://via.placeholder.com/300x180'
          },
          {
            id: 'oop-cpp',
            title: 'Object-Oriented Programming in C++',
            description: 'Learn classes, objects, inheritance, and polymorphism',
            level: 'intermediate',
            duration: '8 weeks',
            lessons: 32,
            enrolled: true,
            progress: 25,
            rating: 4.9,
            students: 8900,
            instructor: 'Prof. Alex Johnson',
            tags: ['Classes', 'Inheritance', 'Polymorphism', 'Encapsulation'],
            estimatedHours: 24,
            thumbnail: 'https://via.placeholder.com/300x180'
          },
          {
            id: 'stl-mastery',
            title: 'STL Deep Dive',
            description: 'Master the Standard Template Library containers and algorithms',
            level: 'intermediate',
            duration: '10 weeks',
            lessons: 40,
            enrolled: false,
            progress: 0,
            rating: 4.7,
            students: 6700,
            instructor: 'Dr. Michael Zhang',
            tags: ['Containers', 'Iterators', 'Algorithms', 'Templates'],
            estimatedHours: 30,
            thumbnail: 'https://via.placeholder.com/300x180'
          },
          {
            id: 'memory-management',
            title: 'Advanced Memory Management',
            description: 'Deep dive into pointers, references, and dynamic memory',
            level: 'advanced',
            duration: '6 weeks',
            lessons: 28,
            enrolled: false,
            progress: 0,
            rating: 4.6,
            students: 3400,
            instructor: 'Dr. Emily Rodriguez',
            tags: ['Pointers', 'Smart Pointers', 'RAII', 'Memory Safety'],
            estimatedHours: 21,
            thumbnail: 'https://via.placeholder.com/300x180'
          },
          {
            id: 'template-metaprogramming',
            title: 'Template Metaprogramming',
            description: 'Advanced template techniques and compile-time programming',
            level: 'advanced',
            duration: '12 weeks',
            lessons: 48,
            enrolled: false,
            progress: 0,
            rating: 4.5,
            students: 1800,
            instructor: 'Prof. David Wilson',
            tags: ['Templates', 'Metaprogramming', 'SFINAE', 'Concepts'],
            estimatedHours: 36,
            thumbnail: 'https://via.placeholder.com/300x180'
          },
          {
            id: 'concurrency-cpp',
            title: 'Concurrency and Multithreading',
            description: 'Learn parallel programming and thread safety in modern C++',
            level: 'advanced',
            duration: '8 weeks',
            lessons: 36,
            enrolled: false,
            progress: 0,
            rating: 4.8,
            students: 2100,
            instructor: 'Dr. Lisa Park',
            tags: ['Threads', 'Async', 'Mutex', 'Atomics'],
            estimatedHours: 28,
            thumbnail: 'https://via.placeholder.com/300x180'
          }
        ];

        const mockStats: LearningStats = {
          totalCourses: 6,
          completedCourses: 0,
          totalLessons: 208,
          completedLessons: 23,
          totalHours: 157,
          currentStreak: 7,
          achievements: 12
        };

        setCourses(mockCourses);
        setStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch learning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningData();
  }, []);

  const filteredCourses = courses.filter(course => {
    const levelMatch = selectedLevel === 'all' || course.level === selectedLevel;
    // Add category filtering logic here based on tags or other criteria
    return levelMatch;
  });

  const enrolledCourses = courses.filter(course => course.enrolled);
  const recommendedCourses = courses.filter(course => !course.enrolled).slice(0, 3);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loading size="lg" text="Loading your learning dashboard..." />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Learn C++ - C++ Mastery Hub</title>
        <meta name="description" content="Master C++ programming with interactive courses and hands-on exercises" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎓 Learn C++ Programming
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Master C++ from fundamentals to advanced concepts with interactive courses, 
            hands-on exercises, and real-world projects.
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Learning Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.completedLessons}</div>
                <div className="text-sm text-gray-600">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedCourses}</div>
                <div className="text-sm text-gray-600">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalHours}h</div>
                <div className="text-sm text-gray-600">Studied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.achievements}</div>
                <div className="text-sm text-gray-600">Achievements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round((stats.completedLessons / stats.totalLessons) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
              <div className="text-center">
                <Button size="sm" variant="primary">
                  View All Stats
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Continue Learning */}
        {enrolledCourses.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map(course => (
                <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant={course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'error'}>
                      {course.level}
                    </Badge>
                    <span className="text-sm text-gray-500">{course.progress}% complete</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{course.description}</p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {course.lessons} lessons
                    </div>
                    <Link href={`/learn/${course.id}`}>
                      <Button size="sm">Continue</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Courses */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
            <Link href="#all-courses">
              <Button variant="secondary" size="sm">View All Courses</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedCourses.map(course => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'error'}>
                      {course.level}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="text-yellow-500 mr-1">⭐</span>
                      {course.rating}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{course.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{course.lessons} lessons</span>
                    <span>{course.duration}</span>
                    <span>{course.students.toLocaleString()} students</span>
                  </div>

                  <Link href={`/learn/${course.id}`}>
                    <Button className="w-full">Enroll Now</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Courses */}
        <section id="all-courses">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Courses</h2>
            
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="fundamentals">Fundamentals</option>
                <option value="advanced">Advanced Topics</option>
                <option value="specialization">Specializations</option>
              </select>
            </div>
          </div>

          <CourseList 
            courses={filteredCourses}
            showEnrollButton
            showProgress
            onCourseClick={(courseId) => window.location.href = `/learn/${courseId}`}
          />
        </section>

        {/* Learning Paths */}
        <section className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🛤️ Structured Learning Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🌱 Complete Beginner
              </h3>
              <p className="text-gray-600 mb-4">
                Start from zero and build a solid foundation in C++ programming.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• C++ Fundamentals</li>
                <li>• Object-Oriented Programming</li>
                <li>• Basic STL Usage</li>
                <li>• Simple Projects</li>
              </ul>
              <Button variant="primary" size="sm" className="w-full">
                Start Path
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🚀 System Developer
              </h3>
              <p className="text-gray-600 mb-4">
                Learn system-level programming and performance optimization.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Memory Management</li>
                <li>• Concurrency & Threading</li>
                <li>• Performance Optimization</li>
                <li>• System Programming</li>
              </ul>
              <Button variant="primary" size="sm" className="w-full">
                Start Path
              </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🎯 Library Developer
              </h3>
              <p className="text-gray-600 mb-4">
                Master advanced C++ features for building robust libraries.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Template Metaprogramming</li>
                <li>• Modern C++ Features</li>
                <li>• API Design</li>
                <li>• Library Development</li>
              </ul>
              <Button variant="primary" size="sm" className="w-full">
                Start Path
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default LearnPage;