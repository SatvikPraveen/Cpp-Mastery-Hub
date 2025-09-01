// File: frontend/src/hooks/useTheme.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { storageService } from '../services/storage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  enableColorScheme = true
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get the actual theme to apply (resolve 'system' to actual theme)
  const actualTheme = theme === 'system' ? systemTheme : theme;

  // Initialize theme from storage
  useEffect(() => {
    const savedTheme = storageService.getTheme();
    setThemeState(savedTheme);
    setMounted(true);
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [enableSystem]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const body = window.document.body;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(actualTheme);
    body.classList.add(actualTheme);

    // Set CSS custom properties for theme
    if (actualTheme === 'dark') {
      root.style.setProperty('--color-scheme', 'dark');
    } else {
      root.style.setProperty('--color-scheme', 'light');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        actualTheme === 'dark' ? '#1f2937' : '#ffffff'
      );
    }

    // Update color-scheme CSS property if enabled
    if (enableColorScheme) {
      root.style.setProperty('color-scheme', actualTheme);
    }
  }, [actualTheme, mounted, enableColorScheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storageService.setTheme(newTheme);

    // Dispatch custom event for other parts of the app
    window.dispatchEvent(
      new CustomEvent('themeChange', {
        detail: { theme: newTheme, actualTheme: newTheme === 'system' ? systemTheme : newTheme }
      })
    );
  }, [systemTheme]);

  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // If currently system, toggle to opposite of system theme
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [theme, systemTheme, setTheme]);

  const contextValue: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
    systemTheme,
    isSystemTheme: theme === 'system'
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for theme-aware styles
export const useThemeStyles = () => {
  const { actualTheme } = useTheme();

  const getThemeClass = useCallback((lightClass: string, darkClass: string) => {
    return actualTheme === 'dark' ? darkClass : lightClass;
  }, [actualTheme]);

  const getThemeValue = useCallback(<T>(lightValue: T, darkValue: T): T => {
    return actualTheme === 'dark' ? darkValue : lightValue;
  }, [actualTheme]);

  return {
    theme: actualTheme,
    isDark: actualTheme === 'dark',
    isLight: actualTheme === 'light',
    getThemeClass,
    getThemeValue
  };
};

// Hook for system theme detection (without context)
export const useSystemTheme = (): 'light' | 'dark' => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return systemTheme;
};

// Hook for theme transitions
export const useThemeTransition = (duration: number = 150) => {
  const { actualTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), duration);
    return () => clearTimeout(timer);
  }, [actualTheme, duration]);

  return isTransitioning;
};

// Hook for theme-aware colors
export const useThemeColors = () => {
  const { actualTheme } = useTheme();

  const colors = {
    light: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)'
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#22d3ee',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#9ca3af',
      border: '#374151',
      shadow: 'rgba(0, 0, 0, 0.25)'
    }
  };

  return colors[actualTheme];
};

// Hook for responsive theme classes
export const useThemeClasses = () => {
  const { actualTheme } = useTheme();

  const classes = {
    light: {
      container: 'bg-white text-gray-900',
      surface: 'bg-gray-50 text-gray-900',
      card: 'bg-white border-gray-200 shadow-sm',
      input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
      button: {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
        outline: 'border-gray-300 text-gray-700 hover:bg-gray-50'
      },
      text: {
        primary: 'text-gray-900',
        secondary: 'text-gray-600',
        muted: 'text-gray-400'
      }
    },
    dark: {
      container: 'bg-gray-900 text-white',
      surface: 'bg-gray-800 text-white',
      card: 'bg-gray-800 border-gray-700 shadow-lg',
      input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
      button: {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
        outline: 'border-gray-600 text-gray-300 hover:bg-gray-700'
      },
      text: {
        primary: 'text-white',
        secondary: 'text-gray-300',
        muted: 'text-gray-500'
      }
    }
  };

  return classes[actualTheme];
};

// Hook for theme persistence
export const useThemePersistence = () => {
  const { theme, setTheme } = useTheme();

  const saveThemeToServer = useCallback(async (newTheme: Theme) => {
    try {
      // In a real app, you would save to your API
      // await userService.updatePreferences({ theme: newTheme });
      console.log('Theme saved to server:', newTheme);
    } catch (error) {
      console.error('Failed to save theme to server:', error);
    }
  }, []);

  const loadThemeFromServer = useCallback(async () => {
    try {
      // In a real app, you would load from your API
      // const preferences = await userService.getPreferences();
      // setTheme(preferences.theme);
      console.log('Theme loaded from server');
    } catch (error) {
      console.error('Failed to load theme from server:', error);
    }
  }, [setTheme]);

  useEffect(() => {
    saveThemeToServer(theme);
  }, [theme, saveThemeToServer]);

  return {
    saveThemeToServer,
    loadThemeFromServer
  };
};

// Higher-order component for theme-aware components
interface WithThemeProps {
  theme: 'light' | 'dark';
  isDark: boolean;
  isLight: boolean;
  themeClasses: ReturnType<typeof useThemeClasses>;
  themeColors: ReturnType<typeof useThemeColors>;
}

export const withTheme = <P extends object>(
  Component: React.ComponentType<P & WithThemeProps>
) => {
  return function ThemedComponent(props: P) {
    const { actualTheme } = useTheme();
    const themeClasses = useThemeClasses();
    const themeColors = useThemeColors();

    const themeProps: WithThemeProps = {
      theme: actualTheme,
      isDark: actualTheme === 'dark',
      isLight: actualTheme === 'light',
      themeClasses,
      themeColors
    };

    return <Component {...props} {...themeProps} />;
  };
};

// Custom hook for media queries with theme awareness
export const useThemeMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
};

export default useTheme;