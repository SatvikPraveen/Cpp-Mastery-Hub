// File: frontend/src/components/Visualizer/MemoryVisualizer.tsx
// Extension: .tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Database,
  Layers,
  ArrowRight,
  ArrowDown,
  Cpu,
  MemoryStick,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Maximize2,
  X,
} from 'lucide-react';
import { MemoryState, StackFrame, HeapObject, Variable, ExecutionResult } from '@/types';

interface MemoryVisualizerProps {
  code: string;
  executionState?: ExecutionResult | null;
  onClose?: () => void;
  className?: string;
}

const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({
  code,
  executionState,
  onClose,
  className = '',
}) => {
  const [memoryStates, setMemoryStates] = useState<MemoryState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between states
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock memory states generation from code analysis
  useEffect(() => {
    generateMemoryStates();
  }, [code, executionState]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && memoryStates.length > 1) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentStateIndex(prev => {
          const next = prev + 1;
          if (next >= memoryStates.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, playbackSpeed);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, memoryStates.length]);

  const generateMemoryStates = () => {
    // This would typically come from the backend execution trace
    // For demo purposes, we'll generate mock states based on the code
    const states: MemoryState[] = [];
    
    // Initial state
    states.push({
      timestamp: 0,
      stackFrames: [
        {
          id: 'main',
          functionName: 'main',
          line: 3,
          variables: [
            {
              name: 'argc',
              type: 'int',
              value: 1,
              address: '0x7fff5fbff5ac',
              size: 4,
              scope: 'parameter',
              isPointer: false,
            },
            {
              name: 'argv',
              type: 'char**',
              value: '0x7fff5fbff5b8',
              address: '0x7fff5fbff5b0',
              size: 8,
              scope: 'parameter',
              isPointer: true,
              pointsTo: '0x7fff5fbff5b8',
            },
          ],
        },
      ],
      heapObjects: [],
      globalVariables: [],
    });

    // Add more states based on code execution
    if (code.includes('vector') || code.includes('new') || code.includes('malloc')) {
      states.push({
        timestamp: 100,
        stackFrames: [
          {
            id: 'main',
            functionName: 'main',
            line: 5,
            variables: [
              ...states[0].stackFrames[0].variables,
              {
                name: 'ptr',
                type: 'int*',
                value: '0x600000000010',
                address: '0x7fff5fbff598',
                size: 8,
                scope: 'local',
                isPointer: true,
                pointsTo: '0x600000000010',
              },
            ],
          },
        ],
        heapObjects: [
          {
            id: 'heap_1',
            address: '0x600000000010',
            type: 'int',
            size: 4,
            value: 42,
            references: ['ptr'],
            isAllocated: true,
          },
        ],
        globalVariables: [],
      });
    }

    setMemoryStates(states);
    setCurrentStateIndex(0);
  };

  const currentState = memoryStates[currentStateIndex] || null;

  const handlePlay = () => {
    if (currentStateIndex >= memoryStates.length - 1) {
      setCurrentStateIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStateIndex(0);
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    if (currentStateIndex < memoryStates.length - 1) {
      setCurrentStateIndex(prev => prev + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStateIndex > 0) {
      setCurrentStateIndex(prev => prev - 1);
    }
  };

  const getVariableColor = (variable: Variable) => {
    switch (variable.scope) {
      case 'parameter':
        return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200';
      case 'local':
        return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200';
      case 'global':
        return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-200';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200';
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'string' && value.startsWith('0x')) {
      return value; // Memory address
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  };

  if (!currentState) {
    return (
      <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Memory Visualizer
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-gray-500 dark:text-gray-400">
          <Database className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No memory data available</p>
          <p className="text-xs mt-1">Execute code to see memory visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Monitor className="w-5 h-5 mr-2" />
          Memory Visualizer
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
            className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded transition-colors duration-200"
          >
            {viewMode === '2d' ? '3D' : '2D'}
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
            title="Reset"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleStepBackward}
            disabled={currentStateIndex === 0}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 rounded-md transition-colors duration-200"
            title="Step backward"
          >
            <ArrowDown className="w-4 h-4 rotate-90" />
          </button>
          
          <button
            onClick={handlePlay}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleStepForward}
            disabled={currentStateIndex >= memoryStates.length - 1}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 rounded-md transition-colors duration-200"
            title="Step forward"
          >
            <ArrowDown className="w-4 h-4 -rotate-90" />
          </button>
          
          <button
            onClick={() => setCurrentStateIndex(memoryStates.length - 1)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors duration-200"
            title="Go to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentStateIndex + 1} / {memoryStates.length}
          </span>
          
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-2 py-1"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>
      </div>

      {/* Memory Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stack */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center mb-3">
            <Layers className="w-4 h-4 mr-2 text-blue-500" />
            <h4 className="font-medium text-gray-900 dark:text-white">Stack</h4>
          </div>
          
          <div className="space-y-2">
            <AnimatePresence>
              {currentState.stackFrames.map((frame, index) => (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    {frame.functionName}() - Line {frame.line}
                  </div>
                  
                  <div className="space-y-1">
                    {frame.variables.map((variable, varIndex) => (
                      <motion.div
                        key={`${variable.name}-${varIndex}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: varIndex * 0.05 }}
                        className={`text-xs p-2 rounded border cursor-pointer transition-all duration-200 hover:shadow-sm ${getVariableColor(variable)} ${
                          selectedVariable?.name === variable.name ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedVariable(variable)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{variable.name}</span>
                          <span className="opacity-75">{variable.type}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span>{formatValue(variable.value)}</span>
                          <span className="opacity-60">{variable.address}</span>
                        </div>
                        {variable.isPointer && variable.pointsTo && (
                          <div className="flex items-center mt-1 text-purple-600 dark:text-purple-400">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            <span>{variable.pointsTo}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Heap */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center mb-3">
            <Database className="w-4 h-4 mr-2 text-green-500" />
            <h4 className="font-medium text-gray-900 dark:text-white">Heap</h4>
          </div>
          
          <div className="space-y-2">
            <AnimatePresence>
              {currentState.heapObjects.map((obj, index) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    obj.isAllocated 
                      ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                      : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {obj.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {obj.size} bytes
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {obj.address}
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Value: {formatValue(obj.value)}
                  </div>
                  
                  {obj.references.length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Referenced by: </span>
                      {obj.references.map((ref, refIndex) => (
                        <span key={refIndex} className="text-blue-600 dark:text-blue-400 mr-1">
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {currentState.heapObjects.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No heap allocations</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Variables & Details */}
        <div className="w-1/3 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Global Variables */}
            <div>
              <div className="flex items-center mb-3">
                <Cpu className="w-4 h-4 mr-2 text-purple-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Global Variables</h4>
              </div>
              
              <div className="space-y-2">
                <AnimatePresence>
                  {currentState.globalVariables.map((variable, index) => (
                    <motion.div
                      key={`global-${variable.name}-${index}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`text-xs p-2 rounded border cursor-pointer transition-all duration-200 hover:shadow-sm ${getVariableColor(variable)}`}
                      onClick={() => setSelectedVariable(variable)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{variable.name}</span>
                        <span className="opacity-75">{variable.type}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>{formatValue(variable.value)}</span>
                        <span className="opacity-60">{variable.address}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {currentState.globalVariables.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    <p className="text-sm">No global variables</p>
                  </div>
                )}
              </div>
            </div>

            {/* Variable Details */}
            {selectedVariable && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Variable Details</h4>
                  <button
                    onClick={() => setSelectedVariable(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVariable.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVariable.type}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Value:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatValue(selectedVariable.value)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Address:</span>
                    <span className="font-mono text-xs text-gray-900 dark:text-white">{selectedVariable.address}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Size:</span>
                    <span className="text-gray-900 dark:text-white">{selectedVariable.size} bytes</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Scope:</span>
                    <span className="capitalize text-gray-900 dark:text-white">{selectedVariable.scope}</span>
                  </div>
                  
                  {selectedVariable.isPointer && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Pointer:</span>
                        <span className="text-green-600 dark:text-green-400">Yes</span>
                      </div>
                      
                      {selectedVariable.pointsTo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Points to:</span>
                          <span className="font-mono text-xs text-purple-600 dark:text-purple-400">{selectedVariable.pointsTo}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Memory Statistics */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center mb-3">
                <MemoryStick className="w-4 h-4 mr-2 text-orange-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Memory Stats</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Stack frames:</span>
                  <span className="text-gray-900 dark:text-white">{currentState.stackFrames.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Stack variables:</span>
                  <span className="text-gray-900 dark:text-white">
                    {currentState.stackFrames.reduce((acc, frame) => acc + frame.variables.length, 0)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Heap objects:</span>
                  <span className="text-gray-900 dark:text-white">{currentState.heapObjects.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Global variables:</span>
                  <span className="text-gray-900 dark:text-white">{currentState.globalVariables.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total heap size:</span>
                  <span className="text-gray-900 dark:text-white">
                    {currentState.heapObjects.reduce((acc, obj) => acc + obj.size, 0)} bytes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Timeline:</span>
          <div className="flex-1 relative h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStateIndex + 1) / memoryStates.length) * 100}%` }}
              transition={{ duration: 0.2 }}
            />
            
            {/* State markers */}
            {memoryStates.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStateIndex(index)}
                className="absolute top-0 w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full border border-white dark:border-gray-800 hover:bg-blue-500 transition-colors duration-200"
                style={{ left: `${(index / (memoryStates.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
                title={`State ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryVisualizer;