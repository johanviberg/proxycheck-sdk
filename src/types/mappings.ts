/**
 * Type mappings and utilities for response transformation
 */

import type { ProxyCheckOptions } from "./index";
import type { DetectionMode, RiskDetailLevel, RiskLevel, SemanticCheckOptions } from "./responses";

/**
 * Extended API options for internal use
 */
interface ExtendedProxyCheckOptions extends ProxyCheckOptions {
  seen?: 0 | 1;
  port?: 0 | 1;
  time?: 0 | 1;
  node?: 0 | 1;
}

/**
 * Map risk score to risk level
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 33) {
    return "low";
  }
  if (score <= 66) {
    return "medium";
  }
  if (score <= 99) {
    return "high";
  }
  return "critical";
}

/**
 * Map detection mode to vpn parameter value
 */
export function mapDetectionMode(mode: DetectionMode): number {
  switch (mode) {
    case "proxy":
      return 0; // Only proxy check
    case "vpn":
      return 2; // Only VPN check
    case "both":
      return 1; // Both, proxy prioritized
    case "comprehensive":
      return 3; // Both with separate results
    default:
      return 1; // Default to both
  }
}

/**
 * Map risk detail level to risk parameter value
 */
export function mapRiskDetailLevel(level: RiskDetailLevel): number {
  switch (level) {
    case false:
      return 0;
    case "basic":
      return 1;
    case "detailed":
      return 2;
    default:
      return 0;
  }
}

/**
 * Transform semantic options to API options
 */
export function transformOptions(options: SemanticCheckOptions): ProxyCheckOptions {
  const apiOptions: ExtendedProxyCheckOptions = {};

  // Detection mode
  if (options.detection?.mode) {
    apiOptions.vpnDetection = mapDetectionMode(options.detection.mode) as 0 | 1 | 2 | 3;
  }

  // Enrichment options
  if (options.enrich) {
    // Risk data
    if (options.enrich.risk !== undefined) {
      apiOptions.riskData = mapRiskDetailLevel(options.enrich.risk) as 0 | 1 | 2;
    }

    // Location and network require ASN data
    if (options.enrich.location || options.enrich.network) {
      apiOptions.asnData = true;
    }

    // Other enrichment flags
    if (options.enrich.lastSeen) {
      // Note: API uses 'seen' not 'lastSeen'
      apiOptions.seen = 1;
    }

    if (options.enrich.port) {
      apiOptions.port = 1;
    }
  }

  // Time range
  if (options.timeRange) {
    apiOptions.dayRestrictor = options.timeRange;
  }

  // Custom tag
  if (options.tag) {
    apiOptions.customTag = options.tag;
    apiOptions.queryTagging = true;
  }

  // Country filtering
  if (options.allowedCountries) {
    apiOptions.allowedCountries = options.allowedCountries;
  }

  if (options.blockedCountries) {
    apiOptions.blockedCountries = options.blockedCountries;
  }

  return apiOptions;
}

/**
 * Default semantic options
 */
export const DEFAULT_SEMANTIC_OPTIONS: SemanticCheckOptions = {
  detection: {
    mode: "both",
  },
  enrich: {
    risk: "basic",
    location: false,
    network: false,
    lastSeen: false,
    port: false,
  },
  timeRange: 7,
};
