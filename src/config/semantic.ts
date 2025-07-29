/**
 * Semantic configuration options and transformation utilities
 */

import { ProxyCheckValidationError } from "../errors";
import type { ProxyCheckOptions } from "../types";
import { transformOptions } from "../types/mappings";
import type { SemanticCheckOptions } from "../types/responses";
import { SemanticCheckOptionsSchema } from "../types/schemas";
import { extractZodErrors } from "../utils/validation";

/**
 * Default semantic configuration optimized for security and performance
 */
export const DEFAULT_CHECK_OPTIONS: SemanticCheckOptions = {
  detection: {
    mode: "both", // Check both proxy and VPN for comprehensive security
  },
  enrich: {
    risk: "basic", // Include basic risk score for decision making
    location: false, // Skip location data by default for better performance
    network: false, // Skip network data by default for better performance
    lastSeen: false, // Skip last seen data by default
    port: false, // Skip port data by default
  },
  timeRange: 7, // Look back 7 days (API default)
  // No tag by default
  // No country restrictions by default
};

/**
 * Security-focused configuration for high-risk applications
 */
export const SECURITY_FOCUSED_OPTIONS: SemanticCheckOptions = {
  detection: {
    mode: "comprehensive", // Get separate VPN and proxy results
  },
  enrich: {
    risk: "detailed", // Get detailed attack history
    location: true, // Include location for geo-blocking
    network: true, // Include network info for provider analysis
    lastSeen: true, // Include last seen for recency analysis
    port: true, // Include port info for additional context
  },
  timeRange: 30, // Look back 30 days for more historical data
};

/**
 * Performance-focused configuration for high-volume applications
 */
export const PERFORMANCE_FOCUSED_OPTIONS: SemanticCheckOptions = {
  detection: {
    mode: "proxy", // Only check proxies, skip VPN detection
  },
  enrich: {
    risk: false, // Skip risk calculation for speed
    location: false, // Skip location data
    network: false, // Skip network data
    lastSeen: false, // Skip last seen data
    port: false, // Skip port data
  },
  timeRange: 1, // Minimal lookback for fastest response
};

/**
 * Merge user options with defaults
 */
export function mergeSemanticOptions(
  userOptions: Partial<SemanticCheckOptions> = {},
  defaults: SemanticCheckOptions = DEFAULT_CHECK_OPTIONS,
): SemanticCheckOptions {
  const merged: SemanticCheckOptions = {};

  // Merge detection options
  if (defaults.detection || userOptions.detection) {
    merged.detection = {
      ...defaults.detection,
      ...userOptions.detection,
    };
  }

  // Merge enrich options
  if (defaults.enrich || userOptions.enrich) {
    merged.enrich = {
      ...defaults.enrich,
      ...userOptions.enrich,
    };
  }

  // Set optional properties only if they have values
  if (userOptions.timeRange !== undefined) {
    merged.timeRange = userOptions.timeRange;
  } else if (defaults.timeRange !== undefined) {
    merged.timeRange = defaults.timeRange;
  }

  if (userOptions.tag !== undefined) {
    merged.tag = userOptions.tag;
  } else if (defaults.tag !== undefined) {
    merged.tag = defaults.tag;
  }

  if (userOptions.allowedCountries !== undefined) {
    merged.allowedCountries = userOptions.allowedCountries;
  } else if (defaults.allowedCountries !== undefined) {
    merged.allowedCountries = defaults.allowedCountries;
  }

  if (userOptions.blockedCountries !== undefined) {
    merged.blockedCountries = userOptions.blockedCountries;
  } else if (defaults.blockedCountries !== undefined) {
    merged.blockedCountries = defaults.blockedCountries;
  }

  return merged;
}

/**
 * Validate semantic options using Zod schema
 */
export function validateSemanticOptions(options: SemanticCheckOptions): SemanticCheckOptions {
  try {
    const validated = SemanticCheckOptionsSchema.parse(options);

    // Additional validation warnings
    if (validated.allowedCountries && validated.blockedCountries) {
      // Note: Both country restrictions are set - blockedCountries takes precedence
      // This could be logged in a future version with proper logging integration
    }

    return validated as SemanticCheckOptions;
  } catch (error: unknown) {
    // Extract and log validation errors
    const validationErrors = extractZodErrors(error);

    if (validationErrors) {
      throw new ProxyCheckValidationError(
        "Invalid semantic options",
        undefined,
        options,
        validationErrors,
        error,
      );
    }
    throw error;
  }
}

/**
 * Transform semantic options to legacy API options
 */
export function semanticToLegacyOptions(
  semanticOptions: SemanticCheckOptions,
  apiKey?: string,
): ProxyCheckOptions {
  // Validate first
  const validated = validateSemanticOptions(semanticOptions);

  // Transform to legacy format
  const legacyOptions = transformOptions(validated);

  // Add API key if provided
  if (apiKey) {
    legacyOptions.apiKey = apiKey;
  }

  return legacyOptions;
}

/**
 * Get optimized options for different use cases
 */
export const PRESET_OPTIONS = {
  default: DEFAULT_CHECK_OPTIONS,
  security: SECURITY_FOCUSED_OPTIONS,
  performance: PERFORMANCE_FOCUSED_OPTIONS,

  // Convenience presets
  quickCheck: {
    detection: { mode: "proxy" as const },
    enrich: { risk: false as const },
    timeRange: 1,
  } as SemanticCheckOptions,

  thoroughCheck: {
    detection: { mode: "comprehensive" as const },
    enrich: {
      risk: "detailed" as const,
      location: true,
      network: true,
      lastSeen: true,
      port: true,
    },
    timeRange: 30,
  } as SemanticCheckOptions,

  vpnOnly: {
    detection: { mode: "vpn" as const },
    enrich: { risk: "basic" as const },
    timeRange: 7,
  } as SemanticCheckOptions,
} as const;

/**
 * Helper to create options with country restrictions
 */
export function withCountryRestrictions(
  baseOptions: SemanticCheckOptions,
  restrictions: {
    allowed?: Array<string>;
    blocked?: Array<string>;
  },
): SemanticCheckOptions {
  const result: SemanticCheckOptions = {
    ...baseOptions,
  };

  if (restrictions.allowed) {
    result.allowedCountries = restrictions.allowed;
  }

  if (restrictions.blocked) {
    result.blockedCountries = restrictions.blocked;
  }

  return result;
}

/**
 * Helper to create options with custom tag
 */
export function withTag(baseOptions: SemanticCheckOptions, tag: string): SemanticCheckOptions {
  return {
    ...baseOptions,
    tag,
  };
}
