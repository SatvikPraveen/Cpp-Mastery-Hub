// File: frontend/src/components/Search/SearchFilters.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Badge } from '../UI/Badge';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface SearchFilters {
  type: string[];
  difficulty: string[];
  category: string[];
  language: string[];
  author: string[];
  dateRange: {
    from?: string;
    to?: string;
  };
  rating: {
    min?: number;
    max?: number;
  };
  duration: {
    min?: number;
    max?: number;
  };
  tags: string[];
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableOptions?: {
    types?: FilterOption[];
    difficulties?: FilterOption[];
    categories?: FilterOption[];
    languages?: FilterOption[];
    authors?: FilterOption[];
    tags?: FilterOption[];
  };
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  availableOptions = {},
  showAdvanced = false,
  onToggleAdvanced
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = localFilters[key] as string[];
    const updated = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, updated);
  };

  const clearAllFilters = () => {
    const clearedFilters: SearchFilters = {
      type: [],
      difficulty: [],
      category: [],
      language: [],
      author: [],
      dateRange: {},
      rating: {},
      duration: {},
      tags: []
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return (
      filters.type.length +
      filters.difficulty.length +
      filters.category.length +
      filters.language.length +
      filters.author.length +
      filters.tags.length +
      (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
      (filters.rating.min || filters.rating.max ? 1 : 0) +
      (filters.duration.min || filters.duration.max ? 1 : 0)
    );
  };

  const defaultOptions = {
    types: [
      { value: 'course', label: 'Courses' },
      { value: 'lesson', label: 'Lessons' },
      { value: 'code', label: 'Code Snippets' },
      { value: 'forum', label: 'Forum Posts' },
      { value: 'user', label: 'Users' }
    ],
    difficulties: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ],
    categories: [
      { value: 'fundamentals', label: 'Fundamentals' },
      { value: 'oop', label: 'Object-Oriented Programming' },
      { value: 'stl', label: 'Standard Template Library' },
      { value: 'algorithms', label: 'Algorithms' },
      { value: 'data-structures', label: 'Data Structures' },
      { value: 'memory-management', label: 'Memory Management' },
      { value: 'concurrency', label: 'Concurrency' },
      { value: 'best-practices', label: 'Best Practices' }
    ],
    languages: [
      { value: 'cpp', label: 'C++' },
      { value: 'c', label: 'C' },
      { value: 'python', label: 'Python' },
      { value: 'javascript', label: 'JavaScript' }
    ]
  };

  const options = {
    types: availableOptions.types || defaultOptions.types,
    difficulties: availableOptions.difficulties || defaultOptions.difficulties,
    categories: availableOptions.categories || defaultOptions.categories,
    languages: availableOptions.languages || defaultOptions.languages,
    authors: availableOptions.authors || [],
    tags: availableOptions.tags || []
  };

  const renderCheckboxGroup = (
    title: string,
    filterKey: keyof SearchFilters,
    optionsList: FilterOption[]
  ) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">{title}</h4>
      <div className="space-y-2">
        {optionsList.map(option => (
          <label key={option.value} className="flex items-center">
            <input
              type="checkbox"
              checked={(localFilters[filterKey] as string[]).includes(option.value)}
              onChange={() => toggleArrayFilter(filterKey, option.value)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 flex-1">
              {option.label}
            </span>
            {option.count !== undefined && (
              <span className="text-xs text-gray-500">({option.count})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );

  const renderRangeInput = (
    title: string,
    filterKey: 'rating' | 'duration',
    min: number,
    max: number,
    step: number = 1,
    unit: string = ''
  ) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localFilters[filterKey].min || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : undefined;
              updateFilter(filterKey, { ...localFilters[filterKey], min: value });
            }}
            placeholder={`${min}${unit}`}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localFilters[filterKey].max || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : undefined;
              updateFilter(filterKey, { ...localFilters[filterKey], max: value });
            }}
            placeholder={`${max}${unit}`}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderDateRange = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Date Range</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={localFilters.dateRange.from || ''}
            onChange={(e) => {
              updateFilter('dateRange', { 
                ...localFilters.dateRange, 
                from: e.target.value || undefined 
              });
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={localFilters.dateRange.to || ''}
            onChange={(e) => {
              updateFilter('dateRange', { 
                ...localFilters.dateRange, 
                to: e.target.value || undefined 
              });
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="primary" size="sm">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {onToggleAdvanced && (
            <button
              onClick={onToggleAdvanced}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? 'Less' : 'More'} Filters
            </button>
          )}
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {filters.type.map(type => (
              <Badge 
                key={type} 
                variant="primary" 
                size="sm" 
                removable 
                onRemove={() => toggleArrayFilter('type', type)}
              >
                {options.types.find(t => t.value === type)?.label || type}
              </Badge>
            ))}
            {filters.difficulty.map(difficulty => (
              <Badge 
                key={difficulty} 
                variant="warning" 
                size="sm" 
                removable 
                onRemove={() => toggleArrayFilter('difficulty', difficulty)}
              >
                {options.difficulties.find(d => d.value === difficulty)?.label || difficulty}
              </Badge>
            ))}
            {filters.category.map(category => (
              <Badge 
                key={category} 
                variant="info" 
                size="sm" 
                removable 
                onRemove={() => toggleArrayFilter('category', category)}
              >
                {options.categories.find(c => c.value === category)?.label || category}
              </Badge>
            ))}
            {filters.tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                size="sm" 
                removable 
                onRemove={() => toggleArrayFilter('tags', tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Basic Filters */}
      <div className="space-y-6">
        {renderCheckboxGroup('Content Type', 'type', options.types)}
        {renderCheckboxGroup('Difficulty', 'difficulty', options.difficulties)}
        {renderCheckboxGroup('Category', 'category', options.categories)}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-6 pt-6 border-t border-gray-200">
          {options.languages.length > 0 && 
            renderCheckboxGroup('Programming Language', 'language', options.languages)
          }
          {options.authors.length > 0 && 
            renderCheckboxGroup('Author', 'author', options.authors)
          }
          {renderRangeInput('Rating', 'rating', 0, 5, 0.1, ' stars')}
          {renderRangeInput('Duration', 'duration', 0, 300, 5, ' min')}
          {renderDateRange()}
        </div>
      )}
    </div>
  );
};