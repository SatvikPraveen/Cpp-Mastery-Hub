// File: frontend/src/hooks/useAuth.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { authService, LoginCredentials, RegisterData, ChangePasswordData } from '../services/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: () => boolean;
  isInstructor: () => boolean;
  isModerator: () => boolean;
  canAccess: (requiredRole?: string, resourceOwnerId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.user);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if we have a valid token
        const token = authService.getToken();
        if (token && !authService.isTokenExpired()) {
          // Token exists and is valid, user should be set from authService
          setUser(authService.user);
        } else if (token && authService.isTokenExpired()) {
          // Token exists but is expired, try to refresh
          try {
            await authService.refreshToken();
            setUser(authService.user);
          } catch (error) {
            console.error('Token refresh failed:', error);
            await authService.logout();
            setUser(null);
          }
        } else {
          // No token, user is not authenticated
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((newUser) => {
      setUser(newUser);
      if (isInitialized) {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [isInitialized]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!user) return;

    const setupTokenRefresh = () => {
      const token = authService.getToken();
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;
        
        // Refresh token 5 minutes before expiration
        const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);

        if (refreshTime > 0) {
          const timeoutId = setTimeout(async () => {
            try {
              await authService.refreshToken();
            } catch (error) {
              console.error('Automatic token refresh failed:', error);
              await logout();
            }
          }, refreshTime);

          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error setting up token refresh:', error);
      }
    };

    return setupTokenRefresh();
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const authResponse = await authService.login(credentials);
      setUser(authResponse.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const authResponse = await authService.register(userData);
      setUser(authResponse.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client side even if server call fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (userData: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      await authService.changePassword(data);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      await authService.verifyEmail(token);
      // Update user state if verification changes user status
      if (user) {
        setUser({ ...user, isEmailVerified: true });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }, [user]);

  const resendVerificationEmail = useCallback(async (email: string) => {
    try {
      await authService.resendVerificationEmail(email);
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const newToken = await authService.refreshToken();
      if (!newToken) {
        await logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
    }
  }, [logout]);

  // Role-based access methods
  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return authService.hasAnyRole(roles);
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return authService.isAdmin();
  }, [user]);

  const isInstructor = useCallback((): boolean => {
    return authService.isInstructor();
  }, [user]);

  const isModerator = useCallback((): boolean => {
    return authService.isModerator();
  }, [user]);

  const canAccess = useCallback((requiredRole?: string, resourceOwnerId?: string): boolean => {
    return authService.canAccess(requiredRole, resourceOwnerId);
  }, [user]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: authService.isAuthenticated,
    isLoading,
    isEmailVerified: authService.isEmailVerified,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyEmail,
    resendVerificationEmail,
    refreshToken,
    hasRole,
    hasAnyRole,
    isAdmin,
    isInstructor,
    isModerator,
    canAccess
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
interface WithAuthProps {
  requiredRole?: string;
  redirectTo?: string;
  fallback?: React.ComponentType;
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) => {
  const { requiredRole, redirectTo = '/auth/login', fallback: Fallback } = options;

  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, hasRole, user } = useAuth();

    // Show loading state
    if (isLoading) {
      return Fallback ? <Fallback /> : <div>Loading...</div>;
    }

    // Check authentication
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = `${redirectTo}?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      }
      return null;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole) && user?.role !== 'ADMIN') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook for conditional rendering based on auth state
export const useAuthState = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    hasRole, 
    hasAnyRole, 
    isAdmin, 
    isInstructor, 
    isModerator, 
    canAccess 
  } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isInstructor,
    isModerator,
    canAccess
  };
};

// Hook for auth actions
export const useAuthActions = () => {
  const {
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyEmail,
    resendVerificationEmail,
    refreshToken
  } = useAuth();

  return {
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyEmail,
    resendVerificationEmail,
    refreshToken
  };
};

// Custom hook for handling authentication redirects
export const useAuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();

  const redirectToLogin = useCallback((returnUrl?: string) => {
    if (typeof window !== 'undefined') {
      const url = returnUrl || window.location.pathname;
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(url)}`;
    }
  }, []);

  const redirectToRegister = useCallback((returnUrl?: string) => {
    if (typeof window !== 'undefined') {
      const url = returnUrl || window.location.pathname;
      window.location.href = `/auth/register?returnUrl=${encodeURIComponent(url)}`;
    }
  }, []);

  const redirectToDashboard = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/learn';
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    redirectToLogin,
    redirectToRegister,
    redirectToDashboard
  };
};

export default useAuth;