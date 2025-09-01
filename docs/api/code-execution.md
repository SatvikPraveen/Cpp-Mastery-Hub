# Code Execution API Reference

Comprehensive documentation for code execution and analysis endpoints.

## Overview

The Code Execution API provides secure, sandboxed execution of C++ code with comprehensive analysis, performance profiling, and memory visualization capabilities.

## Security & Sandboxing

All code execution happens in isolated Docker containers with:
- Limited CPU and memory resources
- No network access
- Read-only filesystem (except temporary directories)
- Time limits and resource monitoring
- Comprehensive security filtering

## Code Analysis

### Analyze Code

Perform static analysis on C++ code without execution.

**Endpoint:** `POST /api/v1/analysis/analyze`

**Request Body:**
```json
{
  "code": "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  "language": "cpp",
  "config": {
    "enableSyntaxCheck": true,
    "enableSemanticCheck": true,
    "enableStyleCheck": true,
    "enableSecurityCheck": true,
    "enablePerformanceCheck": true,
    "warningLevel": "medium",
    "maxIssues": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "errors": [],
    "warnings": [
      {
        "line": 3,
        "column": 5,
        "message": "Consider using 'const' for variables that don't change",
        "severity": "info",
        "code": "CONST_SUGGESTION",
        "category": "STYLE",
        "fixable": true
      }
    ],
    "suggestions": [
      {
        "line": 2,
        "column": 1,
        "message": "Consider using auto keyword for type deduction",
        "type": "modernization",
        "impact": "low",
        "fixedCode": "auto main() -> int {"
      }
    ],
    "metrics": {
      "linesOfCode": 5,
      "linesOfComments": 0,
      "cyclomaticComplexity": 1,
      "cognitiveComplexity": 1,
      "functionCount": 1,
      "classCount": 0,
      "maintainabilityIndex": 95
    },
    "securityIssues": [],
    "performanceIssues": [],
    "executionTime": 120
  }
}
```

### Get Analysis Results

Retrieve cached analysis results.

**Endpoint:** `GET /api/v1/analysis/{analysisId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-uuid",
    "status": "completed",
    "createdAt": "2024-01-15T10:30:00Z",
    "results": {
      // ... same as analyze response
    }
  }
}
```

## Code Execution

### Execute Code

Compile and run C++ code in a secure sandbox.

**Endpoint:** `POST /api/v1/code/execute`

**Request Body:**
```json
{
  "code": "#include <iostream>\nint main() {\n    int x;\n    std::cout << \"Enter number: \";\n    std::cin >> x;\n    std::cout << \"You entered: \" << x << std::endl;\n    return 0;\n}",
  "language": "cpp",
  "input": "42\n",
  "timeout": 10000,
  "memoryLimit": 128,
  "config": {
    "enableDebugInfo": true,
    "enableMemoryVisualization": true,
    "enablePerformanceProfiling": true,
    "optimizationLevel": "O2",
    "cppStandard": "c++20",
    "warnings": ["-Wall", "-Wextra"],
    "defines": {
      "DEBUG": "1"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "execution-uuid",
    "output": "Enter number: You entered: 42\n",
    "errorOutput": "",
    "exitCode": 0,
    "executionTime": 150,
    "memoryUsage": {
      "peakMemoryKB": 1024,
      "averageMemoryKB": 512,
      "heapAllocations": 0,
      "stackSize": 8192,
      "memoryLeaks": []
    },
    "performanceProfile": {
      "cpuUsage": 2.5,
      "instructions": 1250,
      "cacheHits": 1200,
      "cacheMisses": 50,
      "branchPredictions": 25,
      "branchMispredictions": 2,
      "hotspots": [
        {
          "function": "main",
          "line": 4,
          "percentage": 60.0,
          "calls": 1,
          "averageTime": 90
        }
      ]
    },
    "memoryVisualization": {
      "stackFrames": [
        {
          "function": "main",
          "variables": [
            {
              "name": "x",
              "type": "int",
              "value": 42,
              "address": "0x7fff5fbff6ac",
              "size": 4
            }
          ],
          "baseAddress": "0x7fff5fbff6a0",
          "size": 16
        }
      ],
      "heapAllocations": [],
      "memoryLayout": [
        {
          "address": "0x7fff5fbff6a0",
          "size": 16,
          "type": "stack",
          "content": "main frame"
        }
      ],
      "pointers": []
    }
  }
}
```

### Get Execution Results

Retrieve cached execution results.

**Endpoint:** `GET /api/v1/code/execution/{executionId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "execution-uuid",
    "status": "completed",
    "createdAt": "2024-01-15T10:30:00Z",
    "results": {
      // ... same as execute response
    }
  }
}
```

## Error Handling

### Compilation Errors

```json
{
  "success": false,
  "data": {
    "executionId": "execution-uuid",
    "output": "",
    "errorOutput": "",
    "exitCode": 1,
    "compilationError": "main.cpp:3:5: error: 'cout' was not declared in this scope\n    cout << \"Hello\";\n    ^~~~",
    "executionTime": 0
  }
}
```

### Runtime Errors

```json
{
  "success": false,
  "data": {
    "executionId": "execution-uuid",
    "output": "",
    "errorOutput": "Segmentation fault (core dumped)",
    "exitCode": 139,
    "runtimeError": "Program terminated with signal SIGSEGV",
    "executionTime": 50
  }
}
```

### Timeout

```json
{
  "success": false,
  "data": {
    "executionId": "execution-uuid",
    "output": "Starting infinite loop...",
    "errorOutput": "",
    "exitCode": 124,
    "timeout": true,
    "executionTime": 10000
  }
}
```

## Code Snippets Management

### Create Snippet

**Endpoint:** `POST /api/v1/code/snippets`

**Request Body:**
```json
{
  "title": "Hello World Example",
  "description": "Basic C++ Hello World program",
  "code": "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
  "language": "cpp",
  "isPublic": false,
  "tags": ["basic", "hello-world", "iostream"]
}
```

### List Snippets

**Endpoint:** `GET /api/v1/code/snippets`

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Search term
- `tags` (string): Comma-separated tags
- `language` (string): Programming language
- `isPublic` (boolean): Filter by visibility

### Get Snippet

**Endpoint:** `GET /api/v1/code/snippets/{snippetId}`

### Update Snippet

**Endpoint:** `PUT /api/v1/code/snippets/{snippetId}`

### Delete Snippet

**Endpoint:** `DELETE /api/v1/code/snippets/{snippetId}`

## Rate Limits

- **Code Execution**: 100 requests per hour per user
- **Code Analysis**: 200 requests per hour per user
- **Snippet Operations**: 1000 requests per hour per user

## Best Practices

1. **Always validate code** before execution
2. **Use appropriate timeouts** to prevent infinite loops
3. **Monitor memory usage** for large data structures
4. **Cache analysis results** for frequently analyzed code
5. **Use appropriate optimization levels** for different scenarios
6. **Include proper error handling** in your code