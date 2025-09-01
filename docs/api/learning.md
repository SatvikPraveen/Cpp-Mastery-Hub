# Learning Platform API Reference

Documentation for learning management, courses, lessons, exercises, and progress tracking.

## Overview

The Learning Platform API provides comprehensive access to educational content, progress tracking, and personalized learning experiences for C++ programming.

## Course Management

### List Courses

Get all available courses with filtering and pagination.

**Endpoint:** `GET /api/v1/learning/courses`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `difficulty` (string): Filter by difficulty (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
- `tags` (string): Comma-separated tags
- `search` (string): Search in title and description
- `sortBy` (string): Sort field (title, difficulty, createdAt, popularity)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "course-uuid",
      "title": "C++ Fundamentals",
      "description": "Learn the basics of C++ programming language",
      "difficulty": "BEGINNER",
      "estimatedHours": 40,
      "thumbnail": "https://cdn.example.com/course-thumb.jpg",
      "tags": ["cpp", "basics", "programming"],
      "isPublished": true,
      "enrollmentCount": 1250,
      "rating": 4.8,
      "instructorId": "instructor-uuid",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Get Course Details

**Endpoint:** `GET /api/v1/learning/courses/{courseId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "course-uuid",
    "title": "C++ Fundamentals",
    "description": "Learn the basics of C++ programming language",
    "difficulty": "BEGINNER",
    "estimatedHours": 40,
    "thumbnail": "https://cdn.example.com/course-thumb.jpg",
    "tags": ["cpp", "basics", "programming"],
    "isPublished": true,
    "lessons": [
      {
        "id": "lesson-uuid",
        "title": "Introduction to C++",
        "description": "Overview of C++ programming language",
        "order": 1,
        "duration": 30,
        "isCompleted": false
      }
    ],
    "enrollmentCount": 1250,
    "rating": 4.8,
    "userProgress": {
      "isEnrolled": true,
      "progress": 65.5,
      "timeSpent": 1620,
      "completedLessons": 8,
      "totalLessons": 12
    }
  }
}
```

### Enroll in Course

**Endpoint:** `POST /api/v1/learning/courses/{courseId}/enroll`

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "enrollment-uuid",
    "courseId": "course-uuid",
    "enrolledAt": "2024-01-15T10:30:00Z",
    "message": "Successfully enrolled in course"
  }
}
```

## Lesson Management

### Get Lesson Details

**Endpoint:** `GET /api/v1/learning/lessons/{lessonId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lesson-uuid",
    "courseId": "course-uuid",
    "title": "Variables and Data Types",
    "description": "Learn about C++ variables and built-in data types",
    "content": {
      "type": "mixed",
      "content": "# Variables and Data Types\n\nIn C++, variables are...",
      "resources": [
        {
          "type": "link",
          "title": "C++ Reference - Variables",
          "url": "https://cppreference.com/variables",
          "description": "Official C++ documentation on variables"
        }
      ],
      "codeExamples": [
        {
          "title": "Basic Variable Declaration",
          "description": "Example of declaring variables in C++",
          "code": "int age = 25;\nstd::string name = \"John\";\nbool isStudent = true;",
          "language": "cpp",
          "explanation": "This example shows how to declare variables of different types",
          "runnable": true
        }
      ]
    },
    "order": 2,
    "duration": 45,
    "exercises": [
      {
        "id": "exercise-uuid",
        "title": "Variable Declaration Practice",
        "difficulty": "BEGINNER",
        "points": 10
      }
    ],
    "prerequisites": ["lesson-intro-uuid"],
    "objectives": [
      "Understand C++ variable declaration syntax",
      "Learn about different data types",
      "Practice variable initialization"
    ],
    "userProgress": {
      "isCompleted": false,
      "timeSpent": 15,
      "lastAccessed": "2024-01-15T09:00:00Z"
    }
  }
}
```

### Mark Lesson Complete

**Endpoint:** `POST /api/v1/learning/lessons/{lessonId}/complete`

**Request Body:**
```json
{
  "timeSpent": 45
}
```

## Exercise Management

### Get Exercise Details

**Endpoint:** `GET /api/v1/learning/exercises/{exerciseId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exercise-uuid",
    "lessonId": "lesson-uuid",
    "title": "Variable Declaration Practice",
    "description": "Practice declaring and initializing variables of different types",
    "instruction": "Create variables for storing a person's age, name, and student status. Initialize them with appropriate values.",
    "starterCode": "// TODO: Declare variables here\n\nint main() {\n    // Your code here\n    return 0;\n}",
    "solution": "int age = 25;\nstd::string name = \"John\";\nbool isStudent = true;\n\nint main() {\n    return 0;\n}",
    "testCases": [
      {
        "id": "test-1",
        "input": "",
        "expectedOutput": "",
        "description": "Compilation test",
        "isHidden": false,
        "points": 5
      }
    ],
    "difficulty": "BEGINNER",
    "points": 10,
    "hints": [
      "Remember to include the appropriate header for std::string",
      "Use meaningful variable names",
      "Initialize variables when declaring them"
    ],
    "timeLimit": 300,
    "memoryLimit": 64,
    "userSubmissions": [
      {
        "id": "submission-uuid",
        "isCorrect": false,
        "score": 3,
        "submittedAt": "2024-01-15T09:30:00Z"
      }
    ]
  }
}
```

### Submit Exercise Solution

**Endpoint:** `POST /api/v1/learning/exercises/{exerciseId}/submit`

**Request Body:**
```json
{
  "code": "int age = 25;\nstd::string name = \"John\";\nbool isStudent = true;\n\nint main() {\n    return 0;\n}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "submission-uuid",
    "isCorrect": true,
    "score": 10,
    "feedback": "Excellent! You correctly declared and initialized variables of different types.",
    "executionResult": {
      "success": true,
      "output": "",
      "executionTime": 120,
      "memoryUsage": {
        "peakMemoryKB": 512
      }
    },
    "testResults": [
      {
        "testCaseId": "test-1",
        "passed": true,
        "actualOutput": "",
        "executionTime": 120,
        "memoryUsage": 512
      }
    ],
    "submittedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Progress Tracking

### Get User Progress

**Endpoint:** `GET /api/v1/learning/progress`

**Query Parameters:**
- `courseId` (string): Filter by specific course
- `timeframe` (string): Time period (week, month, year, all)

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "coursesEnrolled": 5,
      "coursesCompleted": 2,
      "lessonsCompleted": 45,
      "exercisesSolved": 120,
      "totalTimeSpent": 12600,
      "averageScore": 87.5,
      "streakDays": 15,
      "level": 8,
      "experiencePoints": 2840
    },
    "courses": [
      {
        "courseId": "course-uuid",
        "title": "C++ Fundamentals",
        "progress": 85.5,
        "timeSpent": 3420,
        "isCompleted": false,
        "completedLessons": 11,
        "totalLessons": 12,
        "averageScore": 92.0,
        "lastAccessed": "2024-01-15T10:30:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "lesson_completed",
        "title": "Pointers and References",
        "courseTitle": "C++ Fundamentals",
        "timestamp": "2024-01-15T10:30:00Z",
        "score": 95
      }
    ]
  }
}
```

### Update Progress

**Endpoint:** `POST /api/v1/learning/progress`

**Request Body:**
```json
{
  "courseId": "course-uuid",
  "lessonId": "lesson-uuid",
  "exerciseId": "exercise-uuid",
  "timeSpent": 25,
  "completed": true,
  "score": 88
}
```

## Achievements

### Get User Achievements

**Endpoint:** `GET /api/v1/learning/achievements`

**Response:**
```json
{
  "success": true,
  "data": {
    "unlocked": [
      {
        "id": "achievement-uuid",
        "name": "First Steps",
        "description": "Complete your first C++ lesson",
        "icon": "🎯",
        "category": "LEARNING",
        "points": 10,
        "rarity": "COMMON",
        "unlockedAt": "2024-01-10T14:20:00Z"
      }
    ],
    "inProgress": [
      {
        "id": "achievement-uuid-2",
        "name": "Code Master",
        "description": "Complete 100 exercises",
        "icon": "👨‍💻",
        "category": "CODING",
        "points": 100,
        "rarity": "RARE",
        "progress": 75,
        "criteria": {
          "type": "count",
          "target": 100,
          "metric": "exercises_completed"
        }
      }
    ],
    "available": [
      {
        "id": "achievement-uuid-3",
        "name": "Community Helper",
        "description": "Help 50 other students in the forum",
        "icon": "🤝",
        "category": "COMMUNITY",
        "points": 50,
        "rarity": "UNCOMMON"
      }
    ]
  }
}
```

## Recommendations

### Get Personalized Recommendations

**Endpoint:** `GET /api/v1/learning/recommendations`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "course",
      "content": {
        "id": "course-uuid",
        "title": "Advanced C++ Templates",
        "description": "Master template metaprogramming"
      },
      "reason": "Based on your completion of C++ Fundamentals",
      "priority": "high",
      "estimatedTime": 60
    },
    {
      "type": "exercise",
      "content": {
        "id": "exercise-uuid",
        "title": "Smart Pointer Practice",
        "difficulty": "INTERMEDIATE"
      },
      "reason": "Strengthen your memory management skills",
      "priority": "medium",
      "estimatedTime": 15
    }
  ]
}
```

## Learning Analytics

### Get Learning Analytics

**Endpoint:** `GET /api/v1/learning/analytics`

**Query Parameters:**
- `timeframe` (string): Analysis period (week, month, quarter, year)
- `courseId` (string): Filter by specific course

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTimeSpent": 12600,
      "averageSessionTime": 45,
      "skillLevels": {
        "basics": 90,
        "oop": 75,
        "templates": 45,
        "memory_management": 80
      },
      "strongAreas": ["Basic Syntax", "Control Flow", "Functions"],
      "improvementAreas": ["Templates", "Move Semantics"],
      "learningVelocity": 8.5,
      "retentionRate": 92.0
    },
    "progressOverTime": [
      {
        "date": "2024-01-08",
        "lessonsCompleted": 2,
        "exercisesSolved": 5,
        "timeSpent": 120
      }
    ],
    "recommendations": [
      "Focus more on template exercises",
      "Review move semantics concepts",
      "Practice with real-world projects"
    ]
  }
}
```