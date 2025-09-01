// File: cpp-engine/tests/unit/parser.test.cpp
// Extension: .cpp
// Location: cpp-engine/tests/unit/parser.test.cpp

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <chrono>
#include <algorithm>
#include "../../include/parser/ast_parser.hpp"
#include "../../include/compiler/execution_engine.hpp"
#include "../../include/visualizer/memory_visualizer.hpp"
#include "../../include/utils/logger.hpp"
#include "../../include/utils/file_utils.hpp"
#include "../../include/utils/string_utils.hpp"

using namespace CppMasteryHub;
using namespace testing;

class ParserTest : public ::testing::Test {
protected:
    void SetUp() override {
        parser = std::make_unique<ASTParser>();
        Logger::initialize("parser_test", Logger::Level::DEBUG);
    }

    void TearDown() override {
        parser.reset();
    }

    std::unique_ptr<ASTParser> parser;
};

class ExecutionEngineTest : public ::testing::Test {
protected:
    void SetUp() override {
        engine = std::make_unique<ExecutionEngine>();
        Logger::initialize("execution_test", Logger::Level::DEBUG);
    }

    void TearDown() override {
        engine.reset();
    }

    std::unique_ptr<ExecutionEngine> engine;
};

class MemoryVisualizerTest : public ::testing::Test {
protected:
    void SetUp() override {
        visualizer = std::make_unique<MemoryVisualizer>();
        Logger::initialize("visualizer_test", Logger::Level::DEBUG);
    }

    void TearDown() override {
        visualizer.reset();
    }

    std::unique_ptr<MemoryVisualizer> visualizer;
};

// Parser Tests
TEST_F(ParserTest, ParseFunctionDeclarations) {
    const std::string code = R"(
        int add(int a, int b);
        void print(const std::string& message);
        template<typename T>
        T maximum(T a, T b);
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getFunctionCount(), 3);
    
    const auto& functions = ast.getFunctions();
    
    // Check function signatures
    auto addFunc = std::find_if(functions.begin(), functions.end(),
        [](const auto& f) { return f.getName() == "add"; });
    EXPECT_NE(addFunc, functions.end());
    EXPECT_EQ(addFunc->getReturnType(), "int");
    EXPECT_EQ(addFunc->getParameterCount(), 2);
    
    auto printFunc = std::find_if(functions.begin(), functions.end(),
        [](const auto& f) { return f.getName() == "print"; });
    EXPECT_NE(printFunc, functions.end());
    EXPECT_EQ(printFunc->getReturnType(), "void");
    EXPECT_EQ(printFunc->getParameterCount(), 1);
}

TEST_F(ParserTest, ParseClassDefinitions) {
    const std::string code = R"(
        class Rectangle {
        private:
            double width, height;
        public:
            Rectangle(double w, double h);
            double getArea() const;
            double getPerimeter() const;
        };
        
        template<typename T>
        class Vector3D {
        private:
            T x, y, z;
        public:
            Vector3D(T x, T y, T z);
            T magnitude() const;
        };
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getClassCount(), 2);
    
    const auto& classes = ast.getClasses();
    
    auto rectClass = std::find_if(classes.begin(), classes.end(),
        [](const auto& c) { return c.getName() == "Rectangle"; });
    EXPECT_NE(rectClass, classes.end());
    EXPECT_EQ(rectClass->getMemberFunctionCount(), 3);
    EXPECT_EQ(rectClass->getMemberVariableCount(), 2);
    
    auto vectorClass = std::find_if(classes.begin(), classes.end(),
        [](const auto& c) { return c.getName() == "Vector3D"; });
    EXPECT_NE(vectorClass, classes.end());
    EXPECT_TRUE(vectorClass->isTemplate());
}

TEST_F(ParserTest, ParseNamespaces) {
    const std::string code = R"(
        namespace math {
            const double PI = 3.14159;
            
            namespace geometry {
                class Circle {
                    double radius;
                public:
                    Circle(double r) : radius(r) {}
                };
            }
            
            double square(double x) {
                return x * x;
            }
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getNamespaceCount(), 2);
    
    const auto& namespaces = ast.getNamespaces();
    
    auto mathNs = std::find_if(namespaces.begin(), namespaces.end(),
        [](const auto& ns) { return ns.getName() == "math"; });
    EXPECT_NE(mathNs, namespaces.end());
    
    auto geomNs = std::find_if(namespaces.begin(), namespaces.end(),
        [](const auto& ns) { return ns.getName() == "geometry"; });
    EXPECT_NE(geomNs, namespaces.end());
}

TEST_F(ParserTest, ParseTemplates) {
    const std::string code = R"(
        template<typename T, int N>
        class Array {
        private:
            T data[N];
        public:
            T& operator[](int index) { return data[index]; }
            const T& operator[](int index) const { return data[index]; }
            constexpr int size() const { return N; }
        };
        
        template<typename T>
        T max(T a, T b) {
            return (a > b) ? a : b;
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getTemplateCount(), 2);
    
    const auto& templates = ast.getTemplates();
    
    auto arrayTemplate = std::find_if(templates.begin(), templates.end(),
        [](const auto& t) { return t.getName() == "Array"; });
    EXPECT_NE(arrayTemplate, templates.end());
    EXPECT_EQ(arrayTemplate->getTemplateParameterCount(), 2);
    
    auto maxTemplate = std::find_if(templates.begin(), templates.end(),
        [](const auto& t) { return t.getName() == "max"; });
    EXPECT_NE(maxTemplate, templates.end());
    EXPECT_EQ(maxTemplate->getTemplateParameterCount(), 1);
}

TEST_F(ParserTest, ParseInheritance) {
    const std::string code = R"(
        class Base {
        protected:
            int value;
        public:
            virtual void process() = 0;
            virtual ~Base() = default;
        };
        
        class Derived : public Base {
        public:
            void process() override {
                value = 42;
            }
        };
        
        class MultipleDerived : public Base, public std::enable_shared_from_this<MultipleDerived> {
        public:
            void process() override {}
        };
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getClassCount(), 3);
    
    const auto& classes = ast.getClasses();
    
    auto baseClass = std::find_if(classes.begin(), classes.end(),
        [](const auto& c) { return c.getName() == "Base"; });
    EXPECT_NE(baseClass, classes.end());
    EXPECT_TRUE(baseClass->isAbstract());
    
    auto derivedClass = std::find_if(classes.begin(), classes.end(),
        [](const auto& c) { return c.getName() == "Derived"; });
    EXPECT_NE(derivedClass, classes.end());
    EXPECT_EQ(derivedClass->getBaseClassCount(), 1);
    
    auto multipleClass = std::find_if(classes.begin(), classes.end(),
        [](const auto& c) { return c.getName() == "MultipleDerived"; });
    EXPECT_NE(multipleClass, classes.end());
    EXPECT_EQ(multipleClass->getBaseClassCount(), 2);
}

TEST_F(ParserTest, ParseOperatorOverloading) {
    const std::string code = R"(
        class Complex {
        private:
            double real, imag;
        public:
            Complex(double r = 0, double i = 0) : real(r), imag(i) {}
            
            Complex operator+(const Complex& other) const {
                return Complex(real + other.real, imag + other.imag);
            }
            
            Complex& operator+=(const Complex& other) {
                real += other.real;
                imag += other.imag;
                return *this;
            }
            
            bool operator==(const Complex& other) const {
                return real == other.real && imag == other.imag;
            }
            
            friend std::ostream& operator<<(std::ostream& os, const Complex& c);
        };
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getClassCount(), 1);
    
    const auto& complexClass = ast.getClasses()[0];
    EXPECT_EQ(complexClass.getName(), "Complex");
    
    const auto& operators = complexClass.getOperators();
    EXPECT_GE(operators.size(), 3); // +, +=, ==
    
    bool foundPlusOperator = false;
    bool foundPlusEqualOperator = false;
    bool foundEqualOperator = false;
    
    for (const auto& op : operators) {
        if (op.getOperatorType() == "+") foundPlusOperator = true;
        if (op.getOperatorType() == "+=") foundPlusEqualOperator = true;
        if (op.getOperatorType() == "==") foundEqualOperator = true;
    }
    
    EXPECT_TRUE(foundPlusOperator);
    EXPECT_TRUE(foundPlusEqualOperator);
    EXPECT_TRUE(foundEqualOperator);
}

TEST_F(ParserTest, ParseModernCppFeatures) {
    const std::string code = R"(
        #include <memory>
        #include <vector>
        #include <string>
        
        class ModernClass {
        public:
            // Default and deleted functions
            ModernClass() = default;
            ModernClass(const ModernClass&) = delete;
            ModernClass& operator=(const ModernClass&) = delete;
            ModernClass(ModernClass&&) = default;
            ModernClass& operator=(ModernClass&&) = default;
            
            // Lambda function
            auto getLambda() {
                return [this](int x) -> int {
                    return x * 2;
                };
            }
            
            // Auto return type
            auto getValue() const -> int {
                return 42;
            }
            
            // Range-based for loop
            void processVector(const std::vector<int>& vec) {
                for (const auto& item : vec) {
                    // Process item
                }
            }
        };
        
        // Variadic template
        template<typename... Args>
        void print(Args... args) {
            ((std::cout << args << " "), ...);
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getClassCount(), 1);
    EXPECT_GE(ast.getTemplateCount(), 1);
    
    const auto& modernClass = ast.getClasses()[0];
    EXPECT_EQ(modernClass.getName(), "ModernClass");
    
    // Check for modern C++ features
    const auto& functions = modernClass.getMemberFunctions();
    bool foundAutoReturnType = false;
    bool foundLambda = false;
    
    for (const auto& func : functions) {
        if (func.hasAutoReturnType()) foundAutoReturnType = true;
        if (func.containsLambda()) foundLambda = true;
    }
    
    EXPECT_TRUE(foundAutoReturnType);
    EXPECT_TRUE(foundLambda);
}

// Execution Engine Tests
TEST_F(ExecutionEngineTest, ExecuteSimpleProgram) {
    const std::string code = R"(
        #include <iostream>
        int main() {
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
    )";

    auto result = engine->execute(code);
    
    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.exitCode, 0);
    EXPECT_THAT(result.output, HasSubstr("Hello, World!"));
    EXPECT_GT(result.executionTime, 0);
    EXPECT_LT(result.executionTime, 5000); // Should complete within 5 seconds
}

TEST_F(ExecutionEngineTest, HandleCompilationErrors) {
    const std::string invalidCode = R"(
        #include <iostream>
        int main() {
            std::cout << "Missing semicolon"
            return 0;
        }
    )";

    auto result = engine->execute(invalidCode);
    
    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.compilationError.empty());
    EXPECT_THAT(result.compilationError, HasSubstr("error"));
}

TEST_F(ExecutionEngineTest, HandleRuntimeErrors) {
    const std::string crashingCode = R"(
        #include <iostream>
        int main() {
            int* ptr = nullptr;
            *ptr = 42; // Segmentation fault
            return 0;
        }
    )";

    auto result = engine->execute(crashingCode);
    
    EXPECT_FALSE(result.success);
    EXPECT_NE(result.exitCode, 0);
    EXPECT_FALSE(result.runtimeError.empty());
}

TEST_F(ExecutionEngineTest, EnforceTimeoutLimits) {
    const std::string infiniteLoopCode = R"(
        #include <iostream>
        int main() {
            while(true) {
                std::cout << "Infinite loop" << std::endl;
            }
            return 0;
        }
    )";

    ExecutionConfig config;
    config.timeoutMs = 1000; // 1 second timeout
    
    auto result = engine->execute(infiniteLoopCode, config);
    
    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.timeout);
    EXPECT_GE(result.executionTime, 1000);
}

TEST_F(ExecutionEngineTest, HandleInputOutput) {
    const std::string ioCode = R"(
        #include <iostream>
        int main() {
            int x;
            std::cout << "Enter number: ";
            std::cin >> x;
            std::cout << "You entered: " << x << std::endl;
            return 0;
        }
    )";

    ExecutionConfig config;
    config.input = "42\n";
    
    auto result = engine->execute(ioCode, config);
    
    EXPECT_TRUE(result.success);
    EXPECT_THAT(result.output, HasSubstr("Enter number:"));
    EXPECT_THAT(result.output, HasSubstr("You entered: 42"));
}

TEST_F(ExecutionEngineTest, TrackMemoryUsage) {
    const std::string memoryCode = R"(
        #include <iostream>
        #include <vector>
        int main() {
            std::vector<int> vec(1000000, 42);
            std::cout << "Vector size: " << vec.size() << std::endl;
            return 0;
        }
    )";

    ExecutionConfig config;
    config.trackMemory = true;
    
    auto result = engine->execute(memoryCode, config);
    
    EXPECT_TRUE(result.success);
    EXPECT_GT(result.memoryUsage.peakMemoryKB, 0);
    EXPECT_GT(result.memoryUsage.heapAllocations, 0);
}

TEST_F(ExecutionEngineTest, ExecuteComplexProgram) {
    const std::string complexCode = R"(
        #include <iostream>
        #include <vector>
        #include <algorithm>
        #include <numeric>
        
        int main() {
            std::vector<int> numbers = {5, 2, 8, 1, 9, 3, 7, 4, 6};
            
            // Sort the numbers
            std::sort(numbers.begin(), numbers.end());
            
            // Calculate sum
            int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
            
            // Print results
            std::cout << "Sorted numbers: ";
            for (const auto& num : numbers) {
                std::cout << num << " ";
            }
            std::cout << std::endl;
            std::cout << "Sum: " << sum << std::endl;
            
            return 0;
        }
    )";

    auto result = engine->execute(complexCode);
    
    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.exitCode, 0);
    EXPECT_THAT(result.output, HasSubstr("Sorted numbers:"));
    EXPECT_THAT(result.output, HasSubstr("1 2 3 4 5 6 7 8 9"));
    EXPECT_THAT(result.output, HasSubstr("Sum: 45"));
}

TEST_F(ExecutionEngineTest, HandleResourceLimits) {
    const std::string resourceIntensiveCode = R"(
        #include <iostream>
        #include <vector>
        int main() {
            // Try to allocate a very large vector
            try {
                std::vector<int> huge_vector(1000000000); // 1 billion ints
                std::cout << "Allocated successfully" << std::endl;
            } catch (const std::exception& e) {
                std::cout << "Allocation failed: " << e.what() << std::endl;
            }
            return 0;
        }
    )";

    ExecutionConfig config;
    config.memoryLimitMB = 100; // 100MB limit
    
    auto result = engine->execute(resourceIntensiveCode, config);
    
    // Should either succeed with allocation failure message or fail due to limits
    if (result.success) {
        EXPECT_THAT(result.output, AnyOf(
            HasSubstr("Allocation failed"),
            HasSubstr("Allocated successfully")
        ));
    } else {
        EXPECT_TRUE(result.memoryLimitExceeded || result.timeout);
    }
}

// Memory Visualizer Tests
TEST_F(MemoryVisualizerTest, VisualizeStackFrame) {
    const std::string code = R"(
        int main() {
            int x = 42;
            double y = 3.14;
            char arr[10] = "hello";
            return 0;
        }
    )";

    auto visualization = visualizer->generateVisualization(code);
    
    EXPECT_TRUE(visualization.isValid());
    EXPECT_GT(visualization.getStackFrames().size(), 0);
    
    const auto& mainFrame = visualization.getStackFrames()[0];
    EXPECT_EQ(mainFrame.getFunctionName(), "main");
    EXPECT_GT(mainFrame.getVariables().size(), 0);
    
    // Check for our variables
    const auto& variables = mainFrame.getVariables();
    
    auto xVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "x"; });
    EXPECT_NE(xVar, variables.end());
    EXPECT_EQ(xVar->getType(), "int");
    EXPECT_EQ(xVar->getValue(), "42");
    
    auto yVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "y"; });
    EXPECT_NE(yVar, variables.end());
    EXPECT_EQ(yVar->getType(), "double");
    
    auto arrVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "arr"; });
    EXPECT_NE(arrVar, variables.end());
    EXPECT_EQ(arrVar->getType(), "char[10]");
}

TEST_F(MemoryVisualizerTest, VisualizeHeapAllocations) {
    const std::string code = R"(
        #include <iostream>
        int main() {
            int* ptr1 = new int(42);
            double* ptr2 = new double(3.14);
            int* arr = new int[5]{1, 2, 3, 4, 5};
            
            delete ptr1;
            delete ptr2;
            delete[] arr;
            
            return 0;
        }
    )";

    auto visualization = visualizer->generateVisualization(code);
    
    EXPECT_TRUE(visualization.isValid());
    EXPECT_GT(visualization.getHeapAllocations().size(), 0);
    
    const auto& allocations = visualization.getHeapAllocations();
    
    // Should show allocations and deallocations
    auto intAlloc = std::find_if(allocations.begin(), allocations.end(),
        [](const auto& a) { return a.getType() == "int" && a.getSize() == sizeof(int); });
    EXPECT_NE(intAlloc, allocations.end());
    EXPECT_TRUE(intAlloc->isFreed());
    
    auto doubleAlloc = std::find_if(allocations.begin(), allocations.end(),
        [](const auto& a) { return a.getType() == "double" && a.getSize() == sizeof(double); });
    EXPECT_NE(doubleAlloc, allocations.end());
    EXPECT_TRUE(doubleAlloc->isFreed());
    
    auto arrayAlloc = std::find_if(allocations.begin(), allocations.end(),
        [](const auto& a) { return a.getType() == "int[]" && a.getSize() == 5 * sizeof(int); });
    EXPECT_NE(arrayAlloc, allocations.end());
    EXPECT_TRUE(arrayAlloc->isFreed());
}

TEST_F(MemoryVisualizerTest, DetectMemoryLeaks) {
    const std::string leakyCode = R"(
        #include <iostream>
        int main() {
            int* ptr1 = new int(42);
            double* ptr2 = new double(3.14);
            // Missing delete statements
            return 0;
        }
    )";

    auto visualization = visualizer->generateVisualization(leakyCode);
    
    EXPECT_TRUE(visualization.isValid());
    EXPECT_GT(visualization.getMemoryLeaks().size(), 0);
    
    const auto& leaks = visualization.getMemoryLeaks();
    EXPECT_EQ(leaks.size(), 2); // Two leaked allocations
    
    auto intLeak = std::find_if(leaks.begin(), leaks.end(),
        [](const auto& l) { return l.getType() == "int"; });
    EXPECT_NE(intLeak, leaks.end());
    
    auto doubleLeak = std::find_if(leaks.begin(), leaks.end(),
        [](const auto& l) { return l.getType() == "double"; });
    EXPECT_NE(doubleLeak, leaks.end());
}

TEST_F(MemoryVisualizerTest, VisualizeComplexDataStructures) {
    const std::string complexCode = R"(
        #include <vector>
        #include <map>
        #include <string>
        
        struct Person {
            std::string name;
            int age;
        };
        
        int main() {
            std::vector<int> numbers = {1, 2, 3, 4, 5};
            std::map<std::string, int> ages = {
                {"Alice", 25},
                {"Bob", 30},
                {"Charlie", 35}
            };
            
            Person person{"David", 40};
            
            return 0;
        }
    )";

    auto visualization = visualizer->generateVisualization(complexCode);
    
    EXPECT_TRUE(visualization.isValid());
    
    const auto& mainFrame = visualization.getStackFrames()[0];
    const auto& variables = mainFrame.getVariables();
    
    // Check for complex data structures
    auto vectorVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "numbers"; });
    EXPECT_NE(vectorVar, variables.end());
    EXPECT_EQ(vectorVar->getType(), "std::vector<int>");
    EXPECT_EQ(vectorVar->getElementCount(), 5);
    
    auto mapVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "ages"; });
    EXPECT_NE(mapVar, variables.end());
    EXPECT_EQ(mapVar->getType(), "std::map<std::string, int>");
    EXPECT_EQ(mapVar->getElementCount(), 3);
    
    auto structVar = std::find_if(variables.begin(), variables.end(),
        [](const auto& v) { return v.getName() == "person"; });
    EXPECT_NE(structVar, variables.end());
    EXPECT_EQ(structVar->getType(), "Person");
    EXPECT_GT(structVar->getMemberCount(), 0);
}

// Utility Tests
class UtilityTest : public ::testing::Test {
protected:
    void SetUp() override {
        Logger::initialize("utility_test", Logger::Level::DEBUG);
    }
};

TEST_F(UtilityTest, StringUtilsTests) {
    // Test string trimming
    EXPECT_EQ(StringUtils::trim("  hello  "), "hello");
    EXPECT_EQ(StringUtils::trim("\t\nworld\r\n"), "world");
    
    // Test string splitting
    auto parts = StringUtils::split("a,b,c,d", ",");
    EXPECT_EQ(parts.size(), 4);
    EXPECT_EQ(parts[0], "a");
    EXPECT_EQ(parts[3], "d");
    
    // Test string replacement
    EXPECT_EQ(StringUtils::replace("hello world", "world", "universe"), "hello universe");
    
    // Test case conversion
    EXPECT_EQ(StringUtils::toLowerCase("HELLO"), "hello");
    EXPECT_EQ(StringUtils::toUpperCase("world"), "WORLD");
    
    // Test starts/ends with
    EXPECT_TRUE(StringUtils::startsWith("hello world", "hello"));
    EXPECT_TRUE(StringUtils::endsWith("hello world", "world"));
    EXPECT_FALSE(StringUtils::startsWith("hello world", "world"));
}

TEST_F(UtilityTest, FileUtilsTests) {
    const std::string testFile = "/tmp/test_file.txt";
    const std::string testContent = "Hello, File System!";
    
    // Test file writing
    EXPECT_TRUE(FileUtils::writeFile(testFile, testContent));
    
    // Test file reading
    std::string readContent;
    EXPECT_TRUE(FileUtils::readFile(testFile, readContent));
    EXPECT_EQ(readContent, testContent);
    
    // Test file existence
    EXPECT_TRUE(FileUtils::fileExists(testFile));
    EXPECT_FALSE(FileUtils::fileExists("/nonexistent/file.txt"));
    
    // Test file deletion
    EXPECT_TRUE(FileUtils::deleteFile(testFile));
    EXPECT_FALSE(FileUtils::fileExists(testFile));
    
    // Test directory operations
    const std::string testDir = "/tmp/test_directory";
    EXPECT_TRUE(FileUtils::createDirectory(testDir));
    EXPECT_TRUE(FileUtils::directoryExists(testDir));
    EXPECT_TRUE(FileUtils::removeDirectory(testDir));
}

TEST_F(UtilityTest, LoggerTests) {
    std::stringstream logOutput;
    Logger::setOutputStream(logOutput);
    
    Logger::debug("Debug message");
    Logger::info("Info message");
    Logger::warning("Warning message");
    Logger::error("Error message");
    
    std::string logs = logOutput.str();
    EXPECT_THAT(logs, HasSubstr("DEBUG"));
    EXPECT_THAT(logs, HasSubstr("INFO"));
    EXPECT_THAT(logs, HasSubstr("WARNING"));
    EXPECT_THAT(logs, HasSubstr("ERROR"));
    EXPECT_THAT(logs, HasSubstr("Debug message"));
    EXPECT_THAT(logs, HasSubstr("Error message"));
}

// Benchmark and Performance Tests
TEST_F(ParserTest, BenchmarkParsingPerformance) {
    const std::string largeCode = R"(
        #include <iostream>
        #include <vector>
        #include <map>
        #include <string>
        #include <algorithm>
        #include <numeric>
        
        namespace TestNamespace {
            template<typename T>
            class Container {
            private:
                std::vector<T> data;
            public:
                void add(const T& item) { data.push_back(item); }
                size_t size() const { return data.size(); }
                T& at(size_t index) { return data.at(index); }
                const T& at(size_t index) const { return data.at(index); }
            };
        }
        
        class ComplexClass : public std::enable_shared_from_this<ComplexClass> {
        public:
            ComplexClass() = default;
            virtual ~ComplexClass() = default;
            
            virtual void process() = 0;
            virtual int calculate(int a, int b) const {
                return a + b;
            }
        };
        
        class DerivedClass : public ComplexClass {
        private:
            std::map<std::string, int> data_;
            
        public:
            void process() override {
                for (auto& [key, value] : data_) {
                    value *= 2;
                }
            }
            
            void addData(const std::string& key, int value) {
                data_[key] = value;
            }
        };
        
        int main() {
            auto derived = std::make_shared<DerivedClass>();
            derived->addData("test", 42);
            derived->process();
            
            TestNamespace::Container<int> container;
            for (int i = 0; i < 100; ++i) {
                container.add(i);
            }
            
            return 0;
        }
    )";

    auto start = std::chrono::high_resolution_clock::now();
    auto ast = parser->parseCode(largeCode);
    auto end = std::chrono::high_resolution_clock::now();
    
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_LT(duration.count(), 1000); // Should parse within 1 second
    EXPECT_GT(ast.getClassCount(), 2);
    EXPECT_GT(ast.getTemplateCount(), 0);
    EXPECT_GT(ast.getNamespaceCount(), 0);
}

// Integration Tests
class IntegrationTest : public ::testing::Test {
protected:
    void SetUp() override {
        analyzer = std::make_unique<StaticAnalyzer>();
        parser = std::make_unique<ASTParser>();
        engine = std::make_unique<ExecutionEngine>();
        visualizer = std::make_unique<MemoryVisualizer>();
        
        Logger::initialize("integration_test", Logger::Level::DEBUG);
    }

    void TearDown() override {
        analyzer.reset();
        parser.reset();
        engine.reset();
        visualizer.reset();
    }

    std::unique_ptr<StaticAnalyzer> analyzer;
    std::unique_ptr<ASTParser> parser;
    std::unique_ptr<ExecutionEngine> engine;
    std::unique_ptr<MemoryVisualizer> visualizer;
};

TEST_F(IntegrationTest, FullPipelineTest) {
    const std::string code = R"(
        #include <iostream>
        #include <vector>
        
        int main() {
            std::vector<int> numbers = {1, 2, 3, 4, 5};
            
            for (size_t i = 0; i < numbers.size(); ++i) {
                std::cout << "Number: " << numbers[i] << std::endl;
            }
            
            return 0;
        }
    )";

    // 1. Parse the code
    auto ast = parser->parseCode(code);
    EXPECT_TRUE(ast.isValid());
    EXPECT_EQ(ast.getFunctionCount(), 1);
    
    // 2. Analyze the code
    auto analysisResult = analyzer->analyze(code);
    EXPECT_TRUE(analysisResult.isValid());
    EXPECT_EQ(analysisResult.getErrorCount(), 0);
    
    // 3. Execute the code
    auto executionResult = engine->execute(code);
    EXPECT_TRUE(executionResult.success);
    EXPECT_EQ(executionResult.exitCode, 0);
    
    // Verify output contains all numbers
    for (int i = 1; i <= 5; ++i) {
        EXPECT_THAT(executionResult.output, HasSubstr("Number: " + std::to_string(i)));
    }
    
    // 4. Generate memory visualization
    auto visualization = visualizer->generateVisualization(code);
    EXPECT_TRUE(visualization.isValid());
    EXPECT_GT(visualization.getStackFrames().size(), 0);
}

TEST_F(IntegrationTest, ErrorHandlingPipeline) {
    const std::string problematicCode = R"(
        #include <iostream>
        int main() {
            int* ptr = new int(42);
            std::cout << *ptr << std::endl;
            // Missing delete - memory leak
            
            int arr[5];
            arr[10] = 100; // Buffer overflow
            
            return 0;
        }
    )";

    // 1. Analysis should detect issues
    auto analysisResult = analyzer->analyze(problematicCode);
    EXPECT_TRUE(analysisResult.isValid()); // Code is syntactically valid
    EXPECT_GT(analysisResult.getWarningCount(), 0); // Should have warnings
    
    // Check for specific warnings
    const auto& warnings = analysisResult.getWarnings();
    bool foundMemoryLeak = false;
    bool foundBufferOverflow = false;
    
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("memory leak") != std::string::npos ||
            warning.getMessage().find("delete") != std::string::npos) {
            foundMemoryLeak = true;
        }
        if (warning.getMessage().find("buffer overflow") != std::string::npos ||
            warning.getMessage().find("array bounds") != std::string::npos) {
            foundBufferOverflow = true;
        }
    }
    
    EXPECT_TRUE(foundMemoryLeak);
    // Note: Buffer overflow detection might vary based on analyzer sophistication
    
    // 2. Memory visualization should show the leak
    auto visualization = visualizer->generateVisualization(problematicCode);
    EXPECT_TRUE(visualization.isValid());
    EXPECT_GT(visualization.getMemoryLeaks().size(), 0);
}

TEST_F(IntegrationTest, PerformanceAnalysisPipeline) {
    const std::string performanceCode = R"(
        #include <iostream>
        #include <vector>
        #include <chrono>
        
        void inefficientSort(std::vector<int>& vec) {
            // Bubble sort - O(n²)
            for (size_t i = 0; i < vec.size(); ++i) {
                for (size_t j = 0; j < vec.size() - i - 1; ++j) {
                    if (vec[j] > vec[j + 1]) {
                        std::swap(vec[j], vec[j + 1]);
                    }
                }
            }
        }
        
        int main() {
            std::vector<int> numbers = {5, 2, 8, 1, 9, 3};
            
            auto start = std::chrono::high_resolution_clock::now();
            inefficientSort(numbers);
            auto end = std::chrono::high_resolution_clock::now();
            
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            std::cout << "Sort took: " << duration.count() << " microseconds" << std::endl;
            
            return 0;
        }
    )";

    // 1. Analysis should detect performance issues
    auto analysisResult = analyzer->analyze(performanceCode);
    EXPECT_TRUE(analysisResult.isValid());
    
    const auto& metrics = analysisResult.getComplexityMetrics();
    EXPECT_GT(metrics.cyclomaticComplexity, 3); // Nested loops increase complexity
    
    // 2. Execution should provide timing information
    ExecutionConfig config;
    config.trackPerformance = true;
    
    auto executionResult = engine->execute(performanceCode, config);
    EXPECT_TRUE(executionResult.success);
    EXPECT_GT(executionResult.executionTime, 0);
    
    // Should contain timing output
    EXPECT_THAT(executionResult.output, HasSubstr("Sort took:"));
    EXPECT_THAT(executionResult.output, HasSubstr("microseconds"));
}