// File: cpp-engine/include/server.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <atomic>
#include <thread>
#include <functional>
#include <future>

#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <nlohmann/json.hpp>

namespace CppMasteryEngine {

    /**
     * Server configuration structure
     */
    struct ServerConfig {
        std::string host = "0.0.0.0";
        int port = 9000;
        int worker_threads = 4;
        size_t max_memory_mb = 512;
        int max_execution_time_seconds = 30;
        std::string temp_directory = "/tmp/cpp-sandbox";
        std::vector<std::string> allowed_includes;
        bool enable_cors = true;
        bool enable_ssl = false;
        std::string ssl_cert_file;
        std::string ssl_key_file;
        int max_concurrent_executions = 10;
        bool enable_analysis = true;
        bool enable_visualization = true;
    };

    /**
     * HTTP request context
     */
    struct RequestContext {
        std::string method;
        std::string path;
        std::string query_string;
        std::string body;
        std::map<std::string, std::string> headers;
        std::string client_ip;
        std::string request_id;
        std::chrono::steady_clock::time_point start_time;
    };

    /**
     * HTTP response structure
     */
    struct Response {
        int status_code = 200;
        std::string body;
        std::map<std::string, std::string> headers;
        
        Response() {
            headers["Content-Type"] = "application/json";
            headers["Access-Control-Allow-Origin"] = "*";
            headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        }
    };

    /**
     * Code execution request structure
     */
    struct ExecutionRequest {
        std::string code;
        std::string language;
        std::string input;
        std::vector<std::string> compiler_flags;
        int timeout_seconds = 10;
        std::string execution_id;
    };

    /**
     * Code execution result structure
     */
    struct ExecutionResult {
        bool success = false;
        std::string output;
        std::string error;
        std::string compilation_output;
        std::vector<std::string> warnings;
        double execution_time_ms = 0.0;
        size_t memory_used_bytes = 0;
        int exit_code = -1;
        std::string execution_id;
    };

    /**
     * Code analysis request structure
     */
    struct AnalysisRequest {
        std::string code;
        std::string language;
        std::vector<std::string> analysis_types;
        std::string analysis_id;
    };

    /**
     * Analysis issue structure
     */
    struct AnalysisIssue {
        std::string type;         // error, warning, info, style
        std::string severity;     // high, medium, low
        int line = 0;
        int column = 0;
        std::string message;
        std::string rule;
        std::string suggestion;
    };

    /**
     * Code suggestion structure
     */
    struct CodeSuggestion {
        std::string type;         // performance, readability, best_practice, modern_cpp
        std::string title;
        std::string description;
        int line = 0;
        std::string original_code;
        std::string suggested_code;
        std::string impact;       // high, medium, low
    };

    /**
     * Code metrics structure
     */
    struct CodeMetrics {
        int lines_of_code = 0;
        int functions_count = 0;
        int classes_count = 0;
        int includes_count = 0;
        double comments_ratio = 0.0;
        int duplicated_lines = 0;
    };

    /**
     * Complexity metrics structure
     */
    struct ComplexityMetrics {
        int cyclomatic_complexity = 1;
        double cognitive_complexity = 1.0;
        int nesting_depth = 0;
        double maintainability_index = 100.0;
    };

    /**
     * Code analysis result structure
     */
    struct AnalysisResult {
        bool success = false;
        std::vector<AnalysisIssue> issues;
        std::vector<CodeSuggestion> suggestions;
        CodeMetrics metrics;
        ComplexityMetrics complexity;
        double analysis_time_ms = 0.0;
        std::string analysis_id;
    };

    /**
     * Visualization request structure
     */
    struct VisualizationRequest {
        std::string code;
        std::string type;  // ast, memory, execution_flow, call_graph
        std::string visualization_id;
    };

    /**
     * Visualization data structure
     */
    struct VisualizationData {
        std::string type;
        nlohmann::json data;
        struct {
            int node_count = 0;
            std::string complexity;
            std::string generated_at;
        } metadata;
    };

    // Forward declarations
    class CodeExecutor;
    class CodeAnalyzer;
    class CodeVisualizer;
    class RequestHandler;
    class SecurityManager;

    /**
     * Main HTTP server class for C++ Mastery Engine
     */
    class Server {
    public:
        explicit Server(const ServerConfig& config);
        ~Server();

        // Server lifecycle
        bool initialize();
        bool start();
        void run();
        void stop();
        bool is_running() const { return running_; }

        // Configuration
        const ServerConfig& config() const { return config_; }
        void update_config(const ServerConfig& config);

        // Health and statistics
        nlohmann::json get_health_status() const;
        nlohmann::json get_statistics() const;

    private:
        // Core components
        ServerConfig config_;
        std::atomic<bool> running_{false};
        std::atomic<bool> shutdown_requested_{false};

        // Network components
        boost::asio::io_context io_context_;
        std::unique_ptr<boost::asio::ip::tcp::acceptor> acceptor_;
        std::vector<std::thread> worker_threads_;

        // Service components
        std::unique_ptr<CodeExecutor> code_executor_;
        std::unique_ptr<CodeAnalyzer> code_analyzer_;
        std::unique_ptr<CodeVisualizer> code_visualizer_;
        std::unique_ptr<RequestHandler> request_handler_;
        std::unique_ptr<SecurityManager> security_manager_;

        // Statistics
        mutable std::mutex stats_mutex_;
        struct {
            std::atomic<uint64_t> total_requests{0};
            std::atomic<uint64_t> successful_requests{0};
            std::atomic<uint64_t> failed_requests{0};
            std::atomic<uint64_t> active_connections{0};
            std::atomic<uint64_t> total_executions{0};
            std::atomic<uint64_t> successful_executions{0};
            std::atomic<uint64_t> failed_executions{0};
            std::atomic<uint64_t> total_analyses{0};
            std::chrono::steady_clock::time_point start_time;
        } stats_;

        // Private methods
        void accept_connections();
        void handle_connection(std::shared_ptr<boost::asio::ip::tcp::socket> socket);
        void process_request(const RequestContext& context, Response& response);
        
        // Route handlers
        void handle_health(const RequestContext& context, Response& response);
        void handle_stats(const RequestContext& context, Response& response);
        void handle_execute(const RequestContext& context, Response& response);
        void handle_analyze(const RequestContext& context, Response& response);
        void handle_visualize(const RequestContext& context, Response& response);
        void handle_suggestions(const RequestContext& context, Response& response);
        void handle_templates(const RequestContext& context, Response& response);
        void handle_options(const RequestContext& context, Response& response);
        void handle_not_found(const RequestContext& context, Response& response);

        // Utility methods
        std::string generate_request_id() const;
        void log_request(const RequestContext& context, const Response& response) const;
        bool validate_request(const RequestContext& context, Response& response) const;
        void set_cors_headers(Response& response) const;
        void cleanup_temp_files() const;
        
        // JSON serialization helpers
        nlohmann::json execution_result_to_json(const ExecutionResult& result) const;
        nlohmann::json analysis_result_to_json(const AnalysisResult& result) const;
        nlohmann::json visualization_data_to_json(const VisualizationData& data) const;
        
        ExecutionRequest parse_execution_request(const std::string& json_body) const;
        AnalysisRequest parse_analysis_request(const std::string& json_body) const;
        VisualizationRequest parse_visualization_request(const std::string& json_body) const;

        // Error handling
        void handle_error(const std::exception& e, const RequestContext& context, Response& response) const;
        void send_error_response(int status_code, const std::string& message, 
                                const std::string& details, Response& response) const;
    };

    /**
     * RAII helper for managing server lifecycle
     */
    class ServerManager {
    public:
        explicit ServerManager(const ServerConfig& config);
        ~ServerManager();

        Server& server() { return *server_; }
        const Server& server() const { return *server_; }

        bool start();
        void stop();
        void wait_for_shutdown();

    private:
        std::unique_ptr<Server> server_;
        std::thread server_thread_;
        std::atomic<bool> shutdown_signaled_{false};
    };

} // namespace CppMasteryEngine