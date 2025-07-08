/**
 * Advanced Configuration Examples
 *
 * This example demonstrates advanced configuration options and client customization
 * for enterprise use cases and fine-tuned security requirements.
 */

import { type ClientConfig, ProxyCheckClient } from "../src";

async function advancedConfigurationExamples() {
  console.log("🔧 ProxyCheck.io TypeScript SDK - Advanced Configuration Examples\n");

  // Example 1: Maximum Security Configuration
  console.log("1. Maximum Security Configuration...");
  const maxSecurityClient = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    tlsSecurity: true,

    // Custom timeout and retry settings
    timeout: 10000,
    retries: 3,

    // Custom logging
    logging: {
      level: "debug",
      format: "pretty",
      timestamp: true,
      colors: true,
    },
  });

  try {
    const result = await maxSecurityClient.check.checkAddress("8.8.8.8");
    console.log("Max security result keys:", Object.keys(result["8.8.8.8"] || {}));
    console.log("");

    // Example 2: Performance Optimized Configuration
    console.log("2. Performance Optimized Configuration...");
    const performanceClient = new ProxyCheckClient({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
      tlsSecurity: true,

      // Optimized for speed
      timeout: 5000,
      retries: 1,

      // Minimal logging
      logging: {
        level: "error",
        format: "json",
      },
    });

    const perfResult = await performanceClient.check.checkAddress("1.1.1.1");
    console.log("Performance result:", JSON.stringify(perfResult, null, 2));
    console.log("");

    // Example 3: Enterprise Compliance Configuration
    console.log("3. Enterprise Compliance Configuration...");
    const enterpriseClient = new ProxyCheckClient({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
      tlsSecurity: true,

      // Custom user agent for enterprise identification
      userAgent: "MyCompany-Security-Scanner/1.0",

      // Audit logging
      logging: {
        level: "info",
        format: "pretty",
        timestamp: true,
      },
    });

    const enterpriseResult = await enterpriseClient.check.checkAddress("test@example.com");
    console.log("Enterprise compliance result:");
    console.log("- Status:", enterpriseResult.status);
    console.log(
      "- Masked keys:",
      Object.keys(enterpriseResult).filter((k) => k !== "status"),
    );
    console.log("");

    // Example 4: Multi-Region Configuration
    console.log("4. Multi-Region Configuration with Fallback...");

    const createRegionalClient = (region: "us" | "eu" | "asia") => {
      return new ProxyCheckClient({
        apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",

        // Regional customization
        timeout: region === "asia" ? 15000 : 10000, // Higher timeout for Asia
        tlsSecurity: true,

        logging: {
          level: "warn",
        },
      });
    };

    const regions = ["us", "eu", "asia"] as const;
    const clients = regions.map((region) => ({
      region,
      client: createRegionalClient(region),
    }));

    // Test with primary region, fallback to others
    for (const { region, client } of clients) {
      try {
        console.log(`  Testing ${region.toUpperCase()} region...`);
        const _result = await client.check.checkAddress("8.8.8.8");
        console.log(`  ✅ ${region.toUpperCase()} region successful`);
        break;
      } catch (error) {
        console.log(`  ❌ ${region.toUpperCase()} region failed: ${error.message}`);
      }
    }
    console.log("");

    // Example 5: Custom Headers and Advanced Options
    console.log("5. Custom Headers and Advanced Options...");
    const customClient = new ProxyCheckClient({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",

      tlsSecurity: true,
      userAgent: "CustomApp/1.0",

      logging: {
        level: "debug",
        format: "json",
      },
    });

    const customResult = await customClient.check.checkAddress("1.2.3.4");
    console.log("Custom headers result status:", customResult.status);
    console.log("");

    // Example 6: Configuration Validation
    console.log("6. Configuration Validation...");

    const validateConfiguration = (config: Partial<ClientConfig>) => {
      const client = new ProxyCheckClient(config);
      const _info = client.getClientInfo();

      console.log("Configuration Status:");
      console.log(`  - Configured: ${client.isConfigured() ? "✅" : "❌"}`);
      console.log(`  - API Key Set: ${config.apiKey ? "✅" : "❌"}`);
      console.log(`  - TLS Security: ${config.tlsSecurity ? "✅" : "❌"}`);
      console.log(`  - Timeout: ${config.timeout || "default"}ms`);
      console.log(`  - Retries: ${config.retries || "default"}`);
      console.log(`  - User Agent: ${config.userAgent || "default"}`);

      return client.isConfigured();
    };

    const testConfigs = [
      { apiKey: "test-key", tlsSecurity: true },
      { apiKey: "", tlsSecurity: false },
      { apiKey: process.env.PROXYCHECK_API_KEY, vpnDetection: 3, riskData: 2 },
    ];

    testConfigs.forEach((config, index) => {
      console.log(`\n  Config ${index + 1}:`);
      validateConfiguration(config);
    });
  } catch (error) {
    console.error("Error in advanced configuration:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

// Example 7: Dynamic Configuration Updates
async function dynamicConfigurationExample() {
  console.log("\n7. Dynamic Configuration Updates...");

  const _client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    vpnDetection: 1,
    logLevel: "info",
  });

  // Simulate configuration changes based on threat level
  const threatLevels = ["low", "medium", "high"] as const;

  for (const threatLevel of threatLevels) {
    console.log(`\n  Threat Level: ${threatLevel.toUpperCase()}`);

    // Create new client with threat-appropriate configuration
    const adaptiveClient = new ProxyCheckClient({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
      vpnDetection: threatLevel === "high" ? 3 : threatLevel === "medium" ? 2 : 1,
      riskData: threatLevel === "high" ? 2 : threatLevel === "medium" ? 1 : 0,
      asnData: threatLevel !== "low",
      customTag: `threat-level-${threatLevel}`,
      logLevel: threatLevel === "high" ? "debug" : "warn",
    });

    try {
      const result = await adaptiveClient.check.checkAddress("8.8.8.8");
      const ipData = result["8.8.8.8"];

      console.log(
        `    - Detection Level: ${threatLevel === "high" ? "Maximum" : threatLevel === "medium" ? "Enhanced" : "Standard"}`,
      );
      console.log(`    - Response Fields: ${Object.keys(ipData || {}).length}`);
      console.log(`    - Status: ${result.status}`);
    } catch (error) {
      console.log(`    - Error: ${error.message}`);
    }
  }
}

// Run examples
async function main() {
  await advancedConfigurationExamples();
  await dynamicConfigurationExample();

  console.log("\n🎯 Advanced Configuration Examples Complete!");
  console.log(
    "💡 Tip: Choose configuration based on your security requirements and performance needs.",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runAdvancedConfigurationExamples };
