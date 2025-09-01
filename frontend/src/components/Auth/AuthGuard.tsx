// File: frontend/src/components/Auth/AuthGuard.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Loading } from '../UI/Loading';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Mock auth hook - replace with your actual auth implementation
const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Validate token with backend
          const response = await fetch('/api/auth/validate', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const user = await response.json();
            setAuthState({ user, loading: false, error: null });
          } else {
            localStorage.removeItem('auth_token');
            setAuthState({ user: null, loading: false, error: null });
          }
        } else {
          setAuthState({ user: null, loading: false, error: null });
        }
      } catch (error) {
        setAuthState({ user: null, loading: false, error: 'Auth check failed' });
      }
    };

    checkAuth();
  }, []);

  return authState;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  requireAdmin = false,
  redirectTo = '/auth/login'
}) => {
  const router = useRouter();
  const { user, loading, error } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (loading || hasRedirected) return;

    // If auth is required but user is not authenticated
    if (requireAuth && !user) {
      setHasRedirected(true);
      const returnUrl = encodeURIComponent(router.asPath);
      router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    // If admin is required but user is not admin
    if (requireAdmin && user && user.role !== 'admin') {
      setHasRedirected(true);
      router.replace('/unauthorized');
      return;
    }

    // If user is authenticated but on auth pages, redirect to dashboard
    if (!requireAuth && user && router.pathname.startsWith('/auth')) {
      setHasRedirected(true);
      const returnUrl = router.query.returnUrl as string;
      router.replace(returnUrl || '/dashboard');
      return;
    }
  }, [user, loading, requireAuth, requireAdmin, router, redirectTo, hasRedirected]);

  // Show loading while checking auth
  if (loading) {
    return fallback || <Loading />;
  }

  // Show error if auth check failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, show nothing (redirect in progress)
  if (requireAuth && !user) {
    return null;
  }

  // If admin is required but user is not admin, show nothing (redirect in progress)
  if (requireAdmin && user && user.role !== 'admin') {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
};

// Higher-order component version
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) => {
  const AuthGuardedComponent = (props: P) => (
    <AuthGuard {...options}>
      <Component {...props} />
    </AuthGuard>
  );

  AuthGuardedComponent.displayName = `withAuthGuard(${
    Component.displayName || Component.name
  })`;

  return AuthGuardedComponent;
};

// Specific guards for common use cases
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthGuard requireAdmin>{children}</AuthGuard>
);

export const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthGuard requireAuth={false}>{children}</AuthGuard>
);