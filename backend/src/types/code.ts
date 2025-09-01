// File: backend/src/types/code.ts
// Extension: .ts
// Location: backend/src/types/code.ts

export interface CodeAnalysisRequest {
  code: string;
  language?: string;
  config?: AnalysisConfig;
}

export interface AnalysisConfig {
  enableSyntaxCheck?: boolean;
  enableSemanticCheck?: boolean;
  enableStyleCheck?: boolean;
  enableSecurityCheck?: boolean;
  enablePerformanceCheck?: boolean;
  warningLevel?: 'low' | 'medium' | 'high' | 'all';
  maxIssues?: number;
}

export interface CodeAnalysisResponse {
  success: boolean;
  analysisId?: string;
  errors: AnalysisError[];
  warnings: AnalysisWarning[];
  suggestions: AnalysisSuggestion[];
  metrics?: CodeMetrics;
  securityIssues?: SecurityIssue[];
  performanceIssues?: PerformanceIssue[];
  executionTime?: number;
}

export interface AnalysisError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'fatal';
  code: string;
  category: ErrorCategory;
}

export interface AnalysisWarning {
  line: number;
  column: number;
  message: string;
  severity: 'warning' | 'info';
  code: string;
  category: WarningCategory;
  fixable?: boolean;
}

export interface AnalysisSuggestion {
  line: number;
  column: number;
  message: string;
  type: 'improvement' | 'modernization' | 'optimization';
  impact: 'low' | 'medium' | 'high';
  fixedCode?: string;
}

export enum ErrorCategory {
  SYNTAX = 'SYNTAX',
  SEMANTIC = 'SEMANTIC',
  TYPE = 'TYPE',
  LINKING = 'LINKING'
}

export enum WarningCategory {
  STYLE = 'STYLE',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  MAINTAINABILITY = 'MAINTAINABILITY',
  COMPATIBILITY = 'COMPATIBILITY'
}

export interface CodeMetrics {
  linesOfCode: number;
  linesOfComments: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  functionCount: number;
  classCount: number;
  namespaceCount: number;
  templateCount: number;
  maintainabilityIndex: number;
}

export interface SecurityIssue {
  line: number;
  column: number;
  type: SecurityIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  recommendation: string;
  cwe?: string; // Common Weakness Enumeration
  owasp?: string; // OWASP category
}

export enum SecurityIssueType {
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',
  MEMORY_LEAK = 'MEMORY_LEAK',
  NULL_POINTER_DEREFERENCE = 'NULL_POINTER_DEREFERENCE',
  UNSAFE_FUNCTION = 'UNSAFE_FUNCTION',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  INTEGER_OVERFLOW = 'INTEGER_OVERFLOW',
  DOUBLE_FREE = 'DOUBLE_FREE',
  USE_AFTER_FREE = 'USE_AFTER_FREE'
}

export interface PerformanceIssue {
  line: number;
  column: number;
  type: PerformanceIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  impact: string;
  suggestion: string;
}

export enum PerformanceIssueType {
  UNNECESSARY_COPY = 'UNNECESSARY_COPY',
  INEFFICIENT_ALGORITHM = 'INEFFICIENT_ALGORITHM',
  MEMORY_ALLOCATION = 'MEMORY_ALLOCATION',
  LOOP_OPTIMIZATION = 'LOOP_OPTIMIZATION',
  CACHE_INEFFICIENCY = 'CACHE_INEFFICIENCY'
}

export interface CodeExecutionRequest {
  code: string;
  language?: string;
  input?: string;
  timeout?: number;
  memoryLimit?: number;
  config?: ExecutionConfig;
}

export interface ExecutionConfig {
  enableDebugInfo?: boolean;
  enableMemoryVisualization?: boolean;
  enablePerformanceProfiling?: boolean;
  optimizationLevel?: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Oz';
  cppStandard?: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  warnings?: string[];
  defines?: Record<string, string>;
}

export interface CodeExecutionResponse {
  success: boolean;
  executionId?: string;
  output: string;
  errorOutput?: string;
  exitCode: number;
  executionTime: number;
  memoryUsage?: MemoryUsage;
  performanceProfile?: PerformanceProfile;
  compilationError?: string;
  runtimeError?: string;
  timeout?: boolean;
  memoryVisualization?: MemoryVisualization;
}

export interface MemoryUsage {
  peakMemoryKB: number;
  averageMemoryKB: number;
  heapAllocations: number;
  stackSize: number;
  memoryLeaks?: MemoryLeak[];
}

export interface MemoryLeak {
  address: string;
  size: number;
  type: string;
  line: number;
  function: string;
}

export interface PerformanceProfile {
  cpuUsage: number;
  instructions: number;
  cacheHits: number;
  cacheMisses: number;
  branchPredictions: number;
  branchMispredictions: number;
  hotspots: Hotspot[];
}

export interface Hotspot {
  function: string;
  line: number;
  percentage: number;
  calls: number;
  averageTime: number;
}

export interface MemoryVisualization {
  stackFrames: StackFrame[];
  heapAllocations: HeapAllocation[];
  memoryLayout: MemoryBlock[];
  pointers: PointerRelation[];
}

export interface StackFrame {
  function: string;
  variables: Variable[];
  baseAddress: string;
  size: number;
}

export interface Variable {
  name: string;
  type: string;
  value: any;
  address: string;
  size: number;
}

export interface HeapAllocation {
  address: string;
  size: number;
  type: string;
  allocated: boolean;
  line: number;
  function: string;
}

export interface MemoryBlock {
  address: string;
  size: number;
  type: 'stack' | 'heap' | 'global' | 'code';
  content?: any;
}

export interface PointerRelation {
  from: string;
  to: string;
  type: 'reference' | 'pointer' | 'smart_pointer';
}