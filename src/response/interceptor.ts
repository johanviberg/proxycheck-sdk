/**
 * Response Interceptor - Handles API responses consistently
 */

import { ProxyCheckError } from "../errors";
import { type ResponseEnvelope, ResponseStatusHandler } from "./status-handler";

/**
 * Response interceptor configuration
 */
export interface ResponseInterceptorConfig {
  handleStatus?: boolean;
  throwOnError?: boolean;
  includeWarnings?: boolean;
  logResponses?: boolean;
  onResponse?: (response: unknown, requestId?: string) => void;
  onError?: (error: ProxyCheckError, requestId?: string) => void;
}

/**
 * Default interceptor configuration
 */
export const DEFAULT_INTERCEPTOR_CONFIG: ResponseInterceptorConfig = {
  handleStatus: true,
  throwOnError: true,
  includeWarnings: true,
  logResponses: false,
};

/**
 * Response interceptor for consistent API response handling
 */
export class ResponseInterceptor {
  private readonly _config: ResponseInterceptorConfig;
  private readonly _statusHandler: ResponseStatusHandler;

  constructor(config: Partial<ResponseInterceptorConfig> = {}) {
    this._config = { ...DEFAULT_INTERCEPTOR_CONFIG, ...config };
    this._statusHandler = new ResponseStatusHandler({
      ...(this._config.throwOnError !== undefined && { throwOnError: this._config.throwOnError }),
      ...(this._config.includeWarnings !== undefined && {
        includeWarnings: this._config.includeWarnings,
      }),
    });
  }

  /**
   * Intercept successful response
   */
  onResponse<T>(response: unknown, requestId?: string): T | ResponseEnvelope<T> {
    try {
      // Log response if enabled
      if (this._config.logResponses) {
        this.logResponse(response, requestId);
      }

      // Call response callback if provided
      if (this._config.onResponse) {
        this._config.onResponse(response, requestId);
      }

      // Handle status if enabled
      if (this._config.handleStatus) {
        const envelope = this._statusHandler.handleResponse<T>(response, requestId);
        return envelope;
      }

      return response as T;
    } catch (error) {
      // Handle errors in response processing
      return this.onError(error, requestId);
    }
  }

  /**
   * Intercept error response
   */
  onError<T>(error: unknown, requestId?: string): T | ResponseEnvelope<T> | never {
    try {
      // Log error if enabled
      if (this._config.logResponses) {
        this.logError(error, requestId);
      }

      // Handle error with status handler
      if (this._config.handleStatus) {
        const envelope = this._statusHandler.handleError(error, requestId);
        return envelope as ResponseEnvelope<T>;
      }

      // Re-throw if not handling status
      if (error instanceof ProxyCheckError) {
        throw error;
      }

      // Convert unknown errors
      throw new ProxyCheckError(
        error instanceof Error ? error.message : String(error),
        "UNKNOWN_ERROR",
      );
    } catch (handledError) {
      // Call error callback if provided
      if (this._config.onError && handledError instanceof ProxyCheckError) {
        this._config.onError(handledError, requestId);
      }

      throw handledError;
    }
  }

  /**
   * Create axios interceptors
   */
  createAxiosInterceptors() {
    return {
      response: {
        onFulfilled: (response: unknown) => {
          const requestId = this.extractRequestId(response);
          return this.onResponse((response as { data: unknown }).data, requestId);
        },
        onRejected: (error: unknown) => {
          const requestId = this.extractRequestId((error as { response?: unknown }).response);
          return this.onError(error, requestId);
        },
      },
      request: {
        onFulfilled: (config: unknown) => {
          // Add request ID if not present
          const configObj = config as { headers: Record<string, string> };
          if (!configObj.headers["x-request-id"]) {
            configObj.headers["x-request-id"] = this.generateRequestId();
          }
          return config;
        },
        onRejected: (error: unknown) => {
          return Promise.reject(error);
        },
      },
    };
  }

  /**
   * Extract request ID from response
   */
  private extractRequestId(response?: unknown): string | undefined {
    if (!response) {
      return undefined;
    }

    // Check headers
    if (response && typeof response === "object" && "headers" in response) {
      const headers = (response as { headers: Record<string, string> }).headers;
      return headers["x-request-id"] || headers["request-id"];
    }

    // Check response data
    if (response && typeof response === "object" && "data" in response) {
      const data = (response as { data: Record<string, unknown> }).data;
      return data["requestId"] as string;
    }

    return undefined;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log response
   */
  private logResponse(_response: unknown, _requestId?: string): void {
    // Logging implementation would go here
    // const logData = {
    //   requestId,
    //   timestamp: new Date().toISOString(),
    //   response: response,
    // };
  }

  /**
   * Log error
   */
  private logError(_error: unknown, _requestId?: string): void {
    // Logging implementation would go here
    // const logData = {
    //   requestId,
    //   timestamp: new Date().toISOString(),
    //   error:
    //     error instanceof Error
    //       ? {
    //           name: error.name,
    //           message: error.message,
    //           stack: error.stack,
    //         }
    //       : error,
    // };
  }
}

/**
 * Create basic interceptor
 */
export function createBasicInterceptor(): ResponseInterceptor {
  return new ResponseInterceptor();
}

/**
 * Create interceptor with logging
 */
export function createLoggingInterceptor(): ResponseInterceptor {
  return new ResponseInterceptor({
    logResponses: true,
  });
}

/**
 * Create interceptor that doesn't throw on errors
 */
export function createSafeInterceptor(): ResponseInterceptor {
  return new ResponseInterceptor({
    throwOnError: false,
  });
}

/**
 * Create interceptor with custom callbacks
 */
export function createCallbackInterceptor(
  onResponse?: (response: unknown, requestId?: string) => void,
  onError?: (error: ProxyCheckError, requestId?: string) => void,
): ResponseInterceptor {
  return new ResponseInterceptor({
    ...(onResponse && { onResponse }),
    ...(onError && { onError }),
  });
}

/**
 * Response middleware for processing responses
 */
export interface ResponseMiddleware {
  process<T>(response: T, requestId?: string): T | Promise<T>;
}

/**
 * Response middleware manager
 */
export class ResponseMiddlewareManager {
  private _middleware: Array<ResponseMiddleware> = [];

  /**
   * Add middleware
   */
  use(middleware: ResponseMiddleware): void {
    this._middleware.push(middleware);
  }

  /**
   * Process response through all middleware
   */
  async process<T>(response: T, requestId?: string): Promise<T> {
    let result = response;

    for (const middleware of this._middleware) {
      result = await middleware.process(result, requestId);
    }

    return result;
  }
}

/**
 * Middleware to transform response format
 */
export function createTransformMiddleware<T, U>(transform: (response: T) => U): ResponseMiddleware {
  return {
    process: <V>(response: V) => transform(response as unknown as T) as unknown as V,
  };
}

/**
 * Middleware to validate response
 */
export function createValidatorMiddleware<T>(
  validate: (response: T) => boolean,
  errorMessage = "Response validation failed",
): ResponseMiddleware {
  return {
    process: <V>(response: V) => {
      if (!validate(response as unknown as T)) {
        throw new ProxyCheckError(errorMessage, "VALIDATION_ERROR");
      }
      return response;
    },
  };
}

/**
 * Middleware to cache responses
 */
export function createCacheMiddleware<T>(
  cache: Map<string, T>,
  keyGenerator: (response: T, requestId?: string) => string,
): ResponseMiddleware {
  return {
    process: <V>(response: V, requestId?: string) => {
      const key = keyGenerator(response as unknown as T, requestId);
      cache.set(key, response as unknown as T);
      return response;
    },
  };
}

/**
 * Middleware to measure response time
 */
export function createTimingMiddleware(
  onTiming: (duration: number, requestId?: string) => void,
): ResponseMiddleware {
  const startTimes = new Map<string, number>();

  return {
    process: <T>(response: T, requestId?: string) => {
      if (requestId) {
        const startTime = startTimes.get(requestId);
        if (startTime) {
          const duration = Date.now() - startTime;
          onTiming(duration, requestId);
          startTimes.delete(requestId);
        }
      }
      return response;
    },
  };
}
