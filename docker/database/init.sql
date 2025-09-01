-- File: docker/database/init.sql
-- Extension: .sql
-- Initialize C++ Mastery Hub Database
-- This script sets up the initial database structure and seed data

-- Create database (if running in a fresh PostgreSQL instance)
-- CREATE DATABASE cpp_mastery_hub;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('USER', 'INSTRUCTOR', 'ADMIN');
CREATE TYPE course_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE course_category AS ENUM ('BASICS', 'OOP', 'ALGORITHMS', 'ADVANCED', 'PROJECTS');
CREATE TYPE lesson_type AS ENUM ('TEXT', 'VIDEO', 'CODING', 'QUIZ');
CREATE TYPE difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE submission_status AS ENUM ('PENDING', 'PASSED', 'FAILED');
CREATE TYPE notification_type AS ENUM ('ACHIEVEMENT', 'COURSE_COMPLETION', 'REMINDER', 'FORUM_REPLY', 'SYSTEM');

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Insert seed data for forum categories
INSERT INTO forum_categories (id, name, description, icon, color, order_index, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'General Discussion', 'General C++ programming discussions', '💬', '#3B82F6', 1, NOW(), NOW()),
  (uuid_generate_v4(), 'Beginner Questions', 'Questions from C++ beginners', '🔰', '#10B981', 2, NOW(), NOW()),
  (uuid_generate_v4(), 'Advanced Topics', 'Advanced C++ concepts and techniques', '⚡', '#8B5CF6', 3, NOW(), NOW()),
  (uuid_generate_v4(), 'Code Review', 'Get your code reviewed by the community', '👀', '#F59E0B', 4, NOW(), NOW()),
  (uuid_generate_v4(), 'Project Showcase', 'Show off your C++ projects', '🚀', '#EF4444', 5, NOW(), NOW()),
  (uuid_generate_v4(), 'Career & Industry', 'C++ careers and industry discussions', '💼', '#6B7280', 6, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert seed data for achievements
INSERT INTO achievements (id, title, description, icon, type, criteria, points, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'First Steps', 'Complete your first lesson', '🌟', 'first_lesson', '{"lessons_completed": 1}', 10, NOW(), NOW()),
  (uuid_generate_v4(), 'Code Warrior', 'Solve your first exercise', '⚔️', 'first_exercise', '{"exercises_completed": 1}', 15, NOW(), NOW()),
  (uuid_generate_v4(), 'Dedicated Learner', 'Maintain a 7-day learning streak', '🔥', 'streak_milestone', '{"streak_days": 7}', 25, NOW(), NOW()),
  (uuid_generate_v4(), 'Course Master', 'Complete your first course', '🎓', 'course_completion', '{"courses_completed": 1}', 50, NOW(), NOW()),
  (uuid_generate_v4(), 'Community Helper', 'Help 5 people in the forums', '🤝', 'community_contribution', '{"helpful_replies": 5}', 30, NOW(), NOW()),
  (uuid_generate_v4(), 'Problem Solver', 'Solve 10 exercises', '🧩', 'first_exercise', '{"exercises_completed": 10}', 40, NOW(), NOW()),
  (uuid_generate_v4(), 'Consistency Champion', 'Maintain a 30-day learning streak', '💪', 'streak_milestone', '{"streak_days": 30}', 100, NOW(), NOW()),
  (uuid_generate_v4(), 'Knowledge Seeker', 'Complete 5 courses', '📚', 'course_completion', '{"courses_completed": 5}', 150, NOW(), NOW())
ON CONFLICT (title) DO NOTHING;

-- Create admin user (password: Admin123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'admin@cppmastery.com', crypt('Admin123!', gen_salt('bf')), 'Admin', 'User', 'ADMIN', true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create sample instructor user (password: Instructor123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, bio, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'instructor@cppmastery.com', crypt('Instructor123!', gen_salt('bf')), 'Jane', 'Smith', 'INSTRUCTOR', true, true, 'Experienced C++ developer with 10+ years in the industry', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create sample course
DO $$
DECLARE
    instructor_id UUID;
    course_id UUID;
    lesson1_id UUID;
    lesson2_id UUID;
    exercise_id UUID;
BEGIN
    -- Get instructor ID
    SELECT id INTO instructor_id FROM users WHERE email = 'instructor@cppmastery.com';
    
    IF instructor_id IS NOT NULL THEN
        -- Create course
        INSERT INTO courses (id, title, description, level, category, instructor_id, duration, featured, thumbnail, tags, created_at, updated_at)
        VALUES (uuid_generate_v4(), 'C++ Fundamentals', 'Learn the basics of C++ programming from scratch', 'BEGINNER', 'BASICS', instructor_id, 480, true, '/images/courses/cpp-fundamentals.jpg', ARRAY['beginner', 'fundamentals', 'syntax'], NOW(), NOW())
        RETURNING id INTO course_id;
        
        -- Create lessons
        INSERT INTO lessons (id, title, content, type, order_index, duration, course_id, objectives, starter_code, created_at, updated_at)
        VALUES 
          (uuid_generate_v4(), 'Introduction to C++', '<h2>Welcome to C++</h2><p>C++ is a powerful, general-purpose programming language...</p>', 'TEXT', 1, 30, course_id, ARRAY['Understand what C++ is', 'Learn about its history', 'Set up development environment'], NULL, NOW(), NOW()),
          (uuid_generate_v4(), 'Your First C++ Program', '<h2>Hello, World!</h2><p>Let''s write your first C++ program...</p>', 'CODING', 2, 45, course_id, ARRAY['Write a Hello World program', 'Understand basic syntax', 'Compile and run code'], '#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}', NOW(), NOW())
        RETURNING id INTO lesson2_id;
        
        -- Create exercise
        INSERT INTO exercises (id, title, description, difficulty, estimated_time, starter_code, solution_code, test_cases, hints, tags, lesson_id, created_at, updated_at)
        VALUES (
          uuid_generate_v4(),
          'Hello World Challenge',
          'Write a C++ program that outputs "Hello, World!" to the console.',
          'EASY',
          15,
          '#include <iostream>\n\nint main() {\n    // Write your code here\n    return 0;\n}',
          '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
          '[{"input": "", "expected_output": "Hello, World!"}]',
          ARRAY['Use std::cout to print text', 'Don''t forget the semicolon', 'Include the iostream header'],
          ARRAY['hello-world', 'basics', 'output'],
          lesson2_id,
          NOW(),
          NOW()
        );
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['users', 'courses', 'lessons', 'exercises', 'enrollments', 'lesson_completions', 'exercise_submissions', 'forum_categories', 'forum_posts', 'forum_replies', 'achievements', 'user_achievements', 'notifications'];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()', 
            table_name, table_name);
    END LOOP;
END $$;

-- Insert sample forum post
DO $$
DECLARE
    admin_id UUID;
    category_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE email = 'admin@cppmastery.com';
    SELECT id INTO category_id FROM forum_categories WHERE name = 'General Discussion' LIMIT 1;
    
    IF admin_id IS NOT NULL AND category_id IS NOT NULL THEN
        INSERT INTO forum_posts (id, title, content, category_id, author_id, tags, is_pinned, created_at, updated_at)
        VALUES (
          uuid_generate_v4(),
          'Welcome to C++ Mastery Hub!',
          '<p>Welcome to our learning community! This is a place where C++ enthusiasts of all levels can come together to learn, share knowledge, and grow together.</p><p>Feel free to ask questions, share your projects, and help others on their C++ journey.</p><p>Happy coding! 🚀</p>',
          category_id,
          admin_id,
          ARRAY['welcome', 'community', 'announcement'],
          true,
          NOW(),
          NOW()
        );
    END IF;
END $$;

