/**
 * ProxyCheck SDK Type Definitions
 */

// Re-export constants and schemas
export * from "./constants";
export * from "./schemas";

// Import logging types
import type { LogEntry } from "../logging";

// API Response Types
export type ProxyType = "VPN" | "PUB" | "WEB" | "TOR" | "DCH" | "SES";
export type ProxyStatus = "yes" | "no";
export type DisposableStatus = "yes" | "no";
export type BlockStatus = "yes" | "no" | "na";
export type BlockReason = "proxy" | "vpn" | "country" | "disposable" | "na";

/**
 * Base response structure
 */
export interface BaseResponse {
  status: "ok" | "error" | "warning" | "denied" | "delayed";
  message?: string;
}

/**
 * IP/Email check response for a single address
 */
export interface AddressCheckResult {
  proxy: ProxyStatus;
  type?: ProxyType;
  risk?: number;
  country?: string;
  isocode?: string;
  city?: string;
  region?: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  isp?: string;
  organisation?: string;
  currency?: {
    code: string;
    name: string;
    symbol: string;
  };
  timezone?: string;
  mobile?: boolean;
  vpn?: ProxyStatus;
  port?: boolean;
  seen?: boolean;
  disposable?: DisposableStatus;
  attack_history?: string;
  last_seen?: string;
}

/**
 * Check API response
 */
export interface CheckResponse extends BaseResponse {
  [address: string]: AddressCheckResult | BlockStatus | BlockReason | string | undefined;
  block?: BlockStatus;
  block_reason?: BlockReason;
}

/**
 * Configuration options for API requests
 */
export interface ProxyCheckOptions {
  apiKey?: string;
  asnData?: boolean;
  allowedCountries?: Array<string>;
  blockedCountries?: Array<string>;
  tlsSecurity?: boolean;
  infEngine?: boolean;
  riskData?: 0 | 1 | 2;
  vpnDetection?: 0 | 1 | 2 | 3;
  dayRestrictor?: number;
  queryTagging?: boolean;
  customTag?: string;
  maskAddress?: boolean;
}

/**
 * List management options
 */
export interface ListOptions extends Pick<ProxyCheckOptions, "apiKey" | "tlsSecurity"> {
  listSelection: "whitelist" | "blacklist";
  listAction: "add" | "remove" | "set" | "get";
  listEntries?: Array<string>;
}

/**
 * Rules management options
 */
export interface RuleOptions extends Pick<ProxyCheckOptions, "apiKey" | "tlsSecurity"> {
  ruleSelection?: string;
  ruleAction: "add" | "remove" | "set" | "get" | "test";
  ruleEntries?: string;
}

/**
 * Stats export options
 */
export interface StatsOptions extends Pick<ProxyCheckOptions, "apiKey" | "tlsSecurity"> {
  statSelection: "detections" | "queries" | "usage";
  limit?: number;
  offset?: number;
}

/**
 * List API response
 */
export interface ListResponse extends BaseResponse {
  entries?: Array<string>;
  count?: number;
}

/**
 * Rule API response
 */
export interface RuleResponse extends BaseResponse {
  rules?: Array<{
    name: string;
    conditions: string;
    created: string;
    modified: string;
  }>;
}

/**
 * Stats API response
 */
/**
 * Stats data entry
 */
export interface StatsEntry {
  date: string;
  queries: number;
  detections: number;
  usage: number;
}

export interface StatsResponse extends BaseResponse {
  data?: Array<StatsEntry>;
  total?: number;
  limit?: number;
  offset?: number;
}

/**
 * API Error response
 */
export interface ErrorResponse {
  status: "error" | "denied" | "delayed";
  message: string;
  error?: string;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  tlsSecurity?: boolean;
  userAgent?: string;
  logging?: {
    level?: "debug" | "info" | "warn" | "error" | "silent";
    format?: "json" | "pretty";
    timestamp?: boolean;
    colors?: boolean;
    output?: (entry: LogEntry) => void;
  };
}

/**
 * HTTP Request configuration
 */
export interface RequestConfig {
  method: "GET" | "POST";
  url: string;
  params?: Record<string, string | number | boolean>;
  data?: string | Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}
