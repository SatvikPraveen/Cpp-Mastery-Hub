// File: frontend/src/pages/learn/[courseId].tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { ArrowLeft, Play, CheckCircle, Clock, Users, Star, BookOpen, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import LessonCard from '../../components/Learning/LessonCard';
import PrerequisiteCard from '../../components/Learning/PrerequisiteCard';
import { useAuth } from '../../hooks/useAuth';
import { courseService } from '../../services/api';
import { Course, Lesson, UserProgress, Prerequisite } from '../../types';

interface CoursePageProps {
  courseId: string;
}

const CoursePage: React.FC<CoursePageProps> = ({ courseId }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, isAuthenticated]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseResponse, lessonsResponse, prerequisitesResponse] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getCourseLessons(courseId),
        courseService.getCoursePrerequisites(courseId)
      ]);

      setCourse(courseResponse.data);
      setLessons(lessonsResponse.data);
      setPrerequisites(prerequisitesResponse.data);

      if (isAuthenticated) {
        try {
          const progressResponse = await courseService.getUserCourseProgress(courseId);
          setUserProgress(progressResponse.data);
        } catch (err) {
          // User not enrolled yet
          setUserProgress(null);
        }
      }
    } catch (err) {
      setError('Failed to load course data');
      console.error('Error fetching course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    try {
      setEnrolling(true);
      await courseService.enrollInCourse(courseId);
      await fetchCourseData(); // Refresh data after enrollment
    } catch (err) {
      console.error('Error enrolling in course:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonClick = (lessonId: string) => {
    router.push(`/learn/${courseId}/${lessonId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const calculateProgress = () => {
    if (!userProgress || lessons.length === 0) return 0;
    const completedLessons = lessons.filter(lesson => 
      userProgress.completedLessons?.includes(lesson.id)
    ).length;
    return Math.round((completedLessons / lessons.length) * 100);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Course Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The course you are looking for does not exist.'}
            </p>
            <button
              onClick={() => router.push('/learn')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Learning Hub
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push('/learn')}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Learning Hub
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(course.difficulty)}`}>
                      {course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full text-sm font-medium">
                      {course.category}
                    </span>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {course.title}
                  </h1>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {course.description}
                  </p>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Lessons</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{lessons.length}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.estimatedHours}h</p>
                    </div>
                    <div className="text-center">
                      <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.enrollmentCount}</p>
                    </div>
                    <div className="text-center">
                      <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.rating}/5</p>
                    </div>
                  </div>

                  {/* Progress Bar (if enrolled) */}
                  {userProgress && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progress
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          {calculateProgress()}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${calculateProgress()}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!isAuthenticated ? (
                    <button
                      onClick={() => router.push('/auth/login')}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Sign In to Enroll
                    </button>
                  ) : !userProgress ? (
                    <button
                      onClick={handleEnrollment}
                      disabled={enrolling}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrolling ? 'Enrolling...' : 'Enroll in Course'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const nextLesson = lessons.find(lesson => 
                          !userProgress.completedLessons?.includes(lesson.id)
                        );
                        if (nextLesson) {
                          handleLessonClick(nextLesson.id);
                        }
                      }}
                      className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Continue Learning
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Course Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Course Content
              </h2>
              
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    index={index + 1}
                    isCompleted={userProgress?.completedLessons?.includes(lesson.id) || false}
                    isLocked={!userProgress && index > 0}
                    onClick={() => userProgress && handleLessonClick(lesson.id)}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Learning Objectives */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Learning Objectives
              </h3>
              <ul className="space-y-3">
                {course.learningObjectives?.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      {objective}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Prerequisites
                </h3>
                <div className="space-y-3">
                  {prerequisites.map((prerequisite) => (
                    <PrerequisiteCard
                      key={prerequisite.id}
                      prerequisite={prerequisite}
                      onClick={() => router.push(`/learn/${prerequisite.courseId}`)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Instructor Info */}
            {course.instructor && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Instructor
                </h3>
                <div className="flex items-center">
                  {course.instructor.avatar && (
                    <img
                      src={course.instructor.avatar}
                      alt={course.instructor.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {course.instructor.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {course.instructor.title}
                    </p>
                  </div>
                </div>
                {course.instructor.bio && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                    {course.instructor.bio}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { courseId } = context.params!;
  
  return {
    props: {
      courseId: courseId as string,
    },
  };
};

export default CoursePage;