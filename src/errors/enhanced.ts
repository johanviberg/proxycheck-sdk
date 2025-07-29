/**
 * Enhanced Error Classes for ProxyCheck SDK
 * Provides better developer experience with structured error information
 */

import { ERROR_CODES } from "../types/constants";

/**
 * Error context information for better debugging
 */
export interface ErrorContext {
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp?: Date;
  retryCount?: number;
  userAgent?: string;
  apiVersion?: string;
}

/**
 * Error details for structured error reporting
 */
export interface ErrorDetails {
  code: string;
  category: "client" | "server" | "network" | "validation" | "rate_limit" | "authentication";
  severity: "low" | "medium" | "high" | "critical";
  recoverable: boolean;
  context?: ErrorContext;
  suggestions?: Array<string>;
  documentation?: string;
}

/**
 * Enhanced base error class with better debugging and recovery information
 */
export abstract class EnhancedProxyCheckError extends Error {
  public readonly code: string;
  public readonly category: ErrorDetails["category"];
  public readonly severity: ErrorDetails["severity"];
  public readonly recoverable: boolean;
  public readonly timestamp: Date;
  public readonly context?: ErrorContext;
  public readonly suggestions: Array<string>;
  public readonly documentation?: string;
  public readonly statusCode?: number;

  constructor(message: string, details: ErrorDetails, statusCode?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.recoverable = details.recoverable;
    this.timestamp = new Date();
    if (details.context !== undefined) {
      this.context = details.context;
    }
    this.suggestions = details.suggestions || [];
    if (details.documentation !== undefined) {
      this.documentation = details.documentation;
    }
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get structured error information
   */
  getErrorInfo(): {
    name: string;
    message: string;
    code: string;
    category: string;
    severity: string;
    recoverable: boolean;
    timestamp: string;
    statusCode?: number;
    context?: ErrorContext;
    suggestions: Array<string>;
    documentation?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      ...(this.statusCode !== undefined && { statusCode: this.statusCode }),
      ...(this.context !== undefined && { context: this.context }),
      suggestions: this.suggestions,
      ...(this.documentation !== undefined && { documentation: this.documentation }),
    };
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return this.getErrorInfo();
  }

  /**
   * Get human-readable error message with suggestions
   */
  getDetailedMessage(): string {
    let message = this.message;

    if (this.suggestions.length > 0) {
      message += "\n\nSuggestions:";
      for (const suggestion of this.suggestions) {
        message += `\n  • ${suggestion}`;
      }
    }

    if (this.documentation) {
      message += `\n\nDocumentation: ${this.documentation}`;
    }

    return message;
  }

  /**
   * Check if this error can be retried
   */
  isRetryable(): boolean {
    return this.recoverable && ["server", "network", "rate_limit"].includes(this.category);
  }

  /**
   * Get retry delay in milliseconds (if retryable)
   */
  getRetryDelay(): number {
    if (!this.isRetryable()) {
      return 0;
    }

    switch (this.category) {
      case "rate_limit":
        return 60000; // 1 minute
      case "server":
        return 5000; // 5 seconds
      case "network":
        return 1000; // 1 second
      default:
        return 0;
    }
  }
}

/**
 * API configuration and usage errors
 */
export class ProxyCheckConfigurationError extends EnhancedProxyCheckError {
  constructor(message: string, field?: string, _value?: unknown, context?: ErrorContext) {
    super(message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      category: "client",
      severity: "high",
      recoverable: true,
      ...(context && { context }),
      suggestions: [
        "Check your API configuration",
        "Ensure all required fields are provided",
        "Verify field values are in correct format",
        "Consult the API documentation for valid options",
      ],
      documentation: "https://docs.proxycheck.io/api/configuration",
    });

    if (field) {
      this.suggestions.unshift(`Check the '${field}' field`);
    }
  }
}

/**
 * API key and authentication errors
 */
export class ProxyCheckAuthError extends EnhancedProxyCheckError {
  public readonly authType: "missing" | "invalid" | "expired" | "insufficient";

  constructor(
    message: string,
    authType: "missing" | "invalid" | "expired" | "insufficient" = "invalid",
    context?: ErrorContext,
  ) {
    super(
      message,
      {
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        category: "authentication",
        severity: "critical",
        recoverable: authType === "missing",
        ...(context && { context }),
        suggestions: ProxyCheckAuthError.getSuggestions(authType),
        documentation: "https://docs.proxycheck.io/api/authentication",
      },
      401,
    );

    this.authType = authType;
  }

  private static getSuggestions(authType: string): Array<string> {
    switch (authType) {
      case "missing":
        return [
          "Provide your API key in the configuration",
          "Set the API key using setApiKey() method",
          "Check that your API key is not empty",
        ];
      case "invalid":
        return [
          "Verify your API key is correct",
          "Check for any typos in the API key",
          "Ensure you're using the correct API key format",
        ];
      case "expired":
        return [
          "Renew your API key subscription",
          "Check your account status",
          "Contact support if you believe this is an error",
        ];
      case "insufficient":
        return [
          "Upgrade your plan to access this feature",
          "Check your account limits",
          "Use features available in your current plan",
        ];
      default:
        return ["Check your API key configuration"];
    }
  }
}

/**
 * Rate limiting errors with detailed timing information
 */
export class ProxyCheckRateLimitError extends EnhancedProxyCheckError {
  public readonly limit: number;
  public readonly remaining: number;
  public readonly reset: Date;
  public readonly retryAfter: number;
  public readonly window: number;

  constructor(
    message: string,
    limit: number,
    remaining: number,
    reset: Date,
    retryAfter: number,
    window = 3600,
    context?: ErrorContext,
  ) {
    super(
      message,
      {
        code: ERROR_CODES.RATE_LIMIT,
        category: "rate_limit",
        severity: "medium",
        recoverable: true,
        ...(context && { context }),
        suggestions: [
          `Wait ${retryAfter} seconds before making another request`,
          "Consider implementing exponential backoff",
          "Upgrade your plan for higher rate limits",
          "Optimize your request patterns to stay within limits",
        ],
        documentation: "https://docs.proxycheck.io/api/rate-limits",
      },
      429,
    );

    this.limit = limit;
    this.remaining = remaining;
    this.reset = reset;
    this.retryAfter = retryAfter;
    this.window = window;
  }

  /**
   * Get time until rate limit reset
   */
  getTimeUntilReset(): number {
    return Math.max(0, this.reset.getTime() - Date.now());
  }

  /**
   * Get formatted time until reset
   */
  getFormattedTimeUntilReset(): string {
    const ms = this.getTimeUntilReset();
    if (ms < 1000) {
      return "< 1 second";
    }
    if (ms < 60000) {
      return `${Math.ceil(ms / 1000)} seconds`;
    }
    if (ms < 3600000) {
      return `${Math.ceil(ms / 60000)} minutes`;
    }
    return `${Math.ceil(ms / 3600000)} hours`;
  }

  /**
   * Get retry delay in milliseconds
   */
  override getRetryDelay(): number {
    return this.retryAfter * 1000;
  }
}

/**
 * Network and connectivity errors
 */
export class ProxyCheckNetworkError extends EnhancedProxyCheckError {
  public readonly networkCode?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    networkCode?: string,
    originalError?: Error,
    context?: ErrorContext,
  ) {
    super(message, {
      code: ERROR_CODES.NETWORK_ERROR,
      category: "network",
      severity: "high",
      recoverable: true,
      ...(context && { context }),
      suggestions: [
        "Check your internet connection",
        "Verify proxy/firewall settings",
        "Try again in a few moments",
        "Check ProxyCheck.io service status",
      ],
      documentation: "https://docs.proxycheck.io/api/troubleshooting",
    });

    if (networkCode !== undefined) {
      this.networkCode = networkCode;
    }
    if (originalError !== undefined) {
      this.originalError = originalError;
    }
  }

  /**
   * Get retry delay based on network error type
   */
  override getRetryDelay(): number {
    switch (this.networkCode) {
      case "ECONNRESET":
      case "ECONNREFUSED":
        return 5000; // 5 seconds
      case "ETIMEDOUT":
        return 10000; // 10 seconds
      case "ENOTFOUND":
        return 30000; // 30 seconds
      default:
        return 1000; // 1 second
    }
  }
}

/**
 * Service unavailable or server errors
 */
export class ProxyCheckServiceError extends EnhancedProxyCheckError {
  public readonly serviceStatus?: string;
  public readonly estimatedRecovery?: Date;

  constructor(
    message: string,
    statusCode: number,
    serviceStatus?: string,
    estimatedRecovery?: Date,
    context?: ErrorContext,
  ) {
    super(
      message,
      {
        code: ERROR_CODES.API_ERROR,
        category: "server",
        severity: statusCode >= 500 ? "high" : "medium",
        recoverable: true,
        ...(context && { context }),
        suggestions: [
          "Try again in a few moments",
          "Check ProxyCheck.io service status",
          "Implement retry logic with exponential backoff",
          "Contact support if the issue persists",
        ],
        documentation: "https://docs.proxycheck.io/api/status",
      },
      statusCode,
    );

    if (serviceStatus !== undefined) {
      this.serviceStatus = serviceStatus;
    }
    if (estimatedRecovery !== undefined) {
      this.estimatedRecovery = estimatedRecovery;
    }
  }

  /**
   * Get retry delay based on status code
   */
  override getRetryDelay(): number {
    if (this.statusCode) {
      if (this.statusCode >= 500) {
        return 30000; // 30 seconds for server errors
      }
      if (this.statusCode === 503) {
        return 60000; // 1 minute for service unavailable
      }
    }
    return 5000; // 5 seconds default
  }
}

/**
 * Data validation and parsing errors
 */
export class ProxyCheckDataError extends EnhancedProxyCheckError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly expectedType?: string;
  public readonly validationRules?: Array<string>;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    expectedType?: string,
    validationRules?: Array<string>,
    context?: ErrorContext,
  ) {
    super(message, {
      code: ERROR_CODES.VALIDATION_ERROR,
      category: "validation",
      severity: "medium",
      recoverable: true,
      ...(context && { context }),
      suggestions: [
        "Check the data format and structure",
        "Ensure all required fields are present",
        "Verify data types match expected formats",
        "Review API documentation for valid values",
      ],
      documentation: "https://docs.proxycheck.io/api/validation",
    });

    if (field !== undefined) {
      this.field = field;
    }
    this.value = value;
    if (expectedType !== undefined) {
      this.expectedType = expectedType;
    }
    if (validationRules !== undefined) {
      this.validationRules = validationRules;
    }

    if (field) {
      this.suggestions.unshift(`Check the '${field}' field`);
    }
    if (expectedType) {
      this.suggestions.unshift(`Expected type: ${expectedType}`);
    }
  }
}

/**
 * Request timeout errors
 */
export class ProxyCheckTimeoutError extends EnhancedProxyCheckError {
  public readonly timeout: number;
  public readonly phase: "connection" | "request" | "response";

  constructor(
    message: string,
    timeout: number,
    phase: "connection" | "request" | "response" = "request",
    context?: ErrorContext,
  ) {
    super(message, {
      code: ERROR_CODES.TIMEOUT_ERROR,
      category: "network",
      severity: "medium",
      recoverable: true,
      ...(context && { context }),
      suggestions: [
        "Increase timeout configuration",
        "Check network connectivity",
        "Try again with a longer timeout",
        "Consider using batch requests for multiple operations",
      ],
      documentation: "https://docs.proxycheck.io/api/timeouts",
    });

    this.timeout = timeout;
    this.phase = phase;
  }

  /**
   * Get suggested timeout value
   */
  getSuggestedTimeout(): number {
    return Math.min(this.timeout * 2, 60000); // Double timeout, max 60 seconds
  }
}

/**
 * Resource not found errors
 */
export class ProxyCheckNotFoundError extends EnhancedProxyCheckError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(message: string, resource: string, resourceId?: string, context?: ErrorContext) {
    super(
      message,
      {
        code: ERROR_CODES.API_ERROR,
        category: "client",
        severity: "medium",
        recoverable: false,
        ...(context && { context }),
        suggestions: [
          `Verify the ${resource} exists`,
          "Check the resource identifier",
          "Ensure you have permission to access this resource",
          "Check if the resource has been deleted",
        ],
        documentation: "https://docs.proxycheck.io/api/resources",
      },
      404,
    );

    this.resource = resource;
    if (resourceId) {
      this.resourceId = resourceId;
    }
  }
}

/**
 * Quota exceeded errors
 */
export class ProxyCheckQuotaError extends EnhancedProxyCheckError {
  public readonly quotaType: "daily" | "monthly" | "burst";
  public readonly used: number;
  public readonly limit: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    quotaType: "daily" | "monthly" | "burst",
    used: number,
    limit: number,
    resetTime?: Date,
    context?: ErrorContext,
  ) {
    super(
      message,
      {
        code: ERROR_CODES.RATE_LIMIT,
        category: "rate_limit",
        severity: "high",
        recoverable: quotaType === "burst",
        ...(context && { context }),
        suggestions: [
          `Wait for ${quotaType} quota to reset`,
          "Consider upgrading your plan",
          "Optimize your request patterns",
          "Use caching to reduce API calls",
        ],
        documentation: "https://docs.proxycheck.io/api/quotas",
      },
      429,
    );

    this.quotaType = quotaType;
    this.used = used;
    this.limit = limit;
    if (resetTime !== undefined) {
      this.resetTime = resetTime;
    }
  }

  /**
   * Get time until quota reset
   */
  getTimeUntilReset(): number {
    if (!this.resetTime) {
      return 0;
    }
    return Math.max(0, this.resetTime.getTime() - Date.now());
  }

  /**
   * Get formatted time until reset
   */
  getFormattedTimeUntilReset(): string {
    const ms = this.getTimeUntilReset();
    if (ms < 1000) {
      return "< 1 second";
    }
    if (ms < 60000) {
      return `${Math.ceil(ms / 1000)} seconds`;
    }
    if (ms < 3600000) {
      return `${Math.ceil(ms / 60000)} minutes`;
    }
    if (ms < 86400000) {
      return `${Math.ceil(ms / 3600000)} hours`;
    }
    return `${Math.ceil(ms / 86400000)} days`;
  }
}

/**
 * Enhanced type guards for better error handling
 */
export function isEnhancedProxyCheckError(error: unknown): error is EnhancedProxyCheckError {
  return error instanceof EnhancedProxyCheckError;
}

export function isRetryableError(error: unknown): error is EnhancedProxyCheckError {
  return isEnhancedProxyCheckError(error) && error.isRetryable();
}

export function isAuthenticationError(error: unknown): error is ProxyCheckAuthError {
  return error instanceof ProxyCheckAuthError;
}

export function isRateLimitError(error: unknown): error is ProxyCheckRateLimitError {
  return error instanceof ProxyCheckRateLimitError;
}

export function isNetworkError(error: unknown): error is ProxyCheckNetworkError {
  return error instanceof ProxyCheckNetworkError;
}

export function isServiceError(error: unknown): error is ProxyCheckServiceError {
  return error instanceof ProxyCheckServiceError;
}

export function isDataError(error: unknown): error is ProxyCheckDataError {
  return error instanceof ProxyCheckDataError;
}

export function isTimeoutError(error: unknown): error is ProxyCheckTimeoutError {
  return error instanceof ProxyCheckTimeoutError;
}

export function isNotFoundError(error: unknown): error is ProxyCheckNotFoundError {
  return error instanceof ProxyCheckNotFoundError;
}

export function isQuotaError(error: unknown): error is ProxyCheckQuotaError {
  return error instanceof ProxyCheckQuotaError;
}

/**
 * Extract error message from unknown error object
 */
function extractErrorMessage(error: unknown, defaultMessage: string): string {
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
  }
  return defaultMessage;
}

/**
 * Enhanced error factory for creating appropriate error types
 */
export function createEnhancedErrorFromResponse(
  error: unknown,
  context?: ErrorContext,
): EnhancedProxyCheckError {
  // Handle axios errors
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response: {
        status: number;
        data: unknown;
        headers: Record<string, string>;
        config?: { url?: string; method?: string };
      };
    };

    const { status, data, headers, config } = axiosError.response;
    const enhancedContext: ErrorContext = {
      ...context,
      ...(config?.url && { endpoint: config.url }),
      ...(config?.method && { method: config.method.toUpperCase() }),
      ...(headers["x-request-id"] && { requestId: headers["x-request-id"] }),
      timestamp: new Date(),
    };

    // Rate limiting errors
    if (status === 429) {
      const limit = Number.parseInt(headers["x-ratelimit-limit"] || "0", 10);
      const remaining = Number.parseInt(headers["x-ratelimit-remaining"] || "0", 10);
      const reset = new Date(Number.parseInt(headers["x-ratelimit-reset"] || "0", 10) * 1000);
      const retryAfter = Number.parseInt(headers["retry-after"] || "60", 10);
      const window = Number.parseInt(headers["x-ratelimit-window"] || "3600", 10);

      return new ProxyCheckRateLimitError(
        "Rate limit exceeded",
        limit,
        remaining,
        reset,
        retryAfter,
        window,
        enhancedContext,
      );
    }

    // Authentication errors
    if (status === 401) {
      const message = extractErrorMessage(data, "Authentication failed");
      return new ProxyCheckAuthError(message, "invalid", enhancedContext);
    }

    // Not found errors
    if (status === 404) {
      const message = extractErrorMessage(data, "Resource not found");
      return new ProxyCheckNotFoundError(message, "resource", undefined, enhancedContext);
    }

    // Server errors
    if (status >= 500) {
      const message = extractErrorMessage(data, "Server error occurred");
      return new ProxyCheckServiceError(message, status, undefined, undefined, enhancedContext);
    }

    // Client errors
    if (status >= 400) {
      const message = extractErrorMessage(data, "Client error occurred");
      return new ProxyCheckDataError(
        message,
        undefined,
        undefined,
        undefined,
        undefined,
        enhancedContext,
      );
    }
  }

  // Handle timeout errors
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "ECONNABORTED") {
      const timeout = "timeout" in error && typeof error.timeout === "number" ? error.timeout : 0;
      return new ProxyCheckTimeoutError("Request timed out", timeout, "request", context);
    }

    // Network errors
    if (typeof error.code === "string") {
      const message = extractErrorMessage(error, "Network error occurred");
      return new ProxyCheckNetworkError(
        message,
        error.code,
        error instanceof Error ? error : undefined,
        context,
      );
    }
  }

  // Handle timeout by message
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("timeout")
  ) {
    return new ProxyCheckTimeoutError("Request timed out", 0, "request", context);
  }

  // Handle network errors
  if (error && typeof error === "object" && "request" in error) {
    const message = extractErrorMessage(error, "Network error occurred");
    return new ProxyCheckNetworkError(
      message,
      undefined,
      error instanceof Error ? error : undefined,
      context,
    );
  }

  // Default to configuration error
  const message = extractErrorMessage(error, "An unknown error occurred");
  return new ProxyCheckConfigurationError(message, undefined, undefined, context);
}
