/**
 * Comprehensive Error Handler for ProxyCheck SDK
 * Provides centralized error handling and reporting
 */

import {
  createEnhancedErrorFromResponse,
  type EnhancedProxyCheckError,
  type ErrorContext,
  isAuthenticationError,
  isRetryableError,
} from "./enhanced";

import { createSmartRetry, type RetryExecutor, type RetryOptions } from "./recovery";

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableRetry: boolean;
  retryOptions: Partial<RetryOptions>;
  enableLogging: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
  onError?: (error: EnhancedProxyCheckError, context?: ErrorContext) => void;
  onRetry?: (error: EnhancedProxyCheckError, attempt: number) => void;
  onRecovery?: (error: EnhancedProxyCheckError, result: unknown) => void;
}

/**
 * Default error handler configuration
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  enableRetry: true,
  retryOptions: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "RATE_LIMIT", "API_ERROR"],
  },
  enableLogging: true,
  logLevel: "error",
};

/**
 * Error statistics for monitoring
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByCode: Record<string, number>;
  retriedErrors: number;
  recoveredErrors: number;
  lastError?: EnhancedProxyCheckError;
  errorRate: number;
  uptime: number;
}

/**
 * Centralized error handler
 */
export class ErrorHandler {
  private readonly _config: ErrorHandlerConfig;
  private readonly _retryExecutor: RetryExecutor;
  private readonly _stats: ErrorStats;
  private readonly _startTime: Date;
  private _totalRequests = 0;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this._config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
    this._retryExecutor = createSmartRetry({
      ...this._config.retryOptions,
      onRetry: this.handleRetry.bind(this),
    });
    this._startTime = new Date();
    this._stats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByCode: {},
      retriedErrors: 0,
      recoveredErrors: 0,
      errorRate: 0,
      uptime: 0,
    };
  }

  /**
   * Handle an error with optional retry logic
   */
  async handleError<T>(
    error: unknown,
    context?: ErrorContext,
    retryCallback?: () => Promise<T>,
  ): Promise<T | never> {
    const enhancedError = this.enhanceError(error, context);

    // Update statistics
    this.updateStats(enhancedError);

    // Log error
    this.logError(enhancedError, context);

    // Call error callback if provided
    if (this._config.onError) {
      this._config.onError(enhancedError, context);
    }

    // If retry is enabled and we have a retry callback
    if (this._config.enableRetry && retryCallback && isRetryableError(enhancedError)) {
      return this.executeWithRetry(retryCallback, "retry_operation", context);
    }

    // Throw the enhanced error
    throw enhancedError;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName = "operation",
    context?: ErrorContext,
  ): Promise<T> {
    this._totalRequests++;

    try {
      const result = await this._retryExecutor.execute(operation, operationName);

      if (result.success) {
        // Update recovery stats
        if (result.attempts > 1) {
          this._stats.recoveredErrors++;
          if (this._config.onRecovery && result.retryHistory[0]) {
            this._config.onRecovery(result.retryHistory[0].error, result.result);
          }
        }

        return result.result as T;
      }
      // Update stats and throw
      this.updateStats(result.error as EnhancedProxyCheckError);
      throw result.error;
    } catch (error) {
      const enhancedError = this.enhanceError(error, context);
      this.updateStats(enhancedError);
      throw enhancedError;
    }
  }

  /**
   * Execute operation with timeout and retry
   */
  async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName = "operation",
    context?: ErrorContext,
  ): Promise<T> {
    this._totalRequests++;

    try {
      const result = await this._retryExecutor.executeWithTimeout(
        operation,
        timeoutMs,
        operationName,
      );

      if (result.success) {
        if (result.attempts > 1) {
          this._stats.recoveredErrors++;
          if (this._config.onRecovery && result.retryHistory[0]) {
            this._config.onRecovery(result.retryHistory[0].error, result.result);
          }
        }

        return result.result as T;
      }
      this.updateStats(result.error as EnhancedProxyCheckError);
      throw result.error;
    } catch (error) {
      const enhancedError = this.enhanceError(error, context);
      this.updateStats(enhancedError);
      throw enhancedError;
    }
  }

  /**
   * Create a wrapped version of an async function with error handling
   */
  wrap<T extends Array<unknown>, R>(
    fn: (...args: T) => Promise<R>,
    operationName?: string,
    context?: ErrorContext,
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return this.executeWithRetry(
        () => fn(...args),
        operationName || fn.name || "wrapped_operation",
        context,
      );
    };
  }

  /**
   * Get current error statistics
   */
  getStats(): ErrorStats {
    const now = Date.now();
    const uptime = now - this._startTime.getTime();
    const errorRate =
      this._totalRequests > 0 ? (this._stats.totalErrors / this._totalRequests) * 100 : 0;

    return {
      ...this._stats,
      uptime,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Reset error statistics
   */
  resetStats(): void {
    this._stats.totalErrors = 0;
    this._stats.errorsByCategory = {};
    this._stats.errorsByCode = {};
    this._stats.retriedErrors = 0;
    this._stats.recoveredErrors = 0;
    // lastError is optional, don't set it to undefined
    this._stats.errorRate = 0;
    this._totalRequests = 0;
  }

  /**
   * Get error summary report
   */
  getErrorReport(): {
    summary: ErrorStats;
    topErrors: Array<{ code: string; count: number; percentage: number }>;
    topCategories: Array<{ category: string; count: number; percentage: number }>;
    recommendations: Array<string>;
  } {
    const stats = this.getStats();

    const topErrors = Object.entries(stats.errorsByCode)
      .map(([code, count]) => ({
        code,
        count,
        percentage: Math.round((count / stats.totalErrors) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCategories = Object.entries(stats.errorsByCategory)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / stats.totalErrors) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const recommendations = this.generateRecommendations(stats, topErrors, topCategories);

    return {
      summary: stats,
      topErrors,
      topCategories,
      recommendations,
    };
  }

  /**
   * Check if the system is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStats();

    // Consider healthy if:
    // - Error rate is below 5%
    // - No authentication errors in last batch
    // - Rate limit errors are not dominating
    return (
      (stats.errorRate < 5 && !stats.lastError) ||
      (!isAuthenticationError(stats.lastError) &&
        (stats.errorsByCategory["rate_limit"] || 0) < stats.totalErrors * 0.5)
    );
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    status: "healthy" | "degraded" | "unhealthy";
    issues: Array<string>;
    recommendations: Array<string>;
  } {
    const stats = this.getStats();
    const issues: Array<string> = [];
    const recommendations: Array<string> = [];

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Check error rate
    if (stats.errorRate > 10) {
      status = "unhealthy";
      issues.push(`High error rate: ${stats.errorRate}%`);
      recommendations.push("Review error logs and fix underlying issues");
    } else if (stats.errorRate > 5) {
      status = "degraded";
      issues.push(`Elevated error rate: ${stats.errorRate}%`);
      recommendations.push("Monitor error patterns and consider improvements");
    }

    // Check for authentication issues
    if ((stats.errorsByCategory["authentication"] || 0) > 0) {
      status = status === "healthy" ? "degraded" : "unhealthy";
      issues.push("Authentication errors detected");
      recommendations.push("Verify API key and authentication configuration");
    }

    // Check for rate limiting
    const rateLimitCount = stats.errorsByCategory["rate_limit"] || 0;
    if (rateLimitCount > stats.totalErrors * 0.3) {
      status = status === "healthy" ? "degraded" : status;
      issues.push("High rate limit errors");
      recommendations.push("Implement better rate limiting or upgrade plan");
    }

    // Check for network issues
    const networkCount = stats.errorsByCategory["network"] || 0;
    if (networkCount > stats.totalErrors * 0.4) {
      status = status === "healthy" ? "degraded" : status;
      issues.push("High network errors");
      recommendations.push("Check network connectivity and stability");
    }

    return {
      healthy: status === "healthy",
      status,
      issues,
      recommendations,
    };
  }

  /**
   * Enhanced error creation with context
   */
  private enhanceError(error: unknown, context?: ErrorContext): EnhancedProxyCheckError {
    const enhancedContext: ErrorContext = {
      ...context,
      timestamp: new Date(),
      userAgent: "ProxyCheck-SDK/0.9.2", // This should be configurable
    };

    return createEnhancedErrorFromResponse(error, enhancedContext);
  }

  /**
   * Handle retry events
   */
  private handleRetry(error: EnhancedProxyCheckError, attempt: number): void {
    this._stats.retriedErrors++;

    this.logError(error, error.context, `Retry attempt ${attempt}`);

    if (this._config.onRetry) {
      this._config.onRetry(error, attempt);
    }
  }

  /**
   * Update error statistics
   */
  private updateStats(error: EnhancedProxyCheckError): void {
    this._stats.totalErrors++;
    this._stats.lastError = error;

    // Update category counts
    this._stats.errorsByCategory[error.category] =
      (this._stats.errorsByCategory[error.category] || 0) + 1;

    // Update code counts
    this._stats.errorsByCode[error.code] = (this._stats.errorsByCode[error.code] || 0) + 1;
  }

  /**
   * Log error with appropriate level
   */
  private logError(_error: EnhancedProxyCheckError, _context?: ErrorContext, _prefix = ""): void {
    if (!this._config.enableLogging) {
      return;
    }

    // Log data would be constructed here if needed
    // const logMessage = `${prefix}${prefix ? " " : ""}${error.name}: ${error.message}`;
    // const logData = {
    //   error: error.getErrorInfo(),
    //   context,
    //   timestamp: new Date().toISOString(),
    // };

    // Simple console logging - in production, this should use a proper logger
    switch (this._config.logLevel) {
      case "debug":
        break;
      case "info":
        break;
      case "warn":
        break;
      default:
        break;
    }
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(
    stats: ErrorStats,
    _topErrors: Array<{ code: string; count: number; percentage: number }>,
    topCategories: Array<{ category: string; count: number; percentage: number }>,
  ): Array<string> {
    const recommendations: Array<string> = [];

    // High error rate
    if (stats.errorRate > 10) {
      recommendations.push("Error rate is high - review implementation and error handling");
    }

    // Network issues
    if (topCategories.some((c) => c.category === "network" && c.percentage > 30)) {
      recommendations.push(
        "Network errors are common - check connectivity and implement retry logic",
      );
    }

    // Rate limiting
    if (topCategories.some((c) => c.category === "rate_limit" && c.percentage > 20)) {
      recommendations.push(
        "Rate limiting detected - implement proper rate limiting or upgrade plan",
      );
    }

    // Authentication issues
    if (topCategories.some((c) => c.category === "authentication")) {
      recommendations.push("Authentication errors detected - verify API key configuration");
    }

    // Server errors
    if (topCategories.some((c) => c.category === "server" && c.percentage > 15)) {
      recommendations.push("Server errors detected - check ProxyCheck.io service status");
    }

    // Validation errors
    if (topCategories.some((c) => c.category === "validation" && c.percentage > 25)) {
      recommendations.push(
        "Validation errors are common - review input data format and validation",
      );
    }

    return recommendations;
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Get or create global error handler
 */
export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * Set global error handler configuration
 */
export function configureGlobalErrorHandler(config: Partial<ErrorHandlerConfig>): void {
  globalErrorHandler = new ErrorHandler(config);
}

/**
 * Convenience function for handling errors
 */
export async function handleError<T>(
  error: unknown,
  context?: ErrorContext,
  retryCallback?: () => Promise<T>,
): Promise<T | never> {
  return getGlobalErrorHandler().handleError(error, context, retryCallback);
}

/**
 * Convenience function for executing with retry
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName = "operation",
  context?: ErrorContext,
): Promise<T> {
  return getGlobalErrorHandler().executeWithRetry(operation, operationName, context);
}
