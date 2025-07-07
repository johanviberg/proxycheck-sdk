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
  public readonly remaining: number;
  public readonly reset: Date;
  public readonly retryAfter: number;

  constructor(message: string, limit: number, remaining: number, reset: Date, retryAfter: number) {
    super(message, ERROR_CODES.RATE_LIMIT, 429);
    this.name = "ProxyCheckRateLimitError";
    this.limit = limit;
    this.remaining = remaining;
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

  constructor(message: string, timeout: number) {
    super(message, ERROR_CODES.TIMEOUT_ERROR);
    this.name = "ProxyCheckTimeoutError";
    this.timeout = timeout;
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

  // Handle timeout errors
  if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
    const timeout = "timeout" in error && typeof error.timeout === "number" ? error.timeout : 0;
    return new ProxyCheckTimeoutError("Request timed out", timeout);
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("timeout")
  ) {
    return new ProxyCheckTimeoutError("Request timed out", 0);
  }

  // Handle network errors
  if (error && typeof error === "object" && "request" in error) {
    const originalError = error instanceof Error ? error : undefined;
    return new ProxyCheckNetworkError("Network error occurred", originalError);
  }

  // Default to base error
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "An unknown error occurred";
  return new ProxyCheckError(message, ERROR_CODES.API_ERROR);
}
