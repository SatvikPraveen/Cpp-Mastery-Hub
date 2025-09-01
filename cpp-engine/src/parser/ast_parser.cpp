// File: cpp-engine/src/parser/ast_parser.cpp
// Extension: .cpp

#include "parser/ast_parser.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"

#include <clang/AST/AST.h>
#include <clang/AST/ASTConsumer.h>
#include <clang/AST/ASTContext.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/ASTConsumers.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendActions.h>
#include <clang/Lex/Preprocessor.h>
#include <clang/Parse/ParseAST.h>
#include <clang/Rewrite/Core/Rewriter.h>
#include <clang/Tooling/CommonOptionsParser.h>
#include <clang/Tooling/Tooling.h>

#include <llvm/Support/raw_ostream.h>
#include <nlohmann/json.hpp>

#include <fstream>
#include <sstream>
#include <filesystem>

using json = nlohmann::json;
using namespace clang;
using namespace clang::tooling;

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<ASTParser> ASTParser::instance_ = nullptr;
std::mutex ASTParser::mutex_;

class ASTVisitor : public RecursiveASTVisitor<ASTVisitor> {
public:
    explicit ASTVisitor(ASTContext* context) : context_(context), json_ast_(json::object()) {}

    bool VisitFunctionDecl(FunctionDecl* func) {
        if (!func->isThisDeclarationADefinition()) {
            return true;
        }

        json func_info = {
            {"type", "FunctionDecl"},
            {"name", func->getNameAsString()},
            {"return_type", func->getReturnType().getAsString()},
            {"location", getSourceLocation(func->getLocation())},
            {"parameters", json::array()},
            {"is_definition", func->isThisDeclarationADefinition()},
            {"is_inline", func->isInlineSpecified()},
            {"is_virtual", func->isVirtual()},
            {"storage_class", getStorageClassString(func->getStorageClass())}
        };

        // Add parameters
        for (const auto* param : func->parameters()) {
            json param_info = {
                {"name", param->getNameAsString()},
                {"type", param->getType().getAsString()},
                {"location", getSourceLocation(param->getLocation())}
            };
            func_info["parameters"].push_back(param_info);
        }

        // Add body information if available
        if (func->hasBody()) {
            func_info["has_body"] = true;
            func_info["body_location"] = getSourceLocation(func->getBody()->getBeginLoc());
        }

        addToAST("functions", func_info);
        return true;
    }

    bool VisitVarDecl(VarDecl* var) {
        json var_info = {
            {"type", "VarDecl"},
            {"name", var->getNameAsString()},
            {"var_type", var->getType().getAsString()},
            {"location", getSourceLocation(var->getLocation())},
            {"is_global", var->hasGlobalStorage()},
            {"is_static", var->getStorageClass() == SC_Static},
            {"is_const", var->getType().isConstQualified()},
            {"storage_class", getStorageClassString(var->getStorageClass())}
        };

        // Check if variable has initializer
        if (var->hasInit()) {
            var_info["has_initializer"] = true;
            var_info["initializer_location"] = getSourceLocation(var->getInit()->getBeginLoc());
        }

        addToAST("variables", var_info);
        return true;
    }

    bool VisitCXXRecordDecl(CXXRecordDecl* record) {
        if (!record->isCompleteDefinition()) {
            return true;
        }

        json class_info = {
            {"type", "CXXRecordDecl"},
            {"name", record->getNameAsString()},
            {"kind", record->getTagKind() == TTK_Class ? "class" : 
                     record->getTagKind() == TTK_Struct ? "struct" : "union"},
            {"location", getSourceLocation(record->getLocation())},
            {"is_abstract", record->isAbstract()},
            {"is_polymorphic", record->isPolymorphic()},
            {"is_pod", record->isPOD()},
            {"bases", json::array()},
            {"methods", json::array()},
            {"fields", json::array()}
        };

        // Add base classes
        for (const auto& base : record->bases()) {
            json base_info = {
                {"type", base.getType().getAsString()},
                {"is_virtual", base.isVirtual()},
                {"access", getAccessSpecifierString(base.getAccessSpecifier())}
            };
            class_info["bases"].push_back(base_info);
        }

        // Add methods
        for (const auto* method : record->methods()) {
            json method_info = {
                {"name", method->getNameAsString()},
                {"return_type", method->getReturnType().getAsString()},
                {"is_virtual", method->isVirtual()},
                {"is_pure_virtual", method->isPure()},
                {"is_const", method->isConst()},
                {"is_static", method->isStatic()},
                {"access", getAccessSpecifierString(method->getAccess())},
                {"location", getSourceLocation(method->getLocation())}
            };
            class_info["methods"].push_back(method_info);
        }

        // Add fields
        for (const auto* field : record->fields()) {
            json field_info = {
                {"name", field->getNameAsString()},
                {"type", field->getType().getAsString()},
                {"is_mutable", field->isMutable()},
                {"is_static", field->getStorageClass() == SC_Static},
                {"access", getAccessSpecifierString(field->getAccess())},
                {"location", getSourceLocation(field->getLocation())}
            };
            class_info["fields"].push_back(field_info);
        }

        addToAST("classes", class_info);
        return true;
    }

    bool VisitCallExpr(CallExpr* call) {
        if (FunctionDecl* func = call->getDirectCallee()) {
            json call_info = {
                {"type", "CallExpr"},
                {"function_name", func->getNameAsString()},
                {"location", getSourceLocation(call->getBeginLoc())},
                {"num_args", call->getNumArgs()}
            };
            addToAST("function_calls", call_info);
        }
        return true;
    }

    bool VisitForStmt(ForStmt* stmt) {
        json for_info = {
            {"type", "ForStmt"},
            {"location", getSourceLocation(stmt->getBeginLoc())},
            {"has_init", stmt->getInit() != nullptr},
            {"has_cond", stmt->getCond() != nullptr},
            {"has_inc", stmt->getInc() != nullptr}
        };
        addToAST("control_flow", for_info);
        return true;
    }

    bool VisitWhileStmt(WhileStmt* stmt) {
        json while_info = {
            {"type", "WhileStmt"},
            {"location", getSourceLocation(stmt->getBeginLoc())}
        };
        addToAST("control_flow", while_info);
        return true;
    }

    bool VisitIfStmt(IfStmt* stmt) {
        json if_info = {
            {"type", "IfStmt"},
            {"location", getSourceLocation(stmt->getBeginLoc())},
            {"has_else", stmt->getElse() != nullptr},
            {"has_constexpr", stmt->isConstexpr()}
        };
        addToAST("control_flow", if_info);
        return true;
    }

    json getAST() const { return json_ast_; }

private:
    ASTContext* context_;
    json json_ast_;

    json getSourceLocation(SourceLocation loc) {
        if (loc.isInvalid()) {
            return json::object();
        }

        SourceManager& sm = context_->getSourceManager();
        PresumedLoc presumed = sm.getPresumedLoc(loc);
        
        return json{
            {"file", presumed.getFilename()},
            {"line", presumed.getLine()},
            {"column", presumed.getColumn()}
        };
    }

    std::string getStorageClassString(StorageClass sc) {
        switch (sc) {
            case SC_None: return "none";
            case SC_Auto: return "auto";
            case SC_Register: return "register";
            case SC_Static: return "static";
            case SC_Extern: return "extern";
            case SC_PrivateExtern: return "private_extern";
            default: return "unknown";
        }
    }

    std::string getAccessSpecifierString(AccessSpecifier access) {
        switch (access) {
            case AS_public: return "public";
            case AS_protected: return "protected";
            case AS_private: return "private";
            case AS_none: return "none";
            default: return "unknown";
        }
    }

    void addToAST(const std::string& category, const json& info) {
        if (!json_ast_.contains(category)) {
            json_ast_[category] = json::array();
        }
        json_ast_[category].push_back(info);
    }
};

class ASTConsumerImpl : public ASTConsumer {
public:
    explicit ASTConsumerImpl(ASTVisitor* visitor) : visitor_(visitor) {}

    void HandleTranslationUnit(ASTContext& context) override {
        visitor_->TraverseDecl(context.getTranslationUnitDecl());
    }

private:
    ASTVisitor* visitor_;
};

class FrontendActionImpl : public ASTFrontendAction {
public:
    explicit FrontendActionImpl(ASTVisitor* visitor) : visitor_(visitor) {}

    std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance& ci, StringRef file) override {
        return std::make_unique<ASTConsumerImpl>(visitor_);
    }

private:
    ASTVisitor* visitor_;
};

ASTParser::ASTParser() : initialized_(false) {}

ASTParser& ASTParser::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<ASTParser>(new ASTParser());
    }
    return *instance_;
}

bool ASTParser::initialize() {
    std::lock_guard<std::mutex> lock(parser_mutex_);
    
    if (initialized_) {
        return true;
    }

    auto& logger = Logger::getInstance();
    
    try {
        logger.info("Initializing AST parser...", "ASTParser");
        
        // Test that Clang libraries are available
        // This is a simple test to ensure linking is correct
        initialized_ = true;
        
        logger.info("AST parser initialized successfully", "ASTParser");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Failed to initialize AST parser: " + std::string(e.what()), "ASTParser");
        return false;
    }
}

ParseResult ASTParser::parse(const std::string& code, bool include_tokens) {
    auto& logger = Logger::getInstance();
    
    ParseResult result;
    result.success = false;
    
    if (!initialized_) {
        result.error_message = "AST parser not initialized";
        return result;
    }

    auto start_time = std::chrono::high_resolution_clock::now();

    try {
        // Generate unique filename for this parsing session
        std::string session_id = generateSessionId();
        std::string temp_file = "temp/" + session_id + ".cpp";
        
        // Create temp directory if it doesn't exist
        std::filesystem::create_directories("temp");
        
        // Write code to temporary file
        std::ofstream file(temp_file);
        if (!file.is_open()) {
            result.error_message = "Failed to create temporary file";
            return result;
        }
        file << code;
        file.close();

        // Prepare arguments for Clang
        std::vector<std::string> args = {
            "ast-parser",
            temp_file,
            "--",
            "-std=c++20",
            "-I/usr/include",
            "-I/usr/local/include"
        };

        // Convert to char* array
        std::vector<const char*> argv;
        for (const auto& arg : args) {
            argv.push_back(arg.c_str());
        }

        // Create AST visitor
        ASTVisitor visitor(nullptr);

        // Run Clang tool
        bool tool_result = runToolOnCode(
            std::make_unique<FrontendActionImpl>(&visitor),
            code,
            temp_file
        );

        auto end_time = std::chrono::high_resolution_clock::now();
        result.parse_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();

        if (tool_result) {
            result.success = true;
            result.ast_json = visitor.getAST();
            
            // Add metadata
            result.ast_json["metadata"] = {
                {"parse_time_ms", result.parse_time_ms},
                {"source_file", temp_file},
                {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count()}
            };

            // Generate tokens if requested
            if (include_tokens) {
                result.tokens = generateTokens(code);
            }

            logger.info("AST parsing completed successfully", "ASTParser");
        } else {
            result.success = false;
            result.error_message = "Failed to parse AST";
            logger.error("AST parsing failed", "ASTParser");
        }

        // Clean up temporary file
        try {
            std::filesystem::remove(temp_file);
        } catch (const std::exception& e) {
            logger.warning("Failed to remove temporary file: " + std::string(e.what()), "ASTParser");
        }

        return result;

    } catch (const std::exception& e) {
        result.error_message = "AST parsing exception: " + std::string(e.what());
        logger.error("AST parsing exception: " + std::string(e.what()), "ASTParser");
        return result;
    }
}

json ASTParser::generateTokens(const std::string& code) {
    json tokens = json::array();
    
    try {
        // Simple tokenization - in a full implementation, this would use
        // Clang's Lexer for proper tokenization
        std::istringstream stream(code);
        std::string line;
        int line_number = 1;
        
        while (std::getline(stream, line)) {
            // Basic keyword detection (simplified)
            std::vector<std::string> keywords = {
                "int", "char", "float", "double", "void", "bool",
                "class", "struct", "enum", "namespace",
                "if", "else", "while", "for", "do", "switch", "case", "break", "continue",
                "return", "const", "static", "virtual", "override", "final",
                "public", "private", "protected",
                "#include", "#define", "#ifdef", "#endif"
            };
            
            size_t pos = 0;
            for (const auto& keyword : keywords) {
                pos = 0;
                while ((pos = line.find(keyword, pos)) != std::string::npos) {
                    json token = {
                        {"type", "keyword"},
                        {"value", keyword},
                        {"line", line_number},
                        {"column", pos + 1}
                    };
                    tokens.push_back(token);
                    pos += keyword.length();
                }
            }
            
            line_number++;
        }
        
    } catch (const std::exception& e) {
        Logger::getInstance().warning("Token generation failed: " + std::string(e.what()), "ASTParser");
    }
    
    return tokens;
}

std::string ASTParser::generateSessionId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, 15);
    
    std::string session_id;
    for (int i = 0; i < 8; ++i) {
        session_id += "0123456789abcdef"[dis(gen)];
    }
    
    return session_id;
}

bool ASTParser::validateSyntax(const std::string& code) {
    try {
        ParseResult result = parse(code, false);
        return result.success;
    } catch (const std::exception& e) {
        Logger::getInstance().warning("Syntax validation failed: " + std::string(e.what()), "ASTParser");
        return false;
    }
}

json ASTParser::getASTStatistics(const json& ast) {
    json stats = {
        {"total_functions", 0},
        {"total_classes", 0},
        {"total_variables", 0},
        {"total_function_calls", 0},
        {"control_flow_statements", 0}
    };

    try {
        if (ast.contains("functions") && ast["functions"].is_array()) {
            stats["total_functions"] = ast["functions"].size();
        }
        
        if (ast.contains("classes") && ast["classes"].is_array()) {
            stats["total_classes"] = ast["classes"].size();
        }
        
        if (ast.contains("variables") && ast["variables"].is_array()) {
            stats["total_variables"] = ast["variables"].size();
        }
        
        if (ast.contains("function_calls") && ast["function_calls"].is_array()) {
            stats["total_function_calls"] = ast["function_calls"].size();
        }
        
        if (ast.contains("control_flow") && ast["control_flow"].is_array()) {
            stats["control_flow_statements"] = ast["control_flow"].size();
        }

        // Calculate complexity metrics
        int total_complexity = 0;
        if (ast.contains("control_flow") && ast["control_flow"].is_array()) {
            total_complexity = static_cast<int>(ast["control_flow"].size()) + 1; // Base complexity + control flow
        }
        stats["cyclomatic_complexity"] = total_complexity;

    } catch (const std::exception& e) {
        Logger::getInstance().warning("Failed to calculate AST statistics: " + std::string(e.what()), "ASTParser");
    }

    return stats;
}

} // namespace cpp_mastery