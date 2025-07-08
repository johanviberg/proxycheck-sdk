/**
 * Logging Example
 *
 * This example demonstrates how to use the ProxyCheck SDK with various logging configurations.
 */

import { ProxyCheckClient } from "../src";

// Example 1: Basic logging with default settings
async function basicLogging() {
  console.log("📝 Example 1: Basic Logging\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "info",
    },
  });

  try {
    const result = await client.check.checkAddress("8.8.8.8");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 2: Debug logging with pretty format
async function debugLogging() {
  console.log("\n🔍 Example 2: Debug Logging\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "debug",
      format: "pretty",
      colors: true,
      timestamp: true,
    },
  });

  try {
    // This will show detailed debug information
    const result = await client.check.checkAddresses(["8.8.8.8", "1.1.1.1"]);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 3: JSON logging for production
async function jsonLogging() {
  console.log("\n📊 Example 3: JSON Logging\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "info",
      format: "json",
      timestamp: true,
    },
  });

  try {
    const result = await client.check.isProxy("8.8.8.8");
    console.log("Is proxy:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 4: Custom log output handler
async function customLogging() {
  console.log("\n🔧 Example 4: Custom Log Handler\n");

  const logs: Array<any> = [];

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "debug",
      output: (entry) => {
        // Store logs in array instead of console
        logs.push(entry);

        // Also output to console with custom formatting
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        console.log(`[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`);

        if (entry.context && Object.keys(entry.context).length > 0) {
          console.log("  Context:", entry.context);
        }

        if (entry.error) {
          console.log("  Error:", entry.error.message);
        }
      },
    },
  });

  try {
    await client.check.getDetailedInfo("8.8.8.8");

    console.log("\n📋 Captured Logs:");
    console.log(`Total log entries: ${logs.length}`);
    console.log("Log levels:", [...new Set(logs.map((l) => l.level))]);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 5: Silent logging (no output)
async function silentLogging() {
  console.log("\n🔇 Example 5: Silent Logging\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "silent",
    },
  });

  try {
    const result = await client.check.isVPN("8.8.8.8");
    console.log("Is VPN:", result);
    console.log("(No logging output should appear above this line)");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 6: Warning and error only
async function warningErrorLogging() {
  console.log("\n⚠️ Example 6: Warning/Error Only Logging\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "warn",
      format: "pretty",
      colors: true,
    },
  });

  try {
    // This should only show warnings and errors, not info/debug
    await client.check.checkAddress("8.8.8.8");

    // Force an error to see error logging
    await client.check.checkAddress("invalid-address");
  } catch (_error) {
    console.log("Caught expected error (this is normal for the demo)");
  }
}

// Run all examples
async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Logging Examples\n");

  await basicLogging();
  await debugLogging();
  await jsonLogging();
  await customLogging();
  await silentLogging();
  await warningErrorLogging();

  console.log("\n✅ All logging examples completed!");
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runLoggingExamples };
