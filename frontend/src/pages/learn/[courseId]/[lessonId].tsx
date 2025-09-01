// File: frontend/src/pages/learn/[courseId]/[lessonId].tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { ArrowLeft, ArrowRight, CheckCircle, Play, Code, FileText, Video, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../../components/Layout/Layout';
import CodeEditor from '../../../components/Code/CodeEditor';
import VideoPlayer from '../../../components/Learning/VideoPlayer';
import QuizComponent from '../../../components/Learning/QuizComponent';
import { useAuth } from '../../../hooks/useAuth';
import { courseService } from '../../../services/api';
import { Lesson, LessonContent, UserProgress, Quiz } from '../../../types';

interface LessonPageProps {
  courseId: string;
  lessonId: string;
}

const LessonPage: React.FC<LessonPageProps> = ({ courseId, lessonId }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [userCode, setUserCode] = useState('');

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLessonData();
    }
  }, [courseId, lessonId, isAuthenticated]);

  const fetchLessonData = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    try {
      setLoading(true);
      const [lessonResponse, contentResponse, progressResponse] = await Promise.all([
        courseService.getLesson(courseId, lessonId),
        courseService.getLessonContent(courseId, lessonId),
        courseService.getUserCourseProgress(courseId)
      ]);

      setLesson(lessonResponse.data);
      setLessonContent(contentResponse.data);
      setUserProgress(progressResponse.data);
      setLessonCompleted(progressResponse.data.completedLessons?.includes(lessonId) || false);

      // Load quiz if exists
      if (lessonResponse.data.hasQuiz) {
        const quizResponse = await courseService.getLessonQuiz(courseId, lessonId);
        setQuiz(quizResponse.data);
      }

      // Load user's saved code
      if (contentResponse.data.codeTemplate) {
        try {
          const savedCodeResponse = await courseService.getUserLessonCode(courseId, lessonId);
          setUserCode(savedCodeResponse.data.code || contentResponse.data.codeTemplate);
        } catch {
          setUserCode(contentResponse.data.codeTemplate);
        }
      }
    } catch (err) {
      setError('Failed to load lesson data');
      console.error('Error fetching lesson data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    try {
      await courseService.markLessonComplete(courseId, lessonId);
      setLessonCompleted(true);
      
      // Refresh progress
      const progressResponse = await courseService.getUserCourseProgress(courseId);
      setUserProgress(progressResponse.data);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    }
  };

  const handleRunCode = async () => {
    try {
      const response = await courseService.executeCode({
        code: userCode,
        language: 'cpp',
        input: lessonContent?.codeInput || ''
      });
      setCodeOutput(response.data.output);
    } catch (err) {
      setCodeOutput('Error executing code: ' + (err as Error).message);
    }
  };

  const handleSaveCode = async () => {
    try {
      await courseService.saveLessonCode(courseId, lessonId, userCode);
    } catch (err) {
      console.error('Error saving code:', err);
    }
  };

  const handleNextLesson = () => {
    if (userProgress && userProgress.nextLessonId) {
      router.push(`/learn/${courseId}/${userProgress.nextLessonId}`);
    } else {
      router.push(`/learn/${courseId}`);
    }
  };

  const handlePreviousLesson = () => {
    if (userProgress && userProgress.previousLessonId) {
      router.push(`/learn/${courseId}/${userProgress.previousLessonId}`);
    } else {
      router.push(`/learn/${courseId}`);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'code': return <Code className="h-5 w-5" />;
      case 'quiz': return <CheckCircle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
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

  if (error || !lesson || !lessonContent) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Lesson Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The lesson you are looking for does not exist.'}
            </p>
            <button
              onClick={() => router.push(`/learn/${courseId}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Course
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/learn/${courseId}`)}
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Course
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {lesson.title}
                </h1>
              </div>
              
              <div className="flex items-center space-x-3">
                {lessonCompleted && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Timer className="h-4 w-4 mr-1" />
                  <span className="text-sm">{lesson.estimatedMinutes} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'content', name: 'Content', icon: 'text' },
                      ...(lessonContent.codeTemplate ? [{ id: 'code', name: 'Code Practice', icon: 'code' }] : []),
                      ...(quiz ? [{ id: 'quiz', name: 'Quiz', icon: 'quiz' }] : [])
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        {getContentIcon(tab.icon)}
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Content Tab */}
                  {activeTab === 'content' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {lessonContent.videoUrl && (
                        <div className="mb-8">
                          <VideoPlayer
                            url={lessonContent.videoUrl}
                            onComplete={() => {
                              // Mark video as watched
                            }}
                          />
                        </div>
                      )}

                      <div className="prose dark:prose-invert max-w-none">
                        <div 
                          dangerouslySetInnerHTML={{ __html: lessonContent.content }}
                          className="text-gray-700 dark:text-gray-300"
                        />
                      </div>

                      {lessonContent.codeExamples && lessonContent.codeExamples.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Code Examples
                          </h3>
                          {lessonContent.codeExamples.map((example, index) => (
                            <div key={index} className="mb-6">
                              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                                {example.title}
                              </h4>
                              <CodeEditor
                                value={example.code}
                                language="cpp"
                                readOnly={true}
                                height="200px"
                              />
                              {example.explanation && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  {example.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Code Practice Tab */}
                  {activeTab === 'code' && lessonContent.codeTemplate && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Code Practice
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {lessonContent.codeInstructions || 'Complete the code below according to the lesson requirements.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Code Editor */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">Code Editor</h4>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveCode}
                                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleRunCode}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Run
                              </button>
                            </div>
                          </div>
                          <CodeEditor
                            value={userCode}
                            onChange={setUserCode}
                            language="cpp"
                            height="400px"
                          />
                        </div>

                        {/* Output */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Output</h4>
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-[400px] overflow-auto">
                            <pre>{codeOutput || 'Click "Run" to see output...'}</pre>
                          </div>
                        </div>
                      </div>

                      {lessonContent.expectedOutput && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Expected Output</h4>
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            <pre className="text-sm text-gray-700 dark:text-gray-300">
                              {lessonContent.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Quiz Tab */}
                  {activeTab === 'quiz' && quiz && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <QuizComponent
                        quiz={quiz}
                        onComplete={(score) => {
                          console.log('Quiz completed with score:', score);
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePreviousLesson}
                  disabled={!userProgress?.previousLessonId}
                  className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Previous Lesson
                </button>

                <div className="flex items-center space-x-4">
                  {!lessonCompleted && (
                    <button
                      onClick={handleCompleteLesson}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Mark Complete
                    </button>
                  )}

                  <button
                    onClick={handleNextLesson}
                    disabled={!userProgress?.nextLessonId && !lessonCompleted}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Next Lesson
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Course Progress</h3>
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Completion</span>
                    <span>{userProgress?.progressPercentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${userProgress?.progressPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userProgress?.completedLessons?.length || 0} of {userProgress?.totalLessons || 0} lessons completed
                </p>
              </div>

              {/* Lesson Objectives */}
              {lesson.objectives && lesson.objectives.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Learning Objectives</h3>
                  <ul className="space-y-2">
                    {lesson.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { courseId, lessonId } = context.params!;
  
  return {
    props: {
      courseId: courseId as string,
      lessonId: lessonId as string,
    },
  };
};

export default LessonPage;