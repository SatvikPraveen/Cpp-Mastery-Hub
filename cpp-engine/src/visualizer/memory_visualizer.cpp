// File: cpp-engine/src/visualizer/memory_visualizer.cpp
// Extension: .cpp

#include "visualizer/memory_visualizer.hpp"
#include "utils/logger.hpp"
#include "utils/config.hpp"

#include <nlohmann/json.hpp>
#include <fstream>
#include <filesystem>
#include <sstream>
#include <regex>
#include <random>
#include <algorithm>
#include <iomanip>

using json = nlohmann::json;

namespace cpp_mastery {

// Initialize static members
std::unique_ptr<MemoryVisualizer> MemoryVisualizer::instance_ = nullptr;
std::mutex MemoryVisualizer::mutex_;

MemoryVisualizer::MemoryVisualizer() : initialized_(false) {}

MemoryVisualizer& MemoryVisualizer::getInstance() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (instance_ == nullptr) {
        instance_ = std::unique_ptr<MemoryVisualizer>(new MemoryVisualizer());
    }
    return *instance_;
}

bool MemoryVisualizer::initialize() {
    std::lock_guard<std::mutex> lock(visualizer_mutex_);
    
    if (initialized_) {
        return true;
    }
    
    auto& logger = Logger::getInstance();
    
    try {
        logger.info("Initializing memory visualizer...", "MemoryVisualizer");
        
        // Initialize visualization templates
        initializeVisualizationTemplates();
        
        // Initialize color schemes
        initializeColorSchemes();
        
        initialized_ = true;
        logger.info("Memory visualizer initialized successfully", "MemoryVisualizer");
        return true;
        
    } catch (const std::exception& e) {
        logger.error("Failed to initialize memory visualizer: " + std::string(e.what()), "MemoryVisualizer");
        return false;
    }
}

VisualizationResult MemoryVisualizer::generateVisualization(const std::string& code, const std::string& visualization_type) {
    auto& logger = Logger::getInstance();
    
    VisualizationResult result;
    result.success = false;
    
    if (!initialized_) {
        result.error_message = "Memory visualizer not initialized";
        return result;
    }
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    try {
        // Generate unique session ID
        std::string session_id = generateSessionId();
        
        // Analyze code for memory patterns
        MemoryLayout memory_layout = analyzeMemoryLayout(code);
        
        // Generate visualization based on type
        if (visualization_type == "memory" || visualization_type == "full") {
            result.visualization_data["memory_layout"] = generateMemoryLayoutVisualization(memory_layout);
        }
        
        if (visualization_type == "stack" || visualization_type == "full") {
            result.visualization_data["stack_visualization"] = generateStackVisualization(memory_layout);
        }
        
        if (visualization_type == "heap" || visualization_type == "full") {
            result.visualization_data["heap_visualization"] = generateHeapVisualization(memory_layout);
        }
        
        if (visualization_type == "execution" || visualization_type == "full") {
            result.visualization_data["execution_flow"] = generateExecutionFlowVisualization(code);
        }
        
        if (visualization_type == "data_structures" || visualization_type == "full") {
            result.visualization_data["data_structures"] = generateDataStructureVisualization(code);
        }
        
        auto end_time = std::chrono::high_resolution_clock::now();
        result.generation_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
        
        // Add metadata
        result.metadata = {
            {"visualization_type", visualization_type},
            {"session_id", session_id},
            {"generation_time_ms", result.generation_time_ms},
            {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()).count()},
            {"memory_regions", static_cast<int>(memory_layout.variables.size())},
            {"estimated_stack_size", memory_layout.estimated_stack_size},
            {"estimated_heap_size", memory_layout.estimated_heap_size}
        };
        
        result.success = true;
        result.visualization_type = visualization_type;
        
        logger.info("Memory visualization generated: " + visualization_type, "MemoryVisualizer");
        return result;
        
    } catch (const std::exception& e) {
        result.error_message = "Visualization generation failed: " + std::string(e.what());
        logger.error("Visualization exception: " + std::string(e.what()), "MemoryVisualizer");
        return result;
    }
}

MemoryLayout MemoryVisualizer::analyzeMemoryLayout(const std::string& code) {
    MemoryLayout layout;
    
    // Parse variables and their memory characteristics
    parseVariables(code, layout);
    parseArrays(code, layout);
    parsePointers(code, layout);
    parseClasses(code, layout);
    parseDynamicAllocations(code, layout);
    
    // Calculate memory estimates
    calculateMemoryEstimates(layout);
    
    return layout;
}

void MemoryVisualizer::parseVariables(const std::string& code, MemoryLayout& layout) {
    // Regex patterns for different variable types
    std::vector<std::pair<std::regex, VariableInfo>> variable_patterns = {
        {std::regex(R"(\bint\s+(\w+))"), {"int", 4, "stack", "primitive"}},
        {std::regex(R"(\bchar\s+(\w+))"), {"char", 1, "stack", "primitive"}},
        {std::regex(R"(\bfloat\s+(\w+))"), {"float", 4, "stack", "primitive"}},
        {std::regex(R"(\bdouble\s+(\w+))"), {"double", 8, "stack", "primitive"}},
        {std::regex(R"(\bbool\s+(\w+))"), {"bool", 1, "stack", "primitive"}},
        {std::regex(R"(\blong\s+(\w+))"), {"long", 8, "stack", "primitive"}},
        {std::regex(R"(\bshort\s+(\w+))"), {"short", 2, "stack", "primitive"}},
    };
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (auto& [pattern, var_template] : variable_patterns) {
            std::smatch match;
            std::string::const_iterator search_start(line.cbegin());
            
            while (std::regex_search(search_start, line.cend(), match, pattern)) {
                VariableInfo var_info = var_template;
                var_info.name = match[1].str();
                var_info.line = line_number;
                var_info.scope = determineScopeFromLine(line);
                
                layout.variables.push_back(var_info);
                search_start = match.suffix().first;
            }
        }
        line_number++;
    }
}

void MemoryVisualizer::parseArrays(const std::string& code, MemoryLayout& layout) {
    // Array pattern: type name[size]
    std::regex array_pattern(R"((\w+)\s+(\w+)\s*\[\s*(\d+)\s*\])");
    std::smatch match;
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        std::string::const_iterator search_start(line.cbegin());
        
        while (std::regex_search(search_start, line.cend(), match, array_pattern)) {
            VariableInfo var_info;
            var_info.type = match[1].str() + "[]";
            var_info.name = match[2].str();
            var_info.size = getTypeSize(match[1].str()) * std::stoi(match[3].str());
            var_info.location = "stack";
            var_info.category = "array";
            var_info.line = line_number;
            var_info.scope = determineScopeFromLine(line);
            var_info.metadata["array_size"] = std::stoi(match[3].str());
            var_info.metadata["element_type"] = match[1].str();
            
            layout.variables.push_back(var_info);
            search_start = match.suffix().first;
        }
        line_number++;
    }
}

void MemoryVisualizer::parsePointers(const std::string& code, MemoryLayout& layout) {
    // Pointer patterns
    std::regex pointer_pattern(R"((\w+)\s*\*\s*(\w+))");
    std::smatch match;
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        std::string::const_iterator search_start(line.cbegin());
        
        while (std::regex_search(search_start, line.cend(), match, pointer_pattern)) {
            VariableInfo var_info;
            var_info.type = match[1].str() + "*";
            var_info.name = match[2].str();
            var_info.size = 8; // Pointer size on 64-bit systems
            var_info.location = "stack"; // Pointer itself on stack
            var_info.category = "pointer";
            var_info.line = line_number;
            var_info.scope = determineScopeFromLine(line);
            var_info.metadata["points_to_type"] = match[1].str();
            
            layout.variables.push_back(var_info);
            search_start = match.suffix().first;
        }
        line_number++;
    }
}

void MemoryVisualizer::parseClasses(const std::string& code, MemoryLayout& layout) {
    // Class instance patterns
    std::regex class_pattern(R"(\b(\w+)\s+(\w+)\s*(?:\(|;))");
    std::smatch match;
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        std::string::const_iterator search_start(line.cbegin());
        
        while (std::regex_search(search_start, line.cend(), match, class_pattern)) {
            std::string type = match[1].str();
            
            // Skip primitive types and keywords
            if (isPrimitiveType(type) || isKeyword(type)) {
                search_start = match.suffix().first;
                continue;
            }
            
            VariableInfo var_info;
            var_info.type = type;
            var_info.name = match[2].str();
            var_info.size = estimateClassSize(type); // Estimate based on common patterns
            var_info.location = "stack";
            var_info.category = "object";
            var_info.line = line_number;
            var_info.scope = determineScopeFromLine(line);
            
            layout.variables.push_back(var_info);
            search_start = match.suffix().first;
        }
        line_number++;
    }
}

void MemoryVisualizer::parseDynamicAllocations(const std::string& code, MemoryLayout& layout) {
    // new operator patterns
    std::regex new_pattern(R"((\w+)\s*\*\s*(\w+)\s*=\s*new\s+(\w+))");
    std::regex new_array_pattern(R"((\w+)\s*\*\s*(\w+)\s*=\s*new\s+(\w+)\s*\[\s*(\d+)\s*\])");
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        std::smatch match;
        
        // Check for new array
        if (std::regex_search(line, match, new_array_pattern)) {
            VariableInfo var_info;
            var_info.type = match[1].str() + "*";
            var_info.name = match[2].str();
            var_info.size = getTypeSize(match[3].str()) * std::stoi(match[4].str());
            var_info.location = "heap";
            var_info.category = "dynamic_array";
            var_info.line = line_number;
            var_info.scope = determineScopeFromLine(line);
            var_info.metadata["array_size"] = std::stoi(match[4].str());
            var_info.metadata["element_type"] = match[3].str();
            
            layout.variables.push_back(var_info);
        }
        // Check for regular new
        else if (std::regex_search(line, match, new_pattern)) {
            VariableInfo var_info;
            var_info.type = match[1].str() + "*";
            var_info.name = match[2].str();
            var_info.size = getTypeSize(match[3].str());
            var_info.location = "heap";
            var_info.category = "dynamic_object";
            var_info.line = line_number;
            var_info.scope = determineScopeFromLine(line);
            var_info.metadata["allocated_type"] = match[3].str();
            
            layout.variables.push_back(var_info);
        }
        
        line_number++;
    }
}

void MemoryVisualizer::calculateMemoryEstimates(MemoryLayout& layout) {
    layout.estimated_stack_size = 0;
    layout.estimated_heap_size = 0;
    
    for (const auto& var : layout.variables) {
        if (var.location == "stack") {
            layout.estimated_stack_size += var.size;
        } else if (var.location == "heap") {
            layout.estimated_heap_size += var.size;
        }
    }
    
    // Add some overhead estimates
    layout.estimated_stack_size += 64; // Function call overhead
    layout.estimated_heap_size += layout.estimated_heap_size / 10; // Heap management overhead
}

json MemoryVisualizer::generateMemoryLayoutVisualization(const MemoryLayout& layout) {
    json visualization = {
        {"type", "memory_layout"},
        {"stack", json::array()},
        {"heap", json::array()},
        {"summary", {
            {"total_stack_size", layout.estimated_stack_size},
            {"total_heap_size", layout.estimated_heap_size},
            {"total_variables", layout.variables.size()}
        }}
    };
    
    // Group variables by location
    for (const auto& var : layout.variables) {
        json var_json = {
            {"name", var.name},
            {"type", var.type},
            {"size", var.size},
            {"category", var.category},
            {"line", var.line},
            {"scope", var.scope},
            {"color", getColorForType(var.type)},
            {"metadata", var.metadata}
        };
        
        if (var.location == "stack") {
            visualization["stack"].push_back(var_json);
        } else if (var.location == "heap") {
            visualization["heap"].push_back(var_json);
        }
    }
    
    return visualization;
}

json MemoryVisualizer::generateStackVisualization(const MemoryLayout& layout) {
    json stack_viz = {
        {"type", "stack_visualization"},
        {"frames", json::array()},
        {"total_size", layout.estimated_stack_size}
    };
    
    // Group stack variables by scope (simulate stack frames)
    std::map<std::string, std::vector<VariableInfo>> frames;
    
    for (const auto& var : layout.variables) {
        if (var.location == "stack") {
            frames[var.scope].push_back(var);
        }
    }
    
    // Generate frames
    int frame_offset = 0;
    for (const auto& [scope, vars] : frames) {
        json frame = {
            {"scope", scope},
            {"offset", frame_offset},
            {"variables", json::array()},
            {"size", 0}
        };
        
        int var_offset = 0;
        for (const auto& var : vars) {
            json var_json = {
                {"name", var.name},
                {"type", var.type},
                {"size", var.size},
                {"offset", var_offset},
                {"color", getColorForType(var.type)}
            };
            
            frame["variables"].push_back(var_json);
            var_offset += var.size;
        }
        
        frame["size"] = var_offset;
        frame_offset += var_offset;
        stack_viz["frames"].push_back(frame);
    }
    
    return stack_viz;
}

json MemoryVisualizer::generateHeapVisualization(const MemoryLayout& layout) {
    json heap_viz = {
        {"type", "heap_visualization"},
        {"allocations", json::array()},
        {"total_size", layout.estimated_heap_size},
        {"fragmentation", calculateHeapFragmentation(layout)}
    };
    
    int allocation_id = 0;
    for (const auto& var : layout.variables) {
        if (var.location == "heap") {
            json allocation = {
                {"id", allocation_id++},
                {"name", var.name},
                {"type", var.type},
                {"size", var.size},
                {"category", var.category},
                {"line", var.line},
                {"color", getColorForType(var.type)},
                {"metadata", var.metadata}
            };
            
            heap_viz["allocations"].push_back(allocation);
        }
    }
    
    return heap_viz;
}

json MemoryVisualizer::generateExecutionFlowVisualization(const std::string& code) {
    json flow_viz = {
        {"type", "execution_flow"},
        {"nodes", json::array()},
        {"edges", json::array()}
    };
    
    // Simple execution flow analysis
    std::vector<std::string> control_keywords = {"if", "while", "for", "switch", "return"};
    
    int node_id = 0;
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (const auto& keyword : control_keywords) {
            if (line.find(keyword) != std::string::npos) {
                json node = {
                    {"id", node_id++},
                    {"type", keyword},
                    {"line", line_number},
                    {"content", line.substr(0, 50)}, // Truncate for display
                    {"color", getColorForControlFlow(keyword)}
                };
                
                flow_viz["nodes"].push_back(node);
            }
        }
        line_number++;
    }
    
    // Generate simple sequential edges
    for (int i = 0; i < node_id - 1; ++i) {
        json edge = {
            {"from", i},
            {"to", i + 1},
            {"type", "sequential"}
        };
        flow_viz["edges"].push_back(edge);
    }
    
    return flow_viz;
}

json MemoryVisualizer::generateDataStructureVisualization(const std::string& code) {
    json ds_viz = {
        {"type", "data_structures"},
        {"structures", json::array()}
    };
    
    // Look for common STL containers
    std::vector<std::pair<std::regex, std::string>> ds_patterns = {
        {std::regex(R"(vector<(\w+)>\s+(\w+))"), "vector"},
        {std::regex(R"(list<(\w+)>\s+(\w+))"), "list"},
        {std::regex(R"(map<(\w+),\s*(\w+)>\s+(\w+))"), "map"},
        {std::regex(R"(set<(\w+)>\s+(\w+))"), "set"},
        {std::regex(R"(queue<(\w+)>\s+(\w+))"), "queue"},
        {std::regex(R"(stack<(\w+)>\s+(\w+))"), "stack"}
    };
    
    int line_number = 1;
    std::istringstream stream(code);
    std::string line;
    
    while (std::getline(stream, line)) {
        for (const auto& [pattern, type] : ds_patterns) {
            std::smatch match;
            if (std::regex_search(line, match, pattern)) {
                json structure = {
                    {"type", type},
                    {"name", match.size() > 2 ? match[match.size()-1].str() : "unknown"},
                    {"element_type", match[1].str()},
                    {"line", line_number},
                    {"estimated_size", estimateContainerSize(type)},
                    {"color", getColorForDataStructure(type)}
                };
                
                ds_viz["structures"].push_back(structure);
            }
        }
        line_number++;
    }
    
    return ds_viz;
}

// Helper methods implementation
int MemoryVisualizer::getTypeSize(const std::string& type) {
    static std::map<std::string, int> type_sizes = {
        {"char", 1}, {"bool", 1},
        {"short", 2},
        {"int", 4}, {"float", 4},
        {"long", 8}, {"double", 8}, {"size_t", 8},
        {"long long", 8}
    };
    
    auto it = type_sizes.find(type);
    return it != type_sizes.end() ? it->second : 8; // Default to 8 bytes
}

std::string MemoryVisualizer::determineScopeFromLine(const std::string& line) {
    // Simple scope determination based on indentation
    size_t indent = 0;
    for (char c : line) {
        if (c == ' ' || c == '\t') {
            indent++;
        } else {
            break;
        }
    }
    
    if (indent < 4) return "global";
    if (indent < 8) return "function";
    return "block";
}

bool MemoryVisualizer::isPrimitiveType(const std::string& type) {
    static std::set<std::string> primitives = {
        "int", "char", "float", "double", "bool", "void",
        "short", "long", "unsigned", "signed"
    };
    return primitives.find(type) != primitives.end();
}

bool MemoryVisualizer::isKeyword(const std::string& word) {
    static std::set<std::string> keywords = {
        "if", "else", "while", "for", "do", "switch", "case", "break", "continue",
        "return", "const", "static", "virtual", "override", "final",
        "public", "private", "protected", "class", "struct", "enum",
        "namespace", "using", "typedef", "template", "typename"
    };
    return keywords.find(word) != keywords.end();
}

int MemoryVisualizer::estimateClassSize(const std::string& className) {
    // Rough estimates for common classes
    static std::map<std::string, int> class_sizes = {
        {"string", 32}, {"vector", 24}, {"list", 24},
        {"map", 48}, {"set", 48}, {"deque", 40}
    };
    
    auto it = class_sizes.find(className);
    return it != class_sizes.end() ? it->second : 64; // Default estimate
}

std::string MemoryVisualizer::getColorForType(const std::string& type) {
    static std::map<std::string, std::string> type_colors = {
        {"int", "#4A90E2"}, {"char", "#7ED321"}, {"float", "#F5A623"},
        {"double", "#F5A623"}, {"bool", "#9013FE"}, {"string", "#50E3C2"},
        {"vector", "#B8E986"}, {"map", "#FFB74D"}, {"set", "#A1887F"}
    };
    
    for (const auto& [key, color] : type_colors) {
        if (type.find(key) != std::string::npos) {
            return color;
        }
    }
    return "#757575"; // Default gray
}

std::string MemoryVisualizer::getColorForControlFlow(const std::string& keyword) {
    static std::map<std::string, std::string> flow_colors = {
        {"if", "#FF6B6B"}, {"while", "#4ECDC4"}, {"for", "#45B7D1"},
        {"switch", "#96CEB4"}, {"return", "#FFEAA7"}
    };
    
    auto it = flow_colors.find(keyword);
    return it != flow_colors.end() ? it->second : "#DDA0DD";
}

std::string MemoryVisualizer::getColorForDataStructure(const std::string& type) {
    static std::map<std::string, std::string> ds_colors = {
        {"vector", "#81C784"}, {"list", "#64B5F6"}, {"map", "#FFB74D"},
        {"set", "#A1887F"}, {"queue", "#F06292"}, {"stack", "#9575CD"}
    };
    
    auto it = ds_colors.find(type);
    return it != ds_colors.end() ? it->second : "#90A4AE";
}

int MemoryVisualizer::estimateContainerSize(const std::string& containerType) {
    static std::map<std::string, int> container_sizes = {
        {"vector", 24}, {"list", 24}, {"map", 48},
        {"set", 48}, {"queue", 32}, {"stack", 32}
    };
    
    auto it = container_sizes.find(containerType);
    return it != container_sizes.end() ? it->second : 32;
}

double MemoryVisualizer::calculateHeapFragmentation(const MemoryLayout& layout) {
    // Simple fragmentation estimate based on allocation patterns
    int heap_allocations = 0;
    for (const auto& var : layout.variables) {
        if (var.location == "heap") {
            heap_allocations++;
        }
    }
    
    // More allocations = higher potential fragmentation
    return std::min(0.9, heap_allocations * 0.1);
}

std::string MemoryVisualizer::generateSessionId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(0, 15);
    
    std::string session_id;
    for (int i = 0; i < 8; ++i) {
        session_id += "0123456789abcdef"[dis(gen)];
    }
    
    return session_id;
}

void MemoryVisualizer::initializeVisualizationTemplates() {
    // Initialize any visualization templates or configurations
    // This could load templates from configuration files
}

void MemoryVisualizer::initializeColorSchemes() {
    // Initialize color schemes for different visualization types
    // This could be configurable or theme-based
}

} // namespace cpp_mastery