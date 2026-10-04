/**
 * Idempotent development seed: forum categories, one published course with three lessons, a
 * quiz and an exercise. Safe to run repeatedly (`npm run db:seed`); it upserts by stable ids.
 *
 * No user accounts are created: register through the API so passwords are never committed.
 */
import { Difficulty, PrismaClient } from '@prisma/client';

import { quizQuestionsSchema } from '../src/services/learning/quiz-grading';

const prisma = new PrismaClient();

const categories = [
  { id: 'cat-general', name: 'General', description: 'Anything about learning C++', color: 'blue', orderIndex: 0 },
  { id: 'cat-help', name: 'Help', description: 'Stuck on an exercise? Ask here', color: 'green', orderIndex: 1 },
  { id: 'cat-showcase', name: 'Showcase', description: 'Share what you built', color: 'purple', orderIndex: 2 },
];

const lessons = [
  {
    id: 'lesson-raii-1',
    title: 'Ownership and lifetimes',
    orderIndex: 1,
    duration: 15,
    content:
      '# Ownership and lifetimes\n\nEvery resource has exactly one owner. When the owner is destroyed, the ' +
      'resource is released. This is **RAII**: Resource Acquisition Is Initialization.\n',
  },
  {
    id: 'lesson-raii-2',
    title: 'Smart pointers',
    orderIndex: 2,
    duration: 20,
    content:
      '# Smart pointers\n\n`std::unique_ptr` models sole ownership; `std::shared_ptr` models shared ' +
      'ownership with reference counting. Prefer `std::make_unique`.\n',
  },
  {
    id: 'lesson-raii-3',
    title: 'Struct layout and padding',
    orderIndex: 3,
    duration: 15,
    content:
      '# Struct layout and padding\n\nFields are aligned to their natural alignment, so declaration order ' +
      'changes `sizeof`. Use the memory-layout view to see the padding and an optimal order.\n',
  },
];

const quizQuestions = quizQuestionsSchema.parse([
  {
    id: 'q1',
    prompt: 'Which type expresses sole ownership of a heap object?',
    options: ['T*', 'std::shared_ptr<T>', 'std::unique_ptr<T>', 'std::weak_ptr<T>'],
    answer: 2,
    explanation: 'unique_ptr is move-only and deletes the object when it goes out of scope.',
  },
  {
    id: 'q2',
    prompt: 'On LP64, what is sizeof(struct { char a; double b; char c; int d; })?',
    options: ['14', '16', '24', '32'],
    answer: 2,
    explanation: '1 + 7 padding + 8 + 1 + 3 padding + 4 = 24. Reordering by alignment gives 16.',
  },
]);

async function main(): Promise<void> {
  for (const c of categories) {
    await prisma.forumCategory.upsert({ where: { id: c.id }, create: c, update: c });
  }

  await prisma.course.upsert({
    where: { id: 'course-raii' },
    create: {
      id: 'course-raii',
      title: 'Resource Management in Modern C++',
      shortDescription: 'RAII, smart pointers and memory layout',
      description: 'Learn how C++ manages resources deterministically and how objects are laid out in memory.',
      difficulty: Difficulty.INTERMEDIATE,
      category: 'memory',
      tags: ['memory', 'raii', 'smart-pointers'],
      estimatedHours: 1,
      totalLessons: lessons.length,
      isPublished: true,
    },
    update: { totalLessons: lessons.length, isPublished: true },
  });

  for (const l of lessons) {
    await prisma.lesson.upsert({
      where: { id: l.id },
      create: { ...l, courseId: 'course-raii', isPublished: true },
      update: { ...l, isPublished: true },
    });
  }

  await prisma.quiz.upsert({
    where: { id: 'quiz-raii' },
    create: {
      id: 'quiz-raii',
      lessonId: 'lesson-raii-3',
      title: 'Ownership and layout check',
      questions: quizQuestions,
      passingScore: 50,
      isPublished: true,
    },
    update: { questions: quizQuestions, isPublished: true },
  });

  await prisma.exercise.upsert({
    where: { id: 'exercise-raii-1' },
    create: {
      id: 'exercise-raii-1',
      lessonId: 'lesson-raii-2',
      title: 'Replace raw new/delete',
      description: 'Rewrite the function so that no raw new or delete remains.',
      instructions: 'Use std::make_unique. Static analysis will confirm memory/raw-new-delete no longer fires.',
      starterCode: '#include <memory>\n\nint answer() {\n    int* p = new int(42);\n    int v = *p;\n    delete p;\n    return v;\n}\n',
      testCases: [],
      difficulty: Difficulty.BEGINNER,
      allowedLanguages: ['cpp'],
      hints: ['std::make_unique<int>(42) returns a std::unique_ptr<int>.'],
      tags: ['raii'],
      isPublished: true,
    },
    update: { isPublished: true },
  });

  console.log('Seed complete: %d categories, 1 course, %d lessons, 1 quiz, 1 exercise', categories.length, lessons.length);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
