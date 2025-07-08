/**
 * Error Handling Examples
 *
 * This example demonstrates comprehensive error handling strategies
 * for various failure scenarios in the ProxyCheck.io SDK.
 */

import {
  isProxyCheckError,
  isRateLimitError,
  isValidationError,
  ProxyCheckAuthenticationError,
  ProxyCheckClient,
  ProxyCheckNetworkError,
  ProxyCheckTimeoutError,
  ProxyCheckValidationError,
} from "../src";

// Create clients for different error scenarios
const validClient = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
});

const invalidClient = new ProxyCheckClient({
  apiKey: "invalid-key-123",
});

const unconfiguredClient = new ProxyCheckClient({
  // No API key
});

async function validationErrorExamples() {
  console.log("❌ Validation Error Examples\n");

  const testCases = [
    {
      description: "Invalid IP address format",
      test: () => validClient.check.checkAddress("invalid-ip"),
    },
    {
      description: "Empty address",
      test: () => validClient.check.checkAddress(""),
    },
    {
      description: "Null address",
      test: () => validClient.check.checkAddress(null as any),
    },
    {
      description: "Invalid options",
      test: () => validClient.check.checkAddress("1.2.3.4", { vpnDetection: 99 as any }),
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.description}`);
      await testCase.test();
      console.log("  ❌ Expected validation error but none occurred\n");
    } catch (error) {
      if (isValidationError(error)) {
        console.log("  ✅ Caught ProxyCheckValidationError");
        console.log(`     Message: ${error.message}`);
        console.log(`     Field: ${error.field || "N/A"}`);
        console.log(`     Value: ${JSON.stringify(error.value)}`);
        if (error.validationErrors) {
          console.log("     Validation Errors:");
          error.validationErrors.forEach((err) => {
            console.log(`       - ${err.path}: ${err.message}`);
          });
        }
      } else {
        console.log(`  ⚠️ Unexpected error type: ${error.constructor.name}`);
        console.log(`     Message: ${error.message}`);
      }
      console.log("");
    }
  }
}

async function authenticationErrorExamples() {
  console.log("🔐 Authentication Error Examples\n");

  const testCases = [
    {
      description: "Invalid API key",
      client: invalidClient,
      test: () => invalidClient.check.checkAddress("1.2.3.4"),
    },
    {
      description: "Missing API key",
      client: unconfiguredClient,
      test: () => unconfiguredClient.check.checkAddress("1.2.3.4"),
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.description}`);
      await testCase.test();
      console.log("  ❌ Expected authentication error but none occurred\n");
    } catch (error) {
      if (error instanceof ProxyCheckAuthenticationError) {
        console.log("  ✅ Caught ProxyCheckAuthenticationError");
        console.log(`     Message: ${error.message}`);
        console.log(`     Status Code: ${error.statusCode}`);
      } else if (isValidationError(error)) {
        console.log("  ✅ Caught ProxyCheckValidationError (missing API key)");
        console.log(`     Message: ${error.message}`);
      } else {
        console.log(`  ⚠️ Unexpected error type: ${error.constructor.name}`);
        console.log(`     Message: ${error.message}`);
      }
      console.log("");
    }
  }
}

async function rateLimitErrorExample() {
  console.log("⏱️ Rate Limit Error Simulation\n");

  // This example simulates how to handle rate limiting
  // Note: Actual rate limiting depends on your plan and current usage

  try {
    console.log("Attempting rapid requests to demonstrate rate limit handling...");

    // Create multiple concurrent requests
    const rapidRequests = Array.from({ length: 20 }, (_, i) =>
      validClient.check.checkAddress(`1.2.3.${i + 1}`).catch((error) => ({ error, index: i })),
    );

    const results = await Promise.all(rapidRequests);

    const successful = results.filter((r) => !r.error).length;
    const rateLimited = results.filter((r) => r.error && isRateLimitError(r.error)).length;
    const otherErrors = results.filter((r) => r.error && !isRateLimitError(r.error)).length;

    console.log("  Results:");
    console.log(`    Successful: ${successful}`);
    console.log(`    Rate Limited: ${rateLimited}`);
    console.log(`    Other Errors: ${otherErrors}`);

    // Show rate limit information
    const rateLimitInfo = validClient.getRateLimitInfo();
    if (rateLimitInfo) {
      console.log("  Current Rate Limit Status:");
      console.log(`    Limit: ${rateLimitInfo.limit}`);
      console.log(`    Remaining: ${rateLimitInfo.remaining}`);
      console.log(`    Reset: ${rateLimitInfo.reset}`);
      console.log(`    Retry After: ${rateLimitInfo.retryAfter}s`);
    }

    // Handle any rate limit errors that occurred
    const rateLimitError = results.find((r) => r.error && isRateLimitError(r.error))?.error;
    if (rateLimitError) {
      console.log("  Rate Limit Error Details:");
      console.log(`    Message: ${rateLimitError.message}`);
      console.log(`    Limit: ${rateLimitError.limit}`);
      console.log(`    Remaining: ${rateLimitError.remaining}`);
      console.log(`    Reset: ${rateLimitError.reset}`);
      console.log(`    Retry After: ${rateLimitError.retryAfter}s`);
    }
  } catch (error) {
    console.error("Rate limit example failed:", error.message);
  }

  console.log("");
}

async function networkErrorSimulation() {
  console.log("🌐 Network Error Simulation\n");

  // Create a client with invalid base URL to simulate network errors
  const networkErrorClient = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    baseUrl: "invalid-domain-that-does-not-exist.com",
    timeout: 5000,
  });

  try {
    console.log("Testing with invalid domain...");
    await networkErrorClient.check.checkAddress("1.2.3.4");
    console.log("  ❌ Expected network error but none occurred\n");
  } catch (error) {
    if (error instanceof ProxyCheckNetworkError) {
      console.log("  ✅ Caught ProxyCheckNetworkError");
      console.log(`     Message: ${error.message}`);
      console.log(`     Original Error: ${error.originalError?.message || "N/A"}`);
    } else {
      console.log(`  ⚠️ Unexpected error type: ${error.constructor.name}`);
      console.log(`     Message: ${error.message}`);
    }
    console.log("");
  }
}

async function timeoutErrorSimulation() {
  console.log("⏰ Timeout Error Simulation\n");

  // Create a client with very short timeout
  const timeoutClient = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    timeout: 1, // 1ms timeout - will definitely timeout
  });

  try {
    console.log("Testing with 1ms timeout...");
    await timeoutClient.check.checkAddress("1.2.3.4");
    console.log("  ❌ Expected timeout error but none occurred\n");
  } catch (error) {
    if (error instanceof ProxyCheckTimeoutError) {
      console.log("  ✅ Caught ProxyCheckTimeoutError");
      console.log(`     Message: ${error.message}`);
      console.log(`     Timeout: ${error.timeout}ms`);
    } else {
      console.log(`  ⚠️ Unexpected error type: ${error.constructor.name}`);
      console.log(`     Message: ${error.message}`);
    }
    console.log("");
  }
}

async function comprehensiveErrorHandling() {
  console.log("🛡️ Comprehensive Error Handling Strategy\n");

  async function robustAPICall(address: string, maxRetries = 3): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  Attempt ${attempt}: Checking ${address}...`);

        const result = await validClient.check.checkAddress(address);
        console.log(`  ✅ Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.log(`  ❌ Attempt ${attempt} failed: ${error.message}`);

        if (isRateLimitError(error)) {
          console.log(`  ⏳ Rate limited. Waiting ${error.retryAfter}s before retry...`);
          await new Promise((resolve) => setTimeout(resolve, error.retryAfter * 1000));
          continue;
        }

        if (error instanceof ProxyCheckValidationError) {
          console.log("  🚫 Validation error - not retrying");
          break;
        }

        if (error instanceof ProxyCheckAuthenticationError) {
          console.log("  🔐 Authentication error - not retrying");
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
          console.log(`  ⏸️ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  const testAddresses = ["1.2.3.4", "invalid-ip", "8.8.8.8"];

  for (const address of testAddresses) {
    console.log(`\nRobust check for: ${address}`);
    try {
      const _result = await robustAPICall(address);
      console.log("  Final result: Success");
    } catch (error) {
      console.log("  Final result: Failed after all retries");

      // Log detailed error information
      if (isProxyCheckError(error)) {
        console.log(`  Error Type: ${error.constructor.name}`);
        console.log(`  Error Code: ${error.code}`);
        console.log(`  Message: ${error.message}`);
        if (error.statusCode) {
          console.log(`  Status Code: ${error.statusCode}`);
        }
        console.log(`  Timestamp: ${error.timestamp}`);
      }
    }
  }
}

async function errorRecoveryStrategies() {
  console.log("\n🔄 Error Recovery Strategies\n");

  // Strategy 1: Graceful degradation
  async function gracefulDegradation(address: string) {
    console.log(`Graceful degradation check for: ${address}`);

    try {
      // Try full feature check first
      const result = await validClient.check.getDetailedInfo(address);
      console.log("  ✅ Full feature check successful");
      return { mode: "full", result };
    } catch (error) {
      console.log(`  ⚠️ Full check failed: ${error.message}`);

      try {
        // Fallback to basic check
        const result = await validClient.check.isProxy(address);
        console.log("  ✅ Basic check successful");
        return { mode: "basic", result };
      } catch (fallbackError) {
        console.log(`  ❌ Basic check also failed: ${fallbackError.message}`);

        // Return safe default
        console.log("  🛡️ Using safe default (assume risky)");
        return { mode: "default", result: true };
      }
    }
  }

  // Strategy 2: Circuit breaker pattern
  class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private readonly maxFailures = 3;
    private readonly timeout = 30000; // 30 seconds

    async call<T>(fn: () => Promise<T>): Promise<T> {
      if (this.isOpen()) {
        throw new Error("Circuit breaker is open");
      }

      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure();
        throw error;
      }
    }

    private isOpen(): boolean {
      if (this.failures >= this.maxFailures) {
        return Date.now() - this.lastFailureTime < this.timeout;
      }
      return false;
    }

    private onSuccess(): void {
      this.failures = 0;
    }

    private onFailure(): void {
      this.failures++;
      this.lastFailureTime = Date.now();
    }

    getStatus(): string {
      if (this.isOpen()) {
        return "OPEN";
      }
      if (this.failures > 0) {
        return "HALF_OPEN";
      }
      return "CLOSED";
    }
  }

  const circuitBreaker = new CircuitBreaker();

  async function circuitBreakerExample() {
    console.log("\nCircuit Breaker Pattern:");

    for (let i = 0; i < 5; i++) {
      try {
        console.log(`  Request ${i + 1} (Circuit: ${circuitBreaker.getStatus()})`);

        const _result = await circuitBreaker.call(() => validClient.check.checkAddress("1.2.3.4"));
        console.log("    ✅ Success");
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }
  }

  await gracefulDegradation("1.2.3.4");
  await gracefulDegradation("invalid-ip");
  await circuitBreakerExample();
}

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Error Handling Examples\n");

  try {
    await validationErrorExamples();
    await authenticationErrorExamples();
    await rateLimitErrorExample();
    await networkErrorSimulation();
    await timeoutErrorSimulation();
    await comprehensiveErrorHandling();
    await errorRecoveryStrategies();

    console.log("\n✨ All error handling examples completed!");
  } catch (error) {
    console.error("Examples failed:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runErrorHandlingExamples };
