// File: backend/tests/unit/models.test.ts
// Extension: .ts
// Location: backend/tests/unit/models.test.ts

import { User } from '../../src/models/User';
import { Course } from '../../src/models/Course';
import { CodeSnippet } from '../../src/models/CodeSnippet';
import { ForumPost } from '../../src/models/ForumPost';
import { Achievement } from '../../src/models/Achievement';
import bcrypt from 'bcrypt';

describe('Database Models', () => {

  beforeEach(async () => {
    // Clean up database before each test
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      CodeSnippet.deleteMany({}),
      ForumPost.deleteMany({}),
      Achievement.deleteMany({})
    ]);
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.status).toBe('active'); // Default value
      expect(savedUser.role).toBe('user'); // Default value
      expect(savedUser.isEmailVerified).toBe(false); // Default value
    });

    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      // Password should be hashed
      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password.length).toBeGreaterThan(50);

      // Should be able to compare with bcrypt
      const isValid = await bcrypt.compare(userData.password, savedUser.password);
      expect(isValid).toBe(true);
    });

    it('should validate required fields', async () => {
      const incompleteUser = new User({
        username: 'testuser'
        // Missing required fields
      });

      await expect(incompleteUser.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData1 = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const userData2 = {
        username: 'testuser2',
        email: 'test@example.com', // Same email
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique username', async () => {
      const userData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const userData2 = {
        username: 'testuser', // Same username
        email: 'test2@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const invalidEmailUser = new User({
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });

      await expect(invalidEmailUser.save()).rejects.toThrow();
    });

    it('should update user profile', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const savedUser = await user.save();

      // Update user
      savedUser.bio = 'Updated bio';
      savedUser.location = 'Test City';
      savedUser.programmingLanguages = ['C++', 'JavaScript'];

      const updatedUser = await savedUser.save();

      expect(updatedUser.bio).toBe('Updated bio');
      expect(updatedUser.location).toBe('Test City');
      expect(updatedUser.programmingLanguages).toEqual(['C++', 'JavaScript']);
    });

    it('should track learning progress', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const savedUser = await user.save();

      // Add progress
      savedUser.progress = [{
        courseId: 'course123',
        completedLessons: ['lesson1', 'lesson2'],
        progressPercentage: 50,
        totalTimeSpent: 3600,
        lastAccessedAt: new Date()
      }];

      const updatedUser = await savedUser.save();

      expect(updatedUser.progress).toHaveLength(1);
      expect(updatedUser.progress[0].courseId).toBe('course123');
      expect(updatedUser.progress[0].completedLessons).toEqual(['lesson1', 'lesson2']);
      expect(updatedUser.progress[0].progressPercentage).toBe(50);
    });
  });

  describe('Course Model', () => {
    it('should create a valid course', async () => {
      const courseData = {
        title: 'C++ Fundamentals',
        description: 'Learn the basics of C++ programming',
        difficulty: 'beginner',
        category: 'fundamentals',
        estimatedHours: 20,
        isPublished: true,
        lessons: [
          {
            title: 'Introduction to C++',
            content: 'Welcome to C++ programming',
            order: 1,
            estimatedTime: 30
          }
        ]
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse._id).toBeDefined();
      expect(savedCourse.title).toBe(courseData.title);
      expect(savedCourse.description).toBe(courseData.description);
      expect(savedCourse.difficulty).toBe(courseData.difficulty);
      expect(savedCourse.category).toBe(courseData.category);
      expect(savedCourse.lessons).toHaveLength(1);
      expect(savedCourse.lessons[0].title).toBe('Introduction to C++');
    });

    it('should validate course difficulty', async () => {
      const invalidCourse = new Course({
        title: 'Test Course',
        description: 'Test description',
        difficulty: 'invalid-difficulty',
        category: 'fundamentals'
      });

      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should validate course category', async () => {
      const invalidCourse = new Course({
        title: 'Test Course',
        description: 'Test description',
        difficulty: 'beginner',
        category: 'invalid-category'
      });

      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should require lessons array', async () => {
      const courseWithoutLessons = new Course({
        title: 'Test Course',
        description: 'Test description',
        difficulty: 'beginner',
        category: 'fundamentals'
      });

      const savedCourse = await courseWithoutLessons.save();
      expect(savedCourse.lessons).toEqual([]);
    });

    it('should add quiz to lesson', async () => {
      const course = new Course({
        title: 'Test Course',
        description: 'Test description',
        difficulty: 'beginner',
        category: 'fundamentals',
        lessons: [
          {
            title: 'Test Lesson',
            content: 'Test content',
            order: 1,
            estimatedTime: 30,
            quiz: {
              questions: [
                {
                  question: 'What is C++?',
                  type: 'multiple-choice',
                  options: ['A language', 'A compiler', 'An IDE'],
                  correctAnswer: 0,
                  explanation: 'C++ is a programming language'
                }
              ],
              passingScore: 70
            }
          }
        ]
      });

      const savedCourse = await course.save();

      expect(savedCourse.lessons[0].quiz).toBeDefined();
      expect(savedCourse.lessons[0].quiz.questions).toHaveLength(1);
      expect(savedCourse.lessons[0].quiz.questions[0].question).toBe('What is C++?');
      expect(savedCourse.lessons[0].quiz.passingScore).toBe(70);
    });
  });

  describe('CodeSnippet Model', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should create a valid code snippet', async () => {
      const snippetData = {
        title: 'Hello World',
        description: 'Basic C++ program',
        code: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
        language: 'cpp',
        author: user._id,
        isPublic: true,
        tags: ['beginner', 'iostream']
      };

      const snippet = new CodeSnippet(snippetData);
      const savedSnippet = await snippet.save();

      expect(savedSnippet._id).toBeDefined();
      expect(savedSnippet.title).toBe(snippetData.title);
      expect(savedSnippet.description).toBe(snippetData.description);
      expect(savedSnippet.code).toBe(snippetData.code);
      expect(savedSnippet.language).toBe(snippetData.language);
      expect(savedSnippet.author.toString()).toBe(user._id.toString());
      expect(savedSnippet.isPublic).toBe(true);
      expect(savedSnippet.tags).toEqual(snippetData.tags);
      expect(savedSnippet.likeCount).toBe(0);
      expect(savedSnippet.forkCount).toBe(0);
      expect(savedSnippet.views).toBe(0);
    });

    it('should validate supported languages', async () => {
      const invalidSnippet = new CodeSnippet({
        title: 'Test',
        code: 'test code',
        language: 'invalid-language',
        author: user._id
      });

      await expect(invalidSnippet.save()).rejects.toThrow();
    });

    it('should track likes and forks', async () => {
      const snippet = await CodeSnippet.create({
        title: 'Test Snippet',
        code: 'int main() { return 0; }',
        language: 'cpp',
        author: user._id,
        isPublic: true
      });

      // Add likes
      snippet.likes = [user._id];
      snippet.likeCount = 1;

      // Add forks
      snippet.forks = [{
        snippet: 'fork-snippet-id',
        author: user._id,
        createdAt: new Date()
      }];
      snippet.forkCount = 1;

      const updatedSnippet = await snippet.save();

      expect(updatedSnippet.likes).toHaveLength(1);
      expect(updatedSnippet.likeCount).toBe(1);
      expect(updatedSnippet.forks).toHaveLength(1);
      expect(updatedSnippet.forkCount).toBe(1);
    });

    it('should handle original snippet reference', async () => {
      const originalSnippet = await CodeSnippet.create({
        title: 'Original Snippet',
        code: 'int main() { return 0; }',
        language: 'cpp',
        author: user._id,
        isPublic: true
      });

      const forkedSnippet = await CodeSnippet.create({
        title: 'Forked Snippet',
        code: 'int main() { return 0; }',
        language: 'cpp',
        author: user._id,
        originalSnippet: originalSnippet._id
      });

      expect(forkedSnippet.originalSnippet.toString()).toBe(originalSnippet._id.toString());
    });
  });

  describe('ForumPost Model', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should create a valid forum post', async () => {
      const postData = {
        title: 'How to learn C++?',
        content: 'I am new to C++ programming. Where should I start?',
        category: 'help',
        author: user._id,
        status: 'published',
        tags: ['beginner', 'learning']
      };

      const post = new ForumPost(postData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.title).toBe(postData.title);
      expect(savedPost.content).toBe(postData.content);
      expect(savedPost.category).toBe(postData.category);
      expect(savedPost.author.toString()).toBe(user._id.toString());
      expect(savedPost.status).toBe('published');
      expect(savedPost.tags).toEqual(postData.tags);
      expect(savedPost.voteScore).toBe(0);
      expect(savedPost.commentCount).toBe(0);
      expect(savedPost.views).toBe(0);
    });

    it('should validate post category', async () => {
      const invalidPost = new ForumPost({
        title: 'Test Post',
        content: 'Test content',
        category: 'invalid-category',
        author: user._id
      });

      await expect(invalidPost.save()).rejects.toThrow();
    });

    it('should validate post status', async () => {
      const invalidPost = new ForumPost({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'invalid-status'
      });

      await expect(invalidPost.save()).rejects.toThrow();
    });

    it('should handle votes', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'published'
      });

      // Add votes
      post.votes = [
        { user: user._id, type: 'upvote', createdAt: new Date() }
      ];
      post.voteScore = 1;

      const updatedPost = await post.save();

      expect(updatedPost.votes).toHaveLength(1);
      expect(updatedPost.votes[0].type).toBe('upvote');
      expect(updatedPost.voteScore).toBe(1);
    });

    it('should handle comments', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'published'
      });

      // Add comment
      post.comments = [{
        author: user._id,
        content: 'This is a test comment',
        createdAt: new Date(),
        votes: [],
        voteScore: 0
      }];
      post.commentCount = 1;

      const updatedPost = await post.save();

      expect(updatedPost.comments).toHaveLength(1);
      expect(updatedPost.comments[0].content).toBe('This is a test comment');
      expect(updatedPost.commentCount).toBe(1);
    });

    it('should handle nested comments', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'published'
      });

      const parentCommentId = 'parent-comment-id';

      post.comments = [
        {
          _id: parentCommentId,
          author: user._id,
          content: 'Parent comment',
          createdAt: new Date(),
          votes: [],
          voteScore: 0
        },
        {
          author: user._id,
          content: 'Reply to parent',
          parentId: parentCommentId,
          createdAt: new Date(),
          votes: [],
          voteScore: 0
        }
      ];

      const updatedPost = await post.save();

      expect(updatedPost.comments).toHaveLength(2);
      expect(updatedPost.comments[1].parentId).toBe(parentCommentId);
    });

    it('should handle bookmarks', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'published'
      });

      // Add bookmark
      post.bookmarks = [user._id];

      const updatedPost = await post.save();

      expect(updatedPost.bookmarks).toHaveLength(1);
      expect(updatedPost.bookmarks[0].toString()).toBe(user._id.toString());
    });
  });

  describe('Achievement Model', () => {
    it('should create a valid achievement', async () => {
      const achievementData = {
        name: 'First Steps',
        description: 'Complete your first lesson',
        icon: 'trophy',
        type: 'progress',
        criteria: {
          lessonsCompleted: 1
        },
        points: 10,
        isActive: true
      };

      const achievement = new Achievement(achievementData);
      const savedAchievement = await achievement.save();

      expect(savedAchievement._id).toBeDefined();
      expect(savedAchievement.name).toBe(achievementData.name);
      expect(savedAchievement.description).toBe(achievementData.description);
      expect(savedAchievement.icon).toBe(achievementData.icon);
      expect(savedAchievement.type).toBe(achievementData.type);
      expect(savedAchievement.criteria).toEqual(achievementData.criteria);
      expect(savedAchievement.points).toBe(achievementData.points);
      expect(savedAchievement.isActive).toBe(true);
    });

    it('should validate achievement type', async () => {
      const invalidAchievement = new Achievement({
        name: 'Test Achievement',
        description: 'Test description',
        type: 'invalid-type',
        criteria: {},
        points: 10
      });

      await expect(invalidAchievement.save()).rejects.toThrow();
    });

    it('should require criteria object', async () => {
      const achievement = new Achievement({
        name: 'Test Achievement',
        description: 'Test description',
        type: 'progress',
        points: 10
      });

      const savedAchievement = await achievement.save();
      expect(savedAchievement.criteria).toEqual({});
    });

    it('should handle different criteria types', async () => {
      const achievements = [
        {
          name: 'Course Master',
          type: 'progress',
          criteria: { coursesCompleted: 5 },
          points: 50
        },
        {
          name: 'Social Butterfly',
          type: 'social',
          criteria: { forumPosts: 10 },
          points: 25
        },
        {
          name: 'Code Warrior',
          type: 'coding',
          criteria: { codeSnippets: 20 },
          points: 30
        }
      ];

      for (const achievementData of achievements) {
        const achievement = new Achievement(achievementData);
        const saved = await achievement.save();
        expect(saved.criteria).toEqual(achievementData.criteria);
      }
    });
  });

  describe('Model Relationships', () => {
    let user: any;
    let course: any;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });

      course = await Course.create({
        title: 'Test Course',
        description: 'Test description',
        difficulty: 'beginner',
        category: 'fundamentals',
        lessons: [{
          title: 'Test Lesson',
          content: 'Test content',
          order: 1,
          estimatedTime: 30
        }]
      });
    });

    it('should populate user in forum post', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        category: 'general',
        author: user._id,
        status: 'published'
      });

      const populatedPost = await ForumPost.findById(post._id)
        .populate('author', 'username firstName lastName')
        .lean();

      expect(populatedPost.author).toBeDefined();
      expect(populatedPost.author.username).toBe('testuser');
      expect(populatedPost.author.firstName).toBe('Test');
    });

    it('should populate author in code snippet', async () => {
      const snippet = await CodeSnippet.create({
        title: 'Test Snippet',
        code: 'int main() { return 0; }',
        language: 'cpp',
        author: user._id
      });

      const populatedSnippet = await CodeSnippet.findById(snippet._id)
        .populate('author', 'username')
        .lean();

      expect(populatedSnippet.author).toBeDefined();
      expect(populatedSnippet.author.username).toBe('testuser');
    });

    it('should handle user progress with course reference', async () => {
      user.progress = [{
        courseId: course._id,
        completedLessons: [course.lessons[0]._id],
        progressPercentage: 100,
        totalTimeSpent: 1800,
        lastAccessedAt: new Date()
      }];

      await user.save();

      const userWithProgress = await User.findById(user._id)
        .populate('progress.courseId', 'title description')
        .lean();

      expect(userWithProgress.progress).toHaveLength(1);
      expect(userWithProgress.progress[0].courseId).toBeDefined();
      expect(userWithProgress.progress[0].courseId.title).toBe('Test Course');
    });
  });
});