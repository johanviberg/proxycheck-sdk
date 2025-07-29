/**
 * Response transformation utilities
 */

import type { AddressCheckResult, CheckResponse } from "../types";
import { getRiskLevel } from "../types/mappings";
import type {
  AttackHistory,
  BatchCheckResponse,
  BatchCheckResults,
  CheckResult,
  DetectionInfo,
  DetectionType,
  LocationInfo,
  NetworkInfo,
  ResponseWarning,
  RiskInfo,
  SingleCheckResponse,
} from "../types/responses";

/**
 * Transform attack history from API format
 */
function transformAttackHistory(attacks: unknown): AttackHistory | undefined {
  if (!attacks || typeof attacks !== "object" || attacks === null) {
    return undefined;
  }

  const attacksObj = attacks as Record<string, number>;

  // Use bracket notation to satisfy TypeScript index signature requirements
  // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript index signature
  const total = attacksObj["total"] ?? 0;
  const history: AttackHistory = {
    total,
  };

  if (attacksObj["Login Attempt"] !== undefined) {
    history.loginAttempt = attacksObj["Login Attempt"];
  }
  if (attacksObj["Registration Attempt"] !== undefined) {
    history.registrationAttempt = attacksObj["Registration Attempt"];
  }
  if (attacksObj["Comment Spam"] !== undefined) {
    history.commentSpam = attacksObj["Comment Spam"];
  }
  if (attacksObj["Denial of Service"] !== undefined) {
    history.denialOfService = attacksObj["Denial of Service"];
  }
  if (attacksObj["Forum Spam"] !== undefined) {
    history.forumSpam = attacksObj["Forum Spam"];
  }
  if (attacksObj["Form Submission"] !== undefined) {
    history.formSubmission = attacksObj["Form Submission"];
  }
  if (attacksObj["Vulnerability Probing"] !== undefined) {
    history.vulnerabilityProbing = attacksObj["Vulnerability Probing"];
  }

  return history;
}

/**
 * Transform risk information
 */
function transformRiskInfo(result: AddressCheckResult): RiskInfo {
  const score = result.risk || 0;
  const level = getRiskLevel(score);

  const riskInfo: RiskInfo = {
    score,
    level,
  };

  // Add attack history if available
  if (result.attack_history) {
    // Parse attack history if it's a string
    const attacks =
      typeof result.attack_history === "string"
        ? JSON.parse(result.attack_history)
        : result.attack_history;

    const attackHistory = transformAttackHistory(attacks);
    if (attackHistory) {
      riskInfo.attacks = attackHistory;
    }
  }

  return riskInfo;
}

/**
 * Transform detection information
 */
function transformDetectionInfo(result: AddressCheckResult): DetectionInfo {
  const detection: DetectionInfo = {};

  if (result.type) {
    // Map API type to our detection type
    // Note: Type mapping could be more precise, but keeping it simple for now
    detection.type = result.type as DetectionType;
  }

  if (result.isp || result.organisation) {
    const provider = result.organisation || result.isp;
    if (provider) {
      detection.provider = provider;
    }
  }

  if (result.last_seen) {
    // Convert Unix timestamp to Date
    const timestamp =
      typeof result.last_seen === "string"
        ? Number.parseInt(result.last_seen, 10)
        : result.last_seen;

    if (!Number.isNaN(timestamp)) {
      detection.lastSeen = new Date(timestamp * 1000);
    }
  }

  if (result.port !== undefined && result.port !== false) {
    if (typeof result.port === "number") {
      detection.port = result.port;
    }
  }

  return detection;
}

/**
 * Transform location information
 */
function transformLocationInfo(result: AddressCheckResult): LocationInfo | undefined {
  if (!result.country) {
    return undefined;
  }

  const location: LocationInfo = {
    country: result.country,
    countryCode: result.isocode || "",
  };

  if (result.region) {
    location.region = result.region;
  }

  // Note: regioncode not in current interface, would need to be added
  const extendedResult = result as AddressCheckResult & { regioncode?: string };
  if (extendedResult.regioncode) {
    location.regionCode = extendedResult.regioncode;
  }

  if (result.city) {
    location.city = result.city;
  }

  if (result.latitude !== undefined && result.longitude !== undefined) {
    location.coordinates = {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  }

  if (result.timezone) {
    location.timezone = result.timezone;
  }

  if (result.continent) {
    location.continent = result.continent;
  }

  if (result.currency) {
    location.currency = result.currency;
  }

  return location;
}

/**
 * Transform network information
 */
function transformNetworkInfo(result: AddressCheckResult): NetworkInfo | undefined {
  if (!(result.asn || result.isp || result.organisation)) {
    return undefined;
  }

  const network: NetworkInfo = {};

  if (result.asn) {
    network.asn = result.asn;
  }

  if (result.isp || result.organisation) {
    const provider = result.isp || result.organisation;
    if (provider) {
      network.provider = provider;
    }
  }

  if (result.organisation) {
    network.organization = result.organisation;
  }

  return network;
}

/**
 * Transform a single address result to CheckResult
 */
export function transformAddressResult(address: string, result: AddressCheckResult): CheckResult {
  // Handle email results
  const isEmail = address.includes("@");

  // Core detection results
  const isProxy = result.proxy === "yes";
  const isVPN = result.vpn === "yes" || result.type === "VPN";
  const isDisposableEmail = isEmail && result.disposable === "yes";

  // Build the transformed result
  const checkResult: CheckResult = {
    // Core booleans
    isProxy,
    isVPN,

    // Risk assessment
    risk: transformRiskInfo(result),

    // Detection metadata
    detection: transformDetectionInfo(result),

    // Original address
    address,
  };

  // Add email-specific field
  if (isEmail) {
    checkResult.isDisposableEmail = isDisposableEmail;
  }

  // Add optional location data
  const location = transformLocationInfo(result);
  if (location) {
    checkResult.location = location;
  }

  // Add optional network data
  const network = transformNetworkInfo(result);
  if (network) {
    checkResult.network = network;
  }

  // Add query metadata if available
  // Note: These fields would need to be added to AddressCheckResult interface
  // For now, we'll check if they exist on the result object
  const extendedResult = result as AddressCheckResult & { queryTime?: number; node?: string };
  if (extendedResult.queryTime) {
    checkResult.queryTime = extendedResult.queryTime;
  }

  if (extendedResult.node) {
    checkResult.node = extendedResult.node;
  }

  return checkResult;
}

/**
 * Extract warning information from response
 */
function extractWarning(response: CheckResponse): ResponseWarning | undefined {
  if (response.status !== "warning" || !response.message) {
    return undefined;
  }

  const message = response.message;
  let code: ResponseWarning["code"];

  if (message.includes("within 10% of your query limit")) {
    code = "NEAR_LIMIT";
  } else if (message.includes("burst token")) {
    code = "BURST_TOKEN_USED";
  } else if (message.includes("rate limit")) {
    code = "RATE_LIMIT_WARNING";
  }

  const warning: ResponseWarning = { message };
  if (code) {
    warning.code = code;
  }
  return warning;
}

/**
 * Transform single check response
 */
export function transformSingleResponse(
  address: string,
  response: CheckResponse,
): SingleCheckResponse {
  const result = response[address] as AddressCheckResult;

  if (!result) {
    throw new Error(`No result found for address: ${address}`);
  }

  const baseResponse: SingleCheckResponse = {
    status: response.status,
    result: transformAddressResult(address, result),
  };

  // Add message if present
  if (response.message) {
    baseResponse.message = response.message;
  }

  // Extract warning info
  const warning = extractWarning(response);
  if (warning) {
    baseResponse.warning = warning;
  }

  // Check for burst token usage
  if (response.message?.includes("burst token")) {
    baseResponse.burstTokenUsed = true;
  }

  return baseResponse;
}

/**
 * Transform batch check response
 */
export function transformBatchResponse(
  addresses: Array<string>,
  response: CheckResponse,
): BatchCheckResponse {
  const results: BatchCheckResults = new Map();

  // Process each address
  for (const address of addresses) {
    const result = response[address] as AddressCheckResult;
    if (result && typeof result === "object") {
      results.set(address, transformAddressResult(address, result));
    }
  }

  const baseResponse: BatchCheckResponse = {
    status: response.status,
    results,
  };

  // Add message if present
  if (response.message) {
    baseResponse.message = response.message;
  }

  // Extract warning info
  const warning = extractWarning(response);
  if (warning) {
    baseResponse.warning = warning;
  }

  // Check for burst token usage
  if (response.message?.includes("burst token")) {
    baseResponse.burstTokenUsed = true;
  }

  return baseResponse;
}

/**
 * Helper to check if a result indicates a proxy/VPN
 */
export function isSuspiciousResult(result: CheckResult): boolean {
  return result.isProxy || result.isVPN || result.risk.score > 66;
}

/**
 * Helper to check if an email is disposable
 */
export function isDisposableEmailResult(result: CheckResult): boolean {
  return result.isDisposableEmail === true;
}

/**
 * Helper to get a human-readable risk description
 */
export function getRiskDescription(result: CheckResult): string {
  const { level, score } = result.risk;

  switch (level) {
    case "low":
      return `Low risk (${score}%) - Address appears legitimate`;
    case "medium":
      return `Medium risk (${score}%) - Some suspicious activity detected`;
    case "high":
      return `High risk (${score}%) - Significant threat indicators`;
    case "critical":
      return `Critical risk (${score}%) - Immediate action recommended`;
    default:
      return `Risk level ${level} (${score}%)`;
  }
}

/**
 * Helper to get detection type description
 */
export function getDetectionDescription(result: CheckResult): string {
  if (result.isProxy && result.isVPN) {
    return `VPN/Proxy (${result.detection.type || "Unknown"})`;
  }
  if (result.isProxy) {
    return `Proxy (${result.detection.type || "Unknown"})`;
  }
  if (result.isVPN) {
    return `VPN (${result.detection.type || "Unknown"})`;
  }
  if (result.isDisposableEmail) {
    return "Disposable email address";
  }
  return result.detection.type || "Residential";
}

/**
 * Helper to format location information
 */
export function formatLocation(result: CheckResult): string | null {
  if (!result.location) {
    return null;
  }

  const parts = [result.location.city, result.location.region, result.location.country].filter(
    Boolean,
  );

  return parts.join(", ");
}

/**
 * Helper to check if result indicates a mobile connection
 */
export function isMobileConnection(result: CheckResult): boolean {
  return (
    result.detection.type === "Wireless" ||
    result.detection.provider?.toLowerCase().includes("mobile") === true
  );
}

/**
 * Helper to check if result indicates a business connection
 */
export function isBusinessConnection(result: CheckResult): boolean {
  return (
    result.detection.type === "Business" ||
    result.detection.provider?.toLowerCase().includes("business") === true
  );
}

/**
 * Helper to check if result indicates a hosting provider
 */
export function isHostingProvider(result: CheckResult): boolean {
  return (
    result.detection.type === "Hosting" ||
    result.detection.provider?.toLowerCase().includes("hosting") === true ||
    result.detection.provider?.toLowerCase().includes("cloud") === true
  );
}

/**
 * Helper to calculate time since last seen
 */
export function getTimeSinceLastSeen(result: CheckResult): string | null {
  if (!result.detection.lastSeen) {
    return null;
  }

  const now = new Date();
  const lastSeen = result.detection.lastSeen;
  const diffMs = now.getTime() - lastSeen.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}

/**
 * Helper to create a summary object from results
 */
export function createResultSummary(results: Array<CheckResult>): {
  total: number;
  suspicious: number;
  clean: number;
  proxies: number;
  vpns: number;
  disposableEmails: number;
  averageRisk: number;
  highestRisk: number;
  countries: Record<string, number>;
  providers: Record<string, number>;
} {
  const summary = {
    total: results.length,
    suspicious: 0,
    clean: 0,
    proxies: 0,
    vpns: 0,
    disposableEmails: 0,
    averageRisk: 0,
    highestRisk: 0,
    countries: {} as Record<string, number>,
    providers: {} as Record<string, number>,
  };

  let totalRisk = 0;

  for (const result of results) {
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

    totalRisk += result.risk.score;
    summary.highestRisk = Math.max(summary.highestRisk, result.risk.score);

    if (result.location?.country) {
      summary.countries[result.location.country] =
        (summary.countries[result.location.country] || 0) + 1;
    }

    if (result.detection.provider) {
      summary.providers[result.detection.provider] =
        (summary.providers[result.detection.provider] || 0) + 1;
    }
  }

  summary.averageRisk = results.length > 0 ? Math.round(totalRisk / results.length) : 0;

  return summary;
}
