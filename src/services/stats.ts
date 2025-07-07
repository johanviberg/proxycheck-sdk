/**
 * Stats Service for usage statistics and exports
 */

import { ProxyCheckValidationError } from "../errors";
import type { StatsOptions, StatsResponse } from "../types";
import { API_ENDPOINTS } from "../types/constants";
import { StatsOptionsSchema } from "../types/schemas";
import { BaseService } from "./base";

/**
 * Service for retrieving usage statistics and exports
 */
export class StatsService extends BaseService {
  /**
   * Get service name
   */
  getServiceName(): string {
    return "Stats";
  }

  /**
   * Get detection statistics
   */
  async getDetections(limit = 100, offset = 0): Promise<StatsResponse> {
    return this.getStats("detections", { limit, offset });
  }

  /**
   * Get query statistics
   */
  async getQueries(limit = 100, offset = 0): Promise<StatsResponse> {
    return this.getStats("queries", { limit, offset });
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<StatsResponse> {
    return this.getStats("usage");
  }

  /**
   * Export detection history
   */
  async exportDetections(
    options: { limit?: number; offset?: number } = {},
  ): Promise<StatsResponse> {
    return this.getDetections(options.limit, options.offset);
  }

  /**
   * Export query logs
   */
  async exportQueries(options: { limit?: number; offset?: number } = {}): Promise<StatsResponse> {
    return this.getQueries(options.limit, options.offset);
  }

  /**
   * Export usage data
   */
  async exportUsage(): Promise<StatsResponse> {
    return this.getUsage();
  }

  /**
   * Get paginated detections
   */
  async getDetectionsPaginated(page = 1, pageSize = 100): Promise<StatsResponse> {
    const offset = (page - 1) * pageSize;
    return this.getDetections(pageSize, offset);
  }

  /**
   * Get paginated queries
   */
  async getQueriesPaginated(page = 1, pageSize = 100): Promise<StatsResponse> {
    const offset = (page - 1) * pageSize;
    return this.getQueries(pageSize, offset);
  }

  /**
   * Get recent detections (last N entries)
   */
  async getRecentDetections(count = 50): Promise<StatsResponse> {
    return this.getDetections(count, 0);
  }

  /**
   * Get recent queries (last N entries)
   */
  async getRecentQueries(count = 50): Promise<StatsResponse> {
    return this.getQueries(count, 0);
  }

  /**
   * Get all available statistics
   */
  async getAllStats(): Promise<{
    detections: StatsResponse;
    queries: StatsResponse;
    usage: StatsResponse;
  }> {
    const [detections, queries, usage] = await Promise.all([
      this.getDetections(),
      this.getQueries(),
      this.getUsage(),
    ]);

    return { detections, queries, usage };
  }

  /**
   * Core stats retrieval method
   */
  private async getStats(
    statType: "detections" | "queries" | "usage",
    options: { limit?: number; offset?: number } = {},
  ): Promise<StatsResponse> {
    // Validate configuration
    this.validateConfiguration();

    // Build options
    const statsOptions: StatsOptions = {
      apiKey: this.getApiKey(),
      tlsSecurity: this.config.isTlsEnabled(),
      statSelection: statType,
    };

    // Add pagination options for detections and queries
    if (statType === "detections" || statType === "queries") {
      if (options.limit !== undefined) {
        statsOptions.limit = this.validateLimit(options.limit);
      }
      if (options.offset !== undefined) {
        statsOptions.offset = this.validateOffset(options.offset);
      }
    }

    // Validate options
    const validatedOptions = this.validateOptions(statsOptions);

    // Build URL and query parameters
    const url = `${API_ENDPOINTS.EXPORT}${validatedOptions.statSelection}/`;

    const queryParams: Record<string, string | number> = {
      key: validatedOptions.apiKey || this.getApiKey(),
    };

    // Add JSON format for detections and queries
    if (statType === "detections" || statType === "queries") {
      queryParams["json"] = 1;
    }

    // Add pagination parameters for detections
    if (statType === "detections") {
      if (validatedOptions.limit !== undefined) {
        queryParams["limit"] = validatedOptions.limit;
      }
      if (validatedOptions.offset !== undefined) {
        queryParams["offset"] = validatedOptions.offset;
      }
    }

    // Make request
    const fullUrl = this.http.buildUrl(url, queryParams);
    const response = await this.http.get<StatsResponse>(fullUrl);

    return this.processResponse(response);
  }

  /**
   * Validate limit parameter
   */
  private validateLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new ProxyCheckValidationError("Limit must be a positive integer", "limit", limit);
    }

    if (limit > 1000) {
      throw new ProxyCheckValidationError("Limit cannot exceed 1000", "limit", limit);
    }

    return limit;
  }

  /**
   * Validate offset parameter
   */
  private validateOffset(offset: number): number {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ProxyCheckValidationError(
        "Offset must be a non-negative integer",
        "offset",
        offset,
      );
    }

    return offset;
  }

  /**
   * Validate options using Zod schema
   */
  private validateOptions(options: StatsOptions): StatsOptions {
    try {
      const parsed = StatsOptionsSchema.parse(options) as any;
      return this.stripUndefined(parsed) as StatsOptions;
    } catch (_error) {
      throw new ProxyCheckValidationError("Invalid stats options provided", "options", options);
    }
  }

  private stripUndefined<T extends Record<string, unknown>>(obj: T): T {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
    return result;
  }
}
