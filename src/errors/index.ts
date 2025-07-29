/**
 * ProxyCheck SDK Error Classes
 */

import type { ErrorResponse } from "../types";
import { ERROR_CODES } from "../types/constants";

/**
 * Base error class for all ProxyCheck errors
 */
export class ProxyCheckError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly timestamp: Date;
  public $retryable = false;
  public $metadata: Record<string, unknown> = {};

  constructor(message: string, code: string, statusCode?: number, cause?: unknown) {
    super(message);
    this.name = "ProxyCheckError";
    this.code = code;
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
    this.timestamp = new Date();

    // Store the cause if provided
    if (cause !== undefined) {
      // Using type assertion for ES2020 compatibility (no native ErrorOptions)
      // biome-ignore lint/suspicious/noExplicitAny: Required for ES2020 compatibility
      (this as any).cause = cause;
    }

    // Critical for TypeScript: Maintain proper prototype chain
    Object.setPrototypeOf(this, ProxyCheckError.prototype);

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * API-specific errors (4xx, 5xx responses)
 */
export class ProxyCheckAPIError extends ProxyCheckError {
  public readonly response?: ErrorResponse;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    response?: ErrorResponse,
    requestId?: string,
    cause?: unknown,
  ) {
    super(message, ERROR_CODES.API_ERROR, statusCode, cause);
    this.name = "ProxyCheckAPIError";
    if (response !== undefined) {
      this.response = response;
    }
    if (requestId !== undefined) {
      this.requestId = requestId;
    }
    Object.setPrototypeOf(this, ProxyCheckAPIError.prototype);
  }

  static fromResponse(
    statusCode: number,
    response: ErrorResponse,
    requestId?: string,
    cause?: unknown,
  ) {
    const message = response.message || response.error || `API error: ${statusCode}`;
    return new ProxyCheckAPIError(message, statusCode, response, requestId, cause);
  }
}

/**
 * Validation errors for invalid input
 */
export class ProxyCheckValidationError extends ProxyCheckError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly validationErrors?: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    validationErrors?: Array<{ path: string; message: string }>,
    cause?: unknown,
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, undefined, cause);
    this.name = "ProxyCheckValidationError";
    if (field !== undefined) {
      this.field = field;
    }
    if (value !== undefined) {
      this.value = value;
    }
    if (validationErrors !== undefined) {
      this.validationErrors = validationErrors;
    }
    Object.setPrototypeOf(this, ProxyCheckValidationError.prototype);
  }
}

/**
 * Rate limiting errors
 */
export class ProxyCheckRateLimitError extends ProxyCheckError {
  public readonly limit: number;
  public readonly remaining: number;
  public readonly reset: Date;
  public readonly retryAfter: number;

  constructor(
    message: string,
    limit: number,
    remaining: number,
    reset: Date,
    retryAfter: number,
    cause?: unknown,
  ) {
    super(message, ERROR_CODES.RATE_LIMIT, 429, cause);
    this.name = "ProxyCheckRateLimitError";
    this.limit = limit;
    this.remaining = remaining;
    this.reset = reset;
    this.retryAfter = retryAfter;
    this.$retryable = true;
    this.$metadata["retryAfter"] = retryAfter;
    this.$metadata["reset"] = reset.toISOString();
    Object.setPrototypeOf(this, ProxyCheckRateLimitError.prototype);
  }
}

/**
 * Network and connection errors
 */
export class ProxyCheckNetworkError extends ProxyCheckError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error, cause?: unknown) {
    super(message, ERROR_CODES.NETWORK_ERROR, undefined, cause || originalError);
    this.name = "ProxyCheckNetworkError";
    if (originalError !== undefined) {
      this.originalError = originalError;
    }
    this.$retryable = true;
    Object.setPrototypeOf(this, ProxyCheckNetworkError.prototype);
  }
}

/**
 * Authentication errors
 */
export class ProxyCheckAuthenticationError extends ProxyCheckError {
  constructor(message = "Invalid or missing API key", cause?: unknown) {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, 401, cause);
    this.name = "ProxyCheckAuthenticationError";
    Object.setPrototypeOf(this, ProxyCheckAuthenticationError.prototype);
  }
}

/**
 * Timeout errors
 */
export class ProxyCheckTimeoutError extends ProxyCheckError {
  public readonly timeout: number;

  constructor(message: string, timeout: number, cause?: unknown) {
    super(message, ERROR_CODES.TIMEOUT_ERROR, undefined, cause);
    this.name = "ProxyCheckTimeoutError";
    this.timeout = timeout;
    this.$retryable = true;
    this.$metadata["timeout"] = timeout;
    Object.setPrototypeOf(this, ProxyCheckTimeoutError.prototype);
  }
}

/**
 * Type guard to check if an error is a ProxyCheck error
 */
export function isProxyCheckError(error: unknown): error is ProxyCheckError {
  return error instanceof ProxyCheckError;
}

/**
 * Type guard to check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is ProxyCheckRateLimitError {
  return error instanceof ProxyCheckRateLimitError;
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ProxyCheckValidationError {
  return error instanceof ProxyCheckValidationError;
}

/**
 * List operation errors
 */
export class ProxyCheckListError extends ProxyCheckError {
  public readonly operation?: string;
  public readonly listType?: "whitelist" | "blacklist";
  public readonly entries?: Array<string>;

  constructor(
    message: string,
    operation?: string,
    listType?: "whitelist" | "blacklist",
    entries?: Array<string>,
    cause?: unknown,
  ) {
    super(message, ERROR_CODES.API_ERROR, undefined, cause);
    this.name = "ProxyCheckListError";
    if (operation !== undefined) {
      this.operation = operation;
    }
    if (listType !== undefined) {
      this.listType = listType;
    }
    if (entries !== undefined) {
      this.entries = entries;
    }
    Object.setPrototypeOf(this, ProxyCheckListError.prototype);
  }
}

/**
 * Type guard to check if an error is a list error
 */
export function isListError(error: unknown): error is ProxyCheckListError {
  return error instanceof ProxyCheckListError;
}

// Export enhanced error classes
export * from "./enhanced";
export * from "./handler";
export * from "./recovery";

/**
 * Create appropriate error from axios error or other errors
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for comprehensive error handling
export function createErrorFromResponse(error: unknown): ProxyCheckError {
  // Handle axios errors
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response: { status: number; data: unknown; headers: Record<string, string> };
    };
    const { status, data, headers } = axiosError.response;

    // Check for rate limiting
    if (status === 429) {
      const limit = Number.parseInt(headers["x-ratelimit-limit"] || "0", 10);
      const remaining = Number.parseInt(headers["x-ratelimit-remaining"] || "0", 10);
      const reset = new Date(Number.parseInt(headers["x-ratelimit-reset"] || "0", 10) * 1000);
      const retryAfter = Number.parseInt(headers["retry-after"] || "60", 10);

      return new ProxyCheckRateLimitError(
        "Rate limit exceeded",
        limit,
        remaining,
        reset,
        retryAfter,
        error,
      );
    }

    // Handle authentication errors
    if (status === 401) {
      const message =
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : "Authentication failed";
      return new ProxyCheckAuthenticationError(message, error);
    }

    // Handle other API errors
    const errorResponse = data as ErrorResponse;
    return ProxyCheckAPIError.fromResponse(status, errorResponse, headers["x-request-id"], error);
  }

  // Handle timeout errors
  if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
    const timeout = "timeout" in error && typeof error.timeout === "number" ? error.timeout : 0;
    return new ProxyCheckTimeoutError("Request timed out", timeout, error);
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("timeout")
  ) {
    return new ProxyCheckTimeoutError("Request timed out", 0, error);
  }

  // Handle network errors
  if (error && typeof error === "object" && "request" in error) {
    const originalError = error instanceof Error ? error : undefined;
    return new ProxyCheckNetworkError("Network error occurred", originalError, error);
  }

  // Default to base error
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "An unknown error occurred";
  return new ProxyCheckError(message, ERROR_CODES.API_ERROR, undefined, error);
}
