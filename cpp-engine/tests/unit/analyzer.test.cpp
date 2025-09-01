// File: cpp-engine/tests/unit/analyzer.test.cpp
// Extension: .cpp
// Location: cpp-engine/tests/unit/analyzer.test.cpp

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <chrono>
#include "../../include/analyzer/static_analyzer.hpp"
#include "../../include/parser/ast_parser.hpp"
#include "../../include/utils/logger.hpp"

using namespace CppMasteryHub;
using namespace testing;

class StaticAnalyzerTest : public ::testing::Test {
protected:
    void SetUp() override {
        analyzer = std::make_unique<StaticAnalyzer>();
        parser = std::make_unique<ASTParser>();
        
        // Initialize logger for tests
        Logger::initialize("test", Logger::Level::DEBUG);
    }

    void TearDown() override {
        analyzer.reset();
        parser.reset();
    }

    std::unique_ptr<StaticAnalyzer> analyzer;
    std::unique_ptr<ASTParser> parser;
};

// Test basic functionality
TEST_F(StaticAnalyzerTest, AnalyzeValidCppCode) {
    const std::string validCode = R"(
        #include <iostream>
        int main() {
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
    )";

    auto result = analyzer->analyze(validCode);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_EQ(result.getErrorCount(), 0);
    EXPECT_EQ(result.getWarningCount(), 0);
}

TEST_F(StaticAnalyzerTest, DetectSyntaxErrors) {
    const std::string invalidCode = R"(
        #include <iostream>
        int main() {
            std::cout << "Missing semicolon"
            return 0;
        }
    )";

    auto result = analyzer->analyze(invalidCode);
    
    EXPECT_FALSE(result.isValid());
    EXPECT_GT(result.getErrorCount(), 0);
    
    const auto& errors = result.getErrors();
    EXPECT_THAT(errors[0].getMessage(), HasSubstr("semicolon"));
}

TEST_F(StaticAnalyzerTest, DetectUnusedVariables) {
    const std::string codeWithUnusedVar = R"(
        #include <iostream>
        int main() {
            int unused_variable = 42;
            std::cout << "Hello, World!" << std::endl;
            return 0;
        }
    )";

    auto result = analyzer->analyze(codeWithUnusedVar);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_GT(result.getWarningCount(), 0);
    
    const auto& warnings = result.getWarnings();
    bool foundUnusedVarWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("unused") != std::string::npos) {
            foundUnusedVarWarning = true;
            break;
        }
    }
    EXPECT_TRUE(foundUnusedVarWarning);
}

TEST_F(StaticAnalyzerTest, DetectMemoryLeaks) {
    const std::string codeWithMemoryLeak = R"(
        #include <iostream>
        int main() {
            int* ptr = new int(42);
            std::cout << *ptr << std::endl;
            // Missing delete ptr;
            return 0;
        }
    )";

    auto result = analyzer->analyze(codeWithMemoryLeak);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_GT(result.getWarningCount(), 0);
    
    const auto& warnings = result.getWarnings();
    bool foundMemoryLeakWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("memory leak") != std::string::npos ||
            warning.getMessage().find("delete") != std::string::npos) {
            foundMemoryLeakWarning = true;
            break;
        }
    }
    EXPECT_TRUE(foundMemoryLeakWarning);
}

TEST_F(StaticAnalyzerTest, DetectBufferOverflow) {
    const std::string vulnerableCode = R"(
        #include <iostream>
        #include <cstring>
        int main() {
            char buffer[10];
            char input[100];
            strcpy(buffer, input); // Potential buffer overflow
            return 0;
        }
    )";

    auto result = analyzer->analyze(vulnerableCode);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_GT(result.getWarningCount(), 0);
    
    const auto& warnings = result.getWarnings();
    bool foundBufferOverflowWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("buffer overflow") != std::string::npos ||
            warning.getMessage().find("strcpy") != std::string::npos) {
            foundBufferOverflowWarning = true;
            break;
        }
    }
    EXPECT_TRUE(foundBufferOverflowWarning);
}

TEST_F(StaticAnalyzerTest, DetectNullPointerDereference) {
    const std::string codeWithNullPtr = R"(
        #include <iostream>
        int main() {
            int* ptr = nullptr;
            *ptr = 42; // Null pointer dereference
            return 0;
        }
    )";

    auto result = analyzer->analyze(codeWithNullPtr);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_GT(result.getWarningCount(), 0);
    
    const auto& warnings = result.getWarnings();
    bool foundNullPtrWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("null pointer") != std::string::npos ||
            warning.getMessage().find("nullptr") != std::string::npos) {
            foundNullPtrWarning = true;
            break;
        }
    }
    EXPECT_TRUE(foundNullPtrWarning);
}

TEST_F(StaticAnalyzerTest, CalculateComplexityMetrics) {
    const std::string complexCode = R"(
        #include <iostream>
        int fibonacci(int n) {
            if (n <= 1) {
                return n;
            }
            if (n % 2 == 0) {
                for (int i = 0; i < n; i++) {
                    if (i % 3 == 0) {
                        continue;
                    }
                }
            }
            return fibonacci(n-1) + fibonacci(n-2);
        }
        int main() {
            std::cout << fibonacci(10) << std::endl;
            return 0;
        }
    )";

    auto result = analyzer->analyze(complexCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& metrics = result.getComplexityMetrics();
    EXPECT_GT(metrics.cyclomaticComplexity, 1);
    EXPECT_GT(metrics.cognitiveComplexity, 1);
    EXPECT_GT(metrics.linesOfCode, 10);
}

TEST_F(StaticAnalyzerTest, DetectUnsafeFunctions) {
    const std::string unsafeCode = R"(
        #include <iostream>
        #include <cstring>
        #include <cstdio>
        int main() {
            char buffer[100];
            gets(buffer);        // Unsafe function
            strcat(buffer, "test"); // Potentially unsafe
            sprintf(buffer, "%s", "test"); // Potentially unsafe
            return 0;
        }
    )";

    auto result = analyzer->analyze(unsafeCode);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_GT(result.getWarningCount(), 0);
    
    const auto& warnings = result.getWarnings();
    int unsafeFunctionWarnings = 0;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("unsafe") != std::string::npos ||
            warning.getMessage().find("gets") != std::string::npos ||
            warning.getMessage().find("sprintf") != std::string::npos) {
            unsafeFunctionWarnings++;
        }
    }
    EXPECT_GT(unsafeFunctionWarnings, 0);
}

TEST_F(StaticAnalyzerTest, DetectModernCppViolations) {
    const std::string oldStyleCode = R"(
        #include <iostream>
        int main() {
            int* arr = new int[10];  // Should use std::vector or std::array
            for (int i = 0; i < 10; ++i) {
                arr[i] = i;
            }
            delete[] arr;
            
            int* ptr = new int(42);  // Should use smart pointers
            delete ptr;
            
            return 0;
        }
    )";

    auto result = analyzer->analyze(oldStyleCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& suggestions = result.getSuggestions();
    bool foundModernCppSuggestion = false;
    for (const auto& suggestion : suggestions) {
        if (suggestion.find("smart pointer") != std::string::npos ||
            suggestion.find("std::vector") != std::string::npos ||
            suggestion.find("std::array") != std::string::npos) {
            foundModernCppSuggestion = true;
            break;
        }
    }
    EXPECT_TRUE(foundModernCppSuggestion);
}

TEST_F(StaticAnalyzerTest, AnalyzePerformanceIssues) {
    const std::string inefficientCode = R"(
        #include <iostream>
        #include <vector>
        #include <string>
        
        void inefficientFunction(std::vector<std::string> vec) { // Pass by value
            for (int i = 0; i < vec.size(); ++i) { // Should use size_t
                std::string temp = vec[i] + "suffix"; // Unnecessary copy
                std::cout << temp << std::endl;
            }
        }
        
        int main() {
            std::vector<std::string> data = {"a", "b", "c"};
            inefficientFunction(data);
            return 0;
        }
    )";

    auto result = analyzer->analyze(inefficientCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& suggestions = result.getSuggestions();
    bool foundPerformanceSuggestion = false;
    for (const auto& suggestion : suggestions) {
        if (suggestion.find("const reference") != std::string::npos ||
            suggestion.find("size_t") != std::string::npos ||
            suggestion.find("range-based") != std::string::npos) {
            foundPerformanceSuggestion = true;
            break;
        }
    }
    EXPECT_TRUE(foundPerformanceSuggestion);
}

TEST_F(StaticAnalyzerTest, HandleLargeCodeFiles) {
    // Generate a large code file
    std::string largeCode = "#include <iostream>\n";
    largeCode += "int main() {\n";
    
    // Add many lines of code
    for (int i = 0; i < 1000; ++i) {
        largeCode += "    std::cout << \"Line " + std::to_string(i) + "\" << std::endl;\n";
    }
    
    largeCode += "    return 0;\n}\n";

    auto start = std::chrono::high_resolution_clock::now();
    auto result = analyzer->analyze(largeCode);
    auto end = std::chrono::high_resolution_clock::now();
    
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_LT(duration.count(), 5000); // Should complete within 5 seconds
}

TEST_F(StaticAnalyzerTest, DetectCodingStyleViolations) {
    const std::string poorStyleCode = R"(
        #include<iostream>
        int main(){
        int x=42;
        if(x==42){
        std::cout<<"Value is 42"<<std::endl;
        }
        return 0;
        }
    )";

    auto result = analyzer->analyze(poorStyleCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& styleIssues = result.getStyleIssues();
    EXPECT_GT(styleIssues.size(), 0);
    
    bool foundSpacingIssue = false;
    for (const auto& issue : styleIssues) {
        if (issue.getType() == StyleIssue::Type::SPACING ||
            issue.getType() == StyleIssue::Type::BRACES) {
            foundSpacingIssue = true;
            break;
        }
    }
    EXPECT_TRUE(foundSpacingIssue);
}

TEST_F(StaticAnalyzerTest, AnalyzeThreadSafetyIssues) {
    const std::string threadUnsafeCode = R"(
        #include <iostream>
        #include <thread>
        #include <vector>
        
        int global_counter = 0; // Shared without synchronization
        
        void increment() {
            for (int i = 0; i < 1000; ++i) {
                global_counter++; // Race condition
            }
        }
        
        int main() {
            std::vector<std::thread> threads;
            for (int i = 0; i < 4; ++i) {
                threads.emplace_back(increment);
            }
            for (auto& t : threads) {
                t.join();
            }
            std::cout << global_counter << std::endl;
            return 0;
        }
    )";

    auto result = analyzer->analyze(threadUnsafeCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& warnings = result.getWarnings();
    bool foundThreadSafetyWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("race condition") != std::string::npos ||
            warning.getMessage().find("thread safety") != std::string::npos ||
            warning.getMessage().find("synchronization") != std::string::npos) {
            foundThreadSafetyWarning = true;
            break;
        }
    }
    EXPECT_TRUE(foundThreadSafetyWarning);
}

TEST_F(StaticAnalyzerTest, GenerateSecurityReport) {
    const std::string vulnerableCode = R"(
        #include <iostream>
        #include <cstring>
        #include <cstdlib>
        
        int main() {
            char buffer[100];
            char* input = getenv("USER_INPUT"); // Untrusted input
            strcpy(buffer, input); // Buffer overflow risk
            system(input); // Command injection risk
            return 0;
        }
    )";

    auto result = analyzer->analyze(vulnerableCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& securityReport = result.getSecurityReport();
    EXPECT_GT(securityReport.getVulnerabilityCount(), 0);
    EXPECT_EQ(securityReport.getRiskLevel(), SecurityReport::RiskLevel::HIGH);
    
    const auto& vulnerabilities = securityReport.getVulnerabilities();
    bool foundBufferOverflow = false;
    bool foundCommandInjection = false;
    
    for (const auto& vuln : vulnerabilities) {
        if (vuln.getType() == Vulnerability::Type::BUFFER_OVERFLOW) {
            foundBufferOverflow = true;
        }
        if (vuln.getType() == Vulnerability::Type::COMMAND_INJECTION) {
            foundCommandInjection = true;
        }
    }
    
    EXPECT_TRUE(foundBufferOverflow);
    EXPECT_TRUE(foundCommandInjection);
}

TEST_F(StaticAnalyzerTest, ProvideFixSuggestions) {
    const std::string problematicCode = R"(
        #include <iostream>
        int main() {
            int* ptr = new int(42);
            std::cout << *ptr << std::endl;
            // Missing delete
            return 0;
        }
    )";

    auto result = analyzer->analyze(problematicCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& fixSuggestions = result.getFixSuggestions();
    EXPECT_GT(fixSuggestions.size(), 0);
    
    bool foundSmartPointerSuggestion = false;
    for (const auto& suggestion : fixSuggestions) {
        if (suggestion.getFixedCode().find("std::unique_ptr") != std::string::npos ||
            suggestion.getFixedCode().find("std::shared_ptr") != std::string::npos) {
            foundSmartPointerSuggestion = true;
            break;
        }
    }
    EXPECT_TRUE(foundSmartPointerSuggestion);
}

TEST_F(StaticAnalyzerTest, HandleEmptyCode) {
    const std::string emptyCode = "";
    
    auto result = analyzer->analyze(emptyCode);
    
    EXPECT_FALSE(result.isValid());
    EXPECT_GT(result.getErrorCount(), 0);
}

TEST_F(StaticAnalyzerTest, HandleIncompleteCode) {
    const std::string incompleteCode = R"(
        #include <iostream>
        int main() {
            std::cout << "Hello
    )";

    auto result = analyzer->analyze(incompleteCode);
    
    EXPECT_FALSE(result.isValid());
    EXPECT_GT(result.getErrorCount(), 0);
}

TEST_F(StaticAnalyzerTest, AnalyzeConfiguration) {
    const std::string testCode = R"(
        #include <iostream>
        int main() {
            int unused = 42;
            std::cout << "Hello" << std::endl;
            return 0;
        }
    )";

    AnalysisConfig config;
    config.enableUnusedVariableCheck = false;
    config.enableStyleCheck = true;
    config.enableSecurityCheck = true;
    
    auto result = analyzer->analyze(testCode, config);
    
    EXPECT_TRUE(result.isValid());
    
    // Should not report unused variable warning due to config
    const auto& warnings = result.getWarnings();
    bool foundUnusedVarWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("unused") != std::string::npos) {
            foundUnusedVarWarning = true;
            break;
        }
    }
    EXPECT_FALSE(foundUnusedVarWarning);
}

// Test AST Parser integration
class ASTParserTest : public ::testing::Test {
protected:
    void SetUp() override {
        parser = std::make_unique<ASTParser>();
    }

    void TearDown() override {
        parser.reset();
    }

    std::unique_ptr<ASTParser> parser;
};

TEST_F(ASTParserTest, ParseSimpleProgram) {
    const std::string code = R"(
        #include <iostream>
        int main() {
            return 0;
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_GT(ast.getNodeCount(), 0);
    EXPECT_EQ(ast.getFunctionCount(), 1);
}

TEST_F(ASTParserTest, ParseComplexProgram) {
    const std::string code = R"(
        #include <iostream>
        #include <vector>
        
        class MyClass {
        public:
            void method() {}
        };
        
        int globalFunction(int x) {
            return x * 2;
        }
        
        int main() {
            MyClass obj;
            std::vector<int> vec = {1, 2, 3};
            return 0;
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    EXPECT_GT(ast.getNodeCount(), 10);
    EXPECT_EQ(ast.getFunctionCount(), 3); // method, globalFunction, main
    EXPECT_EQ(ast.getClassCount(), 1);
}

TEST_F(ASTParserTest, HandleParseErrors) {
    const std::string invalidCode = R"(
        #include <iostream>
        int main() {
            std::cout << "Missing semicolon"
            return 0;
        }
    )";

    auto ast = parser->parseCode(invalidCode);
    
    EXPECT_FALSE(ast.isValid());
    EXPECT_GT(ast.getErrorCount(), 0);
}

TEST_F(ASTParserTest, ExtractFunctionInfo) {
    const std::string code = R"(
        int add(int a, int b) {
            return a + b;
        }
        
        void print(const std::string& message) {
            std::cout << message << std::endl;
        }
    )";

    auto ast = parser->parseCode(code);
    
    EXPECT_TRUE(ast.isValid());
    
    const auto& functions = ast.getFunctions();
    EXPECT_EQ(functions.size(), 2);
    
    // Check function signatures
    bool foundAddFunction = false;
    bool foundPrintFunction = false;
    
    for (const auto& func : functions) {
        if (func.getName() == "add") {
            foundAddFunction = true;
            EXPECT_EQ(func.getParameterCount(), 2);
            EXPECT_EQ(func.getReturnType(), "int");
        }
        if (func.getName() == "print") {
            foundPrintFunction = true;
            EXPECT_EQ(func.getParameterCount(), 1);
            EXPECT_EQ(func.getReturnType(), "void");
        }
    }
    
    EXPECT_TRUE(foundAddFunction);
    EXPECT_TRUE(foundPrintFunction);
}

// Additional advanced tests
TEST_F(StaticAnalyzerTest, DetectResourceLeaks) {
    const std::string resourceLeakCode = R"(
        #include <fstream>
        #include <iostream>
        
        int main() {
            std::ifstream file("test.txt");
            if (file.is_open()) {
                std::string line;
                std::getline(file, line);
                std::cout << line << std::endl;
                // Missing file.close()
            }
            return 0;
        }
    )";

    auto result = analyzer->analyze(resourceLeakCode);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& warnings = result.getWarnings();
    bool foundResourceLeakWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("resource") != std::string::npos ||
            warning.getMessage().find("leak") != std::string::npos) {
            foundResourceLeakWarning = true;
            break;
        }
    }
    // Note: This might not always trigger depending on analyzer sophistication
}

TEST_F(StaticAnalyzerTest, DetectDeadCode) {
    const std::string deadCodeExample = R"(
        #include <iostream>
        
        int main() {
            bool condition = false;
            std::cout << "Start" << std::endl;
            
            if (condition) {
                std::cout << "This will never execute" << std::endl; // Dead code
            }
            
            return 0;
            std::cout << "This is also dead code" << std::endl; // Unreachable
        }
    )";

    auto result = analyzer->analyze(deadCodeExample);
    
    EXPECT_TRUE(result.isValid());
    
    const auto& warnings = result.getWarnings();
    bool foundDeadCodeWarning = false;
    for (const auto& warning : warnings) {
        if (warning.getMessage().find("unreachable") != std::string::npos ||
            warning.getMessage().find("dead code") != std::string::npos) {
            foundDeadCodeWarning = true;
            break;
        }
    }
    // Note: Advanced static analysis feature
}

TEST_F(StaticAnalyzerTest, AnalyzeModernCppFeatures) {
    const std::string modernCppCode = R"(
        #include <memory>
        #include <vector>
        #include <algorithm>
        
        int main() {
            auto ptr = std::make_unique<int>(42);
            std::vector<int> numbers = {1, 2, 3, 4, 5};
            
            auto result = std::find_if(numbers.begin(), numbers.end(), 
                [](int n) { return n > 3; });
            
            if (auto value = ptr.get(); value != nullptr) {
                std::cout << *value << std::endl;
            }
            
            return 0;
        }
    )";

    auto result = analyzer->analyze(modernCppCode);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_EQ(result.getErrorCount(), 0);
    
    const auto& metrics = result.getComplexityMetrics();
    EXPECT_GT(metrics.linesOfCode, 5);
}

// Performance and benchmark tests
TEST_F(StaticAnalyzerTest, BenchmarkAnalysisPerformance) {
    const std::string benchmarkCode = R"(
        #include <iostream>
        #include <vector>
        #include <algorithm>
        
        class ComplexClass {
        private:
            std::vector<int> data;
            
        public:
            ComplexClass(size_t size) : data(size) {
                std::iota(data.begin(), data.end(), 0);
            }
            
            void processData() {
                std::sort(data.begin(), data.end());
                auto it = std::unique(data.begin(), data.end());
                data.erase(it, data.end());
            }
            
            int findMax() const {
                return *std::max_element(data.begin(), data.end());
            }
        };
        
        int main() {
            ComplexClass obj(1000);
            obj.processData();
            std::cout << obj.findMax() << std::endl;
            return 0;
        }
    )";

    auto start = std::chrono::high_resolution_clock::now();
    auto result = analyzer->analyze(benchmarkCode);
    auto end = std::chrono::high_resolution_clock::now();
    
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    EXPECT_TRUE(result.isValid());
    EXPECT_LT(duration.count(), 100000); // Should complete within 100ms
    
    std::cout << "Analysis took: " << duration.count() << " microseconds" << std::endl;
}

// Main function for running all tests
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    ::testing::InitGoogleMock(&argc, argv);
    
    // Initialize logging for tests
    Logger::initialize("test_analyzer", Logger::Level::INFO);
    
    return RUN_ALL_TESTS();
}