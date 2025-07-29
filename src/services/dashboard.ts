/**
 * Dashboard Service for ProxyCheck SDK
 * Provides access to dashboard statistics, detections, and query history
 */

import type { StatsResponse } from "../types";
import type { DetectionEntry, QueryHistoryEntry, UsageStats } from "../types/responses";
import { BaseService } from "./base";
import { StatsService } from "./stats";

/**
 * Dashboard service for accessing ProxyCheck dashboard data
 */
export class DashboardService extends BaseService {
  private readonly _statsService: StatsService;

  constructor(http: any, config: any) {
    super(http, config);
    this._statsService = new StatsService(http, config);
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return "Dashboard";
  }

  /**
   * Get current usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await this._statsService.getUsage();
    return this.transformUsageResponse(response);
  }

  /**
   * Get detection entries with optional filtering
   */
  async getDetections(
    options: { limit?: number; offset?: number; filter?: string } = {},
  ): Promise<Array<DetectionEntry>> {
    const { limit = 100, offset = 0 } = options;
    const response = await this._statsService.getDetections(limit, offset);
    return this.transformDetectionResponse(response, options.filter);
  }

  /**
   * Get query history
   */
  async getQueries(options: { days?: number } = {}): Promise<Record<string, QueryHistoryEntry>> {
    const response = await this._statsService.getQueries();
    return this.transformQueryHistoryResponse(response, options.days);
  }

  /**
   * Get paginated detections
   */
  async getDetectionsPaginated(
    page = 1,
    pageSize = 50,
  ): Promise<{
    data: Array<DetectionEntry>;
    pagination: {
      page: number;
      pageSize: number;
      hasMore: boolean;
    };
  }> {
    const offset = (page - 1) * pageSize;
    const detections = await this.getDetections({
      limit: pageSize + 1, // Request one extra to check if there are more
      offset,
    });

    const hasMore = detections.length > pageSize;
    const data = hasMore ? detections.slice(0, pageSize) : detections;

    return {
      data,
      pagination: {
        page,
        pageSize,
        hasMore,
      },
    };
  }

  /**
   * Get recent detections (last N entries)
   */
  async getRecentDetections(count = 50): Promise<Array<DetectionEntry>> {
    return this.getDetections({ limit: count, offset: 0 });
  }

  /**
   * Get detection statistics summary
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for comprehensive summary calculation
  async getDetectionSummary(_days = 30): Promise<{
    total: number;
    unique: number;
    byType: Record<string, number>;
    byRisk: Record<string, number>;
    byCountry: Record<string, number>;
    trends: {
      today: number;
      yesterday: number;
      lastWeek: number;
      lastMonth: number;
    };
  }> {
    const detections = await this.getDetections({ limit: 1000 });

    // Calculate cutoff dates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Process detections
    const uniqueAddresses = new Set<string>();
    const byType: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    const byCountry: Record<string, number> = {};

    let todayCount = 0;
    let yesterdayCount = 0;
    let lastWeekCount = 0;
    let lastMonthCount = 0;

    for (const detection of detections) {
      uniqueAddresses.add(detection.address);

      // Count by type
      const type = detection.detectionType || "Unknown";
      byType[type] = (byType[type] || 0) + 1;

      // Count by risk level (simplified for now since we don't have risk info)
      const risk = "Unknown";
      byRisk[risk] = (byRisk[risk] || 0) + 1;

      // Count by country (simplified for now since we don't have country info)
      const country = "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;

      // Count by time periods
      if (detection.timeRaw) {
        const detectionDate = new Date(detection.timeRaw);
        if (detectionDate >= today) {
          todayCount++;
        } else if (detectionDate >= yesterday) {
          yesterdayCount++;
        }

        if (detectionDate >= lastWeek) {
          lastWeekCount++;
        }

        if (detectionDate >= lastMonth) {
          lastMonthCount++;
        }
      }
    }

    return {
      total: detections.length,
      unique: uniqueAddresses.size,
      byType,
      byRisk,
      byCountry,
      trends: {
        today: todayCount,
        yesterday: yesterdayCount,
        lastWeek: lastWeekCount,
        lastMonth: lastMonthCount,
      },
    };
  }

  /**
   * Transform usage response to UsageStats
   */
  private transformUsageResponse(response: StatsResponse): UsageStats {
    const data = response as unknown as Record<string, string | number>;

    return {
      burstTokensAvailable: Number(data["Burst Tokens Available"]) || 0,
      burstTokenAllowance: Number(data["Burst Token Allowance"]) || 0,
      queriesToday: Number.parseInt(String(data["Queries Today"] || "0"), 10),
      dailyLimit: Number.parseInt(String(data["Daily Limit"] || "0"), 10),
      queriesTotal: Number.parseInt(String(data["Queries Total"] || "0"), 10),
      planTier: (data["Plan Tier"] as UsageStats["planTier"]) || "Free",
    };
  }

  /**
   * Transform detection response to DetectionEntry array
   */
  private transformDetectionResponse(
    response: StatsResponse,
    filter?: string,
  ): Array<DetectionEntry> {
    // Handle different response formats
    if (Array.isArray(response)) {
      return response
        .map((item) => this.transformDetectionItem(item))
        .filter((item) => {
          if (!filter) {
            return true;
          }
          return this.matchesFilter(item, filter);
        });
    }

    if (typeof response === "object" && response !== null) {
      const entries: Array<DetectionEntry> = [];

      // Handle object format where keys are addresses
      for (const [address, data] of Object.entries(response)) {
        if (typeof data === "object" && data !== null) {
          entries.push(this.transformDetectionItem({ address, ...data }));
        }
      }

      return entries.filter((item) => {
        if (!filter) {
          return true;
        }
        return this.matchesFilter(item, filter);
      });
    }

    return [];
  }

  /**
   * Transform detection item to DetectionEntry
   */
  private transformDetectionItem(item: any): DetectionEntry {
    return {
      address: item.address || item.ip || "Unknown",
      detectionType: item.type || "Unknown",
      timeFormatted: item.timestamp
        ? new Date(item.timestamp).toISOString()
        : new Date().toISOString(),
      timeRaw: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
      answeringNode: item.node || "Unknown",
      tag: item.tag,
    };
  }

  /**
   * Transform query history response
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for complex response transformation
  private transformQueryHistoryResponse(
    response: StatsResponse,
    days?: number,
  ): Record<string, QueryHistoryEntry> {
    const queries: Record<string, QueryHistoryEntry> = {};

    if (typeof response === "object" && response !== null) {
      for (const [key, data] of Object.entries(response)) {
        if (typeof data === "object" && data !== null) {
          const entry = data as any;

          // Filter by days if specified
          if (days && entry.timestamp) {
            const entryDate = new Date(entry.timestamp);
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            if (entryDate < cutoffDate) {
              continue;
            }
          }

          queries[key] = {
            proxies: entry.proxies || 0,
            vpns: entry.vpns || 0,
            undetected: entry.undetected || 0,
            refusedQueries: entry.refusedQueries || 0,
            totalQueries: entry.totalQueries || 1,
          };
        }
      }
    }

    return queries;
  }

  /**
   * Check if detection matches filter
   */
  private matchesFilter(detection: DetectionEntry, filter: string): boolean {
    const filterLower = filter.toLowerCase();

    return (
      detection.address.toLowerCase().includes(filterLower) ||
      detection.detectionType.toLowerCase().includes(filterLower) ||
      detection.answeringNode.toLowerCase().includes(filterLower) ||
      detection.tag?.toLowerCase().includes(filterLower) === true
    );
  }
}
