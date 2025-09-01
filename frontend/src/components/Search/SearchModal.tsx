// File: frontend/src/components/Search/SearchModal.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../UI/Modal';
import { Loading } from '../UI/Loading';
import { Badge } from '../UI/Badge';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'code' | 'forum' | 'user';
  title: string;
  description?: string;
  url: string;
  category?: string;
  tags?: string[];
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    author?: string;
    lastUpdated?: string;
    popularity?: number;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        // Mock search API call
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));

    // Navigate to result
    if (onNavigate) {
      onNavigate(result.url);
    } else {
      window.location.href = result.url;
    }
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'lesson':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'code':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'forum':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'course': return 'primary';
      case 'lesson': return 'info';
      case 'code': return 'secondary';
      case 'forum': return 'warning';
      case 'user': return 'success';
      default: return 'default';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-0">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, lessons, code snippets..."
              className="block w-full pl-10 pr-3 py-3 border-0 bg-transparent text-lg placeholder-gray-500 focus:outline-none"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Loading size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Recent searches</h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try searching with different keywords</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`
                    w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start space-x-3
                    ${index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5 text-gray-400">
                    {getTypeIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </h4>
                      <Badge variant={getTypeBadgeVariant(result.type)} size="sm">
                        {result.type}
                      </Badge>
                      {result.metadata?.difficulty && (
                        <Badge variant="secondary" size="sm">
                          {result.metadata.difficulty}
                        </Badge>
                      )}
                    </div>
                    
                    {result.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    
                    {result.category && (
                      <p className="text-xs text-gray-500 mt-1">
                        {result.category}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs ml-1">↓</kbd>
              <span className="ml-2">to navigate</span>
            </span>
            <span className="flex items-center">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↵</kbd>
              <span className="ml-2">to select</span>
            </span>
          </div>
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">esc</kbd>
            <span className="ml-2">to close</span>
          </span>
        </div>
      </div>
    </Modal>
  );
};