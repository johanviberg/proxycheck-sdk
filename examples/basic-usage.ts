/**
 * Basic Usage Examples
 *
 * This example demonstrates the basic functionality of the ProxyCheck.io TypeScript SDK.
 * Now with improved DX - boolean returns and simplified API!
 */

import { ProxyCheck } from "../src";

// Create client instance with the new simplified API
const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
});

async function basicExamples() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Basic Examples (v0.9.2)\n");

  try {
    // Example 1: Check a single IP address - NEW SIMPLIFIED API
    console.log("1. Checking single IP address...");
    const result = await client.check("8.8.8.8");
    console.log("Is proxy?", result.isProxy); // Now returns boolean!
    console.log("Is VPN?", result.isVPN);
    console.log("Risk level:", result.risk.level); // Returns 'low' | 'medium' | 'high' | 'critical'
    console.log("Full result:", JSON.stringify(result, null, 2));
    console.log("");

    // Example 2: Quick proxy check - DIRECT METHOD
    console.log("2. Quick proxy check...");
    const isProxy = await client.isProxy("1.2.3.4");
    console.log(`Is 1.2.3.4 a proxy? ${isProxy}`); // Returns boolean directly
    console.log("");

    // Example 3: VPN detection - DIRECT METHOD
    console.log("3. VPN detection...");
    const isVPN = await client.isVPN("5.6.7.8");
    console.log(`Is 5.6.7.8 a VPN? ${isVPN}`); // Returns boolean directly
    console.log("");

    // Example 4: Email validation - DIRECT METHOD
    console.log("4. Email validation...");
    const isDisposable = await client.isDisposableEmail("test@mailinator.com");
    console.log(`Is test@mailinator.com disposable? ${isDisposable}`); // Returns boolean
    console.log("");

    // Example 5: Risk assessment - NEW METHOD
    console.log("5. Risk assessment...");
    const riskLevel = await client.getRiskLevel("1.1.1.1");
    console.log(`Risk level for 1.1.1.1: ${riskLevel}`); // Returns 'low' | 'medium' | 'high' | 'critical'
    console.log("");

    // Example 6: Check if suspicious (combines multiple checks)
    console.log("6. Suspicious activity check...");
    const isSuspicious = await client.isSuspicious("8.8.8.8");
    console.log(`Is 8.8.8.8 suspicious? ${isSuspicious}`); // High-level check
    console.log("");

    // Example 7: Country check
    console.log("7. Country check...");
    const fromUS = await client.isFromCountry(["8.8.8.8"], "US");
    console.log(`Is 8.8.8.8 from US? ${fromUS}`); // Returns boolean
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("code" in error) {
        console.error("Error code:", error.code);
      }
      if ("suggestion" in error) {
        console.error("Suggestion:", error.suggestion);
      }
    }
  }
}

// Example 8: Client information
async function clientInfo() {
  console.log("\n8. Client information...");
  const status = client.getStatus();
  console.log("SDK Version:", status.version);
  console.log("API Base URL:", status.baseUrl);
  console.log("Configured:", status.configured ? "✅ Yes" : "❌ No");
  console.log("TLS Enabled:", status.tlsEnabled ? "✅ Yes" : "❌ No");
  
  if (status.rateLimitInfo) {
    console.log("\nRate Limit Info:");
    console.log("  Remaining:", status.rateLimitInfo.remaining);
    console.log("  Limit:", status.rateLimitInfo.limit);
    console.log("  Reset:", status.rateLimitInfo.reset);
  }
  console.log("");
}

// Run examples
async function main() {
  await basicExamples();
  await clientInfo();
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runBasicExamples };
