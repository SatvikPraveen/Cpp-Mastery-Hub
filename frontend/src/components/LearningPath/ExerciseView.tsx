import { Play, CheckCircle, AlertCircle, Clock, Target, Lightbulb, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

import CodeEditor from '@/components/Code/CodeEditor';
import { Button } from '@/components/UI/Button';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { apiService } from '@/services/api';
import { Exercise, SkillLevel, SubmissionResult, TestCase } from '@/types';
import { getErrorMessage } from '@/utils/errors';

const difficultyClasses: Record<SkillLevel, string> = {
  [SkillLevel.BEGINNER]: 'bg-green-100 text-green-800',
  [SkillLevel.INTERMEDIATE]: 'bg-yellow-100 text-yellow-800',
  [SkillLevel.ADVANCED]: 'bg-red-100 text-red-800',
  [SkillLevel.EXPERT]: 'bg-purple-100 text-purple-800',
};

interface ExerciseViewProps {
  exercise: Exercise;
  onComplete?: (success: boolean) => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise, onComplete }) => {
  const [userCode, setUserCode] = useState(exercise.starterCode);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const { executeCode, isExecuting, result, error: executionError } = useCodeExecution();
  const hints = exercise.hints ?? [];

  const runTests = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await apiService.post<SubmissionResult>(
        `/api/exercises/${exercise.id}/submit`,
        { code: userCode }
      );
      const tests = response.data.testResults;
      setTestResults(tests);

      if (tests.length > 0 && tests.every((test) => test.passed)) {
        onComplete?.(true);
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Failed to run tests'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const runCode = async () => {
    try {
      await executeCode(userCode, { language: 'cpp' });
    } catch {
      // The hook already exposes the error via `executionError`.
    }
  };

  const resetCode = () => {
    setUserCode(exercise.starterCode);
    setTestResults([]);
    setSubmitError(null);
  };

  const nextHint = () => {
    if (currentHint < hints.length - 1) {
      setCurrentHint(currentHint + 1);
    }
  };

  const allTestsPassed = testResults.length > 0 && testResults.every((test) => test.passed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Problem Description */}
      <div className="space-y-6">
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">{exercise.title}</h2>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  difficultyClasses[exercise.difficulty]
                }`}
              >
                {exercise.difficulty.charAt(0) + exercise.difficulty.slice(1).toLowerCase()}
              </span>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {exercise.estimatedTime ?? Math.ceil((exercise.timeLimit ?? 0) / 60)} min
                </span>
              </div>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-line">{exercise.description}</p>
            {exercise.instructions && (
              <p className="whitespace-pre-line mt-4">{exercise.instructions}</p>
            )}
          </div>

          {/* Examples */}
          {exercise.examples && exercise.examples.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Examples</h3>
              <div className="space-y-4">
                {exercise.examples.map((example) => (
                  <div
                    key={`${example.input}->${example.output}`}
                    className="bg-muted rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Input:</h4>
                        <pre className="text-sm bg-background border rounded p-2 overflow-x-auto">
                          {example.input}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Output:</h4>
                        <pre className="text-sm bg-background border rounded p-2 overflow-x-auto">
                          {example.output}
                        </pre>
                      </div>
                    </div>
                    {example.explanation && (
                      <div className="mt-3">
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          Explanation:
                        </h4>
                        <p className="text-sm">{example.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {exercise.constraints && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Constraints</h3>
              <ul className="text-sm space-y-1">
                {exercise.constraints.map((constraint) => (
                  <li key={constraint} className="flex items-start space-x-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowHints(!showHints)}
                leftIcon={<Lightbulb className="h-4 w-4" />}
              >
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </Button>

              {showHints && (
                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Hint {currentHint + 1} of {hints.length}
                    </h4>
                    {currentHint < hints.length - 1 && (
                      <Button size="sm" variant="outline" onClick={nextHint}>
                        Next Hint
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {hints[currentHint]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-background border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Test Results</span>
              {allTestsPassed && <CheckCircle className="h-5 w-5 text-green-600" />}
            </h3>

            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div
                  key={test.id}
                  className={`border rounded-lg p-3 ${
                    test.passed
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Test Case {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      {test.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          test.passed ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {test.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  {!test.passed && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Expected:</span>
                        <pre className="mt-1 bg-background border rounded p-2 overflow-x-auto">
                          {test.expected}
                        </pre>
                      </div>
                      <div>
                        <span className="font-medium">Got:</span>
                        <pre className="mt-1 bg-background border rounded p-2 overflow-x-auto">
                          {test.actual}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {allTestsPassed && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    Congratulations! All tests passed!
                  </span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You&apos;ve successfully solved this exercise. Great job!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="space-y-4">
        <div className="bg-background border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Your Solution</h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetCode}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runCode()}
                loading={isExecuting}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Run
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void runTests()}
                loading={isSubmitting}
                leftIcon={<Target className="h-4 w-4" />}
              >
                Submit
              </Button>
            </div>
          </div>

          <CodeEditor
            value={userCode}
            onChange={setUserCode}
            language="cpp"
            theme="vs-dark"
            height="24rem"
          />
        </div>

        {submitError && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {submitError}
          </div>
        )}

        {/* Output */}
        {(result ?? executionError) && (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
              <span>Output</span>
              {result && (
                <span>
                  exit {result.exitCode} · {result.executionTime} ms
                </span>
              )}
            </div>
            {result?.output && (
              <pre className="text-green-400 whitespace-pre-wrap">{result.output}</pre>
            )}
            {(result?.error ?? executionError) && (
              <pre className="text-red-400 whitespace-pre-wrap">
                {result?.error ?? executionError}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
