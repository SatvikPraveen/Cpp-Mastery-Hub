'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Gauge,
  Info,
  Lightbulb,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import type { AnalysisResult, AnalysisSuggestion, CodeIssue } from '@/hooks/useCodeAnalysis';

type Tab = 'issues' | 'suggestions' | 'metrics';
type Severity = CodeIssue['severity'];

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onIssueClick?: (line: number) => void;
  onClose?: () => void;
  className?: string;
}

const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

const severityIcon = (severity: Severity) => {
  switch (severity) {
    case 'high':
      return <Bug className="w-4 h-4 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'low':
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const severityClasses = (severity: Severity) => {
  switch (severity) {
    case 'high':
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
    case 'low':
      return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
  }
};

const scoreClasses = (score: number) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const tabClasses = (active: boolean) =>
  `flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
    active
      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
  }`;

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
    <CheckCircle className="w-8 h-8 mb-3 text-green-500" />
    <p className="text-sm">{message}</p>
  </div>
);

interface IssuesTabProps {
  issues: CodeIssue[];
  onIssueClick?: ((line: number) => void) | undefined;
}

const IssuesTab: React.FC<IssuesTabProps> = ({ issues, onIssueClick }) => {
  const [collapsed, setCollapsed] = useState<Set<Severity>>(new Set());

  const toggle = (severity: Severity) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  if (issues.length === 0) {
    return <EmptyState message="No issues found. Nice work!" />;
  }

  return (
    <div className="space-y-4">
      {SEVERITY_ORDER.map((severity) => {
        const group = issues.filter((issue) => issue.severity === severity);
        if (group.length === 0) return null;
        const isOpen = !collapsed.has(severity);

        return (
          <div key={severity}>
            <button
              type="button"
              onClick={() => toggle(severity)}
              className="flex items-center w-full gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {severityIcon(severity)}
              <span className="capitalize">{severity}</span>
              <span className="text-gray-400">({group.length})</span>
            </button>

            {isOpen && (
              <ul className="space-y-2">
                {group.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => onIssueClick?.(issue.line)}
                      className={`w-full text-left p-3 rounded-md border ${severityClasses(
                        severity
                      )} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-900 dark:text-gray-100">{issue.message}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Ln {issue.line}:{issue.column}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {issue.rule_id} · {issue.category.replace('_', ' ')}
                      </p>
                      {issue.suggestion && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                          {issue.suggestion}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SuggestionsTab: React.FC<{ suggestions: AnalysisSuggestion[] }> = ({ suggestions }) => {
  if (suggestions.length === 0) {
    return <EmptyState message="No suggestions. Your code looks idiomatic." />;
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <li
          // Suggestions carry no stable id; type + description is unique enough for display.
          key={`${suggestion.type}-${suggestion.description}-${index}`}
          className="p-3 rounded-md border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">
              {suggestion.type}
            </span>
            <span className="ml-auto text-xs text-gray-500">
              {suggestion.impact} impact · {Math.round(suggestion.confidence * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.description}</p>
          {suggestion.after_code && (
            <pre className="mt-2 p-2 text-xs overflow-x-auto rounded bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
              {suggestion.after_code}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
};

const MetricsTab: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const rows: Array<{ label: string; value: string | number }> = [
    { label: 'Total lines', value: result.metrics.total_lines },
    { label: 'Code lines', value: result.metrics.code_lines },
    { label: 'Comment lines', value: result.metrics.comment_lines },
    { label: 'Functions', value: result.metrics.function_count },
    { label: 'Classes', value: result.metrics.class_count },
    { label: 'Comment ratio', value: `${Math.round(result.metrics.comment_ratio * 100)}%` },
    { label: 'Cyclomatic complexity', value: result.complexity.cyclomatic_complexity },
    { label: 'Cognitive complexity', value: result.complexity.cognitive_complexity },
    { label: 'Max nesting depth', value: result.complexity.max_nesting_depth },
    { label: 'Maintainability index', value: result.complexity.maintainability_index },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overall score</p>
          <p className={`text-3xl font-bold ${scoreClasses(result.overall_score)}`}>
            {Math.round(result.overall_score)}
          </p>
        </div>
        <Gauge className="w-8 h-8 text-gray-400" />
      </div>

      <dl className="divide-y divide-gray-200 dark:divide-gray-700">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-2 text-sm">
            <dt className="text-gray-600 dark:text-gray-400">{row.label}</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-gray-400">Analyzed in {result.analysis_time_ms} ms</p>
    </div>
  );
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  result,
  isAnalyzing,
  onIssueClick,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const issueCount = result?.issues.length ?? 0;
  const suggestionCount = result?.suggestions.length ?? 0;

  const renderBody = () => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mb-3"
          >
            <Gauge className="w-8 h-8" />
          </motion.div>
          <p className="text-sm">Analyzing code...</p>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <Gauge className="w-8 h-8 mb-3" />
          <p className="text-sm">Run analysis to see issues, suggestions and metrics.</p>
        </div>
      );
    }

    if (!result.success) {
      return (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {result.error_message ?? 'Analysis failed.'}
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          {activeTab === 'issues' && (
            <IssuesTab issues={result.issues} onIssueClick={onIssueClick} />
          )}
          {activeTab === 'suggestions' && <SuggestionsTab suggestions={result.suggestions} />}
          {activeTab === 'metrics' && <MetricsTab result={result} />}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Analysis</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analysis panel"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={tabClasses(activeTab === 'issues')}
        >
          Issues ({issueCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suggestions')}
          className={tabClasses(activeTab === 'suggestions')}
        >
          Suggestions ({suggestionCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={tabClasses(activeTab === 'metrics')}
        >
          Metrics
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>
    </div>
  );
};

export default AnalysisPanel;
