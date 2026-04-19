/**
 * Custom hook for managing async operations with loading and error states
 * Provides consistent pattern for data fetching across the app
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

const asyncLogger = logger.child('AsyncState');

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  reset: () => void;
}

export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.immediate !== false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await asyncFunction();
      
      if (mountedRef.current) {
        setData(result);
        options.onSuccess?.(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (mountedRef.current) {
        setError(error);
        options.onError?.(error);
        asyncLogger.error('Async operation failed', error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [asyncFunction, options, ...dependencies]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (options.immediate !== false) {
      execute();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return {
    data,
    loading,
    error,
    refetch: execute,
    reset,
  };
}

/**
 * Hook for managing form submission with loading and error states
 */
export function useAsyncSubmit<T, P = any>(
  submitFunction: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const submit = useCallback(async (params: P) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await submitFunction(params);
      
      if (mountedRef.current) {
        options.onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (mountedRef.current) {
        setError(error);
        options.onError?.(error);
      }
      
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [submitFunction]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    submit,
    loading,
    error,
    reset: () => setError(null),
  };
}

/**
 * Hook for debounced async operations (e.g., search)
 */
export function useDebouncedAsync<T>(
  asyncFunction: (query: string) => Promise<T>,
  delay: number = 500
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef(true);

  const execute = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await asyncFunction(query);
        
        if (mountedRef.current) {
          setData(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (mountedRef.current) {
          setError(error);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, delay);
  }, [asyncFunction, delay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    execute,
  };
}
