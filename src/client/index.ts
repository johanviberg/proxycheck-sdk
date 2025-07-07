/**
 * Main ProxyCheck Client
 */

import { ConfigManager } from "../config";
import { HttpClient } from "../http";
import { CheckService } from "../services/check";
import { ListingService } from "../services/listing";
import { RulesService } from "../services/rules";
import { StatsService } from "../services/stats";
import type { ClientConfig, RateLimitInfo } from "../types";

/**
 * Main ProxyCheck SDK client
 */
export class ProxyCheckClient {
  private readonly _config: ConfigManager;
  private readonly _http: HttpClient;
  private readonly _check: CheckService;
  private readonly _listing: ListingService;
  private readonly _rules: RulesService;
  private readonly _stats: StatsService;

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
    this._check = new CheckService(this._http, this._config);
    this._listing = new ListingService(this._http, this._config);
    this._rules = new RulesService(this._http, this._config);
    this._stats = new StatsService(this._http, this._config);
  }

  /**
   * Access to the Check service
   */
  get check(): CheckService {
    return this._check;
  }

  /**
   * Access to the Listing service
   */
  get listing(): ListingService {
    return this._listing;
  }

  /**
   * Access to the Rules service
   */
  get rules(): RulesService {
    return this._rules;
  }

  /**
   * Access to the Stats service
   */
  get stats(): StatsService {
    return this._stats;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<Required<ClientConfig>> {
    const config = this._config.getConfig();
    return {
      ...config,
      logging: config.logging || {},
    } as Readonly<Required<ClientConfig>>;
  }

  /**
   * Update the client configuration
   */
  updateConfig(updates: Partial<ClientConfig>): void {
    this._config.updateConfig(updates);
    // Note: HttpClient would need to be recreated for some config changes
    // For now, we'll keep it simple and assume most changes don't affect HTTP client
  }

  /**
   * Get the API key
   */
  getApiKey(): string {
    return this._config.getApiKey();
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this._config.setApiKey(apiKey);
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this._http.getRateLimitInfo();
  }

  /**
   * Get the HTTP client instance (for services)
   */
  getHttpClient(): HttpClient {
    return this._http;
  }

  /**
   * Get the config manager instance (for services)
   */
  getConfigManager(): ConfigManager {
    return this._config;
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    try {
      const config = this._config.getConfig();
      return !!config.apiKey && config.apiKey.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get client information
   */
  getClientInfo(): {
    version: string;
    baseUrl: string;
    tlsEnabled: boolean;
    configured: boolean;
    rateLimitInfo?: RateLimitInfo;
  } {
    const rateLimitInfo = this.getRateLimitInfo();
    const result = {
      version: "0.9.0",
      baseUrl: this._config.getBaseUrl(),
      tlsEnabled: this._config.isTlsEnabled(),
      configured: this.isConfigured(),
    };

    if (rateLimitInfo !== undefined) {
      return { ...result, rateLimitInfo };
    }

    return result;
  }
}
