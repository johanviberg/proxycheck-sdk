/**
 * Base service class for all API services
 */

import type { ConfigManager } from "../config";
import { ProxyCheckValidationError } from "../errors";
import type { HttpClient } from "../http";
import type { Logger } from "../logging";

/**
 * Abstract base class for all API services
 */
export abstract class BaseService {
  protected readonly http: HttpClient;
  protected readonly config: ConfigManager;
  protected readonly logger: Logger;

  constructor(http: HttpClient, config: ConfigManager) {
    this.http = http;
    this.config = config;
    this.logger = config.getLogger();
  }

  /**
   * Get the base URL for API requests
   */
  protected getBaseUrl(): string {
    return this.config.getBaseUrl();
  }

  /**
   * Get the API key from configuration
   */
  protected getApiKey(): string {
    return this.config.getApiKey();
  }

  /**
   * Validate that the service is properly configured
   */
  protected validateConfiguration(): void {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.length === 0) {
      throw new ProxyCheckValidationError(
        "API key is required but not configured",
        "apiKey",
        apiKey,
      );
    }
  }

  /**
   * Validate addresses for API requests
   */
  protected validateAddresses(addresses: string | Array<string>): void {
    if (!addresses) {
      throw new ProxyCheckValidationError("Addresses are required", "addresses", addresses);
    }

    const addressList = Array.isArray(addresses) ? addresses : [addresses];

    if (addressList.length === 0) {
      throw new ProxyCheckValidationError(
        "At least one address is required",
        "addresses",
        addresses,
      );
    }

    // Validate each address format
    for (const address of addressList) {
      if (typeof address !== "string" || address.trim().length === 0) {
        throw new ProxyCheckValidationError(
          "Address must be a non-empty string",
          "addresses",
          address,
        );
      }
    }
  }

  /**
   * Build common request headers
   */
  protected buildHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      "User-Agent": this.config.getUserAgent(),
      ...additionalHeaders,
    };
  }

  /**
   * Handle common response processing
   */
  protected processResponse<T>(response: T): T {
    // Add any common response processing logic here
    // For now, just return the response as-is
    return response;
  }

  /**
   * Sleep utility for rate limiting
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry a request with exponential backoff
   */
  protected async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * 2 ** attempt + Math.random() * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Abstract method to be implemented by each service
   */
  abstract getServiceName(): string;
}
