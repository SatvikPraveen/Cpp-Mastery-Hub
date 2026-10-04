import type { Difficulty } from '@prisma/client';

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  EXPERT: 3,
};

export interface CourseFeatures {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Course ids that must be completed first. */
  prerequisites: string[];
  tags: string[];
  enrollmentCount: number;
}

export interface LearnerState {
  completed: CourseFeatures[];
  enrolledIds: Set<string>;
}

export interface Recommendation {
  courseId: string;
  title: string;
  difficulty: Difficulty;
  reason: string;
  /** Lexicographic ranking key, exposed for transparency and tests. */
  rank: [number, number, number, number];
}

/**
 * Next-course recommendation: a transparent rule-based ranker (no learned model).
 *
 *   1. Exclude courses the learner is enrolled in or has completed.
 *   2. Eligible courses (every prerequisite completed) rank above ineligible ones.
 *   3. Prefer the "next" difficulty: one level above the hardest completed course
 *      (BEGINNER for a new learner), measured by |rank(course) - target|.
 *   4. Prefer topical continuity: more tags shared with completed courses.
 *   5. Break ties by popularity (enrollment count), then by id for determinism.
 *
 * The ordering is a strict lexicographic key, so results are reproducible and each
 * recommendation carries a human-readable reason.
 */
export function rankRecommendations(
  candidates: CourseFeatures[],
  learner: LearnerState,
  limit = 5
): Recommendation[] {
  const completedIds = new Set(learner.completed.map((c) => c.id));
  const completedTags = new Set(learner.completed.flatMap((c) => c.tags.map((t) => t.toLowerCase())));
  const hardest = learner.completed.reduce((m, c) => Math.max(m, DIFFICULTY_RANK[c.difficulty]), -1);
  const target = Math.min(hardest + 1, DIFFICULTY_RANK.EXPERT);

  return candidates
    .filter((c) => !learner.enrolledIds.has(c.id) && !completedIds.has(c.id))
    .map((c): Recommendation => {
      const missing = c.prerequisites.filter((p) => !completedIds.has(p));
      const ineligible = missing.length === 0 ? 0 : 1;
      const distance = Math.abs(DIFFICULTY_RANK[c.difficulty] - target);
      const overlap = c.tags.filter((t) => completedTags.has(t.toLowerCase())).length;
      const reasons: string[] = [];
      if (ineligible === 1) reasons.push(`requires ${missing.length} more prerequisite course(s)`);
      else if (distance === 0) reasons.push(hardest < 0 ? 'good starting level' : 'next difficulty level');
      if (overlap > 0) reasons.push(`builds on ${overlap} topic(s) you have studied`);
      if (reasons.length === 0) reasons.push('popular with other learners');
      return {
        courseId: c.id,
        title: c.title,
        difficulty: c.difficulty,
        reason: reasons.join('; '),
        rank: [ineligible, distance, -overlap, -c.enrollmentCount],
      };
    })
    .sort((a, b) => {
      for (let i = 0; i < a.rank.length; i++) {
        const d = (a.rank[i] ?? 0) - (b.rank[i] ?? 0);
        if (d !== 0) return d;
      }
      return a.courseId.localeCompare(b.courseId);
    })
    .slice(0, limit);
}
