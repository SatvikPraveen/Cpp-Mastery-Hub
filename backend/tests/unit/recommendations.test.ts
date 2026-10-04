import { rankRecommendations, type CourseFeatures } from '../../src/services/learning/recommendations';

const course = (id: string, difficulty: CourseFeatures['difficulty'], extra: Partial<CourseFeatures> = {}): CourseFeatures => ({
  id,
  title: id,
  difficulty,
  prerequisites: [],
  tags: [],
  enrollmentCount: 0,
  ...extra,
});

const catalog: CourseFeatures[] = [
  course('basics', 'BEGINNER', { tags: ['syntax'], enrollmentCount: 900 }),
  course('stl', 'INTERMEDIATE', { prerequisites: ['basics'], tags: ['containers', 'syntax'], enrollmentCount: 300 }),
  course('raii', 'INTERMEDIATE', { prerequisites: ['basics'], tags: ['memory'], enrollmentCount: 500 }),
  course('templates', 'ADVANCED', { prerequisites: ['stl'], tags: ['generics'], enrollmentCount: 200 }),
  course('intro-git', 'BEGINNER', { enrollmentCount: 50 }),
];

describe('rankRecommendations', () => {
  it('starts a new learner at BEGINNER, most popular first', () => {
    const recs = rankRecommendations(catalog, { completed: [], enrolledIds: new Set() });
    expect(recs.slice(0, 2).map((r) => r.courseId)).toEqual(['basics', 'intro-git']);
    expect(recs[0]?.reason).toContain('good starting level');
  });

  it('moves up one level and prefers topical continuity after completing basics', () => {
    const basics = catalog[0]!;
    const recs = rankRecommendations(catalog, { completed: [basics], enrolledIds: new Set(['basics']) });
    // Both intermediate courses are eligible; "stl" shares the 'syntax' tag and wins on overlap
    // despite lower popularity.
    expect(recs.map((r) => r.courseId).slice(0, 2)).toEqual(['stl', 'raii']);
    expect(recs[0]?.reason).toMatch(/next difficulty level; builds on 1 topic/);
  });

  it('ranks courses with missing prerequisites last and explains why', () => {
    const recs = rankRecommendations(catalog, { completed: [], enrolledIds: new Set() }, 10);
    const templates = recs.find((r) => r.courseId === 'templates');
    expect(recs.at(-1)?.courseId).toBe('templates');
    expect(templates?.reason).toContain('requires 1 more prerequisite');
  });

  it('never recommends enrolled or completed courses', () => {
    const recs = rankRecommendations(catalog, { completed: [catalog[0]!], enrolledIds: new Set(['raii']) }, 10);
    const ids = recs.map((r) => r.courseId);
    expect(ids).not.toContain('basics');
    expect(ids).not.toContain('raii');
  });

  it('is deterministic for exact ties', () => {
    const tied = [course('b', 'BEGINNER'), course('a', 'BEGINNER')];
    const recs = rankRecommendations(tied, { completed: [], enrolledIds: new Set() });
    expect(recs.map((r) => r.courseId)).toEqual(['a', 'b']);
  });

  it('respects the limit', () => {
    expect(rankRecommendations(catalog, { completed: [], enrolledIds: new Set() }, 2)).toHaveLength(2);
  });
});
