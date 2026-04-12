/**
 * Base service class for all API services
 */

import type { ConfigManager } from "../config";
import {
  ProxyCheckAPIError,
  ProxyCheckAuthenticationError,
  ProxyCheckValidationError,
} from "../errors";
import type { HttpClient } from "../http";
import type { Logger } from "../logging";
import type { ErrorResponse } from "../types";

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
      throw new ProxyCheckValidationError("API key is required but not configured", "apiKey");
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
   * Handle common response processing — checks for API-level errors returned in 200 responses
   */
  protected processResponse<T>(response: T): T {
    if (response && typeof response === "object" && "status" in response) {
      const resp = response as Record<string, unknown>;
      const message = typeof resp["message"] === "string" ? resp["message"] : undefined;

      if (resp["status"] === "denied") {
        throw new ProxyCheckAuthenticationError(message ?? "Request denied by API");
      }

      if (resp["status"] === "error") {
        throw ProxyCheckAPIError.fromResponse(200, {
          status: "error",
          message: message ?? "API returned an error",
        } as ErrorResponse);
      }
    }
    return response;
  }

  /**
   * Abstract method to be implemented by each service
   */
  abstract getServiceName(): string;
}
