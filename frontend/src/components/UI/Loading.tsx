// File: frontend/src/components/UI/Loading.tsx
// Extension: .tsx (TypeScript React Component)

import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  overlay = false,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-8 h-8';
      case 'lg': return 'w-12 h-12';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
    }
  };

  const renderSpinner = () => (
    <svg
      className={`animate-spin ${getSizeClasses()} text-blue-600`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'}
            bg-blue-600 rounded-full animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={`
        ${getSizeClasses()}
        bg-blue-600 rounded-full animate-pulse
      `}
    />
  );

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'spinner': return renderSpinner();
      case 'dots': return renderDots();
      case 'pulse': return renderPulse();
      case 'skeleton': return renderSkeleton();
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {text && (
        <p className={`text-gray-600 ${getTextSize()}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Specific loading components for common use cases
export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-screen">
    <Loading size="lg" text={text} />
  </div>
);

export const SectionLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center justify-center py-12">
    <Loading text={text} />
  </div>
);

export const ButtonLoading: React.FC = () => (
  <Loading size="sm" variant="spinner" />
);

export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center space-x-2">
    <Loading size="sm" variant="spinner" />
    {text && <span className="text-sm text-gray-600">{text}</span>}
  </div>
);

export const TableLoading: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex space-x-4">
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        <div className="h-4 bg-gray-300 rounded w-1/6"></div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
      </div>
    ))}
  </div>
);

export const CardLoading: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    </div>
  </div>
);