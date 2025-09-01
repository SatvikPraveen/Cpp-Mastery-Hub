// File: frontend/src/hooks/useLocalStorage.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: SetValue<T>) => void;
  removeValue: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing localStorage with TypeScript support
 * @param key - The localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @param options - Configuration options
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    syncAcrossTabs?: boolean;
  }
): UseLocalStorageReturn<T> => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Default serialization functions
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;
  const syncAcrossTabs = options?.syncAcrossTabs ?? true;

  // Get value from localStorage or return initial value
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue, deserialize]);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize value on mount
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);
      const value = readValue();
      setStoredValue(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read from localStorage');
    } finally {
      setLoading(false);
    }
  }, [readValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        setError(null);
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialize(valueToStore));
          
          // Dispatch custom event for cross-tab synchronization
          if (syncAcrossTabs) {
            window.dispatchEvent(
              new CustomEvent('localStorage-change', {
                detail: { key, newValue: valueToStore }
              })
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to write to localStorage';
        setError(errorMessage);
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize, storedValue, syncAcrossTabs]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setError(null);
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        // Dispatch custom event for cross-tab synchronization
        if (syncAcrossTabs) {
          window.dispatchEvent(
            new CustomEvent('localStorage-change', {
              detail: { key, newValue: undefined }
            })
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove from localStorage';
      setError(errorMessage);
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, syncAcrossTabs]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        // Key was removed
        setStoredValue(initialValue);
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        if (e.detail.newValue !== undefined) {
          setStoredValue(e.detail.newValue);
        } else {
          setStoredValue(initialValue);
        }
      }
    };

    // Listen for native storage events (other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events (same tab)
    window.addEventListener('localStorage-change', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-change', handleCustomStorageChange as EventListener);
    };
  }, [key, deserialize, initialValue, syncAcrossTabs]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error
  };
};

// Helper hooks for common use cases
export const useLocalStorageState = <T>(key: string, initialValue: T) => {
  const { value, setValue } = useLocalStorage(key, initialValue);
  return [value, setValue] as const;
};

export const useLocalStorageObject = <T extends Record<string, any>>(
  key: string,
  initialValue: T
) => {
  return useLocalStorage(key, initialValue, {
    serialize: JSON.stringify,
    deserialize: JSON.parse
  });
};

export const useLocalStorageString = (key: string, initialValue: string = '') => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value,
    deserialize: (value) => value
  });
};

export const useLocalStorageNumber = (key: string, initialValue: number = 0) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => parseFloat(value) || initialValue
  });
};

export const useLocalStorageBoolean = (key: string, initialValue: boolean = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => value === 'true'
  });
};

// Hook for managing arrays in localStorage
export const useLocalStorageArray = <T>(key: string, initialValue: T[] = []) => {
  const { value, setValue, removeValue, loading, error } = useLocalStorage(key, initialValue);

  const addItem = useCallback((item: T) => {
    setValue(prev => [...prev, item]);
  }, [setValue]);

  const removeItem = useCallback((index: number) => {
    setValue(prev => prev.filter((_, i) => i !== index));
  }, [setValue]);

  const removeItemByValue = useCallback((item: T) => {
    setValue(prev => prev.filter(existingItem => existingItem !== item));
  }, [setValue]);

  const updateItem = useCallback((index: number, newItem: T) => {
    setValue(prev => prev.map((item, i) => i === index ? newItem : item));
  }, [setValue]);

  const clearArray = useCallback(() => {
    setValue([]);
  }, [setValue]);

  return {
    value,
    setValue,
    removeValue,
    loading,
    error,
    addItem,
    removeItem,
    removeItemByValue,
    updateItem,
    clearArray
  };
};

// Hook for managing localStorage with expiration
export const useLocalStorageWithExpiry = <T>(
  key: string,
  initialValue: T,
  expiryInMinutes: number = 60
) => {
  const serialize = useCallback((value: T) => {
    const now = new Date();
    const item = {
      value,
      expiry: now.getTime() + expiryInMinutes * 60 * 1000
    };
    return JSON.stringify(item);
  }, [expiryInMinutes]);

  const deserialize = useCallback((value: string) => {
    const item = JSON.parse(value);
    const now = new Date();
    
    if (now.getTime() > item.expiry) {
      // Item has expired
      return initialValue;
    }
    
    return item.value;
  }, [initialValue]);

  return useLocalStorage(key, initialValue, {
    serialize,
    deserialize
  });
};