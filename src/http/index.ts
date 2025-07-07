/**
 * HTTP Client with retry logic and rate limiting
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { createErrorFromResponse, isRateLimitError } from "../errors";
import type { Logger } from "../logging";
import type { ClientConfig, RateLimitInfo, RequestConfig } from "../types";
import { DEFAULTS } from "../types/constants";

/**
 * HTTP Client class with built-in retry logic and rate limiting
 */
export class HttpClient {
  private readonly _axios: AxiosInstance;
  private readonly _config: Required<Omit<ClientConfig, "logging">>;
  private _rateLimitInfo?: RateLimitInfo;
  private _logger?: Logger;

  constructor(config: ClientConfig, logger?: Logger) {
    this._config = {
      baseUrl: config.baseUrl || DEFAULTS.BASE_URL,
      timeout: config.timeout || DEFAULTS.TIMEOUT,
      retries: config.retries || DEFAULTS.RETRIES,
      retryDelay: config.retryDelay || DEFAULTS.RETRY_DELAY,
      tlsSecurity: config.tlsSecurity ?? DEFAULTS.TLS_SECURITY,
      userAgent: config.userAgent || DEFAULTS.USER_AGENT,
      apiKey: config.apiKey,
    };
    if (logger !== undefined) {
      this._logger = logger;
    }

    this._axios = axios.create({
      timeout: this._config.timeout,
      headers: {
        "User-Agent": this._config.userAgent,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this._axios.interceptors.request.use(
      (config) => {
        // Set base URL with protocol
        const protocol = this._config.tlsSecurity ? "https" : "http";
        config.baseURL = `${protocol}://${this._config.baseUrl}`;

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this._axios.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return response;
      },
      (error) => {
        if (error.response) {
          this.updateRateLimitInfo(error.response);
        }
        return Promise.reject(createErrorFromResponse(error));
      },
    );
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;

    if (headers["x-ratelimit-limit"]) {
      this._rateLimitInfo = {
        limit: Number.parseInt(headers["x-ratelimit-limit"], 10),
        remaining: Number.parseInt(headers["x-ratelimit-remaining"] || "0", 10),
        reset: new Date(Number.parseInt(headers["x-ratelimit-reset"] || "0", 10) * 1000),
        retryAfter: Number.parseInt(headers["retry-after"] || "0", 10),
      };
    }
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this._rateLimitInfo;
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, baseDelay: number): number {
    return baseDelay * 2 ** attempt + Math.random() * 1000;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Check if error has statusCode property
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      // Don't retry client errors (4xx) except rate limits
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return isRateLimitError(error);
      }
      // Retry server errors (5xx)
      if (error.statusCode >= 500) {
        return true;
      }
    }

    // Retry network errors
    if (error && typeof error === "object" && "code" in error) {
      const code = error.code;
      if (code === "NETWORK_ERROR" || code === "TIMEOUT_ERROR") {
        return true;
      }
    }

    return false;
  }

  /**
   * Perform HTTP request with retry logic
   */
  async request<T = unknown>(requestConfig: RequestConfig): Promise<T> {
    const { method, url, params, data, headers } = requestConfig;
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      params,
      data,
      headers: {
        ...headers,
      },
    };

    this._logger?.debug("HTTP request starting", {
      requestId,
      method,
      url,
      params: params ? Object.keys(params) : undefined,
      hasData: !!data,
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= this._config.retries; attempt++) {
      try {
        const response = await this._axios.request<T>(axiosConfig);
        const duration = Date.now() - startTime;

        this._logger?.info("HTTP request completed", {
          requestId,
          method,
          url,
          statusCode: response.status,
          duration,
          ...(attempt > 0 && { retryAttempt: attempt }),
        });

        return response.data;
      } catch (error: unknown) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt === this._config.retries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        // Calculate delay for next attempt
        let delay = this.calculateDelay(attempt, this._config.retryDelay);

        // Use retry-after header for rate limit errors
        if (isRateLimitError(error) && error.retryAfter) {
          delay = error.retryAfter * 1000;
        }

        this._logger?.warn("HTTP request failed, retrying", {
          requestId,
          method,
          url,
          retryAttempt: attempt + 1,
          maxRetries: this._config.retries,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    const duration = Date.now() - startTime;
    this._logger?.error(
      "HTTP request failed after all retries",
      lastError instanceof Error ? lastError : undefined,
      {
        requestId,
        method,
        url,
        duration,
        attempts: this._config.retries + 1,
      },
    );

    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Perform GET request
   */
  async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const config: RequestConfig = {
      method: "GET",
      url,
    };
    if (params !== undefined) {
      config.params = params as Record<string, string | number | boolean>;
    }
    if (headers !== undefined) {
      config.headers = headers;
    }
    return this.request<T>(config);
  }

  /**
   * Perform POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const config: RequestConfig = {
      method: "POST",
      url,
    };
    if (data !== undefined && data !== null) {
      config.data = data as string | Record<string, unknown>;
    }
    if (params !== undefined) {
      config.params = params as Record<string, string | number | boolean>;
    }
    if (headers !== undefined) {
      config.headers = headers;
    }
    return this.request<T>(config);
  }

  /**
   * Perform POST request with form data
   */
  async postForm<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    const formData = new URLSearchParams();
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    const config: RequestConfig = {
      method: "POST",
      url,
      data: formData.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
    };
    if (params !== undefined) {
      config.params = params as Record<string, string | number | boolean>;
    }
    return this.request<T>(config);
  }

  /**
   * Build URL with query parameters
   */
  buildUrl(endpoint: string, params: Record<string, unknown>): string {
    const url = new URL(
      endpoint,
      `${this._config.tlsSecurity ? "https" : "http"}://${this._config.baseUrl}`,
    );

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // Remove leading slash to match expected format
    const result = url.pathname + url.search;
    return result.startsWith("/") ? result.slice(1) : result;
  }

  /**
   * Build URL with address in path (for single IP/email checks)
   */
  buildUrlWithAddress(endpoint: string, address: string, params: Record<string, unknown>): string {
    // Remove trailing slash from endpoint if present
    const cleanEndpoint = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
    const pathWithAddress = `${cleanEndpoint}/${encodeURIComponent(address)}`;

    const url = new URL(
      pathWithAddress,
      `${this._config.tlsSecurity ? "https" : "http"}://${this._config.baseUrl}`,
    );

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // Remove leading slash to match expected format
    const result = url.pathname + url.search;
    return result.startsWith("/") ? result.slice(1) : result;
  }

  /**
   * Generate unique request ID for logging
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get client configuration
   */
  getConfig(): Readonly<Required<Omit<ClientConfig, "logging">>> {
    return { ...this._config };
  }
}
