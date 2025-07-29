/**
 * Error utility functions for ProxyCheck SDK
 */

/**
 * Type for error objects with ProxyCheck-specific properties
 */
interface ErrorWithProperties extends Error {
  code?: string;
  statusCode?: number;
  $retryable?: boolean;
  $metadata?: Record<string, unknown>;
  timestamp?: Date;
  requestId?: string;
  cause?: unknown;
  field?: string;
  value?: unknown;
  validationErrors?: Array<{ path: string; message: string }>;
  limit?: number;
  remaining?: number;
  reset?: Date | string;
  retryAfter?: number;
  timeout?: number;
  originalError?: unknown;
  response?: unknown;
}

/**
 * Ensures that a thrown value is an Error object
 * @param value - The value that was thrown
 * @returns An Error object
 * @example
 * try {
 *   // some code that might throw anything
 * } catch (error) {
 *   const err = ensureError(error);
 *   console.log(err.message); // Guaranteed to be a string
 * }
 */
export function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  let stringified = "[Unable to stringify the thrown value]";
  try {
    stringified = JSON.stringify(value);
  } catch {
    // Ignore stringify errors
  }

  const error = new Error(`Non-error thrown: ${stringified}`);
  error.name = "NonErrorThrown";
  return error;
}

/**
 * Checks if an error should be retried based on ProxyCheck error metadata
 * @param error - The error to check
 * @returns True if the error is retryable
 * @example
 * if (shouldRetryError(error)) {
 *   // Retry the operation
 * }
 */
export function shouldRetryError(error: unknown): boolean {
  if (error && typeof error === "object" && "$retryable" in error) {
    return error.$retryable === true;
  }

  // Check for specific error codes that are retryable
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    if (code === "NETWORK_ERROR" || code === "TIMEOUT_ERROR" || code === "RATE_LIMIT") {
      return true;
    }
  }

  // Check for HTTP status codes
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    // Retry server errors (5xx)
    if (error.statusCode >= 500) {
      return true;
    }
    // Retry rate limit errors (429)
    if (error.statusCode === 429) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts error details for logging and debugging
 * @param error - The error to extract details from
 * @returns An object containing error details
 * @example
 * logger.error('Operation failed', getErrorDetails(error));
 */
export function getErrorDetails(error: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  if (error === null) {
    details["type"] = "null";
    return details;
  }

  if (error === undefined) {
    details["type"] = "undefined";
    return details;
  }

  details["type"] = typeof error;

  if (error instanceof Error) {
    details["name"] = error.name;
    details["message"] = error.message;
    details["stack"] = error.stack;

    // Type the error as ErrorWithProperties to access properties safely
    const errorWithProps = error as ErrorWithProperties;

    // Extract ProxyCheck-specific properties
    if ("code" in error) {
      details["code"] = errorWithProps.code;
    }
    if ("statusCode" in error) {
      details["statusCode"] = errorWithProps.statusCode;
    }
    if ("$retryable" in error) {
      details["retryable"] = errorWithProps.$retryable;
    }
    if ("$metadata" in error) {
      details["metadata"] = errorWithProps.$metadata;
    }
    if ("timestamp" in error) {
      details["timestamp"] = errorWithProps.timestamp;
    }
    if ("requestId" in error) {
      details["requestId"] = errorWithProps.requestId;
    }
    if ("cause" in error && errorWithProps.cause instanceof Error) {
      details["cause"] = getErrorDetails(errorWithProps.cause);
    }

    // Extract validation error details
    if ("field" in error) {
      details["field"] = errorWithProps.field;
    }
    if ("value" in error) {
      details["value"] = errorWithProps.value;
    }
    if ("validationErrors" in error) {
      details["validationErrors"] = errorWithProps.validationErrors;
    }

    // Extract rate limit details
    if ("limit" in error) {
      details["limit"] = errorWithProps.limit;
    }
    if ("remaining" in error) {
      details["remaining"] = errorWithProps.remaining;
    }
    if ("reset" in error) {
      details["reset"] = errorWithProps.reset;
    }
    if ("retryAfter" in error) {
      details["retryAfter"] = errorWithProps.retryAfter;
    }

    // Extract network error details
    if ("originalError" in error) {
      details["originalError"] = getErrorDetails(errorWithProps.originalError);
    }

    // Extract timeout details
    if ("timeout" in error) {
      details["timeout"] = errorWithProps.timeout;
    }

    // Extract API error details
    if ("response" in error) {
      details["response"] = errorWithProps.response;
    }
  } else if (typeof error === "object" && error !== null) {
    // Handle non-Error objects
    try {
      details["value"] = JSON.parse(JSON.stringify(error));
    } catch {
      details["value"] = String(error);
    }
  } else {
    // Handle primitives
    details["value"] = error;
  }

  return details;
}
