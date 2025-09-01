# C++ Mastery Hub API Documentation

Welcome to the comprehensive API documentation for C++ Mastery Hub. This RESTful API provides programmatic access to all platform features including user management, course content, code execution, and analytics.

## 📚 Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
- [SDKs and Libraries](#sdks-and-libraries)
- [Webhooks](#webhooks)
- [Examples](#examples)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. All authenticated requests must include the `Authorization` header with a valid Bearer token.

### Obtaining Access Tokens

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    }
  }
}
```

### Using Access Tokens

Include the access token in the Authorization header:

```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to obtain a new access token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🚦 Rate Limiting

The API implements rate limiting to ensure fair usage and system stability:

- **Standard Users**: 1000 requests per hour
- **Premium Users**: 5000 requests per hour
- **API Partners**: 10000 requests per hour

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "retryAfter": 3600
  }
}
```

## ❌ Error Handling

The API uses conventional HTTP response codes and returns detailed error information:

### HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request parameters
- `401` - Unauthorized: Invalid or missing authentication
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Validation Error: Request validation failed
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Must be a valid email address"
    },
    "documentation": "https://docs.cppmastery.hub/errors#validation-error"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

## 📋 API Endpoints

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
```
Authenticate user and return access tokens.

#### Register
```http
POST /api/auth/register
```
Create a new user account.

#### Refresh Token
```http
POST /api/auth/refresh
```
Refresh an expired access token.

#### Logout
```http
POST /api/auth/logout
```
Invalidate current session tokens.

#### Password Reset
```http
POST /api/auth/forgot-password
```
Send password reset email.

```http
POST /api/auth/reset-password
```
Reset password with token.

#### Email Verification
```http
POST /api/auth/verify-email
```
Verify email address with token.

### User Management

#### Get User Profile
```http
GET /api/user/profile
```
Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.cppmastery.hub/avatars/user_123.jpg",
    "bio": "Passionate C++ developer",
    "experienceLevel": "intermediate",
    "stats": {
      "totalCodeSubmissions": 156,
      "problemsSolved": 89,
      "currentStreak": 7,
      "xpPoints": 2450
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Update User Profile
```http
PUT /api/user/profile
```
Update user profile information.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio",
  "experienceLevel": "advanced"
}
```

#### Get User Statistics
```http
GET /api/user/stats
```
Get detailed user statistics and progress.

#### Get User Achievements
```http
GET /api/user/achievements
```
Get user's earned achievements and badges.

### Course Management

#### List Courses
```http
GET /api/courses?page=1&limit=20&difficulty=beginner&category=fundamentals
```
Get paginated list of courses with filtering.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `difficulty` (string): Filter by difficulty level
- `category` (string): Filter by category
- `search` (string): Search in title and description
- `sort` (string): Sort field (title, difficulty, rating, created)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "course_123",
        "title": "C++ Fundamentals",
        "description": "Learn the basics of C++ programming",
        "slug": "cpp-fundamentals",
        "thumbnail": "https://cdn.cppmastery.hub/course-thumbnails/123.jpg",
        "difficulty": "beginner",
        "estimatedHours": 20,
        "rating": 4.8,
        "reviewCount": 1234,
        "enrollmentCount": 5678,
        "isPublished": true,
        "isFree": true,
        "instructor": {
          "id": "instructor_456",
          "name": "Dr. Jane Smith",
          "avatar": "https://cdn.cppmastery.hub/avatars/instructor_456.jpg"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Course Details
```http
GET /api/courses/{courseId}
```
Get detailed information about a specific course.

#### Enroll in Course
```http
POST /api/courses/{courseId}/enroll
```
Enroll the current user in a course.

#### Get Course Progress
```http
GET /api/courses/{courseId}/progress
```
Get user's progress in a specific course.

### Code Execution

#### Submit Code for Execution
```http
POST /api/code/execute
```
Submit C++ code for compilation and execution.

**Request:**
```json
{
  "code": "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  "language": "cpp",
  "input": "",
  "timeout": 30,
  "memoryLimit": 256
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec_123456",
    "result": {
      "success": true,
      "output": "Hello, World!\n",
      "error": null,
      "exitCode": 0,
      "executionTime": 150,
      "memoryUsage": 1024,
      "compilationTime": 890
    },
    "analysis": {
      "complexity": {
        "cyclomaticComplexity": 1,
        "linesOfCode": 6
      },
      "quality": {
        "score": 95,
        "issues": []
      },
      "security": {
        "vulnerabilities": [],
        "riskScore": 0
      }
    }
  }
}
```

#### Get Code Analysis
```http
POST /api/code/analyze
```
Perform static analysis on C++ code without execution.

#### Get Execution History
```http
GET /api/code/history?page=1&limit=20
```
Get user's code execution history.

### Learning Content

#### Get Lessons
```http
GET /api/courses/{courseId}/lessons
```
Get all lessons for a specific course.

#### Get Lesson Content
```http
GET /api/lessons/{lessonId}
```
Get detailed lesson content including exercises.

#### Submit Exercise Solution
```http
POST /api/exercises/{exerciseId}/submit
```
Submit solution for a coding exercise.

**Request:**
```json
{
  "code": "// Solution code here",
  "language": "cpp"
}
```

#### Get Quiz Questions
```http
GET /api/quizzes/{quizId}/questions
```
Get questions for a specific quiz.

#### Submit Quiz Answers
```http
POST /api/quizzes/{quizId}/submit
```
Submit answers for a quiz attempt.

### Community Features

#### Get Discussions
```http
GET /api/discussions?category=help&page=1&limit=20
```
Get community discussions with filtering.

#### Create Discussion
```http
POST /api/discussions
```
Create a new discussion thread.

**Request:**
```json
{
  "title": "Need help with pointers",
  "content": "I'm struggling to understand pointer arithmetic...",
  "category": "help",
  "tags": ["pointers", "memory", "beginner"]
}
```

#### Reply to Discussion
```http
POST /api/discussions/{discussionId}/replies
```
Add a reply to a discussion thread.

#### Vote on Content
```http
POST /api/discussions/{discussionId}/vote
```
Upvote or downvote a discussion or reply.

### Analytics and Progress

#### Get User Analytics
```http
GET /api/analytics/user
```
Get comprehensive user analytics and progress data.

#### Get Learning Path Progress
```http
GET /api/learning-paths/{pathId}/progress
```
Get progress through a specific learning path.

#### Get Achievement Progress
```http
GET /api/achievements/progress
```
Get progress towards available achievements.

## 🔌 Webhooks

C++ Mastery Hub supports webhooks to notify your application of events in real-time.

### Supported Events

- `user.registered` - New user registration
- `user.verified` - Email verification completed
- `course.enrolled` - User enrolled in course
- `course.completed` - User completed course
- `exercise.submitted` - Exercise solution submitted
- `achievement.earned` - User earned achievement

### Webhook Configuration

Configure webhooks in your account settings or via API:

```http
POST /api/webhooks
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/cppmastery",
  "events": ["user.registered", "course.completed"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload

```json
{
  "id": "evt_123456789",
  "type": "course.completed",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com"
    },
    "course": {
      "id": "course_456",
      "title": "C++ Fundamentals"
    },
    "completedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Webhook Security

Verify webhook authenticity using HMAC signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## 📚 SDKs and Libraries

### Official SDKs

#### JavaScript/Node.js
```bash
npm install @cppmastery/sdk
```

```javascript
import { CPPMasteryAPI } from '@cppmastery/sdk';

const api = new CPPMasteryAPI({
  apiKey: 'your_api_key',
  baseURL: 'https://api.cppmastery.hub'
});

// Execute code
const result = await api.code.execute({
  code: '#include <iostream>\nint main() { return 0; }',
  language: 'cpp'
});
```

#### Python
```bash
pip install cppmastery-python
```

```python
from cppmastery import CPPMasteryAPI

api = CPPMasteryAPI(api_key='your_api_key')

# Get user profile
profile = api.user.get_profile()
print(f"Welcome, {profile.first_name}!")
```

#### PHP
```bash
composer require cppmastery/php-sdk
```

```php
use CPPMastery\API\Client;

$client = new Client([
    'api_key' => 'your_api_key'
]);

// List courses
$courses = $client->courses->list([
    'difficulty' => 'beginner',
    'limit' => 10
]);
```

### Community Libraries

- **Go**: `go get github.com/cppmastery/go-sdk`
- **Rust**: `cargo add cppmastery`
- **Java**: Maven/Gradle dependency available
- **C#**: NuGet package available

## 🔗 API Examples

### Complete Authentication Flow

```javascript
// 1. Register new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    username: 'newuser',
    firstName: 'New',
    lastName: 'User',
    experienceLevel: 'beginner'
  })
});

// 2. Login to get tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePassword123!'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.tokens.accessToken;

// 3. Make authenticated request
const profileResponse = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Code Execution with Analysis

```python
import requests

# Execute and analyze code
response = requests.post('https://api.cppmastery.hub/api/code/execute', 
  headers={'Authorization': 'Bearer your_token'},
  json={
    'code': '''
      #include <iostream>
      #include <vector>
      
      int main() {
          std::vector<int> numbers = {1, 2, 3, 4, 5};
          for (const auto& num : numbers) {
              std::cout << num << " ";
          }
          std::cout << std::endl;
          return 0;
      }
    ''',
    'language': 'cpp',
    'analyze': True
  }
)

result = response.json()
print(f"Output: {result['data']['result']['output']}")
print(f"Quality Score: {result['data']['analysis']['quality']['score']}")
```

### Bulk Course Operations

```bash
# Get all beginner courses
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.cppmastery.hub/api/courses?difficulty=beginner&limit=100"

# Enroll in multiple courses
for course_id in course_123 course_456 course_789; do
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "https://api.cppmastery.hub/api/courses/$course_id/enroll"
done
```

### Real-time Progress Tracking

```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket('wss://api.cppmastery.hub/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'your_access_token'
  }));
  
  ws.send(JSON.stringify({
    type: 'subscribe',
    events: ['progress.updated', 'achievement.earned']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'achievement.earned') {
    showAchievementNotification(data.achievement);
  } else if (data.type === 'progress.updated') {
    updateProgressUI(data.progress);
  }
};
```

## 📊 API Limits and Quotas

### Request Limits

| Plan | Requests/Hour | Requests/Day | Code Executions/Hour |
|------|---------------|--------------|---------------------|
| Free | 1,000 | 10,000 | 100 |
| Premium | 5,000 | 50,000 | 1,000 |
| Enterprise | 10,000 | 100,000 | 5,000 |

### Resource Limits

- **Maximum code length**: 100KB
- **Execution timeout**: 30 seconds
- **Memory limit**: 256MB
- **File upload size**: 10MB
- **Webhook payload size**: 1MB

### Best Practices

1. **Implement exponential backoff** for rate limit handling
2. **Cache responses** when appropriate to reduce API calls
3. **Use pagination** for large data sets
4. **Implement webhook verification** for security
5. **Monitor your usage** through the dashboard

## 🔍 Testing and Development

### Sandbox Environment

Use our sandbox environment for testing:

**Base URL**: `https://sandbox-api.cppmastery.hub`

### Test Data

The sandbox includes pre-populated test data:
- Test users with different roles
- Sample courses and lessons
- Mock code execution results

### API Testing Tools

- **Postman Collection**: Available for download
- **OpenAPI Specification**: Complete API schema
- **Interactive Docs**: Try endpoints directly in browser

---

For more detailed information about specific endpoints, refer to our [Interactive API Documentation](https://docs.cppmastery.hub/api/interactive) or contact our developer support team at [api-support@cppmastery.hub](mailto:api-support@cppmastery.hub).