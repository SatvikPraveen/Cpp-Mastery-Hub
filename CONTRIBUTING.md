# Contributing to C++ Mastery Hub
# File: CONTRIBUTING.md
# Extension: .md
# Location: CONTRIBUTING.md

Thank you for your interest in contributing to C++ Mastery Hub! We welcome contributions from developers of all skill levels. This document will guide you through the process of contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Our Pledge

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Docker** & **Docker Compose**
- **Git** with proper configuration
- **C++ Compiler** (GCC 11+ or Clang 14+)
- **CMake** 3.16+

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cpp-mastery-hub.git
   cd cpp-mastery-hub
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/cpp-mastery-hub/cpp-mastery-hub.git
   ```

## Development Setup

### Quick Setup with Docker

```bash
# Copy environment variables
cp .env.example .env

# Start development environment
docker-compose up -d

# Install dependencies
npm run install:all

# Initialize database
npm run db:migrate
npm run db:seed
```

### Manual Setup

```bash
# Install dependencies
npm run install:all

# Set up databases (PostgreSQL, Redis, MongoDB)
# Configure .env file with your database credentials

# Build C++ engine
cd cpp-engine
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
make -j$(nproc)
cd ../..

# Start services
npm run dev
```

### Verify Setup

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- C++ Engine: http://localhost:8001

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Reports** - Help us identify and fix issues
2. **Feature Requests** - Suggest new functionality
3. **Code Contributions** - Fix bugs or implement features
4. **Documentation** - Improve docs, tutorials, and guides
5. **Testing** - Write tests or improve test coverage
6. **Design** - UI/UX improvements and suggestions

### Getting Started with Code

1. **Choose an Issue**: Look for issues labeled `good first issue` or `help wanted`
2. **Ask Questions**: Comment on the issue if you need clarification
3. **Create a Branch**: Use descriptive branch names
   ```bash
   git checkout -b feature/add-code-analysis
   git checkout -b fix/login-validation
   git checkout -b docs/update-api-guide
   ```

## Coding Standards

### General Principles

- Write clean, readable, and maintainable code
- Follow existing code style and patterns
- Add appropriate comments and documentation
- Write tests for new functionality
- Keep commits focused and atomic

### TypeScript/JavaScript (Frontend & Backend)

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Prefer functional programming patterns
- Add JSDoc comments for public APIs

```typescript
/**
 * Executes C++ code and returns the result
 * @param code - The C++ source code to execute
 * @param language - The C++ standard to use
 * @returns Promise containing execution result
 */
export async function executeCode(
  code: string, 
  language: string = 'cpp'
): Promise<ExecutionResult> {
  // Implementation
}
```

### C++ (Analysis Engine)

- Follow Google C++ Style Guide
- Use modern C++ features (C++17/C++20)
- Use RAII and smart pointers
- Add Doxygen documentation
- Use const correctness

```cpp
/**
 * @brief Analyzes C++ code for potential issues
 * @param code The source code to analyze
 * @param options Analysis configuration options
 * @return Analysis results with issues and suggestions
 */
class CodeAnalyzer {
public:
    [[nodiscard]] auto analyze(
        const std::string& code,
        const AnalysisOptions& options = {}
    ) const -> AnalysisResult;
};
```

### React Components

- Use functional components with hooks
- Follow component composition patterns
- Use TypeScript for props and state
- Implement proper error boundaries
- Add accessibility attributes

```tsx
interface CodeEditorProps {
  initialCode: string;
  language: 'cpp' | 'cpp17' | 'cpp20';
  onCodeChange: (code: string) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language,
  onCodeChange,
  readOnly = false
}) => {
  // Implementation
};
```

## Testing Guidelines

### Frontend Testing

- Write unit tests for components using React Testing Library
- Add integration tests for user workflows
- Test accessibility with screen readers
- Test responsive design on different screen sizes

```typescript
describe('CodeEditor', () => {
  it('should execute code when run button is clicked', async () => {
    render(<CodeEditor initialCode="int main(){}" onCodeChange={jest.fn()} />);
    
    const runButton = screen.getByRole('button', { name: /run/i });
    await userEvent.click(runButton);
    
    expect(mockExecuteCode).toHaveBeenCalledWith('int main(){}');
  });
});
```

### Backend Testing

- Write unit tests for services and utilities
- Add integration tests for API endpoints
- Test authentication and authorization
- Test error handling scenarios

```typescript
describe('POST /api/code/execute', () => {
  it('should execute valid C++ code', async () => {
    const response = await request(app)
      .post('/api/code/execute')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: 'int main() { return 0; }',
        language: 'cpp'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.result).toHaveProperty('output');
  });
});
```

### C++ Testing

- Use Google Test framework
- Test both positive and negative cases
- Add performance benchmarks for critical paths
- Test memory management and leak detection

```cpp
TEST(CodeAnalyzer, AnalyzesValidCode) {
    CodeAnalyzer analyzer;
    const std::string code = "int main() { return 0; }";
    
    const auto result = analyzer.analyze(code);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_EQ(result.issues().size(), 0);
}
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests  
cd backend
npm test

# C++ tests
cd cpp-engine
mkdir build && cd build
cmake .. -DBUILD_TESTS=ON
make test

# All tests
npm run test:all
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest upstream changes
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run the full test suite**
   ```bash
   npm run test:all
   npm run lint
   npm run build
   ```

3. **Update documentation** if needed

4. **Add changelog entry** if it's a user-facing change

### Pull Request Template

Use this template for your pull requests:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Added new tests for changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing for significant changes
4. **Documentation**: Ensure docs are updated
5. **Merge**: Squash and merge after approval

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
Add screenshots if applicable

**Environment:**
- OS: [e.g. Windows 10, macOS 12, Ubuntu 20.04]
- Browser: [e.g. Chrome 96, Firefox 95]
- Version: [e.g. 1.2.0]

**Additional context**
Any other relevant information
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
Clear description of desired feature

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Mockups, examples, or additional info
```

## Documentation

### Types of Documentation

1. **API Documentation** - OpenAPI/Swagger specs
2. **User Guides** - How-to guides for users
3. **Developer Docs** - Technical documentation
4. **Code Comments** - Inline documentation
5. **README Files** - Project and component overviews

### Writing Guidelines

- Use clear, concise language
- Include code examples
- Add screenshots for UI documentation
- Keep documentation up-to-date with code changes
- Use proper markdown formatting

### Documentation Structure

```
docs/
├── api/                    # API documentation
├── user-guides/           # User documentation  
├── developer/             # Developer guides
├── architecture/          # System architecture
└── deployment/           # Deployment guides
```

## Development Workflow

### Git Workflow

We use a feature branch workflow:

1. **Main Branch** - Production-ready code
2. **Feature Branches** - New features and bug fixes
3. **Release Branches** - Prepare releases
4. **Hotfix Branches** - Critical production fixes

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(editor): add syntax highlighting for C++20
fix(auth): resolve login redirect issue
docs(api): update authentication examples
```

## Performance Guidelines

### Frontend Performance

- Use React.memo() for expensive components
- Implement virtual scrolling for large lists
- Optimize bundle size with code splitting
- Use service workers for caching
- Minimize API calls with proper state management

### Backend Performance

- Use database indexes appropriately
- Implement caching strategies
- Use connection pooling
- Add request rate limiting
- Monitor API response times

### C++ Engine Performance

- Use appropriate data structures
- Implement memory pooling where beneficial
- Profile critical code paths
- Use compiler optimizations
- Minimize memory allocations

## Security Considerations

### Input Validation

- Validate all user input on both client and server
- Sanitize input to prevent XSS attacks
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization

### Code Execution Security

- Run code in sandboxed containers
- Limit execution time and memory usage
- Validate code before execution
- Monitor for suspicious activity

### Data Protection

- Encrypt sensitive data in transit and at rest
- Follow GDPR and privacy regulations
- Implement proper session management
- Use secure communication protocols

## Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General discussions and questions
- **Discord** - Real-time chat and collaboration
- **Email** - Direct contact with maintainers

### Getting Help

1. **Check Documentation** - Look for existing solutions
2. **Search Issues** - See if someone else had the same problem
3. **Ask Questions** - Use GitHub Discussions for help
4. **Join Discord** - Get real-time assistance

### Becoming a Maintainer

Active contributors may be invited to become maintainers. Maintainers have additional responsibilities:

- Review pull requests
- Triage issues
- Help with releases
- Mentor new contributors
- Make architectural decisions

## Recognition

We value all contributions and provide recognition through:

- **Contributors List** - All contributors are listed in README
- **GitHub Badges** - Achievement badges for milestones
- **Community Highlights** - Feature outstanding contributions
- **Maintainer Status** - Opportunity to become a maintainer

## License

By contributing to C++ Mastery Hub, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions?

If you have any questions about contributing, please:

1. Check this guide first
2. Search existing issues and discussions
3. Create a new discussion if needed
4. Reach out to maintainers via email

Thank you for contributing to C++ Mastery Hub! 🚀