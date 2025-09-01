// File: frontend/src/components/Search/SearchResults.tsx
// Extension: .tsx (TypeScript React Component)

import React from 'react';
import { Badge } from '../UI/Badge';
import { Loading } from '../UI/Loading';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'code' | 'forum' | 'user';
  title: string;
  description?: string;
  url: string;
  category?: string;
  tags?: string[];
  thumbnail?: string;
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    author?: string;
    lastUpdated?: string;
    popularity?: number;
    rating?: number;
    duration?: string;
    language?: string;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  totalCount?: number;
  onResultClick: (result: SearchResult) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  viewMode?: 'list' | 'grid';
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  query,
  totalCount,
  onResultClick,
  onLoadMore,
  hasMore = false,
  viewMode = 'list'
}) => {
  const getTypeIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
      case 'course':
        return (
          <svg className={`${iconClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'lesson':
        return (
          <svg className={`${iconClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'code':
        return (
          <svg className={`${iconClass} text-purple-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'forum':
        return (
          <svg className={`${iconClass} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
          </svg>
        );
      case 'user':
        return (
          <svg className={`${iconClass} text-indigo-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M15 7l-3 3" />
          </svg>
        );
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderListItem = (result: SearchResult) => (
    <div
      key={result.id}
      onClick={() => onResultClick(result)}
      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white"
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getTypeIcon(result.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                  {result.title}
                </h3>
                <Badge variant="secondary" size="sm">
                  {result.type}
                </Badge>
                {result.metadata?.difficulty && (
                  <Badge variant={getDifficultyColor(result.metadata.difficulty)} size="sm">
                    {result.metadata.difficulty}
                  </Badge>
                )}
              </div>

              {result.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {result.description}
                </p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {result.category && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {result.category}
                  </span>
                )}
                
                {result.metadata?.author && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {result.metadata.author}
                  </span>
                )}

                {result.metadata?.lastUpdated && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(result.metadata.lastUpdated)}
                  </span>
                )}

                {result.metadata?.duration && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {result.metadata.duration}
                  </span>
                )}
              </div>

              {result.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {result.tags.slice(0, 4).map((tag, index) => (
                    <Badge key={index} variant="secondary" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {result.tags.length > 4 && (
                    <Badge variant="secondary" size="sm">
                      +{result.tags.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail or Rating */}
            <div className="flex-shrink-0 ml-4">
              {result.thumbnail ? (
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : result.metadata?.rating && (
                <div className="flex items-center text-yellow-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">
                    {result.metadata.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridItem = (result: SearchResult) => (
    <div
      key={result.id}
      onClick={() => onResultClick(result)}
      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white"
    >
      <div className="flex items-center mb-3">
        {getTypeIcon(result.type)}
        <Badge variant="secondary" size="sm" className="ml-2">
          {result.type}
        </Badge>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {result.title}
      </h3>

      {result.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {result.description}
        </p>
      )}

      {result.metadata?.difficulty && (
        <div className="mb-3">
          <Badge variant={getDifficultyColor(result.metadata.difficulty)} size="sm">
            {result.metadata.difficulty}
          </Badge>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        {result.category && <div>Category: {result.category}</div>}
        {result.metadata?.author && <div>By: {result.metadata.author}</div>}
        {result.metadata?.lastUpdated && (
          <div>Updated: {formatDate(result.metadata.lastUpdated)}</div>
        )}
      </div>
    </div>
  );

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Searching..." />
      </div>
    );
  }

  if (!loading && results.length === 0 && query) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600">
          We couldn't find anything matching "<strong>{query}</strong>".
        </p>
        <p className="text-gray-600 mt-1">
          Try adjusting your search terms or using different keywords.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      {totalCount !== undefined && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {totalCount > 0 ? (
              <>
                Showing {results.length} of {totalCount} results for "
                <strong>{query}</strong>"
              </>
            ) : (
              <>No results found for "<strong>{query}</strong>"</>
            )}
          </p>
        </div>
      )}

      {/* Results List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-4"
      }>
        {results.map(result => 
          viewMode === 'grid' 
            ? renderGridItem(result)
            : renderListItem(result)
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center py-6">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
          >
            {loading ? (
              <>
                <Loading size="sm" />
                <span className="ml-2">Loading...</span>
              </>
            ) : (
              'Load More Results'
            )}
          </button>
        </div>
      )}
    </div>
  );
};