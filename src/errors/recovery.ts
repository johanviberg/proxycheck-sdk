/**
 * Error Recovery and Retry Utilities
 * Provides automatic retry logic with exponential backoff
 */

import {
  EnhancedProxyCheckError,
  isNetworkError,
  isRateLimitError,
  isRetryableError,
  isServiceError,
  isTimeoutError,
  ProxyCheckTimeoutError,
} from "./enhanced";

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryableErrors: Array<string>;
  onRetry?: (error: EnhancedProxyCheckError, attempt: number) => void;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "RATE_LIMIT", "API_ERROR"],
  // onRetry is optional, don't include it
};

/**
 * Retry strategy interface
 */
export interface RetryStrategy {
  shouldRetry(error: EnhancedProxyCheckError, attempt: number): boolean;
  getDelay(error: EnhancedProxyCheckError, attempt: number): number;
}

/**
 * Exponential backoff retry strategy
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(private options: RetryOptions = DEFAULT_RETRY_OPTIONS) {}

  shouldRetry(error: EnhancedProxyCheckError, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.options.maxRetries) {
      return false;
    }

    // Check if error is retryable
    if (!isRetryableError(error)) {
      return false;
    }

    // Check if error code is in retryable list
    return this.options.retryableErrors.includes(error.code);
  }

  getDelay(error: EnhancedProxyCheckError, attempt: number): number {
    let delay: number;

    // Use error-specific delay if available
    if (error.getRetryDelay) {
      delay = error.getRetryDelay();
    } else {
      // Calculate exponential backoff
      delay = this.options.baseDelay * this.options.backoffFactor ** (attempt - 1);
    }

    // Apply maximum delay limit
    delay = Math.min(delay, this.options.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }

    return Math.floor(delay);
  }
}

/**
 * Fixed delay retry strategy
 */
export class FixedDelayStrategy implements RetryStrategy {
  constructor(
    private delay = 1000,
    private maxRetries = 3,
    private retryableErrors: Array<string> = DEFAULT_RETRY_OPTIONS.retryableErrors,
  ) {}

  shouldRetry(error: EnhancedProxyCheckError, attempt: number): boolean {
    return (
      attempt < this.maxRetries &&
      isRetryableError(error) &&
      this.retryableErrors.includes(error.code)
    );
  }

  getDelay(_error: EnhancedProxyCheckError, _attempt: number): number {
    return this.delay;
  }
}

/**
 * Smart retry strategy that adapts based on error type
 */
export class SmartRetryStrategy implements RetryStrategy {
  constructor(private options: RetryOptions = DEFAULT_RETRY_OPTIONS) {}

  shouldRetry(error: EnhancedProxyCheckError, attempt: number): boolean {
    if (attempt >= this.options.maxRetries) {
      return false;
    }

    // Rate limit errors - always retry with proper delay
    if (isRateLimitError(error)) {
      return true;
    }

    // Network errors - retry with exponential backoff
    if (isNetworkError(error)) {
      return attempt < Math.min(this.options.maxRetries, 5); // Cap network retries
    }

    // Service errors - retry server errors, not client errors
    if (isServiceError(error)) {
      return error.statusCode ? error.statusCode >= 500 : true;
    }

    // Timeout errors - retry with longer delays
    if (isTimeoutError(error)) {
      return attempt < Math.min(this.options.maxRetries, 3); // Cap timeout retries
    }

    // Default to retryable check
    return isRetryableError(error) && this.options.retryableErrors.includes(error.code);
  }

  getDelay(error: EnhancedProxyCheckError, attempt: number): number {
    // Rate limit errors - use exact retry after
    if (isRateLimitError(error)) {
      return error.getRetryDelay();
    }

    // Network errors - aggressive backoff
    if (isNetworkError(error)) {
      const baseDelay = error.getRetryDelay() || 1000;
      return Math.min(baseDelay * 2 ** attempt, 30000);
    }

    // Service errors - moderate backoff
    if (isServiceError(error)) {
      const baseDelay = error.getRetryDelay() || 5000;
      return Math.min(baseDelay * 1.5 ** (attempt - 1), 60000);
    }

    // Timeout errors - longer delays
    if (isTimeoutError(error)) {
      return Math.min(error.getSuggestedTimeout?.() || 10000, 60000);
    }

    // Default exponential backoff
    let delay = this.options.baseDelay * this.options.backoffFactor ** (attempt - 1);
    delay = Math.min(delay, this.options.maxDelay);

    if (this.options.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }

    return Math.floor(delay);
  }
}

/**
 * Retry result information
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: EnhancedProxyCheckError;
  attempts: number;
  totalDelay: number;
  retryHistory: Array<{
    attempt: number;
    error: EnhancedProxyCheckError;
    delay: number;
    timestamp: Date;
  }>;
}

/**
 * Enhanced retry executor with comprehensive error handling
 */
export class RetryExecutor {
  constructor(
    private strategy: RetryStrategy = new SmartRetryStrategy(),
    private options: Partial<RetryOptions> = {},
  ) {}

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName = "operation",
  ): Promise<RetryResult<T>> {
    let attempt = 0;
    let totalDelay = 0;
    const retryHistory: RetryResult<T>["retryHistory"] = [];

    while (true) {
      attempt++;

      try {
        const result = await operation();

        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay,
          retryHistory,
        };
      } catch (error) {
        const enhancedError = this.enhanceError(error, operationName, attempt);

        // Record retry attempt
        retryHistory.push({
          attempt,
          error: enhancedError,
          delay: 0,
          timestamp: new Date(),
        });

        // Check if we should retry
        if (!this.strategy.shouldRetry(enhancedError, attempt)) {
          return {
            success: false,
            error: enhancedError,
            attempts: attempt,
            totalDelay,
            retryHistory,
          };
        }

        // Calculate delay
        const delay = this.strategy.getDelay(enhancedError, attempt);
        totalDelay += delay;

        // Update last retry history entry with delay
        const lastEntry = retryHistory[retryHistory.length - 1];
        if (lastEntry) {
          lastEntry.delay = delay;
        }

        // Call retry callback if provided
        if (this.options.onRetry) {
          this.options.onRetry(enhancedError, attempt);
        }

        // Wait before retry
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName = "operation",
  ): Promise<RetryResult<T>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new ProxyCheckTimeoutError(
            `Operation '${operationName}' timed out after ${timeoutMs}ms`,
            timeoutMs,
            "request",
          ),
        );
      }, timeoutMs);
    });

    const operationPromise = this.execute(operation, operationName);

    try {
      return await Promise.race([operationPromise, timeoutPromise]);
    } catch (error) {
      const enhancedError = this.enhanceError(error, operationName, 1);
      return {
        success: false,
        error: enhancedError,
        attempts: 1,
        totalDelay: 0,
        retryHistory: [
          {
            attempt: 1,
            error: enhancedError,
            delay: 0,
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  /**
   * Create a retryable version of an async function
   */
  wrap<T extends Array<unknown>, R>(
    fn: (...args: T) => Promise<R>,
    operationName?: string,
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.execute(
        () => fn(...args),
        operationName || fn.name || "wrapped_operation",
      );

      if (result.success) {
        return result.result as R;
      }
      throw result.error;
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(
    error: unknown,
    operationName: string,
    attempt: number,
  ): EnhancedProxyCheckError {
    if (error instanceof EnhancedProxyCheckError) {
      // Add retry context
      const context = {
        ...error.context,
        retryCount: attempt - 1,
        operationName,
      };

      // Create new error with updated context
      return new (error.constructor as new (...args: Array<unknown>) => EnhancedProxyCheckError)(
        error.message,
        {
          code: error.code,
          category: error.category,
          severity: error.severity,
          recoverable: error.recoverable,
          context,
          suggestions: error.suggestions,
          documentation: error.documentation,
        },
        error.statusCode,
      );
    }

    // Convert unknown errors to enhanced errors
    const message = error instanceof Error ? error.message : String(error);
    return new (require("./enhanced").ProxyCheckConfigurationError)(message, undefined, undefined, {
      operationName,
      retryCount: attempt - 1,
    });
  }
}

/**
 * Create a retry executor with smart defaults
 */
export function createSmartRetry(options: Partial<RetryOptions> = {}): RetryExecutor {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  return new RetryExecutor(new SmartRetryStrategy(mergedOptions), mergedOptions);
}

/**
 * Create a retry executor with exponential backoff
 */
export function createExponentialBackoff(options: Partial<RetryOptions> = {}): RetryExecutor {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  return new RetryExecutor(new ExponentialBackoffStrategy(mergedOptions), mergedOptions);
}

/**
 * Create a retry executor with fixed delay
 */
export function createFixedDelay(delay = 1000, maxRetries = 3): RetryExecutor {
  return new RetryExecutor(new FixedDelayStrategy(delay, maxRetries));
}

/**
 * Analyze error and provide recovery suggestions
 */
export function analyzeError(error: unknown): {
  isRetryable: boolean;
  category: string;
  severity: string;
  suggestedDelay: number;
  suggestions: Array<string>;
  documentation?: string;
} {
  if (error instanceof EnhancedProxyCheckError) {
    return {
      isRetryable: error.isRetryable(),
      category: error.category,
      severity: error.severity,
      suggestedDelay: error.getRetryDelay(),
      suggestions: error.suggestions,
      ...(error.documentation && { documentation: error.documentation }),
    };
  }

  return {
    isRetryable: false,
    category: "unknown",
    severity: "medium",
    suggestedDelay: 0,
    suggestions: ["Check the error message and try again"],
    // documentation is optional, don't include it
  };
}

/**
 * Get human-readable error summary
 */
export function getErrorSummary(error: unknown): string {
  if (error instanceof EnhancedProxyCheckError) {
    return error.getDetailedMessage();
  }

  return error instanceof Error ? error.message : String(error);
}
