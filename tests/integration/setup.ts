/**
 * Integration test setup
 *
 * This file configures the environment for live API tests.
 * Tests will only run if explicitly enabled via environment variables.
 */

import { ProxyCheckClient } from "../../src";

// Environment configuration
export const API_KEY = process.env.PROXYCHECK_TEST_API_KEY;
export const RUN_LIVE_TESTS = process.env.RUN_LIVE_API_TESTS === "true";
export const TEST_TIMEOUT = 30000; // 30 seconds per test
export const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// Test levels
export const RUN_SMOKE_TESTS = RUN_LIVE_TESTS;
export const RUN_COMPREHENSIVE_TESTS = process.env.RUN_COMPREHENSIVE_TESTS === "true";
export const VERBOSE_LOGGING = process.env.VERBOSE_TEST_LOGGING === "true";

// Global test client instance
let testClient: ProxyCheckClient | null = null;

/**
 * Get or create a test client instance
 */
export function getTestClient(): ProxyCheckClient {
  if (!testClient) {
    if (!API_KEY) {
      throw new Error(
        "PROXYCHECK_TEST_API_KEY environment variable is required for live tests.\n" +
          "Please set it to a valid ProxyCheck.io API key.",
      );
    }

    testClient = new ProxyCheckClient({
      apiKey: API_KEY,
      retries: 3,
      retryDelay: 2000,
      timeout: 20000,
      logging: VERBOSE_LOGGING
        ? {
            level: "debug",
            format: "pretty",
            timestamp: true,
            colors: true,
          }
        : undefined,
    });
  }

  return testClient;
}

/**
 * Skip test if live tests are not enabled
 */
export function skipIfNotLive() {
  if (!RUN_LIVE_TESTS) {
    console.log(
      "\n⚠️  Skipping live API tests. To run them:\n" +
        "   export RUN_LIVE_API_TESTS=true\n" +
        "   export PROXYCHECK_TEST_API_KEY=your-api-key\n",
    );
    return true;
  }
  return false;
}

/**
 * Skip test if comprehensive tests are not enabled
 */
export function skipIfNotComprehensive() {
  if (!RUN_COMPREHENSIVE_TESTS) {
    console.log(
      "\n⚠️  Skipping comprehensive tests. To run them:\n" +
        "   export RUN_COMPREHENSIVE_TESTS=true\n",
    );
    return true;
  }
  return false;
}

// Global setup
beforeAll(() => {
  if (RUN_LIVE_TESTS && !API_KEY) {
    throw new Error("PROXYCHECK_TEST_API_KEY is required when RUN_LIVE_API_TESTS is true");
  }
});

// Global teardown
afterAll(() => {
  testClient = null;
});

// Configure Jest timeout for integration tests
jest.setTimeout(TEST_TIMEOUT);
