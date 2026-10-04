/**
 * TypeScript mirror of the analysis engine's JSON contract.
 *
 * Source of truth: cpp-engine/schemas/analysis.schema.json (`cppmastery.analysis/1`) and
 * cpp-engine/schemas/layout.schema.json (`cppmastery.layout/1`). The engine tests validate its
 * output against those schemas; `engine-client.test.ts` checks this mirror against fixtures.
 */

export type Severity = 'info' | 'warning' | 'error';
export type Category =
  | 'correctness'
  | 'security'
  | 'memory'
  | 'performance'
  | 'modernize'
  | 'readability'
  | 'portability'
  | 'complexity';

export interface Position {
  line: number;
  column: number;
}

export interface Diagnostic {
  rule: string;
  severity: Severity;
  category: Category;
  position: Position;
  length: number;
  message: string;
  suggestion: string;
  reference: string;
}

export interface FunctionMetrics {
  name: string;
  start: Position;
  end: Position;
  lines: number;
  parameters: number;
  statements: number;
  cyclomatic: number;
  cyclomatic_extended: number;
  max_nesting: number;
}

export interface CodeMetrics {
  lines: { physical: number; code: number; comment: number; blank: number; mixed: number };
  tokens: number;
  includes: number;
  classes: number;
  comment_ratio: number;
  halstead: {
    n1: number;
    n2: number;
    N1: number;
    N2: number;
    vocabulary: number;
    length: number;
    estimated_length: number;
    volume: number;
    difficulty: number;
    effort: number;
    time_seconds: number;
    delivered_bugs: number;
  };
  cyclomatic: { total: number; max: number; mean: number };
  max_nesting: number;
  maintainability: { raw: number; normalized: number; with_comments: number };
  functions: FunctionMetrics[];
}

export interface RuleInfo {
  id: string;
  description: string;
  category: Category;
  severity: Severity;
  reference: string;
}

export interface AnalysisReport {
  schema: 'cppmastery.analysis/1';
  engine: { version: string; revision: string };
  elapsed_us: number;
  rules_run: number;
  summary: { errors: number; warnings: number; infos: number; total: number };
  diagnostics: Diagnostic[];
  metrics: CodeMetrics;
  rules?: RuleInfo[];
}

export interface FieldLayout {
  name: string;
  type: string;
  pointer_depth: number;
  array_count: number;
  offset: number;
  size: number;
  align: number;
  padding_before: number;
}

export interface StructLayout {
  name: string;
  size: number;
  align: number;
  padding_bytes: number;
  tail_padding: number;
  padding_ratio: number;
  fields: FieldLayout[];
  notes: string[];
}

export interface LayoutReport {
  schema: 'cppmastery.layout/1';
  abi: { name: 'lp64' | 'llp64' | 'ilp32'; pointer_size: 4 | 8 };
  structs: Array<{
    layout: StructLayout;
    suggested?: { bytes_saved: number; layout: StructLayout };
  }>;
}

export interface AnalysisOptions {
  maxCyclomatic?: number;
  maxNesting?: number;
  maxFunctionLines?: number;
  disable?: string[];
}

export type TargetAbi = 'lp64' | 'llp64' | 'ilp32';
