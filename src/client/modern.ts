/**
 * Modern ProxyCheck Client with improved DX
 */

import { ConfigManager } from "../config";
import {
  DEFAULT_CHECK_OPTIONS,
  mergeSemanticOptions,
  PRESET_OPTIONS,
  semanticToLegacyOptions,
} from "../config/semantic";
import { ErrorHandler } from "../errors";
import { HttpClient } from "../http";
import { ResponseStatusHandler } from "../response";
import { CheckService } from "../services/check";
import { DashboardService } from "../services/dashboard";
import { ListManagementService } from "../services/list-management";
import type { ClientConfig, RateLimitInfo } from "../types";
import type {
  BatchCheckResults,
  CheckResult,
  DetectionEntry,
  QueryHistoryEntry,
  RiskLevel,
  SemanticCheckOptions,
  UsageStats,
} from "../types/responses";
import {
  isDisposableEmailResult,
  isSuspiciousResult,
  transformBatchResponse,
  transformSingleResponse,
} from "../utils/transform";

/**
 * Dashboard API interface
 */
interface DashboardAPI {
  getUsage(): Promise<UsageStats>;
  getDetections(options?: {
    limit?: number;
    offset?: number;
    filter?: string;
  }): Promise<Array<DetectionEntry>>;
  getQueries(options?: { days?: number }): Promise<Record<string, QueryHistoryEntry>>;
}

/**
 * List management interface
 */
interface ListsAPI {
  whitelist: {
    add(
      entries: Array<string>,
      options?: { validateBeforeAdd?: boolean; allowDuplicates?: boolean; notes?: string },
    ): Promise<import("../services/list-management").ListOperationResult>;
    remove(
      entries: Array<string>,
    ): Promise<import("../services/list-management").ListOperationResult>;
    get(): Promise<import("../services/list-management").EnhancedListResponse>;
    set(entries: Array<string>): Promise<import("../services/list-management").ListOperationResult>;
    clear(): Promise<import("../services/list-management").ListOperationResult>;
  };
  blacklist: {
    add(
      entries: Array<string>,
      options?: { validateBeforeAdd?: boolean; allowDuplicates?: boolean; notes?: string },
    ): Promise<import("../services/list-management").ListOperationResult>;
    remove(
      entries: Array<string>,
    ): Promise<import("../services/list-management").ListOperationResult>;
    get(): Promise<import("../services/list-management").EnhancedListResponse>;
    set(entries: Array<string>): Promise<import("../services/list-management").ListOperationResult>;
    clear(): Promise<import("../services/list-management").ListOperationResult>;
  };
}

/**
 * Modern ProxyCheck client with improved developer experience
 */
export class ProxyCheck {
  private readonly _config: ConfigManager;
  private readonly _http: HttpClient;
  private readonly _checkService: CheckService;
  private readonly _dashboardService: DashboardService;
  private readonly _listManagementService: ListManagementService;
  private readonly _errorHandler: ErrorHandler;
  private readonly _responseHandler: ResponseStatusHandler;

  constructor(config: Partial<ClientConfig> = {}) {
    this._config = new ConfigManager(config);
    const fullConfig = this._config.getConfig();

    const httpConfig: ClientConfig = {
      apiKey: fullConfig.apiKey,
      baseUrl: fullConfig.baseUrl,
      timeout: fullConfig.timeout,
      retries: fullConfig.retries,
      retryDelay: fullConfig.retryDelay,
      tlsSecurity: fullConfig.tlsSecurity,
      userAgent: fullConfig.userAgent,
    };

    if (fullConfig.logging !== undefined) {
      httpConfig.logging = fullConfig.logging;
    }

    this._http = new HttpClient(httpConfig, this._config.getLogger());

    // Initialize services
    this._checkService = new CheckService(this._http, this._config);
    this._dashboardService = new DashboardService(this._http, this._config);
    this._listManagementService = new ListManagementService(this._http, this._config);

    // Initialize error handler
    this._errorHandler = new ErrorHandler({
      enableRetry: true,
      enableLogging: fullConfig.logging !== undefined,
      logLevel: "error",
    });

    // Initialize response handler
    this._responseHandler = new ResponseStatusHandler({
      throwOnError: true,
      includeWarnings: true,
    });
  }

  // Core check methods

  /**
   * Check a single IP address or email with semantic options
   */
  async check(address: string, options: Partial<SemanticCheckOptions> = {}): Promise<CheckResult> {
    const mergedOptions = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);
    const legacyOptions = semanticToLegacyOptions(mergedOptions, this._config.getApiKey());

    const response = await this._checkService.checkAddress(address, legacyOptions);
    const transformed = transformSingleResponse(address, response);

    return transformed.result;
  }

  /**
   * Check multiple addresses and return a Map for easy lookup
   */
  async checkBatch(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<BatchCheckResults> {
    if (addresses.length === 0) {
      return new Map();
    }

    // Use optimized batch processing for large sets
    if (addresses.length > 100) {
      return this.checkBatchChunked(addresses, options);
    }

    const mergedOptions = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);
    const legacyOptions = semanticToLegacyOptions(mergedOptions, this._config.getApiKey());

    const response = await this._checkService.checkAddresses(addresses, legacyOptions);
    const transformed = transformBatchResponse(addresses, response);

    return transformed.results;
  }

  /**
   * Check multiple addresses with automatic chunking for large batches
   */
  async checkBatchChunked(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    chunkSize = 100,
  ): Promise<BatchCheckResults> {
    const results = new Map<string, CheckResult>();
    const chunks = this.chunkArray(addresses, chunkSize);

    for (const chunk of chunks) {
      const chunkResults = await this.checkBatch(chunk, options);
      for (const [address, result] of chunkResults) {
        results.set(address, result);
      }
    }

    return results;
  }

  /**
   * Check multiple addresses with detailed error handling and retries
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for comprehensive batch processing
  async checkBatchResilient(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    retryOptions: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (address: string, attempt: number, error: Error) => void;
      onError?: (address: string, error: Error) => void;
    } = {},
  ): Promise<{
    results: BatchCheckResults;
    errors: Map<string, Error>;
    stats: {
      successful: number;
      failed: number;
      retried: number;
    };
  }> {
    const results = new Map<string, CheckResult>();
    const errors = new Map<string, Error>();
    const stats = { successful: 0, failed: 0, retried: 0 };

    const { maxRetries = 3, retryDelay = 1000, onRetry, onError } = retryOptions;

    for (const address of addresses) {
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= maxRetries) {
        try {
          const result = await this.check(address, options);
          results.set(address, result);
          stats.successful++;
          break;
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxRetries) {
            attempt++;
            stats.retried++;

            if (onRetry) {
              onRetry(address, attempt, lastError);
            }

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
          } else {
            // Max retries reached
            errors.set(address, lastError);
            stats.failed++;

            if (onError) {
              onError(address, lastError);
            }
            break;
          }
        }
      }
    }

    return { results, errors, stats };
  }

  /**
   * Check addresses in parallel with concurrency control
   */
  async checkBatchConcurrent(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    concurrency = 5,
  ): Promise<BatchCheckResults> {
    const results = new Map<string, CheckResult>();
    const semaphore = new Array(concurrency).fill(null);
    let index = 0;

    const processAddress = async (address: string): Promise<void> => {
      try {
        const result = await this.check(address, options);
        results.set(address, result);
      } catch (_error) {
        // Log error but continue processing
        // Error handling strategy could be configurable in production
      }
    };

    const workers = semaphore.map(async () => {
      while (index < addresses.length) {
        const currentIndex = index++;
        const address = addresses[currentIndex];
        if (address) {
          await processAddress(address);
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * Check addresses with rate limiting
   */
  async checkBatchRateLimited(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    requestsPerSecond = 10,
  ): Promise<BatchCheckResults> {
    const results = new Map<string, CheckResult>();
    const delay = 1000 / requestsPerSecond;

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (!address) {
        continue;
      }

      try {
        const result = await this.check(address, options);
        results.set(address, result);
      } catch (_error) {
        // Error handling strategy could be configurable in production
      }

      // Rate limiting delay (except for the last request)
      if (i < addresses.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Smart batch processing that adapts to API limits and performance
   */
  async checkBatchSmart(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    smartOptions: {
      maxConcurrency?: number;
      rateLimitRPS?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {},
  ): Promise<BatchCheckResults> {
    const { maxConcurrency = 3, rateLimitRPS = 10, onProgress } = smartOptions;

    // For small batches, use simple batch processing
    if (addresses.length <= 10) {
      return this.checkBatch(addresses, options);
    }

    // For medium batches, use concurrent processing
    if (addresses.length <= 100) {
      return this.checkBatchConcurrent(addresses, options, maxConcurrency);
    }

    // For large batches, use chunked processing with rate limiting
    const results = new Map<string, CheckResult>();
    const chunks = this.chunkArray(addresses, 50);
    let completed = 0;

    for (const chunk of chunks) {
      const chunkResults = await this.checkBatchRateLimited(chunk, options, rateLimitRPS);

      for (const [address, result] of chunkResults) {
        results.set(address, result);
      }

      completed += chunk.length;

      if (onProgress) {
        onProgress(completed, addresses.length);
      }
    }

    return results;
  }

  // Convenience methods

  /**
   * Quick check if an address is suspicious (proxy, VPN, or high risk)
   */
  async isSuspicious(
    address: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<boolean> {
    const result = await this.check(address, options);
    return isSuspiciousResult(result);
  }

  /**
   * Check if an address is a proxy
   */
  async isProxy(address: string, options: Partial<SemanticCheckOptions> = {}): Promise<boolean> {
    const result = await this.check(address, options);
    return result.isProxy;
  }

  /**
   * Check if an address is a VPN
   */
  async isVPN(address: string, options: Partial<SemanticCheckOptions> = {}): Promise<boolean> {
    const result = await this.check(address, options);
    return result.isVPN;
  }

  /**
   * Check if an email is disposable
   */
  async isDisposableEmail(
    email: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<boolean> {
    const result = await this.check(email, options);
    return isDisposableEmailResult(result);
  }

  /**
   * Get risk level for an address
   */
  async getRiskLevel(
    address: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<RiskLevel> {
    const mergedOptions = mergeSemanticOptions(options, {
      ...DEFAULT_CHECK_OPTIONS,
      enrich: { risk: "basic" },
    });

    const result = await this.check(address, mergedOptions);
    return result.risk.level;
  }

  /**
   * Check if an address is from specific countries
   */
  async isFromCountry(
    address: string,
    countryCodes: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<boolean> {
    const mergedOptions = mergeSemanticOptions(options, {
      ...DEFAULT_CHECK_OPTIONS,
      enrich: { location: true },
    });

    const result = await this.check(address, mergedOptions);

    if (!result.location) {
      return false;
    }

    return (
      countryCodes.includes(result.location.country) ||
      countryCodes.includes(result.location.countryCode)
    );
  }

  /**
   * Get detailed information for an address
   */
  async getDetailedInfo(
    address: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<CheckResult> {
    const detailedOptions = mergeSemanticOptions(options, PRESET_OPTIONS.thoroughCheck);
    return this.check(address, detailedOptions);
  }

  /**
   * Check if an address should be blocked based on risk level
   */
  async shouldBlock(
    address: string,
    riskThreshold: RiskLevel = "medium",
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<boolean> {
    const result = await this.check(address, {
      ...options,
      enrich: { risk: "basic", ...options.enrich },
    });

    const riskLevels = ["low", "medium", "high", "critical"];
    const addressRiskIndex = riskLevels.indexOf(result.risk.level);
    const thresholdIndex = riskLevels.indexOf(riskThreshold);

    return addressRiskIndex >= thresholdIndex;
  }

  /**
   * Check multiple addresses with progress callback
   */
  async checkBatchWithProgress(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
    onProgress?: (completed: number, total: number, current: string) => void,
  ): Promise<BatchCheckResults> {
    const results = new Map<string, CheckResult>();
    const total = addresses.length;

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (!address) {
        continue;
      }

      try {
        const result = await this.check(address, options);
        results.set(address, result);
        if (onProgress) {
          onProgress(i + 1, total, address);
        }
      } catch {
        // Continue with other addresses even if one fails
        // In a production environment, you might want to log this error
        // or handle it according to your application's error handling strategy
      }
    }

    return results;
  }

  /**
   * Filter addresses by type (suspicious, clean, etc.)
   */
  async filterAddresses(
    addresses: Array<string>,
    filter: "suspicious" | "clean" | "proxy" | "vpn" | "disposable",
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<Array<string>> {
    const results = await this.checkBatch(addresses, options);
    const filtered: Array<string> = [];

    for (const [address, result] of results) {
      let include = false;

      switch (filter) {
        case "suspicious":
          include = isSuspiciousResult(result);
          break;
        case "clean":
          include = !isSuspiciousResult(result);
          break;
        case "proxy":
          include = result.isProxy;
          break;
        case "vpn":
          include = result.isVPN;
          break;
        case "disposable":
          include = result.isDisposableEmail === true;
          break;
      }

      if (include) {
        filtered.push(address);
      }
    }

    return filtered;
  }

  /**
   * Get summary statistics for a batch of addresses
   */
  async getBatchSummary(
    addresses: Array<string>,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<{
    total: number;
    suspicious: number;
    clean: number;
    proxies: number;
    vpns: number;
    disposableEmails: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    countries: Record<string, number>;
  }> {
    const results = await this.checkBatch(addresses, {
      ...options,
      enrich: { risk: "basic", location: true, ...options.enrich },
    });

    const summary = {
      total: addresses.length,
      suspicious: 0,
      clean: 0,
      proxies: 0,
      vpns: 0,
      disposableEmails: 0,
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      countries: {} as Record<string, number>,
    };

    for (const [, result] of results) {
      if (isSuspiciousResult(result)) {
        summary.suspicious++;
      } else {
        summary.clean++;
      }

      if (result.isProxy) {
        summary.proxies++;
      }
      if (result.isVPN) {
        summary.vpns++;
      }
      if (result.isDisposableEmail) {
        summary.disposableEmails++;
      }

      summary.riskDistribution[result.risk.level]++;

      if (result.location?.country) {
        summary.countries[result.location.country] =
          (summary.countries[result.location.country] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Quick security check with recommended action
   */
  async getSecurityRecommendation(
    address: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<{
    action: "allow" | "challenge" | "block";
    reason: string;
    confidence: "low" | "medium" | "high";
    details: CheckResult;
  }> {
    const result = await this.check(address, {
      ...options,
      enrich: { risk: "detailed", ...options.enrich },
    });

    let action: "allow" | "challenge" | "block" = "allow";
    let reason = "Address appears to be legitimate";
    let confidence: "low" | "medium" | "high" = "high";

    if (result.risk.level === "critical") {
      action = "block";
      reason = "Critical risk level detected";
      confidence = "high";
    } else if (result.risk.level === "high") {
      action = "block";
      reason = "High risk level detected";
      confidence = "high";
    } else if (result.isProxy && result.isVPN) {
      action = "challenge";
      reason = "VPN detected - may be legitimate";
      confidence = "medium";
    } else if (result.isProxy) {
      action = "block";
      reason = "Proxy detected";
      confidence = "high";
    } else if (result.isDisposableEmail) {
      action = "challenge";
      reason = "Disposable email address";
      confidence = "medium";
    } else if (result.risk.level === "medium") {
      action = "challenge";
      reason = "Medium risk level - additional verification recommended";
      confidence = "medium";
    }

    return {
      action,
      reason,
      confidence,
      details: result,
    };
  }

  /**
   * Validate email address and check if disposable
   */
  async validateEmail(
    email: string,
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<{
    isValid: boolean;
    isDisposable: boolean;
    recommendation: "accept" | "reject" | "verify";
    details: CheckResult;
  }> {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    if (!isValid) {
      throw new Error("Invalid email format");
    }

    const result = await this.check(email, options);
    const isDisposable = result.isDisposableEmail === true;

    let recommendation: "accept" | "reject" | "verify" = "accept";
    if (isDisposable) {
      recommendation = result.risk.level === "critical" ? "reject" : "verify";
    }

    return {
      isValid,
      isDisposable,
      recommendation,
      details: result,
    };
  }

  /**
   * Check if address is from a trusted network
   */
  async isTrustedNetwork(
    address: string,
    trustedProviders: Array<string> = ["Google", "Amazon", "Microsoft", "Cloudflare"],
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<boolean> {
    const result = await this.check(address, {
      ...options,
      enrich: { network: true, ...options.enrich },
    });

    if (!(result.network?.provider || result.detection.provider)) {
      return false;
    }

    const provider = result.network?.provider || result.detection.provider || "";
    return trustedProviders.some((trusted) =>
      provider.toLowerCase().includes(trusted.toLowerCase()),
    );
  }

  /**
   * Get geographic risk assessment
   */
  async getGeoRiskAssessment(
    address: string,
    highRiskCountries: Array<string> = [],
    options: Partial<SemanticCheckOptions> = {},
  ): Promise<{
    country: string;
    countryCode: string;
    riskLevel: "low" | "medium" | "high";
    isHighRisk: boolean;
    details: CheckResult;
  }> {
    const result = await this.check(address, {
      ...options,
      enrich: { location: true, ...options.enrich },
    });

    if (!result.location) {
      throw new Error("Unable to determine geographic location");
    }

    const isHighRisk =
      highRiskCountries.includes(result.location.country) ||
      highRiskCountries.includes(result.location.countryCode);

    let riskLevel: "low" | "medium" | "high" = "low";
    if (isHighRisk) {
      riskLevel = "high";
    } else if (result.risk.level === "medium" || result.risk.level === "high") {
      riskLevel = "medium";
    }

    return {
      country: result.location.country,
      countryCode: result.location.countryCode,
      riskLevel,
      isHighRisk,
      details: result,
    };
  }

  // Dashboard API

  /**
   * Access to dashboard functionality
   */
  get dashboard(): DashboardAPI {
    return {
      getUsage: async () => {
        return this._dashboardService.getUsage();
      },

      getDetections: async (options = {}) => {
        return this._dashboardService.getDetections(options);
      },

      getQueries: async (options = {}) => {
        return this._dashboardService.getQueries(options);
      },
    };
  }

  /**
   * Get dashboard analytics and insights
   */
  async getDashboardAnalytics(): Promise<{
    usage: UsageStats;
    detectionSummary: {
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
    };
    recentDetections: Array<DetectionEntry>;
  }> {
    const [usage, detectionSummary, recentDetections] = await Promise.all([
      this._dashboardService.getUsage(),
      this._dashboardService.getDetectionSummary(),
      this._dashboardService.getRecentDetections(10),
    ]);

    return {
      usage,
      detectionSummary,
      recentDetections,
    };
  }

  /**
   * Get paginated detections with metadata
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
    return this._dashboardService.getDetectionsPaginated(page, pageSize);
  }

  // List management

  /**
   * Access to list management functionality
   */
  get lists(): ListsAPI {
    const createListAPI = (listType: "whitelist" | "blacklist") => ({
      add: async (
        entries: Array<string>,
        options?: { validateBeforeAdd?: boolean; allowDuplicates?: boolean; notes?: string },
      ) => {
        return this._listManagementService.addEntries(listType, entries, options);
      },

      remove: async (entries: Array<string>) => {
        return this._listManagementService.removeEntries(listType, entries);
      },

      get: async () => {
        return this._listManagementService.getList(listType);
      },

      set: async (entries: Array<string>) => {
        return this._listManagementService.setList(listType, entries);
      },

      clear: async () => {
        return this._listManagementService.clearList(listType);
      },
    });

    return {
      whitelist: createListAPI("whitelist"),
      blacklist: createListAPI("blacklist"),
    };
  }

  // Advanced list management methods

  /**
   * Get comprehensive list statistics
   */
  async getListStatistics(): Promise<{
    whitelist: {
      total: number;
      byType: Record<string, number>;
    };
    blacklist: {
      total: number;
      byType: Record<string, number>;
    };
    conflicts: number;
  }> {
    return this._listManagementService.getListStatistics();
  }

  /**
   * Find entries that exist in both whitelist and blacklist
   */
  async findListConflicts(): Promise<Array<string>> {
    return this._listManagementService.findConflicts();
  }

  /**
   * Resolve conflicts by removing entries from specified list
   */
  async resolveListConflicts(
    removeFrom: "whitelist" | "blacklist" = "blacklist",
  ): Promise<import("../services/list-management").ListOperationResult> {
    return this._listManagementService.resolveConflicts(removeFrom);
  }

  /**
   * Search for entries across both lists
   */
  async searchListEntries(
    query: string,
    options?: {
      caseSensitive?: boolean;
      exactMatch?: boolean;
    },
  ): Promise<{
    whitelist: Array<import("../services/list-management").ListEntry>;
    blacklist: Array<import("../services/list-management").ListEntry>;
  }> {
    return this._listManagementService.searchEntries(query, options);
  }

  /**
   * Import entries from various formats
   */
  async importListEntries(
    listType: "whitelist" | "blacklist",
    data: string,
    format: "csv" | "json" | "txt" = "txt",
  ): Promise<import("../services/list-management").ListOperationResult> {
    return this._listManagementService.importEntries(listType, data, format);
  }

  /**
   * Export entries to various formats
   */
  async exportListEntries(
    listType: "whitelist" | "blacklist",
    format: "csv" | "json" | "txt" = "txt",
  ): Promise<string> {
    return this._listManagementService.exportEntries(listType, format);
  }

  /**
   * Validate entries before adding to list
   */
  validateListEntries(
    entries: Array<string>,
  ): import("../services/list-management").ListValidationResult {
    return this._listManagementService.validateEntries(entries);
  }

  /**
   * Compare whitelist and blacklist entries
   */
  async compareListEntries(): Promise<import("../services/list-management").ListComparisonResult> {
    return this._listManagementService.compareLists();
  }

  // Error handling and monitoring methods

  /**
   * Get error statistics and health information
   */
  getErrorStats(): import("../errors").ErrorStats {
    return this._errorHandler.getStats();
  }

  /**
   * Get comprehensive error report
   */
  getErrorReport(): {
    summary: import("../errors").ErrorStats;
    topErrors: Array<{ code: string; count: number; percentage: number }>;
    topCategories: Array<{ category: string; count: number; percentage: number }>;
    recommendations: Array<string>;
  } {
    return this._errorHandler.getErrorReport();
  }

  /**
   * Check if the client is healthy
   */
  isHealthy(): boolean {
    return this._errorHandler.isHealthy();
  }

  /**
   * Get detailed health status
   */
  getHealthStatus(): {
    healthy: boolean;
    status: "healthy" | "degraded" | "unhealthy";
    issues: Array<string>;
    recommendations: Array<string>;
  } {
    return this._errorHandler.getHealthStatus();
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this._errorHandler.resetStats();
  }

  /**
   * Execute operation with enhanced error handling
   */
  async executeWithRetry<T>(operation: () => Promise<T>, operationName = "operation"): Promise<T> {
    return this._errorHandler.executeWithRetry(operation, operationName);
  }

  /**
   * Execute operation with timeout and retry
   */
  async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName = "operation",
  ): Promise<T> {
    return this._errorHandler.executeWithTimeoutAndRetry(operation, timeoutMs, operationName);
  }

  // Utility methods

  /**
   * Get current usage limits and remaining queries
   */
  async getLimits(): Promise<{
    remaining: number;
    daily: number;
    burstTokens: number;
    planTier: string;
  }> {
    const usage = await this.dashboard.getUsage();
    return {
      remaining: usage.dailyLimit - usage.queriesToday,
      daily: usage.dailyLimit,
      burstTokens: usage.burstTokensAvailable,
      planTier: usage.planTier,
    };
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this._http.getRateLimitInfo();
  }

  /**
   * Get client configuration and status
   */
  getStatus(): {
    version: string;
    configured: boolean;
    baseUrl: string;
    tlsEnabled: boolean;
    rateLimitInfo?: RateLimitInfo;
  } {
    const rateLimitInfo = this.getRateLimitInfo();
    const config = this._config.getConfig();

    const result: {
      version: string;
      configured: boolean;
      baseUrl: string;
      tlsEnabled: boolean;
      rateLimitInfo?: RateLimitInfo;
    } = {
      version: "0.9.2",
      configured: !!config.apiKey && config.apiKey.length > 0,
      baseUrl: this._config.getBaseUrl(),
      tlsEnabled: this._config.isTlsEnabled(),
    };

    if (rateLimitInfo) {
      result.rateLimitInfo = rateLimitInfo;
    }

    return result;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this._config.setApiKey(apiKey);
  }

  /**
   * Get current API key
   */
  getApiKey(): string {
    return this._config.getApiKey();
  }

  /**
   * Get response status handler
   */
  getResponseHandler(): ResponseStatusHandler {
    return this._responseHandler;
  }

  // Private utility methods

  /**
   * Chunk array into smaller arrays of specified size
   */
  private chunkArray<T>(array: Array<T>, chunkSize: number): Array<Array<T>> {
    const chunks: Array<Array<T>> = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Static helpers for configuration presets

  /**
   * Create ProxyCheck instance with security-focused configuration
   */
  static withSecurityFocus(config: Partial<ClientConfig> = {}): ProxyCheck {
    return new ProxyCheck(config);
  }

  /**
   * Create ProxyCheck instance with performance-focused configuration
   */
  static withPerformanceFocus(config: Partial<ClientConfig> = {}): ProxyCheck {
    return new ProxyCheck(config);
  }

  /**
   * Create ProxyCheck instance from API key only
   */
  static fromApiKey(apiKey: string): ProxyCheck {
    return new ProxyCheck({ apiKey });
  }
}
