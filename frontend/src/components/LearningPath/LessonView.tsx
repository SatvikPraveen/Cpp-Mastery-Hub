// File: frontend/src/components/LearningPath/LessonView.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { Loading } from '../UI/Loading';

interface LessonContent {
  type: 'text' | 'code' | 'video' | 'quiz' | 'exercise';
  id: string;
  title?: string;
  content: string;
  language?: string;
  metadata?: {
    duration?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    points?: number;
  };
}

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'code-completion' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  codeSnippet?: string;
}

interface LessonData {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  points: number;
  content: LessonContent[];
  quiz?: QuizQuestion[];
  prerequisites?: string[];
  objectives: string[];
  completed: boolean;
  progress: number;
  nextLessonId?: string;
  previousLessonId?: string;
}

interface LessonViewProps {
  lessonId: string;
  onComplete: (lessonId: string, score?: number) => void;
  onNavigate: (lessonId: string) => void;
  loading?: boolean;
}

export const LessonView: React.FC<LessonViewProps> = ({
  lessonId,
  onComplete,
  onNavigate,
  loading = false
}) => {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | number>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);

  // Mock lesson data - replace with actual API call
  useEffect(() => {
    const fetchLesson = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockLesson: LessonData = {
        id: lessonId,
        title: 'Understanding C++ Pointers',
        description: 'Learn the fundamentals of pointers in C++, including declaration, initialization, and memory management.',
        courseId: 'cpp-fundamentals',
        courseName: 'C++ Fundamentals',
        difficulty: 'intermediate',
        duration: 25,
        points: 100,
        completed: false,
        progress: 0,
        nextLessonId: 'lesson-next',
        previousLessonId: 'lesson-prev',
        prerequisites: ['Variables and Data Types', 'Memory Basics'],
        objectives: [
          'Understand what pointers are and why they are useful',
          'Learn how to declare and initialize pointers',
          'Practice pointer arithmetic and dereferencing',
          'Understand the relationship between pointers and arrays'
        ],
        content: [
          {
            type: 'text',
            id: 'intro',
            title: 'Introduction to Pointers',
            content: `
              Pointers are one of the most powerful features of C++. A pointer is a variable that stores the memory address of another variable. Understanding pointers is crucial for efficient memory management and advanced C++ programming.

              Think of a pointer as a "signpost" that points to a location in memory where your data is stored, rather than storing the data directly.
            `
          },
          {
            type: 'code',
            id: 'declaration',
            title: 'Pointer Declaration and Initialization',
            content: `// Declaring a pointer
int* ptr;        // ptr is a pointer to an integer
int x = 42;      // regular integer variable

// Initializing a pointer
ptr = &x;        // ptr now points to x's memory address

// Direct declaration and initialization
int* ptr2 = &x;  // declare and initialize in one line

// Printing values
std::cout << "Value of x: " << x << std::endl;           // prints 42
std::cout << "Address of x: " << &x << std::endl;        // prints memory address
std::cout << "Value stored in ptr: " << ptr << std::endl; // prints same address
std::cout << "Value pointed to by ptr: " << *ptr << std::endl; // prints 42`,
            language: 'cpp'
          },
          {
            type: 'text',
            id: 'dereferencing',
            title: 'Dereferencing Pointers',
            content: `
              The asterisk (*) operator is used to access the value stored at the memory address pointed to by a pointer. This operation is called "dereferencing".

              When you dereference a pointer, you're essentially saying "give me the value at the address this pointer is pointing to".
            `
          },
          {
            type: 'code',
            id: 'dereferencing-example',
            title: 'Dereferencing Example',
            content: `int num = 100;
int* ptr = &num;

// Dereferencing the pointer
int value = *ptr;  // value now contains 100

// Modifying the value through the pointer
*ptr = 200;        // num is now 200

std::cout << "num = " << num << std::endl;     // prints 200
std::cout << "*ptr = " << *ptr << std::endl;   // prints 200`,
            language: 'cpp'
          }
        ],
        quiz: [
          {
            id: 'q1',
            type: 'multiple-choice',
            question: 'What does the & operator do when used with a variable?',
            options: [
              'Returns the value of the variable',
              'Returns the memory address of the variable',
              'Dereferences the variable',
              'Creates a copy of the variable'
            ],
            correctAnswer: 1,
            explanation: 'The & operator (address-of operator) returns the memory address where the variable is stored.'
          },
          {
            id: 'q2',
            type: 'multiple-choice',
            question: 'What happens when you dereference a pointer using the * operator?',
            options: [
              'You get the memory address',
              'You get the value stored at the address the pointer points to',
              'You create a new pointer',
              'You delete the pointer'
            ],
            correctAnswer: 1,
            explanation: 'Dereferencing a pointer with * gives you access to the value stored at the memory address the pointer points to.'
          },
          {
            id: 'q3',
            type: 'code-completion',
            question: 'Complete the code to make ptr point to the variable x:',
            codeSnippet: `int x = 10;
int* ptr = _____;`,
            correctAnswer: '&x',
            explanation: 'Use &x to get the address of variable x and assign it to the pointer.'
          }
        ]
      };
      
      setLesson(mockLesson);
    };

    fetchLesson();
  }, [lessonId]);

  const handleQuizAnswer = (questionId: string, answer: string | number) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizSubmit = () => {
    if (!lesson?.quiz) return;

    let correct = 0;
    lesson.quiz.forEach(question => {
      if (quizAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });

    const score = (correct / lesson.quiz.length) * 100;
    setQuizScore(score);
    setQuizCompleted(true);
    setShowExplanations(true);

    // Auto-complete lesson if quiz score is above 70%
    if (score >= 70) {
      onComplete(lessonId, score);
    }
  };

  const handleNextSection = () => {
    if (lesson && currentSection < lesson.content.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else if (lesson?.quiz && !quizCompleted) {
      // Move to quiz
      setCurrentSection(lesson.content.length);
    }
  };

  const handlePreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const renderContent = (content: LessonContent) => {
    switch (content.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {content.title && (
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {content.title}
              </h3>
            )}
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {content.content}
            </div>
          </div>
        );

      case 'code':
        return (
          <div>
            {content.title && (
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {content.title}
              </h3>
            )}
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{content.content}</code>
              </pre>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-600">
            Content type "{content.type}" not yet supported.
          </div>
        );
    }
  };

  const renderQuiz = () => {
    if (!lesson?.quiz) return null;

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900">Knowledge Check</h3>
          <p className="text-gray-600 mt-2">
            Test your understanding of the lesson content.
          </p>
        </div>

        {lesson.quiz.map((question, index) => (
          <div key={question.id} className="space-y-4">
            <div className="font-medium text-gray-900">
              {index + 1}. {question.question}
            </div>

            {question.codeSnippet && (
              <div className="bg-gray-100 p-3 rounded-lg">
                <pre className="text-sm">
                  <code>{question.codeSnippet}</code>
                </pre>
              </div>
            )}

            {question.type === 'multiple-choice' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name={question.id}
                      value={optionIndex}
                      checked={quizAnswers[question.id] === optionIndex}
                      onChange={(e) => handleQuizAnswer(question.id, parseInt(e.target.value))}
                      disabled={quizCompleted}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`
                      ${quizCompleted && optionIndex === question.correctAnswer 
                        ? 'text-green-600 font-medium' 
                        : quizCompleted && quizAnswers[question.id] === optionIndex && optionIndex !== question.correctAnswer
                        ? 'text-red-600'
                        : 'text-gray-700'
                      }
                    `}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'code-completion' && (
              <input
                type="text"
                value={quizAnswers[question.id] || ''}
                onChange={(e) => handleQuizAnswer(question.id, e.target.value)}
                disabled={quizCompleted}
                placeholder="Enter your answer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            )}

            {showExplanations && question.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <strong>Explanation:</strong> {question.explanation}
                </div>
              </div>
            )}
          </div>
        ))}

        {!quizCompleted && (
          <Button
            onClick={handleQuizSubmit}
            disabled={Object.keys(quizAnswers).length < lesson.quiz.length}
            variant="primary"
          >
            Submit Quiz
          </Button>
        )}

        {quizCompleted && quizScore !== null && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Quiz Results</h4>
                <p className="text-gray-600">
                  You scored {quizScore}% ({Math.round(quizScore / 100 * lesson.quiz.length)} out of {lesson.quiz.length} correct)
                </p>
              </div>
              <Badge 
                variant={quizScore >= 70 ? 'success' : 'warning'}
                size="lg"
              >
                {quizScore >= 70 ? 'Passed' : 'Needs Review'}
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading || !lesson) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Loading lesson..." />
      </div>
    );
  }

  const isQuizSection = currentSection >= lesson.content.length;
  const currentContent = !isQuizSection ? lesson.content[currentSection] : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
          <span>{lesson.courseName}</span>
          <span>•</span>
          <Badge variant="secondary" size="sm">
            {lesson.difficulty}
          </Badge>
          <span>•</span>
          <span>{lesson.duration} min</span>
          <span>•</span>
          <span>{lesson.points} points</span>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {lesson.title}
        </h1>
        
        <p className="text-lg text-gray-600 mb-4">
          {lesson.description}
        </p>

        {/* Learning objectives */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">What you'll learn:</h3>
          <ul className="space-y-1 text-blue-800">
            {lesson.objectives.map((objective, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                {objective}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isQuizSection ? 'Knowledge Check' : `Section ${currentSection + 1} of ${lesson.content.length}`}
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((currentSection + (isQuizSection ? 1 : 0)) / (lesson.content.length + (lesson.quiz ? 1 : 0))) * 100}%` 
              }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {Math.round(((currentSection + (isQuizSection ? 1 : 0)) / (lesson.content.length + (lesson.quiz ? 1 : 0))) * 100)}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 min-h-96">
        {isQuizSection ? renderQuiz() : currentContent && renderContent(currentContent)}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePreviousSection}
          disabled={currentSection === 0}
          variant="secondary"
        >
          Previous
        </Button>

        <div className="flex items-center space-x-4">
          {lesson.previousLessonId && (
            <Button
              onClick={() => onNavigate(lesson.previousLessonId!)}
              variant="secondary"
            >
              Previous Lesson
            </Button>
          )}

          {isQuizSection && quizCompleted && quizScore && quizScore >= 70 ? (
            lesson.nextLessonId ? (
              <Button
                onClick={() => onNavigate(lesson.nextLessonId!)}
                variant="primary"
              >
                Next Lesson
              </Button>
            ) : (
              <Button
                onClick={() => onComplete(lessonId, quizScore)}
                variant="primary"
              >
                Complete Course
              </Button>
            )
          ) : (
            <Button
              onClick={handleNextSection}
              disabled={isQuizSection && lesson.quiz}
              variant="primary"
            >
              {isQuizSection ? 'Lesson Complete' : currentSection === lesson.content.length - 1 && lesson.quiz ? 'Take Quiz' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};