// File: tests/performance/load-testing.js
// Extension: .js
// Location: tests/performance/load-testing.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.05'],             // Custom error rate under 5%
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'testuser1@example.com', password: 'TestPassword123!' },
  { email: 'testuser2@example.com', password: 'TestPassword123!' },
  { email: 'testuser3@example.com', password: 'TestPassword123!' },
];

const cppCodeSamples = [
  `#include <iostream>
   int main() {
       std::cout << "Hello, World!" << std::endl;
       return 0;
   }`,
  `#include <iostream>
   #include <vector>
   int main() {
       std::vector<int> numbers = {1, 2, 3, 4, 5};
       for (const auto& num : numbers) {
           std::cout << num << " ";
       }
       return 0;
   }`,
  `#include <iostream>
   #include <algorithm>
   #include <vector>
   int main() {
       std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
       std::sort(v.begin(), v.end());
       std::cout << "Sorted: ";
       for (int n : v) {
           std::cout << n << " ";
       }
       return 0;
   }`
];

// Utility functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomCode() {
  return cppCodeSamples[Math.floor(Math.random() * cppCodeSamples.length)];
}

function authenticateUser() {
  const user = getRandomUser();
  
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, 
    JSON.stringify({
      email: user.email,
      password: user.password
    }), 
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' }
    }
  );

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => JSON.parse(r.body).token !== undefined,
  });

  if (!loginSuccess) {
    errorRate.add(1);
    return null;
  }

  return JSON.parse(loginResponse.body).token;
}

// Main test function
export default function() {
  group('Authentication Flow', () => {
    // Test user login
    const token = authenticateUser();
    
    if (!token) {
      console.log('Authentication failed, skipping user tests');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Test getting user profile
    group('User Profile', () => {
      const profileResponse = http.get(`${BASE_URL}/api/users/me`, {
        headers: headers,
        tags: { name: 'get_profile' }
      });

      check(profileResponse, {
        'profile status is 200': (r) => r.status === 200,
        'profile has user data': (r) => JSON.parse(r.body).user !== undefined,
      }) || errorRate.add(1);

      responseTime.add(profileResponse.timings.duration);
      apiCalls.add(1);
    });

    // Test code execution
    group('Code Execution', () => {
      const code = getRandomCode();
      
      const executeResponse = http.post(`${BASE_URL}/api/code/execute`,
        JSON.stringify({
          code: code,
          language: 'cpp',
          input: ''
        }),
        {
          headers: headers,
          tags: { name: 'execute_code' },
          timeout: '30s' // Code execution can take longer
        }
      );

      check(executeResponse, {
        'execution request accepted': (r) => r.status === 200 || r.status === 202,
        'execution response valid': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.success !== undefined;
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      responseTime.add(executeResponse.timings.duration);
      apiCalls.add(1);
    });

    // Test code analysis
    group('Code Analysis', () => {
      const code = getRandomCode();
      
      const analysisResponse = http.post(`${BASE_URL}/api/analysis/analyze`,
        JSON.stringify({
          code: code,
          language: 'cpp',
          analysisTypes: ['syntax', 'static']
        }),
        {
          headers: headers,
          tags: { name: 'analyze_code' }
        }
      );

      check(analysisResponse, {
        'analysis status is 200': (r) => r.status === 200,
        'analysis has results': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.analysis !== undefined;
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      responseTime.add(analysisResponse.timings.duration);
      apiCalls.add(1);
    });

    // Test getting courses
    group('Learning Content', () => {
      const coursesResponse = http.get(`${BASE_URL}/api/learning/courses`, {
        headers: headers,
        tags: { name: 'get_courses' }
      });

      check(coursesResponse, {
        'courses status is 200': (r) => r.status === 200,
        'courses response has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.courses);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      responseTime.add(coursesResponse.timings.duration);
      apiCalls.add(1);
    });

    // Test forum/community features
    group('Community Features', () => {
      const postsResponse = http.get(`${BASE_URL}/api/community/posts?limit=10`, {
        headers: headers,
        tags: { name: 'get_posts' }
      });

      check(postsResponse, {
        'posts status is 200': (r) => r.status === 200,
        'posts response has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.posts);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      responseTime.add(postsResponse.timings.duration);
      apiCalls.add(1);
    });

    // Test code snippets
    group('Code Snippets', () => {
      // Get snippets
      const snippetsResponse = http.get(`${BASE_URL}/api/code/snippets?limit=10`, {
        headers: headers,
        tags: { name: 'get_snippets' }
      });

      check(snippetsResponse, {
        'snippets status is 200': (r) => r.status === 200,
        'snippets response has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.snippets);
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      // Create a snippet
      const createSnippetResponse = http.post(`${BASE_URL}/api/code/snippets`,
        JSON.stringify({
          title: `Load Test Snippet ${Date.now()}`,
          description: 'Generated during load testing',
          code: getRandomCode(),
          language: 'cpp',
          isPublic: false
        }),
        {
          headers: headers,
          tags: { name: 'create_snippet' }
        }
      );

      check(createSnippetResponse, {
        'snippet creation status is 201': (r) => r.status === 201,
        'snippet creation response valid': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.snippet !== undefined;
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);

      responseTime.add(snippetsResponse.timings.duration);
      responseTime.add(createSnippetResponse.timings.duration);
      apiCalls.add(2);
    });

    // Test user logout
    group('Logout', () => {
      const logoutResponse = http.post(`${BASE_URL}/api/auth/logout`, '', {
        headers: headers,
        tags: { name: 'logout' }
      });

      check(logoutResponse, {
        'logout status is 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      responseTime.add(logoutResponse.timings.duration);
      apiCalls.add(1);
    });

    sleep(1); // Wait 1 second between iterations
  });
}

// Test scenarios for specific load patterns
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Spike test configuration
export const spikeTestOptions = {
  stages: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 10 },   // Return to normal
  ],
};

// Stress test configuration
export const stressTestOptions = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 10 },   // Normal load
    { duration: '2m', target: 20 },   // Increase load
    { duration: '5m', target: 20 },   // Higher load
    { duration: '2m', target: 50 },   // High load
    { duration: '5m', target: 50 },   // Sustained high load
    { duration: '2m', target: 100 },  // Very high load
    { duration: '5m', target: 100 },  // Sustained very high load
    { duration: '10m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s during stress
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

// Endurance test configuration
export const enduranceTestOptions = {
  stages: [
    { duration: '5m', target: 20 },   // Ramp up
    { duration: '30m', target: 20 },  // Sustained load for 30 minutes
    { duration: '5m', target: 0 },    // Ramp down
  ],
};

// Frontend load test
export function frontendLoadTest() {
  group('Frontend Performance', () => {
    // Test main page load
    const mainPageResponse = http.get(FRONTEND_URL, {
      tags: { name: 'main_page' }
    });

    check(mainPageResponse, {
      'main page status is 200': (r) => r.status === 200,
      'main page loads in reasonable time': (r) => r.timings.duration < 3000,
    });

    // Test static assets
    const staticAssets = [
      '/_next/static/css/app.css',
      '/_next/static/js/app.js',
      '/favicon.ico'
    ];

    staticAssets.forEach(asset => {
      const assetResponse = http.get(`${FRONTEND_URL}${asset}`, {
        tags: { name: 'static_asset' }
      });

      check(assetResponse, {
        [`${asset} loads successfully`]: (r) => r.status === 200,
      });
    });

    sleep(1);
  });
}

// Database load test
export function databaseLoadTest() {
  const token = authenticateUser();
  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  group('Database Performance', () => {
    // Test rapid API calls that hit database
    for (let i = 0; i < 10; i++) {
      http.get(`${BASE_URL}/api/learning/courses?page=${i+1}&limit=20`, {
        headers: headers,
        tags: { name: 'db_pagination' }
      });
    }

    // Test search functionality
    const searchTerms = ['C++', 'algorithm', 'pointer', 'class', 'function'];
    searchTerms.forEach(term => {
      http.get(`${BASE_URL}/api/community/search?q=${term}&limit=10`, {
        headers: headers,
        tags: { name: 'db_search' }
      });
    });

    sleep(0.5);
  });
}

// WebSocket connection test
export function websocketLoadTest() {
  // Note: k6 doesn't support WebSocket load testing out of the box
  // This would require a custom extension or different tool
  console.log('WebSocket load testing requires additional tooling');
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  
  return `
${indent}Test Summary:
${indent}=============
${indent}Total Requests: ${data.metrics.http_reqs.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.count} (${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%)
${indent}Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
${indent}95th Percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms
${indent}Max Response Time: ${data.metrics.http_req_duration.max.toFixed(2)}ms
${indent}Requests per Second: ${(data.metrics.http_reqs.count / data.state.testRunDurationMs * 1000).toFixed(2)}
  `;
}