// File: frontend/src/pages/code/snippets.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, Filter, Code, Star, Eye, Download, Trash2, Edit, Plus, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import CodeEditor from '../../components/Code/CodeEditor';
import { useAuth } from '../../hooks/useAuth';
import { codeService } from '../../services/api';
import { CodeSnippet } from '../../types';

interface CodeSnippetsProps {}

const CodeSnippets: React.FC<CodeSnippetsProps> = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'algorithms', name: 'Algorithms' },
    { id: 'data-structures', name: 'Data Structures' },
    { id: 'fundamentals', name: 'Fundamentals' },
    { id: 'oop', name: 'Object-Oriented' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'examples', name: 'Examples' }
  ];

  const languages = [
    { id: 'all', name: 'All Languages' },
    { id: 'cpp', name: 'C++' },
    { id: 'c', name: 'C' }
  ];

  const sortOptions = [
    { id: 'recent', name: 'Most Recent' },
    { id: 'popular', name: 'Most Popular' },
    { id: 'alphabetical', name: 'Alphabetical' },
    { id: 'oldest', name: 'Oldest First' }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchSnippets();
    } else {
      router.push('/auth/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterSnippets();
  }, [snippets, searchQuery, selectedCategory, selectedLanguage, sortBy]);

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      const response = await codeService.getUserSnippets();
      setSnippets(response.data);
    } catch (error) {
      console.error('Error fetching snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSnippets = () => {
    let filtered = [...snippets];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(snippet =>
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(snippet => snippet.category === selectedCategory);
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(snippet => snippet.language === selectedLanguage);
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    setFilteredSnippets(filtered);
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;

    try {
      await codeService.deleteSnippet(snippetId);
      setSnippets(snippets.filter(s => s.id !== snippetId));
    } catch (error) {
      console.error('Error deleting snippet:', error);
      alert('Failed to delete snippet');
    }
  };

  const handleEditSnippet = (snippet: CodeSnippet) => {
    router.push(`/code/edit/${snippet.id}`);
  };

  const handlePreviewSnippet = (snippet: CodeSnippet) => {
    setSelectedSnippet(snippet);
    setShowPreview(true);
  };

  const handleLoadInPlayground = (snippet: CodeSnippet) => {
    localStorage.setItem('playgroundCode', snippet.code);
    router.push('/code');
  };

  const handleExportSnippet = (snippet: CodeSnippet) => {
    const dataStr = `data:text/plain;charset=utf-8,${encodeURIComponent(snippet.code)}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `${snippet.title}.cpp`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const SnippetCard: React.FC<{ snippet: CodeSnippet; index: number }> = ({ snippet, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {snippet.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {snippet.description || 'No description provided'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => handlePreviewSnippet(snippet)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleEditSnippet(snippet)}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleDeleteSnippet(snippet.id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center space-x-4">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full text-xs">
              {snippet.language.toUpperCase()}
            </span>
            
            {snippet.category && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                {snippet.category}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {snippet.isPublic && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span>{snippet.likes || 0}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{new Date(snippet.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 mb-4">
          <pre className="text-green-400 text-xs font-mono overflow-hidden" style={{ maxHeight: '100px' }}>
            {snippet.code.split('\n').slice(0, 5).join('\n')}
            {snippet.code.split('\n').length > 5 && '\n...'}
          </pre>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => handleLoadInPlayground(snippet)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Code className="h-4 w-4 mr-2" />
            Open in Playground
          </button>
          
          <button
            onClick={() => handleExportSnippet(snippet)}
            className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please sign in to access your code snippets.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              My Code Snippets
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and organize your code snippets
            </p>
          </div>
          
          <button
            onClick={() => router.push('/code')}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Snippet
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search snippets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {languages.map(language => (
                <option key={language.id} value={language.id}>
                  {language.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {sortOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''} found
            </p>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className="grid grid-cols-2 gap-1 w-4 h-4">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className="space-y-1 w-4 h-4">
                  <div className="bg-current h-1 rounded"></div>
                  <div className="bg-current h-1 rounded"></div>
                  <div className="bg-current h-1 rounded"></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="text-center py-12">
            <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No snippets found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || selectedCategory !== 'all' || selectedLanguage !== 'all'
                ? 'Try adjusting your search criteria.'
                : 'Start by creating your first code snippet.'}
            </p>
            <button
              onClick={() => router.push('/code')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Snippet
            </button>
          </div>
        ) : (
          <div className={`${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'}`}
          >
            {filteredSnippets.map((snippet, index) => (
              <SnippetCard key={snippet.id} snippet={snippet} index={index} />
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedSnippet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSnippet.title}
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                <CodeEditor
                  value={selectedSnippet.code}
                  language={selectedSnippet.language}
                  readOnly={true}
                  height="400px"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleLoadInPlayground(selectedSnippet)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open in Playground
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CodeSnippets;