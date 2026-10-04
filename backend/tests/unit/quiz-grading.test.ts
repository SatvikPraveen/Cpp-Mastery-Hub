import { gradeQuiz, publicQuestions, quizQuestionsSchema, type QuizQuestion } from '../../src/services/learning/quiz-grading';

const questions: QuizQuestion[] = [
  { id: 'q1', prompt: 'sizeof(char)?', options: ['1', '2', '4'], answer: 0, explanation: 'By definition.' },
  { id: 'q2', prompt: 'RAII stands for?', options: ['Resource Acquisition Is Initialization', 'Other'], answer: 0 },
  { id: 'q3', prompt: 'std::move does?', options: ['moves', 'casts to rvalue'], answer: 1 },
  { id: 'q4', prompt: 'nullptr type?', options: ['int', 'std::nullptr_t'], answer: 1 },
];

describe('gradeQuiz', () => {
  it('scores a perfect submission as 100 and passing', () => {
    const graded = gradeQuiz(questions, { q1: 0, q2: 0, q3: 1, q4: 1 }, 70);
    expect(graded).toMatchObject({ score: 100, correct: 4, total: 4, passed: true });
  });

  it('treats unanswered questions as wrong and rounds the percentage', () => {
    const graded = gradeQuiz(questions.slice(0, 3), { q1: 0 }, 70);
    expect(graded.score).toBe(33);
    expect(graded.passed).toBe(false);
    expect(graded.results.map((r) => r.chosen)).toEqual([0, null, null]);
  });

  it('ignores answers to questions that are not in the quiz', () => {
    const graded = gradeQuiz(questions, { q1: 0, bogus1: 0, bogus2: 1 } as Record<string, number>, 50);
    expect(graded.correct).toBe(1);
    expect(graded.total).toBe(4);
  });

  it('applies the passing threshold inclusively', () => {
    expect(gradeQuiz(questions, { q1: 0, q2: 0, q3: 0, q4: 0 }, 50).passed).toBe(true); // 2/4 = 50
    expect(gradeQuiz(questions, { q1: 0, q2: 0, q3: 0, q4: 0 }, 51).passed).toBe(false);
  });

  it('includes explanations only where they exist', () => {
    const [first, second] = gradeQuiz(questions, {}, 70).results;
    expect(first?.explanation).toBe('By definition.');
    expect(second).not.toHaveProperty('explanation');
  });
});

describe('quiz question schema', () => {
  it('never exposes answers in the public view', () => {
    for (const q of publicQuestions(questions)) {
      expect(q).not.toHaveProperty('answer');
      expect(q).not.toHaveProperty('explanation');
    }
  });

  it('rejects out-of-range answers and duplicate ids', () => {
    const bad = [
      { id: 'a', prompt: 'p', options: ['x', 'y'], answer: 2 },
      { id: 'a', prompt: 'p', options: ['x', 'y'], answer: 0 },
    ];
    const result = quizQuestionsSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(expect.arrayContaining(['answer index out of range', 'duplicate id']));
    }
  });
});
