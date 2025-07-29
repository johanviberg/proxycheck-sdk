/**
 * Response Status Handler - Simplified approach for handling API responses
 */

import {
  createErrorFromResponse,
  ProxyCheckAPIError,
  ProxyCheckError,
  ProxyCheckRateLimitError,
} from "../errors";

/**
 * Response status information
 */
export interface ResponseStatus {
  success: boolean;
  statusCode?: number;
  error?: ProxyCheckError;
  warnings?: Array<string>;
  requestId?: string;
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: Date;
    retryAfter?: number;
  };
}

/**
 * Response envelope with status handling
 */
export interface ResponseEnvelope<T = unknown> {
  data?: T;
  status: ResponseStatus;
  raw?: unknown;
}

/**
 * Status handler configuration
 */
export interface StatusHandlerOptions {
  throwOnError?: boolean;
  includeWarnings?: boolean;
  retryOnRateLimit?: boolean;
  maxRetries?: number;
}

/**
 * Default status handler options
 */
export const DEFAULT_STATUS_OPTIONS: StatusHandlerOptions = {
  throwOnError: true,
  includeWarnings: true,
  retryOnRateLimit: false,
  maxRetries: 3,
};

/**
 * Response status handler
 */
export class ResponseStatusHandler {
  private readonly _options: StatusHandlerOptions;

  constructor(options: Partial<StatusHandlerOptions> = {}) {
    this._options = { ...DEFAULT_STATUS_OPTIONS, ...options };
  }

  /**
   * Handle response and create status envelope
   */
  handleResponse<T>(response: unknown, requestId?: string): ResponseEnvelope<T> {
    const status = this.createStatus(response, requestId);

    if (status.error && this._options.throwOnError) {
      throw status.error;
    }

    return {
      data: response as T,
      status,
      raw: response,
    };
  }

  /**
   * Handle error response
   */
  handleError(error: unknown, requestId?: string): ResponseEnvelope<never> {
    const proxyCheckError = createErrorFromResponse(error);

    const status: ResponseStatus = {
      success: false,
      error: proxyCheckError,
      ...(requestId && { requestId }),
      ...(proxyCheckError.statusCode && { statusCode: proxyCheckError.statusCode }),
    };

    // Extract rate limit info if available
    if (proxyCheckError instanceof ProxyCheckRateLimitError) {
      status.rateLimitInfo = {
        limit: proxyCheckError.limit,
        remaining: proxyCheckError.remaining,
        reset: proxyCheckError.reset,
        retryAfter: proxyCheckError.retryAfter,
      };
    }

    if (this._options.throwOnError) {
      throw proxyCheckError;
    }

    return {
      status,
      raw: error,
    };
  }

  /**
   * Create response status from response data
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for comprehensive status creation
  private createStatus(response: unknown, requestId?: string): ResponseStatus {
    const status: ResponseStatus = {
      success: true,
      ...(requestId && { requestId }),
    };

    // Handle API response format
    if (response && typeof response === "object") {
      const responseObj = response as Record<string, unknown>;

      // Check for explicit status field
      if ("status" in responseObj) {
        if (responseObj["status"] === "error") {
          status.success = false;
          interface TempErrorResponse {
            status: "error" | "denied" | "delayed";
            message: string;
            error?: string;
          }
          const errorResponse: TempErrorResponse = {
            status: responseObj["status"] as "error",
            message: String(responseObj["message"] || "API error"),
          };
          if (responseObj["error"] !== undefined) {
            errorResponse.error = String(responseObj["error"]);
          }
          status.error = new ProxyCheckAPIError(
            String(responseObj["message"] || "API error"),
            Number(responseObj["code"]) || 500,
            errorResponse,
            requestId,
          );
        } else if (responseObj["status"] === "warning") {
          status.warnings = Array.isArray(responseObj["warnings"])
            ? responseObj["warnings"].map(String)
            : [String(responseObj["message"])];
        }
      }

      // Check for error indicators
      if ("error" in responseObj && responseObj["error"]) {
        status.success = false;
        interface TempErrorResponse {
          status: "error" | "denied" | "delayed";
          message: string;
          error?: string;
        }
        const errorResponse: TempErrorResponse = {
          status: "error" as const,
          message: String(responseObj["error"]),
        };
        if (responseObj["error"] !== undefined) {
          errorResponse.error = String(responseObj["error"]);
        }
        status.error = new ProxyCheckAPIError(
          String(responseObj["error"]),
          Number(responseObj["code"]) || 400,
          errorResponse,
          requestId,
        );
      }

      // Handle rate limit headers (if passed through)
      if ("x-ratelimit-limit" in responseObj) {
        status.rateLimitInfo = {
          limit: Number.parseInt(String(responseObj["x-ratelimit-limit"]), 10),
          remaining: Number.parseInt(String(responseObj["x-ratelimit-remaining"] || "0"), 10),
          reset: new Date(
            Number.parseInt(String(responseObj["x-ratelimit-reset"] || "0"), 10) * 1000,
          ),
          retryAfter: Number.parseInt(String(responseObj["retry-after"] || "0"), 10),
        };
      }
    }

    return status;
  }

  /**
   * Check if response indicates success
   */
  static isSuccess(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const responseObj = response as Record<string, unknown>;

    // Check explicit status
    if ("status" in responseObj) {
      return responseObj["status"] === "ok" || responseObj["status"] === "success";
    }

    // Check for error indicators
    if ("error" in responseObj && responseObj["error"]) {
      return false;
    }

    // Default to success if no error indicators
    return true;
  }

  /**
   * Extract warnings from response
   */
  static extractWarnings(response: unknown): Array<string> {
    const warnings: Array<string> = [];

    if (!response || typeof response !== "object") {
      return warnings;
    }

    const responseObj = response as Record<string, unknown>;

    if ("warnings" in responseObj && Array.isArray(responseObj["warnings"])) {
      warnings.push(...responseObj["warnings"].map(String));
    }

    if ("warning" in responseObj && typeof responseObj["warning"] === "string") {
      warnings.push(responseObj["warning"]);
    }

    if ("status" in responseObj && responseObj["status"] === "warning" && responseObj["message"]) {
      warnings.push(String(responseObj["message"]));
    }

    return warnings;
  }

  /**
   * Extract request ID from response or headers
   */
  static extractRequestId(response: unknown, headers?: Record<string, string>): string | undefined {
    // Check response body
    if (response && typeof response === "object") {
      const responseObj = response as Record<string, unknown>;
      if ("requestId" in responseObj && typeof responseObj["requestId"] === "string") {
        return responseObj["requestId"];
      }
    }

    // Check headers
    if (headers) {
      return headers["x-request-id"] || headers["request-id"];
    }

    return undefined;
  }
}

/**
 * Create a successful response envelope
 */
export function createSuccessResponse<T>(data: T, requestId?: string): ResponseEnvelope<T> {
  return {
    data,
    status: {
      success: true,
      ...(requestId && { requestId }),
    },
    raw: data,
  };
}

/**
 * Create an error response envelope
 */
export function createErrorResponse(
  error: ProxyCheckError,
  requestId?: string,
): ResponseEnvelope<never> {
  return {
    status: {
      success: false,
      error,
      ...(requestId && { requestId }),
      ...(error.statusCode !== undefined && { statusCode: error.statusCode }),
    },
    raw: error,
  };
}

/**
 * Create a response with warnings
 */
export function createResponseWithWarnings<T>(
  data: T,
  warnings: Array<string>,
  requestId?: string,
): ResponseEnvelope<T> {
  return {
    data,
    status: {
      success: true,
      warnings,
      ...(requestId && { requestId }),
    },
    raw: data,
  };
}

/**
 * Transform response envelope to simple result
 */
export function unwrapResponse<T>(envelope: ResponseEnvelope<T>): T {
  if (!envelope.status.success) {
    throw envelope.status.error || new ProxyCheckError("Unknown error", "UNKNOWN_ERROR");
  }

  if (envelope.data === undefined) {
    throw new ProxyCheckError("Response data is undefined", "MISSING_DATA");
  }

  return envelope.data;
}

/**
 * Transform response envelope to result with status
 */
export function unwrapResponseWithStatus<T>(envelope: ResponseEnvelope<T>): {
  data: T;
  warnings?: Array<string>;
} {
  if (!envelope.status.success) {
    throw envelope.status.error || new ProxyCheckError("Unknown error", "UNKNOWN_ERROR");
  }

  if (envelope.data === undefined) {
    throw new ProxyCheckError("Response data is undefined", "MISSING_DATA");
  }

  return {
    data: envelope.data,
    ...(envelope.status.warnings && { warnings: envelope.status.warnings }),
  };
}

/**
 * Validate response structure
 */
export function validateResponse(response: unknown): { valid: boolean; errors: Array<string> } {
  const errors: Array<string> = [];

  if (!response) {
    errors.push("Response is null or undefined");
    return { valid: false, errors };
  }

  if (typeof response !== "object") {
    errors.push("Response must be an object");
    return { valid: false, errors };
  }

  const responseObj = response as Record<string, unknown>;

  // Check for required fields based on response type
  if ("status" in responseObj) {
    if (responseObj["status"] === "error" && !responseObj["message"] && !responseObj["error"]) {
      errors.push("Error response must have a message or error field");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate API key response
 */
export function validateApiKeyResponse(response: unknown): boolean {
  if (!response || typeof response !== "object") {
    return false;
  }

  const responseObj = response as Record<string, unknown>;

  // Check for authentication error indicators
  if ("status" in responseObj && responseObj["status"] === "error") {
    return false;
  }

  if ("error" in responseObj && typeof responseObj["error"] === "string") {
    const errorLower = responseObj["error"].toLowerCase();
    return !(errorLower.includes("api key") || errorLower.includes("authentication"));
  }

  return true;
}
