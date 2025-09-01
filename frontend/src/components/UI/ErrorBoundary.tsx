// File: frontend/src/components/UI/ErrorBoundary.tsx
// Extension: .tsx (TypeScript React Component)

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. Please try again.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-100 rounded-lg">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <pre className="text-sm text-red-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/"
                className="text-sm text-blue-600 hover:underline"
              >
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error);
    }
  };
};

// HOC for adding error boundary to components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Error</h1>
          <p className="text-gray-600 mb-4">
            This page encountered an error and couldn't be displayed.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </a>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          This component failed to load. Please refresh the page.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Global error handler setup
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(event.reason);
    }
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(event.error);
    }
  });
};