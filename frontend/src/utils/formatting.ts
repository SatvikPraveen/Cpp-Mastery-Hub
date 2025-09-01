// File: frontend/src/utils/formatting.ts
// Extension: .ts
// Location: frontend/src/utils/formatting.ts

/**
 * Format a date to a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return targetDate.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a date to a short string (MM/DD/YYYY)
 */
export function formatDateShort(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format a time to HH:MM format
 */
export function formatTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return (num * 100).toFixed(decimals) + '%';
}

/**
 * Format a number with compact notation (e.g., 1.2K, 1.5M)
 */
export function formatCompactNumber(num: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  return formatter.format(num);
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format execution time in milliseconds
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format memory size in bytes to human-readable format
 */
export function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * Format C++ code with basic indentation
 */
export function formatCppCode(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (let line of lines) {
    line = line.trim();
    
    if (line === '') {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for closing braces
    if (line.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add indentation
    const indentedLine = '  '.repeat(indentLevel) + line;
    formattedLines.push(indentedLine);

    // Increase indent for opening braces
    if (line.includes('{') && !line.includes('}')) {
      indentLevel++;
    }

    // Handle special cases
    if (line.startsWith('case ') || line.startsWith('default:')) {
      indentLevel++;
    }
    if (line.includes('break;') && indentLevel > 0) {
      indentLevel--;
    }
  }

  return formattedLines.join('\n');
}

/**
 * Format code line numbers
 */
export function formatLineNumber(lineNumber: number, totalLines: number): string {
  const maxWidth = totalLines.toString().length;
  return lineNumber.toString().padStart(maxWidth, ' ');
}

/**
 * Format progress as a percentage string
 */
export function formatProgress(current: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (current / total) * 100;
  return `${Math.round(percentage)}%`;
}

/**
 * Format score with appropriate precision
 */
export function formatScore(score: number, maxScore: number = 100): string {
  const percentage = (score / maxScore) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format difficulty level
 */
export function formatDifficulty(level: number): string {
  const difficulties = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
  return difficulties[Math.min(level - 1, difficulties.length - 1)] || 'Unknown';
}

/**
 * Format language display name
 */
export function formatLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    'cpp': 'C++',
    'c++': 'C++',
    'cpp11': 'C++11',
    'cpp14': 'C++14',
    'cpp17': 'C++17',
    'cpp20': 'C++20',
    'cpp23': 'C++23',
    'c': 'C',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'rust': 'Rust',
    'go': 'Go'
  };

  return languageMap[language.toLowerCase()] || language;
}

/**
 * Format user status
 */
export function formatUserStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Active',
    'inactive': 'Inactive',
    'pending': 'Pending Verification',
    'suspended': 'Suspended',
    'premium': 'Premium Member',
    'moderator': 'Moderator',
    'admin': 'Administrator'
  };

  return statusMap[status] || status;
}

/**
 * Format notification type
 */
export function formatNotificationType(type: string): string {
  const typeMap: Record<string, string> = {
    'like': 'Like',
    'comment': 'Comment',
    'mention': 'Mention',
    'follow': 'Follow',
    'achievement': 'Achievement',
    'system': 'System',
    'course_update': 'Course Update',
    'new_lesson': 'New Lesson'
  };

  return typeMap[type] || type;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format file extension for display
 */
export function formatFileExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return '';
  
  const extensionMap: Record<string, string> = {
    'cpp': 'C++',
    'hpp': 'C++ Header',
    'cc': 'C++',
    'cxx': 'C++',
    'h': 'Header',
    'c': 'C',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'rs': 'Rust',
    'go': 'Go',
    'md': 'Markdown',
    'txt': 'Text',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML'
  };

  return extensionMap[extension] || extension.toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format plural forms
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || singular + 's';
  return count === 1 ? singular : pluralForm;
}

/**
 * Format error messages for display
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
}