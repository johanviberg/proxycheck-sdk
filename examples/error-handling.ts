/**
 * Error Handling Examples for ProxyCheck SDK v0.9.2
 * 
 * This example demonstrates comprehensive error handling strategies
 * for the ProxyCheck SDK, including network errors, validation errors,
 * rate limiting, and recovery strategies.
 */

import { 
  ProxyCheck, 
  ProxyCheckError,
  ProxyCheckValidationError,
  ProxyCheckRateLimitError,
  ProxyCheckNetworkError,
  type CheckResult
} from "../src";

// Helper function to safely log errors
function logError(error: unknown, context: string) {
  console.error(`\n❌ Error in ${context}:`);
  
  if (error instanceof ProxyCheckError) {
    console.error(`  Type: ${error.constructor.name}`);
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Category: ${error.category}`);
    console.error(`  Severity: ${error.severity}`);
    
    if (error.statusCode) {
      console.error(`  HTTP Status: ${error.statusCode}`);
    }
    
    if (error.context) {
      console.error("  Context:", error.context);
    }
    
    if (error.suggestions && error.suggestions.length > 0) {
      console.error("  Suggestions:");
      error.suggestions.forEach(suggestion => {
        console.error(`    - ${suggestion}`);
      });
    }
    
    console.error(`  Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
  } else if (error instanceof Error) {
    console.error(`  Standard Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n')[1]?.trim()}`);
    }
  } else {
    console.error("  Unknown error type:", error);
  }
}

async function basicErrorHandlingExample() {
  console.log("1. Basic Error Handling Example\n");
  
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "invalid-key-for-demo"
  });

  try {
    console.log("  Attempting to check IP with potentially invalid API key...");
    const result = await client.check("8.8.8.8");
    console.log("  ✅ Check successful:", result.address);
  } catch (error) {
    logError(error, "basic API call");
    
    // Demonstrate error type checking
    if (error instanceof ProxyCheckValidationError) {
      console.log("\n  📝 This is a validation error - check your API key format");
    } else if (error instanceof ProxyCheckError && error.code === 'AUTHENTICATION_ERROR') {
      console.log("\n  🔐 This is an authentication error - verify your API key is valid");
    }
  }
}

async function validationErrorExample() {
  console.log("\n2. Validation Error Handling\n");
  
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key"
  });

  // Test various invalid inputs
  const invalidInputs = [
    { value: "", description: "Empty string" },
    { value: "not-an-ip", description: "Invalid IP format" },
    { value: "999.999.999.999", description: "Out of range IP" },
    { value: "invalid@", description: "Invalid email format" },
    { value: "test@.com", description: "Malformed email" }
  ];

  for (const input of invalidInputs) {
    try {
      console.log(`  Testing ${input.description}: "${input.value}"`);
      await client.check(input.value);
    } catch (error) {
      if (error instanceof ProxyCheckValidationError) {
        console.log(`    ❌ Validation failed: ${error.message}`);
        if (error.context?.field) {
          console.log(`    Field: ${error.context.field}`);
        }
        if (error.context?.value !== undefined) {
          console.log(`    Value: ${error.context.value}`);
        }
      }
    }
  }
}

async function rateLimitHandlingExample() {
  console.log("\n3. Rate Limit Error Handling with Retry Strategy\n");
  
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key"
  });

  // Simulate rate limit scenario
  async function checkWithRetry(ip: string, maxRetries = 3): Promise<CheckResult | null> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        attempts++;
        console.log(`  Attempt ${attempts} for ${ip}...`);
        
        const result = await client.check(ip);
        console.log(`  ✅ Success on attempt ${attempts}`);
        return result;
        
      } catch (error) {
        if (error instanceof ProxyCheckRateLimitError) {
          console.log("  ⏳ Rate limited!");
          
          if (error.retryAfter) {
            console.log(`    Retry after: ${error.retryAfter}ms`);
            
            if (attempts < maxRetries) {
              console.log("    Waiting before retry...");
              await new Promise(resolve => setTimeout(resolve, error.retryAfter || 1000));
              continue;
            }
          }
          
          // Check current rate limit status
          const rateLimitInfo = client.getRateLimitInfo();
          if (rateLimitInfo) {
            console.log("    Current limits:");
            console.log(`      Limit: ${rateLimitInfo.limit}`);
            console.log(`      Remaining: ${rateLimitInfo.remaining}`);
            console.log(`      Reset: ${new Date(Number(rateLimitInfo.reset) * 1000).toISOString()}`);
          }
        }
        
        logError(error, `attempt ${attempts}`);
        
        if (attempts >= maxRetries) {
          console.log(`  ❌ Max retries (${maxRetries}) reached`);
          return null;
        }
      }
    }
    
    return null;
  }

  // Test rate limit handling
  await checkWithRetry("1.1.1.1");
}

async function networkErrorHandlingExample() {
  console.log("\n4. Network Error Handling and Resilience\n");
  
  // Create client with short timeout to simulate network issues
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key",
    timeout: 100, // Very short timeout
    retries: 2
  });

  try {
    console.log("  Testing with very short timeout (100ms)...");
    await client.check("8.8.8.8");
  } catch (error) {
    if (error instanceof ProxyCheckNetworkError) {
      console.log("  ⚡ Network error detected!");
      console.log(`    Message: ${error.message}`);
      console.log(`    Code: ${error.code}`);
      
      // Implement exponential backoff
      console.log("\n  Implementing exponential backoff retry...");
      
      const backoffClient = new ProxyCheck({
        apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key",
        timeout: 5000, // More reasonable timeout
        retries: 0 // We'll handle retries manually
      });
      
      let retryDelay = 1000;
      for (let i = 1; i <= 3; i++) {
        try {
          console.log(`    Retry ${i} after ${retryDelay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          const result = await backoffClient.check("8.8.8.8");
          console.log(`    ✅ Success! IP is ${result.isProxy ? 'a proxy' : 'clean'}`);
          break;
        } catch (_retryError) {
          console.log(`    ❌ Retry ${i} failed`);
          retryDelay *= 2; // Exponential backoff
        }
      }
    } else {
      logError(error, "network test");
    }
  }
}

async function batchErrorHandlingExample() {
  console.log("\n5. Batch Processing Error Handling\n");
  
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key"
  });

  const addresses = [
    "8.8.8.8",          // Valid IP
    "invalid-ip",       // Invalid format
    "1.1.1.1",          // Valid IP
    "256.256.256.256",  // Out of range
    "test@example.com", // Valid email
    "bad@",             // Invalid email
    "2.2.2.2"           // Valid IP
  ];

  console.log("  Processing batch with mixed valid/invalid addresses...");
  
  try {
    const results = await client.checkBatch(addresses, {
      detection: { mode: "comprehensive" },
      enrich: { risk: "basic" }
    });
    
    console.log(`\n  Results: ${results.size} successful checks`);
    
    // Process successful results
    for (const [address, result] of results) {
      if ('error' in result) {
        // This shouldn't happen with the new API, but just in case
        console.log(`    ❌ ${address}: Error - ${result.error}`);
      } else {
        const status = result.isProxy ? "PROXY" : result.isVPN ? "VPN" : "CLEAN";
        console.log(`    ✅ ${address}: ${status} (Risk: ${result.risk.level})`);
      }
    }
    
  } catch (error) {
    logError(error, "batch processing");
    
    // For batch operations, we might want to process partial results
    if (error instanceof ProxyCheckValidationError) {
      console.log("\n  Some addresses were invalid. Check the error message for details.");
      
      // Filter out obviously invalid addresses for retry
      const validIpPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const validAddresses = addresses.filter(addr => 
        validIpPattern.test(addr) || validEmailPattern.test(addr)
      );
      
      if (validAddresses.length > 0 && validAddresses.length < addresses.length) {
        console.log(`\n  Retrying with ${validAddresses.length} valid addresses...`);
        try {
          const retryResults = await client.checkBatch(validAddresses);
          console.log(`  ✅ Retry successful: ${retryResults.size} results`);
        } catch (_retryError) {
          logError(_retryError, "batch retry");
        }
      }
    }
  }
}

async function errorRecoveryStrategiesExample() {
  console.log("\n6. Advanced Error Recovery Strategies\n");
  
  // Strategy 1: Fallback to cached results
  const cache = new Map<string, { result: CheckResult; timestamp: number }>();
  const CACHE_TTL = 60000; // 1 minute
  
  async function checkWithCache(client: ProxyCheck, ip: string): Promise<CheckResult | null> {
    // Check cache first
    const cached = cache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`  📦 Using cached result for ${ip}`);
      return cached.result;
    }
    
    try {
      const result = await client.check(ip);
      // Cache successful result
      cache.set(ip, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      // Try to use stale cache on error
      if (cached) {
        console.log(`  ⚠️ Using stale cache for ${ip} due to error`);
        return cached.result;
      }
      throw error;
    }
  }
  
  // Strategy 2: Circuit breaker pattern
  class CircuitBreaker {
    private _failures = 0;
    private _lastFailureTime = 0;
    private _state: 'closed' | 'open' | 'half-open' = 'closed';
    
    constructor(
      private threshold = 3,
      private timeout = 30000 // 30 seconds
    ) {}
    
    async execute<T>(operation: () => Promise<T>): Promise<T> {
      if (this._state === 'open') {
        if (Date.now() - this._lastFailureTime > this.timeout) {
          this._state = 'half-open';
          console.log("  🔄 Circuit breaker: Trying half-open state");
        } else {
          throw new Error('Circuit breaker is OPEN - service unavailable');
        }
      }
      
      try {
        const result = await operation();
        if (this._state === 'half-open') {
          this._state = 'closed';
          this._failures = 0;
          console.log("  ✅ Circuit breaker: Recovered to closed state");
        }
        return result;
      } catch (error) {
        this._failures++;
        this._lastFailureTime = Date.now();
        
        if (this._failures >= this.threshold) {
          this._state = 'open';
          console.log("  🚫 Circuit breaker: OPEN due to repeated failures");
        }
        
        throw error;
      }
    }
  }
  
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key"
  });
  
  const breaker = new CircuitBreaker();
  
  // Test circuit breaker
  console.log("  Testing circuit breaker pattern...");
  
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        // Simulate random failures
        if (Math.random() > 0.7) {
          throw new ProxyCheckNetworkError('Simulated network failure');
        }
        return await checkWithCache(client, "8.8.8.8");
      });
      console.log(`    Attempt ${i + 1}: Success`);
    } catch (error) {
      console.log(`    Attempt ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function customErrorHandlingExample() {
  console.log("\n7. Custom Error Handling and Logging\n");
  
  // Create a custom error handler
  class ErrorHandler {
    private _errorLog: Array<{
      timestamp: Date;
      error: Error;
      context: Record<string, unknown>;
    }> = [];
    
    handle(error: unknown, context: Record<string, unknown> = {}): void {
      if (error instanceof Error) {
        this._errorLog.push({
          timestamp: new Date(),
          error,
          context
        });
        
        // Custom handling based on error type
        if (error instanceof ProxyCheckRateLimitError) {
          console.log("  ⏳ Rate limit reached - implementing cooldown period");
          // Could trigger alerts, switch to backup service, etc.
        } else if (error instanceof ProxyCheckValidationError) {
          console.log("  📝 Validation error - logging for data quality analysis");
          // Could update validation rules, clean data, etc.
        } else if (error instanceof ProxyCheckNetworkError) {
          console.log("  🌐 Network error - checking connectivity");
          // Could switch endpoints, check internet connection, etc.
        }
      }
    }
    
    getErrorSummary(): void {
      console.log("\n  Error Summary:");
      const errorCounts = new Map<string, number>();
      
      this._errorLog.forEach(entry => {
        const errorType = entry.error.constructor.name;
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      });
      
      errorCounts.forEach((count, type) => {
        console.log(`    ${type}: ${count} occurrences`);
      });
    }
  }
  
  const errorHandler = new ErrorHandler();
  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key"
  });
  
  // Test various scenarios
  const testCases = [
    { address: "8.8.8.8", scenario: "valid" },
    { address: "invalid", scenario: "validation" },
    { address: "", scenario: "empty" },
    { address: "test@test", scenario: "invalid email" }
  ];
  
  for (const test of testCases) {
    try {
      console.log(`  Testing ${test.scenario}: ${test.address || '(empty)'}`);
      await client.check(test.address);
      console.log("    ✅ Success");
    } catch (error) {
      errorHandler.handle(error, { scenario: test.scenario, address: test.address });
    }
  }
  
  errorHandler.getErrorSummary();
}

// Main function to run all examples
async function main() {
  console.log("🛡️ ProxyCheck.io SDK - Comprehensive Error Handling Examples (v0.9.2)\n");
  console.log(`${"=".repeat(60)}\n`);
  
  try {
    await basicErrorHandlingExample();
    await validationErrorExample();
    await rateLimitHandlingExample();
    await networkErrorHandlingExample();
    await batchErrorHandlingExample();
    await errorRecoveryStrategiesExample();
    await customErrorHandlingExample();
    
    console.log("\n✅ All error handling examples completed!");
    console.log("\n💡 Key Takeaways:");
    console.log("  - Always catch and handle ProxyCheckError instances");
    console.log("  - Use instanceof to check for specific error types");
    console.log("  - Implement retry strategies for transient errors");
    console.log("  - Consider caching and circuit breakers for resilience");
    console.log("  - Log errors appropriately for debugging and monitoring");
    
  } catch (error) {
    console.error("\n🚨 Unexpected error in examples:");
    logError(error, "main");
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runErrorHandlingExamples };