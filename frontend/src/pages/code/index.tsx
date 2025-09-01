// File: frontend/src/pages/code/index.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Play, Save, Share, Code, FileText, Settings, Users, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import CodeEditor from '../../components/Code/CodeEditor';
import { useAuth } from '../../hooks/useAuth';
import { codeService } from '../../services/api';
import { CodeSnippet } from '../../types';

interface CodePlaygroundProps {}

const CodePlayground: React.FC<CodePlaygroundProps> = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [code, setCode] = useState(`#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentSnippets, setRecentSnippets] = useState<CodeSnippet[]>([]);
  const [popularSnippets, setPopularSnippets] = useState<CodeSnippet[]>([]);
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 14,
    tabSize: 4,
    wordWrap: true,
    showLineNumbers: true
  });

  useEffect(() => {
    fetchRecentSnippets();
    fetchPopularSnippets();
    loadEditorSettings();
  }, [isAuthenticated]);

  const fetchRecentSnippets = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await codeService.getRecentSnippets();
      setRecentSnippets(response.data);
    } catch (error) {
      console.error('Error fetching recent snippets:', error);
    }
  };

  const fetchPopularSnippets = async () => {
    try {
      const response = await codeService.getPopularSnippets();
      setPopularSnippets(response.data);
    } catch (error) {
      console.error('Error fetching popular snippets:', error);
    }
  };

  const loadEditorSettings = () => {
    const savedSettings = localStorage.getItem('codeEditorSettings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };

  const saveEditorSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('codeEditorSettings', JSON.stringify(newSettings));
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    
    try {
      const response = await codeService.executeCode({
        code,
        language: 'cpp',
        input: ''
      });
      setOutput(response.data.output || response.data.error || 'No output');
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveSnippet = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const title = prompt('Enter a title for your snippet:');
    if (!title) return;

    setIsSaving(true);
    try {
      await codeService.saveSnippet({
        title,
        code,
        language: 'cpp',
        description: '',
        isPublic: false
      });
      await fetchRecentSnippets();
    } catch (error) {
      console.error('Error saving snippet:', error);
      alert('Failed to save snippet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareCode = async () => {
    try {
      const response = await codeService.shareCode({ code, language: 'cpp' });
      const shareUrl = `${window.location.origin}/code/shared/${response.data.shareId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Check out my C++ code',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing code:', error);
      alert('Failed to share code');
    }
  };

  const handleLoadSnippet = (snippet: CodeSnippet) => {
    setCode(snippet.code);
    setOutput('');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Code className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Code Playground
                </h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/code/snippets')}
                  className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  My Snippets
                </button>
                
                <button
                  onClick={() => router.push('/code/collaborate')}
                  className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Collaborate
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Editor Area */}
            <div className="xl:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                    
                    <button
                      onClick={() => {/* Open settings modal */}}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSaveSnippet}
                      disabled={isSaving || !isAuthenticated}
                      className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    
                    <button
                      onClick={handleShareCode}
                      className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Share className="h-5 w-5 mr-2" />
                      Share
                    </button>
                    
                    <button
                      onClick={handleRunCode}
                      disabled={isRunning}
                      className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                  </div>
                </div>

                {/* Editor and Output */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  {/* Code Editor */}
                  <div className="border-r border-gray-200 dark:border-gray-700">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-900 dark:text-white">Code Editor</h3>
                    </div>
                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      language="cpp"
                      height="500px"
                      theme={settings.theme}
                      fontSize={settings.fontSize}
                      tabSize={settings.tabSize}
                      wordWrap={settings.wordWrap}
                      showLineNumbers={settings.showLineNumbers}
                    />
                  </div>

                  {/* Output */}
                  <div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-900 dark:text-white">Output</h3>
                    </div>
                    <div className="h-[500px] overflow-auto">
                      <pre className="p-4 bg-gray-900 text-green-400 h-full font-mono text-sm whitespace-pre-wrap">
                        {output || 'Click "Run" to see output...'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setCode(`#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Hello World Template
                  </button>
                  
                  <button
                    onClick={() => setCode(`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> numbers = {1, 2, 3, 4, 5};
    
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}`)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Vector Example
                  </button>
                  
                  <button
                    onClick={() => setCode('')}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear Editor
                  </button>
                </div>
              </motion.div>

              {/* Recent Snippets */}
              {isAuthenticated && recentSnippets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Recent Snippets
                  </h3>
                  <div className="space-y-3">
                    {recentSnippets.slice(0, 5).map((snippet) => (
                      <div
                        key={snippet.id}
                        onClick={() => handleLoadSnippet(snippet)}
                        className="cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {snippet.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(snippet.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => router.push('/code/snippets')}
                    className="w-full mt-3 text-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All Snippets
                  </button>
                </motion.div>
              )}

              {/* Popular Snippets */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Popular Snippets
                </h3>
                <div className="space-y-3">
                  {popularSnippets.slice(0, 5).map((snippet) => (
                    <div
                      key={snippet.id}
                      onClick={() => handleLoadSnippet(snippet)}
                      className="cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {snippet.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          by {snippet.author?.username || 'Anonymous'}
                        </p>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {snippet.likes || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Help & Tips */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tips</h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>Ctrl/Cmd + Enter:</strong> Run code
                  </div>
                  <div>
                    <strong>Ctrl/Cmd + S:</strong> Save snippet
                  </div>
                  <div>
                    <strong>Ctrl/Cmd + /:</strong> Toggle comment
                  </div>
                  <div>
                    <strong>Alt + Shift + F:</strong> Format code
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CodePlayground;