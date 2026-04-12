/**
 * ProxyCheck SDK Error Classes
 */

import type { ErrorResponse } from "../types";
import { ERROR_CODES } from "../types/constants";

/**
 * Parse a header value as an integer, returning undefined if absent or malformed
 */
function safeParseInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Base error class for all ProxyCheck errors
 */
export class ProxyCheckError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly timestamp: Date;
  public requestId?: string;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = "ProxyCheckError";
    this.code = code;
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
    this.timestamp = new Date();

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
      requestId: this.requestId,
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

  constructor(message: string, statusCode: number, response?: ErrorResponse, requestId?: string) {
    super(message, ERROR_CODES.API_ERROR, statusCode);
    this.name = "ProxyCheckAPIError";
    if (response !== undefined) {
      this.response = response;
    }
    if (requestId !== undefined) {
      this.requestId = requestId;
    }
  }

  static fromResponse(statusCode: number, response: ErrorResponse, requestId?: string) {
    const message = response.message || response.error || `API error: ${statusCode}`;
    return new ProxyCheckAPIError(message, statusCode, response, requestId);
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
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR);
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
  }
}

/**
 * Rate limiting errors
 */
export class ProxyCheckRateLimitError extends ProxyCheckError {
  public readonly limit: number;
  public readonly remaining?: number;
  public readonly reset: Date;
  public readonly retryAfter: number;

  constructor(
    message: string,
    limit: number,
    remaining: number | undefined,
    reset: Date,
    retryAfter: number,
  ) {
    super(message, ERROR_CODES.RATE_LIMIT, 429);
    this.name = "ProxyCheckRateLimitError";
    this.limit = limit;
    if (remaining !== undefined) {
      this.remaining = remaining;
    }
    this.reset = reset;
    this.retryAfter = retryAfter;
  }
}

/**
 * Network and connection errors
 */
export class ProxyCheckNetworkError extends ProxyCheckError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, ERROR_CODES.NETWORK_ERROR);
    this.name = "ProxyCheckNetworkError";
    if (originalError !== undefined) {
      this.originalError = originalError;
      Object.defineProperty(this, "cause", { value: originalError, writable: false });
    }
  }
}

/**
 * Authentication errors
 */
export class ProxyCheckAuthenticationError extends ProxyCheckError {
  constructor(message = "Invalid or missing API key") {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, 401);
    this.name = "ProxyCheckAuthenticationError";
  }
}

/**
 * Timeout errors
 */
export class ProxyCheckTimeoutError extends ProxyCheckError {
  public readonly timeout: number;
  public readonly originalError?: Error;

  constructor(message: string, timeout: number, originalError?: Error) {
    super(message, ERROR_CODES.TIMEOUT_ERROR);
    this.name = "ProxyCheckTimeoutError";
    this.timeout = timeout;
    if (originalError !== undefined) {
      this.originalError = originalError;
      Object.defineProperty(this, "cause", { value: originalError, writable: false });
    }
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
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: unknown): error is ProxyCheckNetworkError {
  return error instanceof ProxyCheckNetworkError;
}

/**
 * Type guard to check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is ProxyCheckTimeoutError {
  return error instanceof ProxyCheckTimeoutError;
}

/**
 * Type guard to check if an error is an authentication error
 */
export function isAuthenticationError(error: unknown): error is ProxyCheckAuthenticationError {
  return error instanceof ProxyCheckAuthenticationError;
}

/**
 * Create appropriate error from axios error or other errors
 */
export function createErrorFromResponse(error: unknown): ProxyCheckError {
  // Handle axios errors
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response: { status: number; data: unknown; headers: Record<string, string> };
    };
    const { status, data, headers } = axiosError.response;

    // Check for rate limiting
    if (status === 429) {
      const limit = safeParseInt(headers["x-ratelimit-limit"]) ?? 0;
      const remaining = safeParseInt(headers["x-ratelimit-remaining"]);
      const resetSeconds = safeParseInt(headers["x-ratelimit-reset"]);
      const reset = resetSeconds !== undefined ? new Date(resetSeconds * 1000) : new Date();
      const retryAfter = safeParseInt(headers["retry-after"]) ?? 0;

      return new ProxyCheckRateLimitError(
        "Rate limit exceeded",
        limit,
        remaining,
        reset,
        retryAfter,
      );
    }

    // Handle authentication errors
    if (status === 401) {
      const message =
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : "Authentication failed";
      return new ProxyCheckAuthenticationError(message);
    }

    // Handle other API errors
    const errorResponse = data as ErrorResponse;
    return ProxyCheckAPIError.fromResponse(status, errorResponse, headers["x-request-id"]);
  }

  const originalError = error instanceof Error ? error : undefined;

  // Handle timeout errors
  if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
    const timeout = "timeout" in error && typeof error.timeout === "number" ? error.timeout : 0;
    return new ProxyCheckTimeoutError("Request timed out", timeout, originalError);
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("timeout")
  ) {
    return new ProxyCheckTimeoutError("Request timed out", 0, originalError);
  }

  // Handle network errors
  if (error && typeof error === "object" && "request" in error) {
    return new ProxyCheckNetworkError("Network error occurred", originalError);
  }

  // Default to unknown error
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "An unknown error occurred";
  return new ProxyCheckError(message, ERROR_CODES.UNKNOWN_ERROR);
}
