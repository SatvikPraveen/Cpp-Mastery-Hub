# 🎯 C++ Mastery Hub

> **A Comprehensive C++ Learning Platform with Real-time Code Execution, Analysis, and Community Features**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-20+-blue.svg)](https://www.docker.com/)
[![C++](https://img.shields.io/badge/C++-20/23-red.svg)](https://en.cppreference.com/)

## 🌟 Overview

C++ Mastery Hub is a portfolio project that demonstrates modern full-stack development practices while creating a comprehensive platform for learning C++. This project showcases enterprise-grade architecture, combining real-time code execution, static analysis, interactive visualizations, and collaborative features to create an immersive learning environment.

**This project serves as a learning resource for:**
- Modern C++ development practices (C++17/20/23)
- Full-stack web development with TypeScript
- Microservices architecture and containerization
- Real-time communication and WebSocket implementation
- Database design and ORM usage
- DevOps practices and CI/CD pipelines

### ✨ Key Features

#### 🚀 **Real-time Code Execution Engine**
- Multi-compiler support (GCC, Clang) with C++11 through C++23 standards
- Secure Docker-based sandboxed execution environment
- Performance profiling with memory and CPU usage tracking
- Compilation error handling and debugging assistance

#### 🔍 **Intelligent Code Analysis**
- Static code analysis using Clang-Tidy integration
- Code quality metrics and complexity measurement
- Security vulnerability detection and recommendations
- Performance optimization suggestions and best practices

#### 🎨 **Interactive Learning Features**
- Memory layout visualization showing stack, heap, and variable states
- Step-by-step execution flow with debugging capabilities
- Data structure visualizations for better concept understanding
- Interactive tutorials and guided exercises

#### 👥 **Collaborative Learning Environment**
- Real-time code sharing and collaborative editing
- Discussion forums with syntax-highlighted code snippets
- User progress tracking and achievement system
- Community-driven content and peer learning

#### 🏗️ **Modern Architecture**
- Microservices design with Docker containerization
- TypeScript throughout the stack for type safety
- Real-time WebSocket communication
- Comprehensive API documentation and testing

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Next.js Frontend<br/>TypeScript + Tailwind]
        FE --> |WebSocket| WS[Real-time Communication]
    end

    subgraph "API Gateway"
        NGINX[Nginx Reverse Proxy<br/>Load Balancer]
        NGINX --> FE
    end

    subgraph "Application Layer"
        API[Express.js Backend<br/>TypeScript + Prisma]
        API --> |HTTP/WS| FE
    end

    subgraph "Processing Layer"
        CPP[C++ Analysis Engine<br/>LLVM/Clang Integration]
        API --> |HTTP| CPP
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary Database)]
        RD[(Redis<br/>Cache & Sessions)]
        MG[(MongoDB<br/>Community Content)]
        API --> PG
        API --> RD
        API --> MG
    end

    subgraph "Infrastructure"
        DOCKER[Docker Containers<br/>Orchestration]
        MONITORING[Monitoring Stack<br/>Logs & Metrics]
    end
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | Modern React-based UI with SSR capabilities |
| **Backend** | Express.js, TypeScript, Prisma ORM | RESTful API with type-safe database access |
| **Code Engine** | C++20/23, CMake, LLVM/Clang | Secure code execution and analysis |
| **Databases** | PostgreSQL, Redis, MongoDB | Relational data, caching, and document storage |
| **Infrastructure** | Docker, Nginx, GitHub Actions | Containerization and CI/CD pipeline |
| **Monitoring** | Prometheus, Grafana, ELK Stack | Application monitoring and logging |

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Docker** 20.10+ and Docker Compose 2.0+
- **Node.js** 18+ with npm 8+
- **Git** for version control

### Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/SatvikPraveen/Cpp-Mastery-Hub.git
cd Cpp-Mastery-Hub
```

2. **Environment configuration:**
```bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Install dependencies for all services
npm run install:all
```

3. **Start the development environment:**
```bash
# Start all services with Docker Compose
npm run docker:dev

# Run database migrations and seed data
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev
```

4. **Access the application:**

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | http://localhost:3000 | Frontend application |
| **API Server** | http://localhost:8000 | Backend API + WebSocket |
| **C++ Engine** | http://localhost:9000 | Code execution service |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |
| **Database Admin** | http://localhost:5050 | pgAdmin interface |

## 📁 Project Structure

```
Cpp-Mastery-Hub/
├── 📱 frontend/                    # Next.js application
│   ├── src/
│   │   ├── components/            # Reusable React components
│   │   │   ├── Auth/              # Authentication components
│   │   │   ├── CodeEditor/        # Monaco editor integration
│   │   │   ├── Dashboard/         # User dashboard
│   │   │   ├── Learning/          # Learning path components
│   │   │   └── Community/         # Forum and social features
│   │   ├── pages/                 # Next.js pages and API routes
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API client services
│   │   └── utils/                 # Utility functions
│   └── tests/                     # Frontend test suites
│
├── 🔧 backend/                     # Express.js API server
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/            # API route handlers
│   │   │   ├── middleware/        # Authentication, validation
│   │   │   └── sockets/           # WebSocket handlers
│   │   ├── services/              # Business logic
│   │   ├── models/                # Data models and schemas
│   │   └── utils/                 # Backend utilities
│   ├── prisma/                    # Database schema and migrations
│   └── tests/                     # Backend test suites
│
├── ⚙️ cpp-engine/                  # C++ analysis engine
│   ├── src/                       # C++ source code
│   ├── include/                   # Header files
│   ├── tests/                     # C++ unit tests
│   └── CMakeLists.txt             # Build configuration
│
├── 🐳 docker/                      # Docker configurations
├── 📚 docs/                       # Project documentation
├── 🧪 tests/                      # Integration and E2E tests
└── 📜 scripts/                    # Development and deployment scripts
```

## 💻 Development Workflow

### Available Scripts

```bash
# Development
npm run dev                # Start all development servers
npm run dev:frontend       # Start only frontend
npm run dev:backend        # Start only backend
npm run dev:cpp-engine     # Start only C++ engine

# Testing
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests

# Code Quality
npm run lint              # Lint all codebases
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code (Prettier + clang-format)

# Database
npm run db:migrate        # Apply database migrations
npm run db:seed           # Seed with sample data
npm run db:reset          # Reset database (⚠️ destructive)
npm run db:studio         # Open Prisma Studio

# Docker
npm run docker:build      # Build all images
npm run docker:up         # Start containers
npm run docker:down       # Stop containers
```

### Code Quality Standards

- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automated code formatting
- **Husky**: Pre-commit hooks for quality assurance
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

## 🎯 Learning Objectives & Features

### For C++ Learners

**Beginner Level:**
- Basic syntax and data types
- Control structures and functions
- Introduction to OOP concepts
- Memory management fundamentals

**Intermediate Level:**
- Advanced OOP and inheritance
- STL containers and algorithms
- Smart pointers and RAII
- Exception handling

**Advanced Level:**
- Template metaprogramming
- Concurrency and threading
- Move semantics and perfect forwarding
- Modern C++17/20/23 features

### For Full-Stack Developers

**Frontend Development:**
- Modern React with Next.js
- TypeScript integration
- Real-time updates with WebSockets
- Responsive design with Tailwind CSS

**Backend Development:**
- RESTful API design
- Database modeling with Prisma
- Authentication and authorization
- WebSocket server implementation

**DevOps & Infrastructure:**
- Docker containerization
- Multi-service orchestration
- CI/CD pipeline setup
- Monitoring and logging

## 🔧 Technical Implementation Details

### Code Execution Pipeline

1. **Code Submission**: Frontend sends C++ code via WebSocket
2. **Validation**: Backend validates and sanitizes input
3. **Compilation**: C++ engine compiles code using GCC/Clang
4. **Execution**: Secure Docker container runs the compiled program
5. **Analysis**: Static analysis tools examine code quality
6. **Response**: Results sent back with execution output and analysis

### Security Measures

- **Sandboxed Execution**: All code runs in isolated Docker containers
- **Resource Limits**: CPU and memory constraints prevent abuse
- **Input Validation**: Comprehensive sanitization of all inputs
- **Rate Limiting**: API rate limiting to prevent spam
- **Authentication**: JWT-based user authentication

### Performance Optimizations

- **Redis Caching**: Frequently accessed data cached for quick retrieval
- **Database Indexing**: Optimized database queries with proper indexing
- **Code Splitting**: Frontend bundle optimization for faster loading
- **CDN Integration**: Static assets served via CDN

## 📊 Project Metrics & Achievements

### Technical Metrics
- **Lines of Code**: ~15,000+ (TypeScript, C++, Configuration)
- **Test Coverage**: 80%+ across all services
- **API Endpoints**: 25+ RESTful endpoints
- **Database Tables**: 12 normalized tables with relationships
- **Docker Images**: 5 optimized production images

### Learning Outcomes Demonstrated
- Full-stack application development
- Microservices architecture implementation
- Real-time communication systems
- Database design and optimization
- DevOps and deployment practices
- Security best practices
- Testing strategies and implementation

## 🧪 Testing Strategy

### Test Pyramid Structure

```
    E2E Tests (Playwright)
         🔺
    Integration Tests (Jest)
       🔺🔺🔺
  Unit Tests (Jest + Google Test)
     🔺🔺🔺🔺🔺
```

### Testing Coverage

- **Unit Tests**: Components, services, and utility functions
- **Integration Tests**: API endpoints and database interactions
- **E2E Tests**: Complete user workflows and critical paths
- **Performance Tests**: Load testing and response time validation

## 🚀 Deployment & Production

### Deployment Options

1. **Local Development**: Docker Compose for full local setup
2. **Staging**: Automated deployment via GitHub Actions
3. **Production**: Container orchestration with scaling capabilities

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/cppmastery
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-production-secret
CPP_ENGINE_URL=http://cpp-engine:9000
```

## 🤝 Contributing

This project welcomes contributions and serves as a learning resource for the community.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/new-feature`)
3. **Make** your changes with comprehensive tests
4. **Commit** using conventional commit format
5. **Push** and create a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write comprehensive tests for new features
- Update documentation for significant changes
- Ensure all CI/CD checks pass

## 📚 Learning Resources

### Documentation
- [API Documentation](docs/api/README.md) - Complete API reference
- [Architecture Guide](docs/architecture/README.md) - System design details
- [User Guide](docs/user-guides/getting-started.md) - Getting started tutorial

### Educational Value
This project demonstrates practical implementation of:
- **Design Patterns**: Observer, Factory, Strategy patterns
- **SOLID Principles**: Applied throughout the codebase
- **Clean Architecture**: Separation of concerns and dependency inversion
- **Test-Driven Development**: Comprehensive test coverage

## 🔮 Future Enhancements

### Planned Features
- [ ] AI-powered code suggestions and error explanations
- [ ] Mobile application for learning on-the-go
- [ ] Advanced debugger integration
- [ ] Competitive programming challenges
- [ ] Video tutorial integration
- [ ] Multi-language support (Python, Java, Rust)

### Technical Improvements
- [ ] Kubernetes deployment configuration
- [ ] Advanced monitoring and alerting
- [ ] Performance optimization with caching strategies
- [ ] GraphQL API implementation
- [ ] Progressive Web App (PWA) features

## 📄 License & Attribution

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments
- **LLVM Project** for C++ analysis capabilities
- **Monaco Editor** for VS Code-quality editing experience
- **Open Source Community** for the amazing ecosystem of tools and libraries

## 📞 Contact & Support

- **Repository**: [https://github.com/SatvikPraveen/Cpp-Mastery-Hub](https://github.com/SatvikPraveen/Cpp-Mastery-Hub)
- **Issues**: [GitHub Issues](https://github.com/SatvikPraveen/Cpp-Mastery-Hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SatvikPraveen/Cpp-Mastery-Hub/discussions)

---

**Built as a Portfolio Project | Demonstrating Modern Full-Stack Development**

*This project serves as both a learning platform for C++ and a showcase of contemporary software development practices, including microservices architecture, real-time communication, and comprehensive testing strategies.*