/**
 * ProxyCheck SDK Constants
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  CHECK: "v2/",
  LISTS: "dashboard/lists/",
  RULES: "dashboard/rules/",
  EXPORT: "dashboard/export/",
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  BASE_URL: "proxycheck.io",
  TIMEOUT: 30000, // 30 seconds
  RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  TLS_SECURITY: true,
  USER_AGENT: "proxycheck-sdk/0.9.0",
} as const;

/**
 * VPN Detection Levels
 */
export const VPN_LEVELS = {
  DISABLED: 0,
  BASIC: 1,
  ENHANCED: 2,
  PARANOID: 3,
} as const;

/**
 * Risk Data Levels
 */
export const RISK_LEVELS = {
  DISABLED: 0,
  BASIC: 1,
  DETAILED: 2,
} as const;

/**
 * List Actions
 */
export const LIST_ACTIONS = {
  ADD: "add",
  REMOVE: "remove",
  SET: "set",
  GET: "get",
} as const;

/**
 * Rule Actions
 */
export const RULE_ACTIONS = {
  ADD: "add",
  REMOVE: "remove",
  SET: "set",
  GET: "get",
  TEST: "test",
} as const;

/**
 * Stat Types
 */
export const STAT_TYPES = {
  DETECTIONS: "detections",
  QUERIES: "queries",
  USAGE: "usage",
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  API_ERROR: "API_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  RATE_LIMIT: "RATE_LIMIT",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
} as const;

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
