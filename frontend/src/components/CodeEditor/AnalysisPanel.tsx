// File: frontend/src/components/CodeEditor/AnalysisPanel.tsx
// Extension: .tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingUp,
  Gauge,
  Lightbulb,
  Code,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { CodeMetrics, CodeSuggestion, CodeSmell } from '@/types';

interface AnalysisPanelProps {
  diagnostics: CodeSmell[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics | null;
  isAnalyzing: boolean;
  onClose?: () => void;
  className?: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  diagnostics,
  suggestions,
  metrics,
  isAnalyzing,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'suggestions' | 'metrics'>('diagnostics');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSeverityIcon = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const getSuggestionIcon = (type: CodeSuggestion['type']) => {
    switch (type) {
      case 'performance':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'style':
        return <Code className="w-4 h-4 text-purple-500" />;
      case 'best-practice':
        return <Lightbulb className="w-4 h-4 text-orange-500" />;
      case 'modernization':
        return <Gauge className="w-4 h-4 text-blue-500" />;
    }
  };

  const getMetricsScore = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'warning';
    return 'poor';
  };

  const getScoreColor = (score: 'good' | 'warning' | 'poor') => {
    switch (score) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'poor':
        return 'text-red-600 dark:text-red-400';
    }
  };

  const groupDiagnosticsBySeverity = () => {
    const grouped = {
      error: diagnostics.filter(d => d.severity === 'error'),
      warning: diagnostics.filter(d => d.severity === 'warning'),
      info: diagnostics.filter(d => d.severity === 'info'),
    };
    return grouped;
  };

  const groupSuggestionsByType = () => {
    const grouped = {
      performance: suggestions.filter(s => s.type === 'performance'),
      'best-practice': suggestions.filter(s => s.type === 'best-practice'),
      style: suggestions.filter(s => s.type === 'style'),
      modernization: suggestions.filter(s => s.type === 'modernization'),
    };
    return grouped;
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Analysis</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'diagnostics'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Issues ({diagnostics.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'suggestions'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Suggestions ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'metrics'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Metrics
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isAnalyzing ? (
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
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'diagnostics' && (
              <motion.div
                key="diagnostics"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <DiagnosticsTab diagnostics={groupDiagnosticsBySeverity()} />
              </motion.div>
            )}

            {activeTab === 'suggestions' && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <SuggestionsTab suggestions={groupSuggestionsByType()} />
              </motion.div>
            )}

            {activeTab === 'metrics' && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <MetricsTab metrics={metrics} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Diagnostics Tab Component
interface DiagnosticsTabProps {
  diagnostics: Record<string, CodeSmell[]>;
}

const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ diagnostics }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['error', 'warning']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSeverityIcon = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const totalIssues = Object.values(diagnostics).flat().length;

  if (totalIssues === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
        <CheckCircle className="w-8 h-8 mb-3 text-green-500" />
        <p className="text-