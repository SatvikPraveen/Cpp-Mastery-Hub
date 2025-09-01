// File: cpp-engine/src/server.cpp
// Extension: .cpp

#include "server.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"
#include "analyzer/code_analyzer.hpp"
#include "parser/ast_parser.hpp"
#include "compiler/execution_engine.hpp"
#include "visualizer/memory_visualizer.hpp"

#include <nlohmann/json.hpp>
#include <httplib.h>
#include <chrono>
#include <thread>
#include <fstream>
#include <sstream>
#include <regex>
#include <iomanip>

using json = nlohmann::json;

namespace cpp_mastery {

Server::Server(const std::string& host, int port)
    : host_(host), port_(port), running_(false) {
    server_ = std::make_unique<httplib::Server>();
}

Server::~Server() {
    stop();
}

bool Server::initialize() {
    auto& logger = Logger::getInstance();
    
    try {
        setupRoutes();
        setupMiddleware();
        setupErrorHandlers();
        
        logger.info("✅ Server initialized successfully");
        return true;
    } catch (const std::exception& e) {
        logger.error("❌ Server initialization failed: " + std::string(e.what()));
        return false;
    }
}

void Server::start() {
    auto& logger = Logger::getInstance();
    
    if (running_) {
        logger.warning("⚠️ Server is already running");
        return;
    }
    
    running_ = true;
    start_time_ = std::chrono::system_clock::now();
    
    logger.info("🚀 Starting server on " + host_ + ":" + std::to_string(port_));
    
    if (!server_->listen(host_.c_str(), port_)) {
        logger.error("❌ Failed to start server on " + host_ + ":" + std::to_string(port_));
        running_ = false;
        throw std::runtime_error("Failed to start HTTP server");
    }
}

void Server::stop() {
    auto& logger = Logger::getInstance();
    
    if (!running_) {
        return;
    }
    
    logger.info("🛑 Stopping server...");
    
    running_ = false;
    
    if (server_) {
        server_->stop();
    }
    
    logger.info("✅ Server stopped");
}

void Server::setupRoutes() {
    // Health check endpoint
    server_->Get("/health", [this](const httplib::Request& req, httplib::Response& res) {
        handleHealthCheck(req, res);
    });
    
    // API documentation endpoint
    server_->Get("/", [this](const httplib::Request& req, httplib::Response& res) {
        handleApiDocs(req, res);
    });
    
    // Code compilation endpoint
    server_->Post("/api/compile", [this](const httplib::Request& req, httplib::Response& res) {
        handleCompile(req, res);
    });
    
    // Code execution endpoint
    server_->Post("/api/execute", [this](const httplib::Request& req, httplib::Response& res) {
        handleExecute(req, res);
    });
    
    // Code analysis endpoint
    server_->Post("/api/analyze", [this](const httplib::Request& req, httplib::Response& res) {
        handleAnalyze(req, res);
    });
    
    // Memory visualization endpoint
    server_->Post("/api/visualize", [this](const httplib::Request& req, httplib::Response& res) {
        handleVisualize(req, res);
    });
    
    // AST parsing endpoint
    server_->Post("/api/parse", [this](const httplib::Request& req, httplib::Response& res) {
        handleParse(req, res);
    });
    
    // Code formatting endpoint
    server_->Post("/api/format", [this](const httplib::Request& req, httplib::Response& res) {
        handleFormat(req, res);
    });
    
    // System metrics endpoint
    server_->Get("/api/metrics", [this](const httplib::Request& req, httplib::Response& res) {
        handleMetrics(req, res);
    });
}

void Server::setupMiddleware() {
    // CORS middleware
    server_->set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        return httplib::Server::HandlerResponse::Unhandled;
    });
    
    // OPTIONS handler for preflight requests
    server_->Options(".*", [](const httplib::Request& req, httplib::Response& res) {
        return;
    });
    
    // Request logging middleware
    server_->set_logger([](const httplib::Request& req, const httplib::Response& res) {
        auto& logger = Logger::getInstance();
        std::ostringstream oss;
        oss << req.method << " " << req.path;
        if (!req.params.empty()) {
            oss << "?";
            for (auto it = req.params.begin(); it != req.params.end(); ++it) {
                if (it != req.params.begin()) oss << "&";
                oss << it->first << "=" << it->second;
            }
        }
        oss << " - " << res.status;
        logger.info("📡 " + oss.str());
    });
}

void Server::setupErrorHandlers() {
    // 404 handler
    server_->set_error_handler([](const httplib::Request& req, httplib::Response& res) {
        json error_response = {
            {"error", "Not Found"},
            {"message", "The requested endpoint does not exist"},
            {"path", req.path},
            {"method", req.method},
            {"available_endpoints", {
                "/health",
                "/api/compile",
                "/api/execute", 
                "/api/analyze",
                "/api/visualize",
                "/api/parse",
                "/api/format",
                "/api/metrics"
            }}
        };
        
        res.status = 404;
        res.set_content(error_response.dump(2), "application/json");
    });
    
    // Exception handler
    server_->set_exception_handler([](const httplib::Request& req, httplib::Response& res, std::exception_ptr ep) {
        auto& logger = Logger::getInstance();
        
        try {
            std::rethrow_exception(ep);
        } catch (const std::exception& e) {
            logger.error("🚨 Exception in " + req.method + " " + req.path + ": " + e.what());
            
            json error_response = {
                {"error", "Internal Server Error"},
                {"message", "An unexpected error occurred"},
                {"path", req.path},
                {"method", req.method}
            };
            
            res.status = 500;
        } catch (...) {
            logger.error("🚨 Unknown exception in " + req.method + " " + req.path);
            
            json error_response = {
                {"error", "Internal Server Error"},
                {"message", "An unknown error occurred"},
                {"path", req.path},
                {"method", req.method}
            };
            
            res.status = 500;
            res.set_content(error_response.dump(2), "application/json");
        }
    });
}

void Server::handleHealthCheck(const httplib::Request& req, httplib::Response& res) {
    auto now = std::chrono::system_clock::now();
    auto uptime = std::chrono::duration_cast<std::chrono::seconds>(now - start_time_).count();
    
    json health = {
        {"status", "healthy"},
        {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count()},
        {"uptime_seconds", uptime},
        {"version", "1.0.0"},
        {"services", {
            {"analyzer", CodeAnalyzer::getInstance().isInitialized()},
            {"parser", ASTParser::getInstance().isInitialized()},
            {"executor", ExecutionEngine::getInstance().isInitialized()}
        }}
    };
    
    res.set_content(health.dump(2), "application/json");
}

void Server::handleApiDocs(const httplib::Request& req, httplib::Response& res) {
    std::string html = R"(
<!DOCTYPE html>
<html>
<head>
    <title>C++ Mastery Hub Engine API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { font-weight: bold; color: #2c5aa0; }
        .path { font-family: monospace; background: #e8e8e8; padding: 2px 5px; }
        code { background: #f0f0f0; padding: 2px 4px; }
    </style>
</head>
<body>
    <h1>C++ Mastery Hub Engine API</h1>
    <p>Advanced C++ code analysis, compilation, and execution engine.</p>
    
    <div class="endpoint">
        <div class="method">GET</div>
        <div class="path">/health</div>
        <p>Health check endpoint returning system status and uptime.</p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/compile</div>
        <p>Compile C++ code and return compilation results.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "options": {...}}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/execute</div>
        <p>Execute C++ code in a secure sandbox environment.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "input": "string", "options": {...}}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/analyze</div>
        <p>Perform static analysis on C++ code.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "analysis_type": "string"}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/visualize</div>
        <p>Generate memory and execution visualizations.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "visualization_type": "string"}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/parse</div>
        <p>Parse C++ code and return AST representation.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "include_tokens": boolean}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">POST</div>
        <div class="path">/api/format</div>
        <p>Format C++ code according to style guidelines.</p>
        <p><strong>Body:</strong> <code>{"code": "string", "style": "string"}</code></p>
    </div>
    
    <div class="endpoint">
        <div class="method">GET</div>
        <div class="path">/api/metrics</div>
        <p>Get system performance metrics and statistics.</p>
    </div>
</body>
</html>
    )";
    
    res.set_content(html, "text/html");
}

void Server::handleCompile(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        json options = request_json.value("options", json::object());
        
        auto& executor = ExecutionEngine::getInstance();
        auto result = executor.compile(code, options);
        
        json response = {
            {"success", result.success},
            {"executable_path", result.executable_path},
            {"compilation_time_ms", result.compilation_time_ms},
            {"warnings", result.warnings},
            {"errors", result.errors},
            {"compiler_output", result.compiler_output}
        };
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Compilation failed: " + std::string(e.what()));
    }
}

void Server::handleExecute(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        std::string input = request_json.value("input", "");
        json options = request_json.value("options", json::object());
        
        auto& executor = ExecutionEngine::getInstance();
        auto result = executor.execute(code, input, options);
        
        json response = {
            {"success", result.success},
            {"exit_code", result.exit_code},
            {"stdout", result.stdout},
            {"stderr", result.stderr},
            {"execution_time_ms", result.execution_time_ms},
            {"memory_usage_kb", result.memory_usage_kb},
            {"cpu_time_ms", result.cpu_time_ms}
        };
        
        if (!result.success) {
            response["error"] = result.error_message;
        }
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Execution failed: " + std::string(e.what()));
    }
}

void Server::handleAnalyze(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        std::string analysis_type = request_json.value("analysis_type", "full");
        
        auto& analyzer = CodeAnalyzer::getInstance();
        auto result = analyzer.analyze(code, analysis_type);
        
        json response = {
            {"success", true},
            {"analysis_type", analysis_type},
            {"metrics", result.metrics},
            {"issues", result.issues},
            {"suggestions", result.suggestions},
            {"complexity", result.complexity},
            {"performance_hints", result.performance_hints}
        };
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Analysis failed: " + std::string(e.what()));
    }
}

void Server::handleVisualize(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        std::string visualization_type = request_json.value("visualization_type", "memory");
        
        auto& visualizer = MemoryVisualizer::getInstance();
        auto result = visualizer.generateVisualization(code, visualization_type);
        
        json response = {
            {"success", true},
            {"visualization_type", visualization_type},
            {"data", result.visualization_data},
            {"metadata", result.metadata}
        };
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Visualization failed: " + std::string(e.what()));
    }
}

void Server::handleParse(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        bool include_tokens = request_json.value("include_tokens", false);
        
        auto& parser = ASTParser::getInstance();
        auto result = parser.parse(code, include_tokens);
        
        json response = {
            {"success", true},
            {"ast", result.ast_json},
            {"parse_time_ms", result.parse_time_ms}
        };
        
        if (include_tokens) {
            response["tokens"] = result.tokens;
        }
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Parsing failed: " + std::string(e.what()));
    }
}

void Server::handleFormat(const httplib::Request& req, httplib::Response& res) {
    try {
        auto request_json = json::parse(req.body);
        
        if (!request_json.contains("code")) {
            sendErrorResponse(res, 400, "Missing 'code' field in request body");
            return;
        }
        
        std::string code = request_json["code"];
        std::string style = request_json.value("style", "llvm");
        
        // Use clang-format for code formatting
        std::string formatted_code = formatCode(code, style);
        
        json response = {
            {"success", true},
            {"formatted_code", formatted_code},
            {"style", style}
        };
        
        res.set_content(response.dump(2), "application/json");
        
    } catch (const json::parse_error& e) {
        sendErrorResponse(res, 400, "Invalid JSON in request body");
    } catch (const std::exception& e) {
        sendErrorResponse(res, 500, "Formatting failed: " + std::string(e.what()));
    }
}

void Server::handleMetrics(const httplib::Request& req, httplib::Response& res) {
    auto now = std::chrono::system_clock::now();
    auto uptime = std::chrono::duration_cast<std::chrono::seconds>(now - start_time_).count();
    
    json metrics = {
        {"uptime_seconds", uptime},
        {"requests_served", request_count_},
        {"memory_usage", getMemoryUsage()},
        {"cpu_usage", getCpuUsage()},
        {"disk_usage", getDiskUsage()},
        {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count()}
    };
    
    res.set_content(metrics.dump(2), "application/json");
}

void Server::sendErrorResponse(httplib::Response& res, int status_code, const std::string& message) {
    json error = {
        {"error", true},
        {"status_code", status_code},
        {"message", message},
        {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count()}
    };
    
    res.status = status_code;
    res.set_content(error.dump(2), "application/json");
}

std::string Server::formatCode(const std::string& code, const std::string& style) {
    // Simple implementation using clang-format
    // In a real implementation, you would use the clang-format API
    
    // For now, return the original code with basic formatting
    std::string formatted = code;
    
    // Basic indentation and spacing fixes
    std::regex tab_regex("\t");
    formatted = std::regex_replace(formatted, tab_regex, "    ");
    
    return formatted;
}

long Server::getMemoryUsage() {
    // Platform-specific memory usage implementation
    // This is a simplified version
    return 0; // TODO: Implement actual memory usage detection
}

double Server::getCpuUsage() {
    // Platform-specific CPU usage implementation
    // This is a simplified version
    return 0.0; // TODO: Implement actual CPU usage detection
}

json Server::getDiskUsage() {
    json disk_info = {
        {"total_gb", 0},
        {"free_gb", 0},
        {"used_gb", 0}
    };
    
    try {
        auto space = std::filesystem::space(".");
        disk_info["total_gb"] = space.capacity / (1024 * 1024 * 1024);
        disk_info["free_gb"] = space.free / (1024 * 1024 * 1024);
        disk_info["used_gb"] = (space.capacity - space.free) / (1024 * 1024 * 1024);
    } catch (const std::exception& e) {
        Logger::getInstance().warning("Could not get disk usage: " + std::string(e.what()));
    }
    
    return disk_info;
}

} // namespace cpp_mastery