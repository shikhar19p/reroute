/**
 * Performance Monitoring Utilities
 *
 * Provides tools to monitor app performance, track render times,
 * and identify performance bottlenecks in development.
 */

import { InteractionManager } from 'react-native';

const isDevelopment = __DEV__;

/**
 * Measure the time taken by an async operation
 */
export async function measureAsync<T>(
  label: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  if (!isDevelopment) {
    return asyncFn();
  }

  const start = performance.now();
  try {
    const result = await asyncFn();
    const duration = performance.now() - start;
    console.log(`⚡ [Performance] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`❌ [Performance] ${label} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(label: string, fn: () => T): T {
  if (!isDevelopment) {
    return fn();
  }

  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    console.log(`⚡ [Performance] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`❌ [Performance] ${label} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

/**
 * Run a task after all interactions are complete
 * Useful for deferring non-critical operations
 */
export function runAfterInteractions(callback: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    if (isDevelopment) {
      console.log('🔄 [Performance] Running deferred task');
    }
    callback();
  });
}

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once per specified period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Simple cache implementation for expensive computations
 */
export class SimpleCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    // Simple LRU - remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Log component render in development
 */
export function logRender(componentName: string, props?: any): void {
  if (isDevelopment) {
    console.log(`🔄 [Render] ${componentName}`, props ? `with props: ${JSON.stringify(props, null, 2)}` : '');
  }
}

/**
 * Create a memoized selector function
 */
export function createSelector<T, R>(
  selector: (state: T) => R,
  equalityFn: (prev: R, next: R) => boolean = (a, b) => a === b
): (state: T) => R {
  let lastState: T;
  let lastResult: R;

  return (state: T): R => {
    const result = selector(state);

    if (lastState === state && equalityFn(lastResult, result)) {
      return lastResult;
    }

    lastState = state;
    lastResult = result;
    return result;
  };
}

/**
 * Performance marks for measuring app startup and navigation
 */
export const PerformanceMarks = {
  mark(name: string): void {
    if (isDevelopment) {
      performance.mark(name);
      console.log(`📍 [Performance Mark] ${name}`);
    }
  },

  measure(name: string, startMark: string, endMark: string): number | null {
    if (!isDevelopment) {
      return null;
    }

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      const duration = measure.duration;
      console.log(`⏱️  [Performance Measure] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    } catch (error) {
      console.warn(`Could not measure ${name}:`, error);
      return null;
    }
  },

  clear(): void {
    performance.clearMarks();
    performance.clearMeasures();
  }
};

/**
 * Memory usage monitoring (iOS/Android only)
 */
export function logMemoryUsage(label?: string): void {
  if (!isDevelopment) {
    return;
  }

  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`💾 [Memory${label ? ` - ${label}` : ''}]`, {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    });
  }
}
