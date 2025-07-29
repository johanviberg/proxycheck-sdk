// Re-export version

// Export main clients
export { ProxyCheck } from "./client";
// Export ProxyCheck also as ProxyCheckClient for backward compatibility
export {
  ProxyCheck as ModernProxyCheck,
  ProxyCheck as default,
  ProxyCheck as ProxyCheckClient,
} from "./client/modern";
// Export config utilities
export { createConfig, validateOptions } from "./config";
export * from "./config/semantic";
// Export errors
export * from "./errors";
// Export logging
export * from "./logging";
// Export services (for advanced usage)
export { CheckService } from "./services/check";
export { DashboardService } from "./services/dashboard";
export type {
  EnhancedListResponse,
  ListComparisonResult,
  ListEntry,
  ListOperationResult,
  ListValidationResult,
} from "./services/list-management";
export { ListManagementService } from "./services/list-management";
export { ListingService } from "./services/listing";
export { RulesService } from "./services/rules";
export { StatsService } from "./services/stats";
// Export types
export * from "./types";
// Export utils
export * from "./utils";
export { VERSION } from "./version";
