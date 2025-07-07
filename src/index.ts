export const VERSION = "0.9.0";

// Export main client
export { ProxyCheckClient } from "./client";
// Export config utilities
export { createConfig, validateOptions } from "./config";
// Export errors
export * from "./errors";
// Export logging
export * from "./logging";
// Export services
export { CheckService } from "./services/check";
export { ListingService } from "./services/listing";
export { RulesService } from "./services/rules";
export { StatsService } from "./services/stats";
// Export types
export * from "./types";

export default {
  version: VERSION,
};
