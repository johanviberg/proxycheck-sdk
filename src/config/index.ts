/**
 * Configuration management with validation and environment variable support
 */

import { z } from "zod";
import { ProxyCheckValidationError } from "../errors";
import { createLogger, type Logger } from "../logging";
import type { ClientConfig, ProxyCheckOptions } from "../types";
import { DEFAULTS } from "../types/constants";
import { ClientConfigSchema, ProxyCheckOptionsSchema } from "../types/schemas";

/**
 * Query parameters interface
 */
interface QueryParams {
  key?: string;
  vpn?: number;
  asn?: number;
  risk?: number;
  inf?: number;
  days?: number;
  node?: number;
  port?: number;
  seen?: number;
}

/**
 * POST data interface
 */
interface PostData {
  ips?: string;
  tag?: string;
}

/**
 * Environment variable names
 */
const ENV_VARS = {
  API_KEY: "PROXYCHECK_API_KEY",
  BASE_URL: "PROXYCHECK_BASE_URL",
  TIMEOUT: "PROXYCHECK_TIMEOUT",
  RETRIES: "PROXYCHECK_RETRIES",
  RETRY_DELAY: "PROXYCHECK_RETRY_DELAY",
  TLS_SECURITY: "PROXYCHECK_TLS_SECURITY",
} as const;

/**
 * Configuration manager class
 */
export class ConfigManager {
  private _config: Required<Omit<ClientConfig, "logging">> & { logging?: ClientConfig["logging"] };
  private _logger: Logger;

  constructor(userConfig: Partial<ClientConfig> = {}) {
    this._config = this.buildConfig(userConfig);
    this.validateConfig();
    this._logger = createLogger(this._config.logging);
  }

  /**
   * Build configuration from user config, environment variables, and defaults
   */
  private buildConfig(
    userConfig: Partial<ClientConfig>,
  ): Required<Omit<ClientConfig, "logging">> & { logging?: ClientConfig["logging"] } {
    const envConfig = this.getEnvironmentConfig();

    const config: Required<Omit<ClientConfig, "logging">> & { logging?: ClientConfig["logging"] } =
      {
        apiKey: userConfig.apiKey || envConfig.apiKey || "",
        baseUrl: userConfig.baseUrl || envConfig.baseUrl || DEFAULTS.BASE_URL,
        timeout: userConfig.timeout || envConfig.timeout || DEFAULTS.TIMEOUT,
        retries: userConfig.retries || envConfig.retries || DEFAULTS.RETRIES,
        retryDelay: userConfig.retryDelay || envConfig.retryDelay || DEFAULTS.RETRY_DELAY,
        tlsSecurity: userConfig.tlsSecurity ?? envConfig.tlsSecurity ?? DEFAULTS.TLS_SECURITY,
        userAgent: userConfig.userAgent || DEFAULTS.USER_AGENT,
      };

    if (userConfig.logging !== undefined) {
      config.logging = userConfig.logging;
    }

    return config;
  }

  /**
   * Get configuration from environment variables
   */
  private getEnvironmentConfig(): Partial<ClientConfig> {
    const env = process.env;
    const config: Partial<ClientConfig> = {};

    const apiKey = env[ENV_VARS.API_KEY];
    if (apiKey) {
      config.apiKey = apiKey;
    }
    const baseUrl = env[ENV_VARS.BASE_URL];
    if (baseUrl) {
      config.baseUrl = baseUrl;
    }
    const timeout = env[ENV_VARS.TIMEOUT];
    if (timeout) {
      config.timeout = Number.parseInt(timeout, 10);
    }
    const retries = env[ENV_VARS.RETRIES];
    if (retries) {
      config.retries = Number.parseInt(retries, 10);
    }
    const retryDelay = env[ENV_VARS.RETRY_DELAY];
    if (retryDelay) {
      config.retryDelay = Number.parseInt(retryDelay, 10);
    }
    if (env[ENV_VARS.TLS_SECURITY]) {
      config.tlsSecurity = env[ENV_VARS.TLS_SECURITY] === "true";
    }

    return config;
  }

  /**
   * Validate configuration using Zod schema
   */
  private validateConfig(): void {
    try {
      ClientConfigSchema.parse(this._config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));

        throw new ProxyCheckValidationError(
          "Invalid configuration",
          undefined,
          this._config,
          validationErrors,
        );
      }
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<
    Required<Omit<ClientConfig, "logging">> & { logging?: ClientConfig["logging"] }
  > {
    return { ...this._config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClientConfig>): void {
    const currentLogging = this._config.logging;
    const baseConfig: Partial<ClientConfig> = {
      apiKey: this._config.apiKey,
      baseUrl: this._config.baseUrl,
      timeout: this._config.timeout,
      retries: this._config.retries,
      retryDelay: this._config.retryDelay,
      tlsSecurity: this._config.tlsSecurity,
      userAgent: this._config.userAgent,
    };

    if (currentLogging !== undefined) {
      baseConfig.logging = currentLogging;
    }

    const newConfig: Partial<ClientConfig> = { ...baseConfig, ...updates };
    this._config = this.buildConfig(newConfig);
    this.validateConfig();
    this._logger = createLogger(this._config.logging);
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    return this._config.apiKey;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.updateConfig({ apiKey });
  }

  /**
   * Get base URL with protocol
   */
  getBaseUrl(): string {
    const protocol = this._config.tlsSecurity ? "https" : "http";
    return `${protocol}://${this._config.baseUrl}`;
  }

  /**
   * Check if TLS security is enabled
   */
  isTlsEnabled(): boolean {
    return this._config.tlsSecurity;
  }

  /**
   * Get timeout in milliseconds
   */
  getTimeout(): number {
    return this._config.timeout;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): { retries: number; retryDelay: number } {
    return {
      retries: this._config.retries,
      retryDelay: this._config.retryDelay,
    };
  }

  /**
   * Get user agent string
   */
  getUserAgent(): string {
    return this._config.userAgent;
  }

  /**
   * Get logger instance
   */
  getLogger(): Logger {
    return this._logger;
  }
}

/**
 * Helper to remove undefined values from an object for exactOptionalPropertyTypes
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

/**
 * Validate and merge ProxyCheck options
 */
export function validateOptions(options: ProxyCheckOptions): ProxyCheckOptions {
  try {
    const parsed = ProxyCheckOptionsSchema.parse(options) as any;
    return stripUndefined(parsed) as ProxyCheckOptions;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      throw new ProxyCheckValidationError(
        "Invalid ProxyCheck options",
        undefined,
        options,
        validationErrors,
      );
    }
    throw error;
  }
}

/**
 * Build query parameters from options
 */
export function buildQueryParams(options: ProxyCheckOptions, apiKey?: string): QueryParams {
  const params: QueryParams = {};

  // API key
  const finalApiKey = options.apiKey || apiKey;
  if (finalApiKey) {
    params.key = finalApiKey;
  }

  // Feature flags
  if (options.vpnDetection !== undefined) {
    params.vpn = options.vpnDetection;
  }

  if (options.asnData) {
    params.asn = 1;
  }

  if (options.riskData !== undefined) {
    params.risk = options.riskData;
  }

  if (options.infEngine) {
    params.inf = 1;
  }

  if (options.dayRestrictor) {
    params.days = options.dayRestrictor;
  }

  // Always include these for detailed responses
  params.node = 1;
  params.port = 1;
  params.seen = 1;

  return params;
}

/**
 * Build POST data from options (only for multiple addresses)
 */
export function buildPostData(
  options: ProxyCheckOptions,
  addresses?: string | Array<string>,
): PostData {
  const data: PostData = {};

  // Only create POST data for multiple addresses
  if (addresses && Array.isArray(addresses) && addresses.length > 1) {
    data.ips = addresses.join(",");
  }

  // Query tagging
  if (options.queryTagging && options.customTag) {
    data.tag = options.customTag;
  }

  return data;
}

/**
 * Check if addresses should use POST method (multiple addresses only)
 */
export function shouldUsePostMethod(addresses?: string | Array<string>): boolean {
  return Array.isArray(addresses) && addresses.length > 1;
}

/**
 * Process addresses with email masking if enabled
 */
export function processAddresses(
  addresses: string | Array<string>,
  maskAddress = false,
): string | Array<string> {
  const maskEmail = (address: string): string => {
    if (address.includes("@")) {
      const [, domain] = address.split("@");
      return `anonymous@${domain}`;
    }
    return address;
  };

  if (!maskAddress) {
    return addresses;
  }

  if (Array.isArray(addresses)) {
    return addresses.map(maskEmail);
  }

  return maskEmail(addresses);
}

/**
 * Merge country restrictions with ASN requirement
 */
export function mergeCountryOptions(options: ProxyCheckOptions): ProxyCheckOptions {
  const merged = { ...options };

  // Enable ASN data if country restrictions are set
  if (
    (options.allowedCountries && options.allowedCountries.length > 0) ||
    (options.blockedCountries && options.blockedCountries.length > 0)
  ) {
    merged.asnData = true;
  }

  return merged;
}

/**
 * Create a configuration manager with validation
 */
export function createConfig(config: Partial<ClientConfig> = {}): ConfigManager {
  return new ConfigManager(config);
}
