cpp-mastery-hub
├── .dockerignore
├── .env.example
├── .github
│   └── workflows
│       └── ci-cd.yml
├── .gitignore
├── backend
│   ├── .eslintrc.json
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma
│   │   └── schema.prisma
│   ├── src
│   │   ├── api
│   │   │   ├── middleware
│   │   │   │   ├── auth.ts
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── logging.ts
│   │   │   │   ├── ratelimit.ts
│   │   │   │   └── validation.ts
│   │   │   ├── routes
│   │   │   │   ├── admin.ts
│   │   │   │   ├── analysis.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── code.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── learning.ts
│   │   │   │   └── users.ts
│   │   │   └── sockets
│   │   │       └── code-execution.ts
│   │   ├── config
│   │   │   ├── database.ts
│   │   │   ├── index.ts
│   │   │   └── redis.ts
│   │   ├── models
│   │   │   ├── Achievement.ts
│   │   │   ├── CodeSnippet.ts
│   │   │   ├── Course.ts
│   │   │   ├── ForumPost.ts
│   │   │   └── User.ts
│   │   ├── server.ts
│   │   ├── services
│   │   │   ├── analyzer
│   │   │   │   └── analysis-service.ts
│   │   │   ├── auth
│   │   │   │   ├── auth-service.ts
│   │   │   │   └── jwt.ts
│   │   │   ├── compiler
│   │   │   │   └── execution-service.ts
│   │   │   ├── learning
│   │   │   │   ├── learning-service.tsx
│   │   │   │   └── progress.tsx
│   │   │   ├── notification
│   │   │   │   └── notification-service.ts
│   │   │   ├── sandbox
│   │   │   ├── storage.ts
│   │   │   └── user-service.ts
│   │   ├── types
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── cache.ts
│   │   │   ├── code.ts
│   │   │   ├── collaboration.ts
│   │   │   ├── community.ts
│   │   │   ├── config.ts
│   │   │   ├── events.ts
│   │   │   ├── express.d.ts
│   │   │   ├── index.ts
│   │   │   ├── learning.ts
│   │   │   ├── monitoring.ts
│   │   │   ├── validation.ts
│   │   │   └── websocket.ts
│   │   └── utils
│   │       ├── errors.ts
│   │       └── logger.ts
│   ├── tests
│   │   ├── auth.test.ts
│   │   ├── integration
│   │   │   └── api.test.ts
│   │   └── unit
│   │       ├── models.test.ts
│   │       └── services.test.ts
│   └── tsconfig.json
├── content
│   ├── examples
│   ├── quizzes
│   └── tutorials
├── CONTRIBUTING.md
├── cpp-engine
│   ├── .clang-format
│   ├── .clang-tidy
│   ├── CMakeLists.txt
│   ├── conanfile.txt
│   ├── Dockerfile
│   ├── include
│   │   ├── analyzer
│   │   │   └── static_analyzer.hpp
│   │   ├── compiler
│   │   │   └── execution_engine.hpp
│   │   ├── parser
│   │   │   └── ast_parser.hpp
│   │   ├── server.hpp
│   │   ├── utils
│   │   │   ├── config.hpp
│   │   │   ├── file_utils.hpp
│   │   │   ├── logger.hpp
│   │   │   └── string_utils.hpp
│   │   └── visualizer
│   │       └── memory_visualizer.hpp
│   ├── lib
│   ├── scripts
│   │   └── dev-server.sh
│   ├── src
│   │   ├── analyzer
│   │   │   ├── code_analyzer.cpp
│   │   │   └── static_analyzer.cpp
│   │   ├── compiler
│   │   │   └── execution_engine.cpp
│   │   ├── main.cpp
│   │   ├── parser
│   │   │   └── ast_parser.cpp
│   │   ├── server.cpp
│   │   ├── utils
│   │   │   ├── config.cpp
│   │   │   ├── file_utils.cpp
│   │   │   ├── logger.cpp
│   │   │   └── string_utils.cpp
│   │   └── visualizer
│   │       └── memory_visualizer.cpp
│   └── tests
│       └── unit
│           ├── analyzer.test.cpp
│           └── parser.test.cpp
├── docker
│   ├── backend
│   │   └── Dockerfile
│   ├── cpp-engine
│   │   └── Dockerfile
│   ├── database
│   │   └── init.sql
│   ├── frontend
│   │   ├── default.conf
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   └── nginx
│       └── nginx.conf
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── docker-compose.test.yml
├── docker-compose.yml
├── docs
│   ├── api
│   │   ├── authentication.md
│   │   ├── code-execution.md
│   │   ├── learning.md
│   │   └── README.md
│   ├── architecture
│   │   └── README.md
│   └── user-guides
│       ├── getting-started.md
│       └── README.md
├── frontend
│   ├── .eslintrc.json
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   ├── public
│   ├── src
│   │   ├── components
│   │   │   ├── Auth
│   │   │   │   ├── AuthGuard.tsx
│   │   │   │   ├── ForgotPassword.tsx
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── CodeEditor
│   │   │   │   ├── AnalysisPanel.tsx
│   │   │   │   ├── CodeEditor.tsx
│   │   │   │   ├── ExecutionOutput.tsx
│   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   └── ToolBar.tsx
│   │   │   ├── Community
│   │   │   │   ├── CommentSystem.tsx
│   │   │   │   ├── ForumList.tsx
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   ├── PostView.tsx
│   │   │   │   └── UserProfile.tsx
│   │   │   ├── Dashboard
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── ProgressCard.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   └── StatsCard.tsx
│   │   │   ├── Layout
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── LearningPath
│   │   │   │   ├── CourseCard.tsx
│   │   │   │   ├── CourseList.tsx
│   │   │   │   ├── ExerciseView.tsx
│   │   │   │   ├── LessonView.tsx
│   │   │   │   └── ProgressTracker.tsx
│   │   │   ├── Notification
│   │   │   │   ├── Notification.tsx
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   └── NotificationSettings.tsx
│   │   │   ├── Search
│   │   │   │   ├── SearchFilters.tsx
│   │   │   │   ├── SearchModal.tsx
│   │   │   │   └── SearchResults.tsx
│   │   │   ├── UI
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Toast.tsx
│   │   │   └── Visualizer
│   │   │       └── MemoryVisualizer.tsx
│   │   ├── hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCodeAnalysis.ts
│   │   │   ├── useCodeExecution.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useTheme.ts
│   │   │   └── useWebSocket.ts
│   │   ├── pages
│   │   │   ├── api
│   │   │   │   └── health.ts
│   │   │   ├── auth
│   │   │   │   ├── forgot-password.tsx
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── code
│   │   │   │   ├── collaborate.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   └── snippets.tsx
│   │   │   ├── community
│   │   │   │   ├── [postId].tsx
│   │   │   │   ├── forums.tsx
│   │   │   │   └── index.ts
│   │   │   ├── dashboard.tsx
│   │   │   ├── index.tsx
│   │   │   └── learn
│   │   │       ├── [courseId]
│   │   │       │   └── [lessonId].tsx
│   │   │       ├── [courseId].tsx
│   │   │       └── index.tsx
│   │   ├── services
│   │   │   ├── analytics.ts
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── socket.ts
│   │   ├── styles
│   │   │   ├── components.css
│   │   │   ├── global.css
│   │   │   └── monaco.css
│   │   ├── types
│   │   │   └── index.ts
│   │   └── utils
│   │       ├── cn.ts
│   │       ├── constants.ts
│   │       ├── formatting.ts
│   │       ├── helpers.ts
│   │       ├── monaco-config.ts
│   │       └── validation.ts
│   ├── tailwind.config.js
│   ├── tests
│   │   ├── components
│   │   │   ├── CodeEditor.test.tsx
│   │   │   └── Dashboard.test.tsx
│   │   └── hooks
│   │       └── useAuth.test.ts
│   └── tsconfig.json
├── package.json
├── PROJECT_STRUCTURE.md
├── README.md
├── scripts
│   ├── deploy
│   │   ├── production.sh
│   │   └── staging.sh
│   └── dev
└── tests
    ├── e2e
    │   ├── auth.spec.ts
    │   ├── code-execution.spec.ts
    │   ├── community.spec.ts
    │   └── learning.spec.ts
    ├── integration
    │   ├── auth.test.ts
    │   ├── code-editor.test.ts
    │   ├── database.test.ts
    │   ├── full-stack.test.ts
    │   ├── learning-flow.test.ts
    │   ├── security.test.ts
    │   └── setup.ts
    └── performance
        └── load-testing.js

91 directories, 212 files
