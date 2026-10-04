import { z } from 'zod';

/**
 * Quiz questions are stored as JSON in `Quiz.questions`. This schema is the contract for that
 * column; the API never sends `answer` or `explanation` to a client before submission.
 */
export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(8),
  /** Index into `options` of the correct choice. */
  answer: z.number().int().min(0),
  explanation: z.string().optional(),
});

export const quizQuestionsSchema = z
  .array(quizQuestionSchema)
  .min(1)
  .superRefine((qs, ctx) => {
    const ids = new Set<string>();
    qs.forEach((q, i) => {
      if (q.answer >= q.options.length) {
        ctx.addIssue({ code: 'custom', path: [i, 'answer'], message: 'answer index out of range' });
      }
      if (ids.has(q.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: 'duplicate id' });
      ids.add(q.id);
    });
  });

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/** Client view of a question: no answer key. */
export function publicQuestions(questions: QuizQuestion[]) {
  return questions.map(({ id, prompt, options }) => ({ id, prompt, options }));
}

export interface QuestionResult {
  id: string;
  chosen: number | null;
  correct: boolean;
  answer: number;
  explanation?: string;
}

export interface GradedQuiz {
  /** Percentage, rounded to an integer, in [0, 100]. */
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  results: QuestionResult[];
}

/**
 * Grades a submission. Unanswered questions count as incorrect; answers to ids that are not
 * in the quiz are ignored, so a client cannot inflate its score.
 */
export function gradeQuiz(
  questions: QuizQuestion[],
  answers: Record<string, number>,
  passingScore: number
): GradedQuiz {
  const results = questions.map((q): QuestionResult => {
    const chosen = Object.prototype.hasOwnProperty.call(answers, q.id) ? (answers[q.id] ?? null) : null;
    const result: QuestionResult = { id: q.id, chosen, correct: chosen === q.answer, answer: q.answer };
    if (q.explanation !== undefined) result.explanation = q.explanation;
    return result;
  });
  const correct = results.filter((r) => r.correct).length;
  const score = Math.round((100 * correct) / questions.length);
  return { score, correct, total: questions.length, passed: score >= passingScore, results };
}
