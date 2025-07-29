/**
 * Advanced Configuration Examples
 *
 * This example demonstrates advanced configuration options and client customization
 * for enterprise use cases and fine-tuned security requirements using the new API.
 */

import { type ClientConfig, ProxyCheck } from "../src";

async function advancedConfigurationExamples() {
  console.log("🔧 ProxyCheck.io TypeScript SDK - Advanced Configuration Examples (v0.9.2)\n");

  // Example 1: Maximum Security Configuration
  console.log("1. Maximum Security Configuration...");
  const maxSecurityClient = new ProxyCheck({
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
    // Use semantic options for maximum security
    const result = await maxSecurityClient.check("8.8.8.8", {
      detection: {
        mode: "comprehensive"
      },
      enrich: {
        risk: "detailed",
        location: true,
        network: true,
        lastSeen: true,
        port: true
      },
      timeRange: 30  // Look back 30 days
    });
    console.log("Max security result:");
    console.log("  Is Proxy:", result.isProxy);
    console.log("  Is VPN:", result.isVPN);
    console.log("  Risk Level:", result.risk.level);
    console.log("  Risk Score:", result.risk.score + "%");
    if (result.risk.attacks) {
      console.log("  Attack History Total:", result.risk.attacks.total);
    }
    console.log("");

    // Example 2: Performance Optimized Configuration
    console.log("2. Performance Optimized Configuration...");
    const performanceClient = new ProxyCheck({
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

    // Use minimal options for best performance
    const perfResult = await performanceClient.check("1.1.1.1", {
      detection: {
        mode: "proxy"  // Only check proxies, skip VPN
      },
      enrich: {
        risk: false,    // Skip risk calculation
        location: false,
        network: false
      },
      timeRange: 1      // Minimal lookback
    });
    console.log("Performance result:");
    console.log("  Is Proxy:", perfResult.isProxy);
    console.log("  Response time: Fast due to minimal options");
    console.log("");

    // Example 3: Enterprise Compliance Configuration
    console.log("3. Enterprise Compliance Configuration...");
    const enterpriseClient = new ProxyCheck({
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

    // Check email with privacy masking
    const enterpriseResult = await enterpriseClient.check("test@example.com", {
      privacy: {
        maskEmails: true  // Mask email addresses for compliance
      },
      tagging: {
        enabled: true,
        tag: "enterprise-audit"
      }
    });
    console.log("Enterprise compliance result:");
    console.log("- Is Disposable Email:", enterpriseResult.isDisposableEmail || false);
    console.log("- Risk Level:", enterpriseResult.risk.level);
    console.log("- Address (masked):", enterpriseResult.address);
    console.log("");

    // Example 4: Multi-Region Configuration
    console.log("4. Multi-Region Configuration with Fallback...");

    const createRegionalClient = (region: "us" | "eu" | "asia") => {
      return new ProxyCheck({
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
        const _result = await client.check("8.8.8.8");
        console.log(`  ✅ ${region.toUpperCase()} region successful`);
        break;
      } catch (error) {
        console.log(`  ❌ ${region.toUpperCase()} region failed: ${(error as Error).message}`);
      }
    }
    console.log("");

    // Example 5: Custom Headers and Advanced Options
    console.log("5. Custom Headers and Advanced Options...");
    const customClient = new ProxyCheck({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",

      tlsSecurity: true,
      userAgent: "CustomApp/1.0",

      logging: {
        level: "debug",
        format: "json",
      },
    });

    const customResult = await customClient.check("1.2.3.4", {
      detection: {
        mode: "both"
      },
      enrich: {
        risk: "basic",
        network: true
      },
      tagging: {
        enabled: true,
        tag: "custom-app"
      }
    });
    console.log("Custom headers result:");
    console.log("  Is Proxy:", customResult.isProxy);
    console.log("  Detection Type:", customResult.detection.type || "None");
    console.log("");

    // Example 6: Configuration Validation
    console.log("6. Configuration Validation...");

    const validateConfiguration = (config: Partial<ClientConfig>) => {
      const client = new ProxyCheck(config);
      const status = client.getStatus();

      console.log("Configuration Status:");
      console.log(`  - Configured: ${status.configured ? "✅" : "❌"}`);
      console.log(`  - API Key Set: ${config.apiKey ? "✅" : "❌"}`);
      console.log(`  - TLS Security: ${config.tlsSecurity !== false ? "✅" : "❌"}`);
      console.log(`  - Timeout: ${config.timeout || "default"}ms`);
      console.log(`  - Retries: ${config.retries || "default"}`);
      console.log(`  - User Agent: ${config.userAgent || "default"}`);
      console.log(`  - Base URL: ${status.baseUrl}`);
      console.log(`  - SDK Version: ${status.version}`);

      return status.configured;
    };

    const testConfigs = [
      { apiKey: "test-key", tlsSecurity: true },
      { apiKey: "", tlsSecurity: false },
      { apiKey: process.env.PROXYCHECK_API_KEY, timeout: 15000, retries: 5 },
    ];

    testConfigs.forEach((config, index) => {
      console.log(`\n  Config ${index + 1}:`);
      validateConfiguration(config);
    });
  } catch (error) {
    console.error("Error in advanced configuration:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("code" in error) {
        console.error("Error code:", error.code);
      }
    }
  }
}

// Example 7: Dynamic Configuration Updates
async function dynamicConfigurationExample() {
  console.log("\n7. Dynamic Configuration Updates...");

  // Simulate configuration changes based on threat level
  const threatLevels = ["low", "medium", "high"] as const;

  for (const threatLevel of threatLevels) {
    console.log(`\n  Threat Level: ${threatLevel.toUpperCase()}`);

    // Create new client with threat-appropriate configuration
    const adaptiveClient = new ProxyCheck({
      apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
      // Adjust client-level settings based on threat
      timeout: threatLevel === "high" ? 15000 : 10000,
      retries: threatLevel === "high" ? 3 : 2,
      logging: {
        level: threatLevel === "high" ? "debug" : threatLevel === "medium" ? "info" : "warn"
      }
    });

    try {
      // Use semantic options based on threat level
      const semanticOptions = threatLevel === "high" ? {
        detection: { mode: "comprehensive" as const },
        enrich: {
          risk: "detailed" as const,
          location: true,
          network: true,
          lastSeen: true,
          port: true
        },
        timeRange: 30,
        tagging: {
          enabled: true,
          tag: `threat-level-${threatLevel}`
        }
      } : threatLevel === "medium" ? {
        detection: { mode: "both" as const },
        enrich: {
          risk: "basic" as const,
          location: true,
          network: true
        },
        timeRange: 7,
        tagging: {
          enabled: true,
          tag: `threat-level-${threatLevel}`
        }
      } : {
        detection: { mode: "proxy" as const },
        enrich: {
          risk: false
        },
        timeRange: 1
      };

      const result = await adaptiveClient.check("8.8.8.8", semanticOptions);

      console.log(
        `    - Detection Level: ${threatLevel === "high" ? "Maximum" : threatLevel === "medium" ? "Enhanced" : "Standard"}`,
      );
      console.log(`    - Risk Score: ${result.risk.score || 0}%`);
      console.log(`    - Risk Level: ${result.risk.level || "unknown"}`);
      console.log(`    - Is Proxy: ${result.isProxy}`);
      console.log(`    - Is VPN: ${result.isVPN}`);
    } catch (error) {
      console.log(`    - Error: ${(error as Error).message}`);
    }
  }
}

// Example 8: Configuration Factory Methods
async function configurationFactoryExample() {
  console.log("\n8. Configuration Factory Methods...");

  // Security-focused configuration
  console.log("\n  Security-Focused Client:");
  const securityClient = ProxyCheck.withSecurityFocus({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here"
  });

  const securityResult = await securityClient.check("1.2.3.4");
  console.log("    - Automatic comprehensive detection");
  console.log("    - Risk Level:", securityResult.risk.level);
  if (securityResult.risk.attacks) {
    console.log("    - Attack History Included: Yes");
  }

  // Performance-focused configuration
  console.log("\n  Performance-Focused Client:");
  const performanceClient = ProxyCheck.withPerformanceFocus({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here"
  });

  const start = Date.now();
  const perfResult = await performanceClient.check("8.8.8.8");
  const elapsed = Date.now() - start;
  console.log("    - Minimal detection only");
  console.log(`    - Response time: ${elapsed}ms`);
  console.log("    - Is Proxy:", perfResult.isProxy);

  // From API key only
  console.log("\n  Simple API Key Client:");
  const simpleClient = ProxyCheck.fromApiKey(
    process.env.PROXYCHECK_API_KEY || "your-api-key-here"
  );
  console.log("    - Default configuration with just API key");
  const simpleStatus = simpleClient.getStatus();
  console.log("    - Configured:", simpleStatus.configured);
}

// Example 9: Preset Configuration Options
async function presetConfigurationExample() {
  console.log("\n9. Preset Configuration Options...");

  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here"
  });

  // Use preset options from the library
  const presets = [
    {
      name: "DEFAULT_CHECK_OPTIONS",
      options: {} // Will use defaults
    },
    {
      name: "SECURITY_FOCUSED_OPTIONS",
      options: {
        detection: { mode: "comprehensive" as const },
        enrich: {
          risk: "detailed" as const,
          location: true,
          network: true,
          lastSeen: true,
          port: true
        },
        timeRange: 30
      }
    },
    {
      name: "PERFORMANCE_FOCUSED_OPTIONS",
      options: {
        detection: { mode: "proxy" as const },
        enrich: {
          risk: false as const,
          location: false,
          network: false
        },
        timeRange: 1
      }
    }
  ];

  for (const preset of presets) {
    console.log(`\n  Using ${preset.name}:`);
    try {
      const result = await client.check("1.1.1.1", preset.options);
      console.log("    - Is Proxy:", result.isProxy);
      console.log("    - Has location:", !!result.location);
      console.log("    - Has risk details:", !!result.risk.attacks);
    } catch (error) {
      console.log("    - Error:", (error as Error).message);
    }
  }
}

// Run examples
async function main() {
  await advancedConfigurationExamples();
  await dynamicConfigurationExample();
  await configurationFactoryExample();
  await presetConfigurationExample();

  console.log("\n🎯 Advanced Configuration Examples Complete!");
  console.log(
    "💡 Tip: Choose configuration based on your security requirements and performance needs.",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runAdvancedConfigurationExamples };
