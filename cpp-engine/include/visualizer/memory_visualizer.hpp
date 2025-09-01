// File: cpp-engine/include/visualizer/memory_visualizer.hpp
// Extension: .hpp

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <map>
#include <set>
#include <chrono>
#include <nlohmann/json.hpp>

namespace cpp_mastery {

/**
 * @brief Information about a variable in memory
 */
struct VariableInfo {
    std::string name;
    std::string type;
    int size = 0;                    // Size in bytes
    std::string location;            // "stack", "heap", "static"
    std::string category;            // "primitive", "array", "object", "pointer"
    int line = 0;                    // Line number in source code
    std::string scope;               // "global", "function", "block"
    nlohmann::json metadata;         // Additional metadata
};

/**
 * @brief Complete memory layout analysis
 */
struct MemoryLayout {
    std::vector<VariableInfo> variables;
    int estimated_stack_size = 0;
    int estimated_heap_size = 0;
    std::map<std::string, int> scope_sizes;
};

/**
 * @brief Result of visualization generation
 */
struct VisualizationResult {
    bool success = false;
    std::string visualization_type;
    nlohmann::json visualization_data;
    nlohmann::json metadata;
    long generation_time_ms = 0;
    std::string error_message;
};

/**
 * @brief Singleton memory visualizer for C++ code
 * 
 * Provides comprehensive memory visualization capabilities including:
 * - Stack frame visualization with variable layout
 * - Heap allocation tracking and fragmentation analysis
 * - Memory usage patterns and optimization suggestions
 * - Data structure visualization (STL containers, custom classes)
 * - Execution flow diagrams with memory state changes
 * - Interactive memory inspection and debugging views
 */
class MemoryVisualizer {
public:
    /**
     * @brief Get the singleton instance of the memory visualizer
     * 
     * @return MemoryVisualizer& Reference to the memory visualizer instance
     */
    static MemoryVisualizer& getInstance();
    
    // Delete copy constructor and assignment operator
    MemoryVisualizer(const MemoryVisualizer&) = delete;
    MemoryVisualizer& operator=(const MemoryVisualizer&) = delete;
    
    /**
     * @brief Initialize the memory visualizer
     * 
     * Sets up visualization templates, color schemes, and analysis tools.
     * 
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool initialize();
    
    /**
     * @brief Check if memory visualizer is initialized
     * 
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return initialized_; }
    
    /**
     * @brief Generate memory visualization for C++ source code
     * 
     * @param code C++ source code to analyze
     * @param visualization_type Type of visualization (memory, stack, heap, execution, data_structures, full)
     * @return VisualizationResult Result containing visualization data and metadata
     */
    VisualizationResult generateVisualization(const std::string& code, const std::string& visualization_type = "memory");

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    MemoryVisualizer();
    
    /**
     * @brief Initialize visualization templates and configurations
     */
    void initializeVisualizationTemplates();
    
    /**
     * @brief Initialize color schemes for different visualization types
     */
    void initializeColorSchemes();
    
    /**
     * @brief Analyze memory layout of source code
     * 
     * @param code Source code to analyze
     * @return MemoryLayout Complete memory layout analysis
     */
    MemoryLayout analyzeMemoryLayout(const std::string& code);
    
    /**
     * @brief Parse variables from source code
     * 
     * @param code Source code
     * @param layout Memory layout to populate
     */
    void parseVariables(const std::string& code, MemoryLayout& layout);
    
    /**
     * @brief Parse arrays from source code
     * 
     * @param code Source code
     * @param layout Memory layout to populate
     */
    void parseArrays(const std::string& code, MemoryLayout& layout);
    
    /**
     * @brief Parse pointers from source code
     * 
     * @param code Source code
     * @param layout Memory layout to populate
     */
    void parsePointers(const std::string& code, MemoryLayout& layout);
    
    /**
     * @brief Parse class instances from source code
     * 
     * @param code Source code
     * @param layout Memory layout to populate
     */
    void parseClasses(const std::string& code, MemoryLayout& layout);
    
    /**
     * @brief Parse dynamic memory allocations
     * 
     * @param code Source code
     * @param layout Memory layout to populate
     */
    void parseDynamicAllocations(const std::string& code, MemoryLayout& layout);
    
    /**
     * @brief Calculate memory size estimates
     * 
     * @param layout Memory layout to update with estimates
     */
    void calculateMemoryEstimates(MemoryLayout& layout);
    
    /**
     * @brief Generate memory layout visualization
     * 
     * @param layout Memory layout data
     * @return nlohmann::json Visualization data
     */
    nlohmann::json generateMemoryLayoutVisualization(const MemoryLayout& layout);
    
    /**
     * @brief Generate stack visualization
     * 
     * @param layout Memory layout data
     * @return nlohmann::json Stack visualization data
     */
    nlohmann::json generateStackVisualization(const MemoryLayout& layout);
    
    /**
     * @brief Generate heap visualization
     * 
     * @param layout Memory layout data
     * @return nlohmann::json Heap visualization data
     */
    nlohmann::json generateHeapVisualization(const MemoryLayout& layout);
    
    /**
     * @brief Generate execution flow visualization
     * 
     * @param code Source code
     * @return nlohmann::json Execution flow visualization data
     */
    nlohmann::json generateExecutionFlowVisualization(const std::string& code);
    
    /**
     * @brief Generate data structure visualization
     * 
     * @param code Source code
     * @return nlohmann::json Data structure visualization data
     */
    nlohmann::json generateDataStructureVisualization(const std::string& code);
    
    // Helper methods
    
    /**
     * @brief Get size of C++ type in bytes
     * 
     * @param type Type name
     * @return int Size in bytes
     */
    int getTypeSize(const std::string& type);
    
    /**
     * @brief Determine variable scope from source line
     * 
     * @param line Source code line
     * @return std::string Scope name
     */
    std::string determineScopeFromLine(const std::string& line);
    
    /**
     * @brief Check if type is a primitive type
     * 
     * @param type Type name
     * @return true if primitive
     * @return false if not primitive
     */
    bool isPrimitiveType(const std::string& type);
    
    /**
     * @brief Check if word is a C++ keyword
     * 
     * @param word Word to check
     * @return true if keyword
     * @return false if not keyword
     */
    bool isKeyword(const std::string& word);
    
    /**
     * @brief Estimate size of class instance
     * 
     * @param className Class name
     * @return int Estimated size in bytes
     */
    int estimateClassSize(const std::string& className);
    
    /**
     * @brief Get color for variable type visualization
     * 
     * @param type Variable type
     * @return std::string Hex color code
     */
    std::string getColorForType(const std::string& type);
    
    /**
     * @brief Get color for control flow visualization
     * 
     * @param keyword Control flow keyword
     * @return std::string Hex color code
     */
    std::string getColorForControlFlow(const std::string& keyword);
    
    /**
     * @brief Get color for data structure visualization
     * 
     * @param type Data structure type
     * @return std::string Hex color code
     */
    std::string getColorForDataStructure(const std::string& type);
    
    /**
     * @brief Estimate size of STL container
     * 
     * @param containerType Container type name
     * @return int Estimated size in bytes
     */
    int estimateContainerSize(const std::string& containerType);
    
    /**
     * @brief Calculate heap fragmentation estimate
     * 
     * @param layout Memory layout
     * @return double Fragmentation ratio (0.0 - 1.0)
     */
    double calculateHeapFragmentation(const MemoryLayout& layout);
    
    /**
     * @brief Generate unique session ID
     * 
     * @return std::string Unique session identifier
     */
    std::string generateSessionId();
    
    // Static members for singleton pattern
    static std::unique_ptr<MemoryVisualizer> instance_;
    static std::mutex mutex_;
    
    // Initialization state
    bool initialized_;
    
    // Thread safety
    mutable std::mutex visualizer_mutex_;
};

} // namespace cpp_mastery