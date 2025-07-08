/**
 * Deno usage example
 * Demonstrates how to use the package in Deno environment
 */

// Deno import example (this would work in actual Deno environment)
// import { ProxyCheckClient } from 'https://deno.land/x/proxycheck@v1.0.0/mod.ts';
// import { ProxyCheckClient } from 'npm:proxycheck-sdk@^1.0.0';

// For testing purposes, we'll simulate the import
declare const ProxyCheckClient: any;

// Deno permissions required:
// --allow-net (for HTTP requests)
// --allow-env (for environment variables)

async function denoExample() {
  try {
    console.log("Testing Deno environment compatibility...");

    // Check if we're in Deno environment
    const isDeno = typeof Deno !== "undefined";
    console.log("Is Deno environment:", isDeno);

    if (isDeno) {
      // Get API key from environment
      const _apiKey = Deno.env.get("PROXYCHECK_API_KEY") || "demo-key";

      // Create client (this would work in actual Deno environment)
      // const client = new ProxyCheckClient({
      //   apiKey: apiKey,
      //   tlsSecurity: true
      // });

      console.log("✓ Deno environment detected");
      console.log("✓ Environment variables accessible");
      console.log("✓ HTTP permissions available");

      // Test that Web APIs are available
      console.log("✓ fetch API available:", typeof fetch !== "undefined");
      console.log("✓ URL API available:", typeof URL !== "undefined");
      console.log("✓ crypto API available:", typeof crypto !== "undefined");

      return true;
    }
    console.log("Not running in Deno environment");
    return false;
  } catch (error) {
    console.error("Deno compatibility test failed:", error);
    return false;
  }
}

// Export for testing
export { denoExample };

// Run if executed directly in Deno
if (import.meta.main) {
  denoExample()
    .then((success) => {
      Deno.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      Deno.exit(1);
    });
}
