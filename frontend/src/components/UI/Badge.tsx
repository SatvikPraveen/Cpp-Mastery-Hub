// File: frontend/src/components/UI/Badge.tsx
// Extension: .tsx (TypeScript React Component)

import React from 'react';

export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  removable = false,
  onRemove,
  icon,
  dot = false
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'secondary':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-0.5';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'primary': return 'bg-blue-500';
      case 'secondary': return 'bg-gray-500';
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full border
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-2 h-2 rounded-full ${getDotColor()}`} />
      )}
      
      {icon && (
        <span className="w-3 h-3">
          {icon}
        </span>
      )}
      
      <span>{children}</span>
      
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
          aria-label="Remove badge"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

// Specialized badge components
export const StatusBadge: React.FC<{
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed';
  children?: React.ReactNode;
}> = ({ status, children }) => {
  const statusConfig = {
    active: { variant: 'success' as BadgeVariant, text: 'Active', dot: true },
    inactive: { variant: 'secondary' as BadgeVariant, text: 'Inactive', dot: true },
    pending: { variant: 'warning' as BadgeVariant, text: 'Pending', dot: true },
    completed: { variant: 'success' as BadgeVariant, text: 'Completed', dot: true },
    failed: { variant: 'error' as BadgeVariant, text: 'Failed', dot: true }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {children || config.text}
    </Badge>
  );
};

export const SkillBadge: React.FC<{
  skill: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  removable?: boolean;
  onRemove?: () => void;
}> = ({ skill, level, removable, onRemove }) => {
  const levelConfig = {
    beginner: { variant: 'info' as BadgeVariant, icon: '📚' },
    intermediate: { variant: 'warning' as BadgeVariant, icon: '⚡' },
    advanced: { variant: 'success' as BadgeVariant, icon: '🏆' }
  };

  const config = level ? levelConfig[level] : null;

  return (
    <Badge
      variant={config?.variant || 'default'}
      removable={removable}
      onRemove={onRemove}
      icon={config && <span>{config.icon}</span>}
    >
      {skill}
    </Badge>
  );
};

export const CountBadge: React.FC<{
  count: number;
  max?: number;
  variant?: BadgeVariant;
}> = ({ count, max, variant = 'primary' }) => {
  const displayCount = max && count > max ? `${max}+` : count.toString();
  
  return (
    <Badge variant={variant} size="sm">
      {displayCount}
    </Badge>
  );
};

export const NewBadge: React.FC = () => (
  <Badge variant="error" size="sm">
    NEW
  </Badge>
);

export const ProBadge: React.FC = () => (
  <Badge 
    variant="warning" 
    size="sm"
    icon={
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    }
  >
    PRO
  </Badge>
);

export const BetaBadge: React.FC = () => (
  <Badge variant="info" size="sm">
    BETA
  </Badge>
);