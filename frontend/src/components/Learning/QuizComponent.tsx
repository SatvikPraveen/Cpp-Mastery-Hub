import { CheckCircle, XCircle } from 'lucide-react';
import React, { useState } from 'react';

import type { Quiz } from '@/types';

interface QuizComponentProps {
  quiz: Quiz;
  /** Called with the score as a percentage (0-100) once the quiz is submitted. */
  onComplete?: (score: number) => void;
}

export const QuizComponent: React.FC<QuizComponentProps> = ({ quiz, onComplete }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const total = quiz.questions.length;
  const answeredAll = quiz.questions.every((q) => answers[q.id] !== undefined);
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correctAnswer).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const passed = score >= (quiz.passingScore ?? 70);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onComplete?.(score);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {quiz.title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{quiz.title}</h3>
      )}

      {quiz.questions.map((question, qIndex) => {
        const selected = answers[question.id];
        return (
          <fieldset
            key={question.id}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <legend className="px-1 font-medium text-gray-900 dark:text-white">
              {qIndex + 1}. {question.question}
            </legend>
            <div className="mt-3 space-y-2">
              {question.options.map((option, oIndex) => {
                const inputId = `${question.id}-${oIndex}`;
                const isCorrect = submitted && oIndex === question.correctAnswer;
                const isWrong = submitted && selected === oIndex && !isCorrect;
                return (
                  <div
                    key={inputId}
                    className={`flex items-center gap-2 p-2 rounded ${
                      isCorrect ? 'bg-green-50 dark:bg-green-900/20' : ''
                    } ${isWrong ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={question.id}
                      checked={selected === oIndex}
                      disabled={submitted}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: oIndex }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={inputId} className="text-sm text-gray-700 dark:text-gray-300">
                      {option}
                    </label>
                    {isCorrect && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                    {isWrong && <XCircle className="h-4 w-4 text-red-600 ml-auto" />}
                  </div>
                );
              })}
            </div>
            {submitted && question.explanation && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {question.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {submitted ? (
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className={`font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
            You scored {score}% ({correct}/{total}) {passed ? '- passed!' : '- try again.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Retry
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!answeredAll}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answers
        </button>
      )}
    </form>
  );
};

export default QuizComponent;
