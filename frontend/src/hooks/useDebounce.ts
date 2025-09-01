// File: frontend/src/hooks/useDebounce.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook that debounces a value by delaying the update until after a specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook that debounces a callback function
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @param deps - Dependency array for the callback
 * @returns The debounced function
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook that provides debounced state with immediate and debounced values
 * @param initialValue - Initial value
 * @param delay - The delay in milliseconds
 * @returns Object with immediate value, debounced value, and setter
 */
export const useDebouncedState = <T>(
  initialValue: T,
  delay: number
): {
  value: T;
  debouncedValue: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  isDebouncing: boolean;
} => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsDebouncing(true);
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, debouncedValue]);

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing
  };
};

/**
 * Hook for debounced search functionality
 * @param searchTerm - The search term to debounce
 * @param delay - The delay in milliseconds
 * @returns Object with search state and utilities
 */
export const useDebouncedSearch = (
  searchTerm: string,
  delay: number = 300
): {
  debouncedSearchTerm: string;
  isSearching: boolean;
  clearSearch: () => void;
} => {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const clearSearch = useCallback(() => {
    setIsSearching(false);
  }, []);

  return {
    debouncedSearchTerm,
    isSearching,
    clearSearch
  };
};

/**
 * Hook that debounces an effect
 * @param effect - The effect function to debounce
 * @param deps - Dependency array
 * @param delay - The delay in milliseconds
 */
export const useDebouncedEffect = (
  effect: React.EffectCallback,
  deps: React.DependencyList,
  delay: number
): void => {
  useEffect(() => {
    const handler = setTimeout(() => {
      effect();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [...deps, delay]);
};

/**
 * Hook for debounced API calls
 * @param apiCall - The API function to call
 * @param delay - The delay in milliseconds
 * @returns Object with loading state and debounced call function
 */
export const useDebouncedApiCall = <TArgs extends any[], TResult>(
  apiCall: (...args: TArgs) => Promise<TResult>,
  delay: number = 300
): {
  loading: boolean;
  error: Error | null;
  data: TResult | null;
  debouncedCall: (...args: TArgs) => void;
  cancel: () => void;
} => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResult | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const debouncedCall = useDebouncedCallback(
    async (...args: TArgs) => {
      cancel(); // Cancel any previous calls

      setLoading(true);
      setError(null);
      
      abortControllerRef.current = new AbortController();

      try {
        const result = await apiCall(...args);
        if (!abortControllerRef.current.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!abortControllerRef.current.signal.aborted) {
          setError(err instanceof Error ? err : new Error('API call failed'));
          setLoading(false);
        }
      }
    },
    delay,
    [apiCall, delay]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    loading,
    error,
    data,
    debouncedCall,
    cancel
  };
};

/**
 * Hook for debounced form validation
 * @param values - Form values to validate
 * @param validator - Validation function
 * @param delay - The delay in milliseconds
 * @returns Object with validation state
 */
export const useDebouncedValidation = <T extends Record<string, any>>(
  values: T,
  validator: (values: T) => Record<string, string> | Promise<Record<string, string>>,
  delay: number = 300
): {
  errors: Record<string, string>;
  isValidating: boolean;
  isValid: boolean;
} => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  
  const debouncedValues = useDebounce(values, delay);

  useEffect(() => {
    const validateValues = async () => {
      setIsValidating(true);
      try {
        const validationErrors = await validator(debouncedValues);
        setErrors(validationErrors);
      } catch (err) {
        console.error('Validation error:', err);
        setErrors({ _general: 'Validation failed' });
      } finally {
        setIsValidating(false);
      }
    };

    if (Object.keys(debouncedValues).length > 0) {
      validateValues();
    }
  }, [debouncedValues, validator]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    errors,
    isValidating,
    isValid
  };
};

/**
 * Hook that combines debouncing with local storage
 * @param key - localStorage key
 * @param initialValue - Initial value
 * @param delay - The delay in milliseconds
 * @returns Object with value, setter, and debounced persistence
 */
export const useDebouncedLocalStorage = <T>(
  key: string,
  initialValue: T,
  delay: number = 1000
): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  isPersisting: boolean;
} => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const [isPersisting, setIsPersisting] = useState(false);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsPersisting(true);
    try {
      window.localStorage.setItem(key, JSON.stringify(debouncedValue));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    } finally {
      setIsPersisting(false);
    }
  }, [key, debouncedValue]);

  return {
    value,
    setValue,
    isPersisting
  };
};