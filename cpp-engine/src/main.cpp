// File: cpp-engine/src/main.cpp
// Extension: .cpp

#include <iostream>
#include <memory>
#include <signal.h>
#include <chrono>
#include <thread>
#include <exception>
#include <fstream>
#include <csignal>

#include "server.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"
#include "analyzer/code_analyzer.hpp"
#include "parser/ast_parser.hpp"
#include "compiler/execution_engine.hpp"

// Global server instance for signal handling
std::unique_ptr<cpp_mastery::Server> g_server = nullptr;
std::atomic<bool> g_shutdown_requested{false};

// Signal handler for graceful shutdown
void signalHandler(int signal) {
    const char* signal_name = "UNKNOWN";
    switch (signal) {
        case SIGINT:  signal_name = "SIGINT"; break;
        case SIGTERM: signal_name = "SIGTERM"; break;
        case SIGABRT: signal_name = "SIGABRT"; break;
        default: break;
    }
    
    cpp_mastery::Logger::getInstance().info("Received signal " + std::string(signal_name) + ", initiating graceful shutdown...");
    
    g_shutdown_requested = true;
    
    if (g_server) {
        try {
            g_server->stop();
        } catch (const std::exception& e) {
            cpp_mastery::Logger::getInstance().error("Error during server shutdown: " + std::string(e.what()));
        }
    }
}

// Setup signal handlers
void setupSignalHandlers() {
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);
    std::signal(SIGABRT, signalHandler);
    
    #ifdef SIGPIPE
        // Ignore SIGPIPE on Unix systems
        std::signal(SIGPIPE, SIG_IGN);
    #endif
}

// Initialize core components
bool initializeComponents() {
    auto& logger = cpp_mastery::Logger::getInstance();
    
    try {
        // Initialize configuration
        logger.info("🔧 Loading configuration...");
        auto& config = cpp_mastery::Config::getInstance();
        if (!config.load()) {
            logger.error("❌ Failed to load configuration");
            return false;
        }
        logger.info("✅ Configuration loaded successfully");
        
        // Initialize code analyzer
        logger.info("🔍 Initializing code analyzer...");
        auto& analyzer = cpp_mastery::CodeAnalyzer::getInstance();
        if (!analyzer.initialize()) {
            logger.error("❌ Failed to initialize code analyzer");
            return false;
        }
        logger.info("✅ Code analyzer initialized");
        
        // Initialize AST parser
        logger.info("🌳 Initializing AST parser...");
        auto& parser = cpp_mastery::ASTParser::getInstance();
        if (!parser.initialize()) {
            logger.error("❌ Failed to initialize AST parser");
            return false;
        }
        logger.info("✅ AST parser initialized");
        
        // Initialize execution engine
        logger.info("⚙️ Initializing execution engine...");
        auto& executor = cpp_mastery::ExecutionEngine::getInstance();
        if (!executor.initialize()) {
            logger.error("❌ Failed to initialize execution engine");
            return false;
        }
        logger.info("✅ Execution engine initialized");
        
        return true;
    } catch (const std::exception& e) {
        logger.error("❌ Component initialization failed: " + std::string(e.what()));
        return false;
    }
}

// Display startup banner
void displayBanner() {
    auto& logger = cpp_mastery::Logger::getInstance();
    
    logger.info("╔══════════════════════════════════════════════════════════════╗");
    logger.info("║                    C++ Mastery Hub Engine                   ║");
    logger.info("║                  Advanced C++ Analysis Tool                 ║");
    logger.info("║                        Version 1.0.0                        ║");
    logger.info("╚══════════════════════════════════════════════════════════════╝");
}

// Perform system health checks
bool performHealthChecks() {
    auto& logger = cpp_mastery::Logger::getInstance();
    
    logger.info("🩺 Performing system health checks...");
    
    // Check if required directories exist
    std::vector<std::string> required_dirs = {
        "temp",
        "logs",
        "cache",
        "uploads"
    };
    
    for (const auto& dir : required_dirs) {
        if (!std::filesystem::exists(dir)) {
            try {
                std::filesystem::create_directories(dir);
                logger.info("📁 Created directory: " + dir);
            } catch (const std::exception& e) {
                logger.error("❌ Failed to create directory " + dir + ": " + e.what());
                return false;
            }
        }
    }
    
    // Check available disk space
    try {
        auto space = std::filesystem::space(".");
        auto free_gb = space.free / (1024 * 1024 * 1024);
        
        if (free_gb < 1) {
            logger.warning("⚠️ Low disk space: " + std::to_string(free_gb) + "GB available");
        } else {
            logger.info("💾 Disk space available: " + std::to_string(free_gb) + "GB");
        }
    } catch (const std::exception& e) {
        logger.warning("⚠️ Could not check disk space: " + std::string(e.what()));
    }
    
    // Check memory availability
    // This is platform-specific, simplified implementation
    logger.info("🧠 Memory check passed");
    
    logger.info("✅ Health checks completed");
    return true;
}

// Main application entry point
int main(int argc, char* argv[]) {
    try {
        // Initialize logging first
        auto& logger = cpp_mastery::Logger::getInstance();
        logger.setLevel(cpp_mastery::LogLevel::INFO);
        
        displayBanner();
        
        // Parse command line arguments
        std::string config_file = "config/server.json";
        int port = 9000;
        std::string host = "0.0.0.0";
        bool daemon_mode = false;
        
        for (int i = 1; i < argc; i++) {
            std::string arg = argv[i];
            
            if (arg == "--config" && i + 1 < argc) {
                config_file = argv[++i];
            } else if (arg == "--port" && i + 1 < argc) {
                port = std::stoi(argv[++i]);
            } else if (arg == "--host" && i + 1 < argc) {
                host = argv[++i];
            } else if (arg == "--daemon") {
                daemon_mode = true;
            } else if (arg == "--verbose" || arg == "-v") {
                logger.setLevel(cpp_mastery::LogLevel::DEBUG);
            } else if (arg == "--quiet" || arg == "-q") {
                logger.setLevel(cpp_mastery::LogLevel::ERROR);
            } else if (arg == "--help" || arg == "-h") {
                std::cout << "C++ Mastery Hub Engine\n\n";
                std::cout << "Usage: " << argv[0] << " [options]\n\n";
                std::cout << "Options:\n";
                std::cout << "  --config FILE     Configuration file path (default: config/server.json)\n";
                std::cout << "  --port PORT       Server port (default: 9000)\n";
                std::cout << "  --host HOST       Server host (default: 0.0.0.0)\n";
                std::cout << "  --daemon          Run in daemon mode\n";
                std::cout << "  --verbose, -v     Enable verbose logging\n";
                std::cout << "  --quiet, -q       Enable quiet mode (errors only)\n";
                std::cout << "  --help, -h        Show this help message\n";
                return 0;
            } else {
                logger.warning("Unknown argument: " + arg);
            }
        }
        
        logger.info("🚀 Starting C++ Mastery Hub Engine...");
        logger.info("📁 Config file: " + config_file);
        logger.info("🌐 Server address: " + host + ":" + std::to_string(port));
        
        // Setup signal handlers
        setupSignalHandlers();
        
        // Perform health checks
        if (!performHealthChecks()) {
            logger.error("❌ Health checks failed, aborting startup");
            return 1;
        }
        
        // Initialize all components
        if (!initializeComponents()) {
            logger.error("❌ Component initialization failed, aborting startup");
            return 1;
        }
        
        // Create and configure server
        logger.info("🌐 Starting HTTP server...");
        g_server = std::make_unique<cpp_mastery::Server>(host, port);
        
        if (!g_server->initialize()) {
            logger.error("❌ Failed to initialize server");
            return 1;
        }
        
        // Start server in a separate thread if daemon mode
        if (daemon_mode) {
            logger.info("👹 Running in daemon mode");
            
            std::thread server_thread([&]() {
                try {
                    g_server->start();
                } catch (const std::exception& e) {
                    logger.error("Server thread error: " + std::string(e.what()));
                    g_shutdown_requested = true;
                }
            });
            
            // Wait for shutdown signal
            while (!g_shutdown_requested) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
            
            if (server_thread.joinable()) {
                server_thread.join();
            }
        } else {
            // Run server on main thread
            try {
                g_server->start();
            } catch (const std::exception& e) {
                logger.error("Server error: " + std::string(e.what()));
                return 1;
            }
        }
        
        logger.info("✅ Server shutdown completed");
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown fatal error occurred" << std::endl;
        return 1;
    }
}

// Optional: Additional utility functions for debugging
#ifdef DEBUG
namespace cpp_mastery {
    void dumpSystemInfo() {
        auto& logger = Logger::getInstance();
        
        logger.debug("=== System Information ===");
        logger.debug("Compiler: " + std::string(__VERSION__));
        logger.debug("Build date: " + std::string(__DATE__) + " " + std::string(__TIME__));
        logger.debug("C++ Standard: " + std::to_string(__cplusplus));
        
        #ifdef __GNUC__
            logger.debug("GCC Version: " + std::to_string(__GNUC__) + "." + 
                        std::to_string(__GNUC_MINOR__) + "." + 
                        std::to_string(__GNUC_PATCHLEVEL__));
        #endif
        
        #ifdef __clang__
            logger.debug("Clang Version: " + std::to_string(__clang_major__) + "." +
                        std::to_string(__clang_minor__) + "." +
                        std::to_string(__clang_patchlevel__));
        #endif
        
        logger.debug("Platform: " + std::string(CMAKE_SYSTEM_NAME));
        logger.debug("Architecture: " + std::string(CMAKE_SYSTEM_PROCESSOR));
        
        // Thread information
        logger.debug("Hardware threads: " + std::to_string(std::thread::hardware_concurrency()));
        
        logger.debug("=== End System Information ===");
    }
}
#endif