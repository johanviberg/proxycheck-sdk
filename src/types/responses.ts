/**
 * Modern response types for ProxyCheck SDK with improved DX
 */

/**
 * Risk level based on score ranges
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Detection types returned by the API
 */
export type DetectionType =
  | "Residential"
  | "Wireless"
  | "Business"
  | "Hosting"
  | "TOR"
  | "VPN"
  | "SOCKS"
  | "SOCKS4"
  | "SOCKS5"
  | "HTTP"
  | "HTTPS";

/**
 * Attack history when risk=2 is used
 */
export interface AttackHistory {
  loginAttempt?: number;
  registrationAttempt?: number;
  commentSpam?: number;
  denialOfService?: number;
  forumSpam?: number;
  formSubmission?: number;
  vulnerabilityProbing?: number;
  total: number;
}

/**
 * Risk assessment information
 */
export interface RiskInfo {
  score: number; // 0-100
  level: RiskLevel;
  attacks?: AttackHistory; // Present when risk=2
}

/**
 * Detection metadata
 */
export interface DetectionInfo {
  type?: DetectionType;
  provider?: string;
  lastSeen?: Date; // Converted from Unix timestamp
  port?: number;
}

/**
 * Geographic location data (when asn=1)
 */
export interface LocationInfo {
  country: string;
  countryCode: string; // ISO code
  region?: string;
  regionCode?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  continent?: string;
  currency?: {
    code: string;
    name: string;
    symbol: string;
  };
}

/**
 * Network information (when asn=1)
 */
export interface NetworkInfo {
  asn?: string;
  provider?: string; // ISP/provider name
  organization?: string;
}

/**
 * Main check result with improved DX
 */
export interface CheckResult {
  // Core detection results - boolean for better DX
  isProxy: boolean;
  isVPN: boolean;
  isDisposableEmail?: boolean; // Only for email checks

  // Risk assessment
  risk: RiskInfo;

  // Detection metadata
  detection: DetectionInfo;

  // Geographic data (optional based on options)
  location?: LocationInfo;

  // Network information (optional based on options)
  network?: NetworkInfo;

  // Original address queried
  address: string;

  // Response metadata
  queryTime?: number; // When time=1
  node?: string; // When node=1
}

/**
 * Batch check results using Map for easy lookup
 */
export type BatchCheckResults = Map<string, CheckResult>;

/**
 * Usage statistics from dashboard
 */
export interface UsageStats {
  burstTokensAvailable: number;
  burstTokenAllowance: number;
  queriesToday: number;
  dailyLimit: number;
  queriesTotal: number;
  planTier: "Free" | "Starter" | "Professional" | "Business" | "Enterprise";
}

/**
 * Detection entry from dashboard export
 */
export interface DetectionEntry {
  timeFormatted: string;
  timeRaw: number;
  address: string;
  detectionType: string;
  answeringNode: string;
  tag?: string;
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
  proxies: number;
  vpns: number;
  undetected: number;
  refusedQueries: number;
  totalQueries: number;
}

/**
 * Response warnings
 */
export interface ResponseWarning {
  message: string;
  code?: "NEAR_LIMIT" | "BURST_TOKEN_USED" | "RATE_LIMIT_WARNING";
}

/**
 * Base response with status handling
 */
export interface BaseCheckResponse {
  status: "ok" | "warning" | "error" | "denied" | "delayed";
  message?: string;
  warning?: ResponseWarning;
  burstTokenUsed?: boolean;
}

/**
 * Single check response
 */
export interface SingleCheckResponse extends BaseCheckResponse {
  result: CheckResult;
}

/**
 * Batch check response
 */
export interface BatchCheckResponse extends BaseCheckResponse {
  results: BatchCheckResults;
}

/**
 * Configuration detection mode mapping
 */
export type DetectionMode = "proxy" | "vpn" | "both" | "comprehensive";

/**
 * Risk detail level
 */
export type RiskDetailLevel = false | "basic" | "detailed";

/**
 * Semantic configuration options
 */
export interface SemanticCheckOptions {
  detection?: {
    mode?: DetectionMode;
  };
  enrich?: {
    risk?: RiskDetailLevel;
    location?: boolean;
    network?: boolean;
    lastSeen?: boolean;
    port?: boolean;
  };
  timeRange?: number; // Days to look back (1-365)
  tag?: string; // Custom tag for analytics

  // Country filtering
  allowedCountries?: Array<string>;
  blockedCountries?: Array<string>;
}
