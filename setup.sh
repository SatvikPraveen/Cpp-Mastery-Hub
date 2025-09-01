#!/bin/bash

# C++ Mastery Hub - Complete Project Setup Script
# This script creates the entire project structure

echo "🚀 Creating C++ Mastery Hub Project Structure..."

# Create main project directory
mkdir -p cpp-mastery-hub
cd cpp-mastery-hub

# Frontend structure
mkdir -p frontend/{src/{components/{CodeEditor,Visualizer,Dashboard,LearningPath,Community},hooks,services,utils,types,pages,styles},public,tests}

# Backend structure
mkdir -p backend/{src/{api/{routes,middleware},services/{compiler,analyzer,sandbox,learning},models,utils,types},tests,dist}

# C++ Engine structure
mkdir -p cpp-engine/{src/{parser,analyzer,visualizer},include,tests,build,lib}

# Content and documentation
mkdir -p {content/{tutorials,examples,quizzes},docs/{api,architecture,user-guides},scripts/{build,deploy,dev}}

# Docker and deployment
mkdir -p docker/{frontend,backend,cpp-engine,database}

# Tests and CI/CD
mkdir -p {tests/{integration,e2e,performance},.github/workflows}

# Configuration files
touch {docker-compose.yml,docker-compose.dev.yml,.env.example,.gitignore,README.md,CONTRIBUTING.md}

# Frontend package files
touch frontend/{package.json,tsconfig.json,next.config.js,.eslintrc.json,tailwind.config.js}

# Backend package files
touch backend/{package.json,tsconfig.json,.eslintrc.json,prisma/schema.prisma}

# C++ Engine files
touch cpp-engine/{CMakeLists.txt,conanfile.txt,.clang-format,.clang-tidy}

echo "✅ Project structure created successfully!"
echo "📁 Total directories created: $(find . -type d | wc -l)"
echo "📄 Ready for implementation!"