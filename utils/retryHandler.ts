/**
 * Retry handler with exponential backoff for API calls and async operations
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    if (!error) return false;
    const message = error?.message?.toLowerCase() || '';
    const code = error?.code;

    // Network errors are retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    // Firebase errors that are retryable
    if (code === 'PERMISSION_DENIED') return false;
    if (code === 'INVALID_ARGUMENT') return false;
    if (code === 'NOT_FOUND') return false;
    if (code === 'ALREADY_EXISTS') return false;

    // Retry on server errors (5xx)
    if (code >= 500) return true;

    // Retry on specific client errors
    if (code === 408 || code === 429) return true;

    return false;
  },
};

class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate delay for retry attempt using exponential backoff with jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    // Add jitter (±20% of delay) to avoid thundering herd
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(100, cappedDelay + jitter);
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.config.shouldRetry(error)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);

        if (__DEV__) {
          console.log(
            `[Retry] ${operationName} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`,
            error?.message
          );
        }

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global retry handler instance
 */
const globalRetryHandler = new RetryHandler();

/**
 * Execute async function with automatic retry
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
  operationName?: string
): Promise<T> {
  const handler = config ? new RetryHandler(config) : globalRetryHandler;
  return handler.execute(fn, operationName);
}

/**
 * Retry hook for React components
 */
export function useRetry(config?: RetryConfig) {
  const handler = new RetryHandler(config);

  const retry = async <T,>(
    fn: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    return handler.execute(fn, operationName);
  };

  return { retry };
}

/**
 * Wrap a service function with automatic retry
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: RetryConfig
): T {
  return (async (...args: any[]) => {
    return retryAsync(() => fn(...args), config, fn.name);
  }) as T;
}

export default retryAsync;
