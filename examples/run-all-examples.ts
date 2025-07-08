/**
 * Run All Examples
 *
 * This script runs all the example files to demonstrate the complete
 * functionality of the ProxyCheck.io TypeScript SDK.
 */

import { runAdvancedConfigurationExamples } from "./advanced-configuration";
import { runBasicExamples } from "./basic-usage";
import { runBatchExamples } from "./batch-processing";
import { runCountryFilteringExamples } from "./country-filtering";
import { runEnterpriseSecurityExamples } from "./enterprise-security";
import { runErrorHandlingExamples } from "./error-handling";
import { runListManagementExamples } from "./list-management";
import { runRealtimeMonitoringExamples } from "./realtime-monitoring";
import { runRulesManagementExamples } from "./rules-management";
import { runStatisticsMonitoringExamples } from "./statistics-monitoring";

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Complete Examples Suite\n");
  console.log("=========================================================\n");

  // Check if API key is configured
  if (!process.env.PROXYCHECK_API_KEY) {
    console.log("⚠️  Warning: PROXYCHECK_API_KEY environment variable not set.");
    console.log("   Some examples may fail or use placeholder data.\n");
    console.log("   To set your API key:");
    console.log('     export PROXYCHECK_API_KEY="your-api-key-here"\n');
  } else {
    console.log("✅ API key configured\n");
  }

  const examples = [
    {
      name: "Basic Usage Examples",
      runner: runBasicExamples,
      description: "Fundamental SDK operations and simple checks",
    },
    {
      name: "Batch Processing Examples",
      runner: runBatchExamples,
      description: "Efficient processing of multiple addresses",
    },
    {
      name: "Country Filtering Examples",
      runner: runCountryFilteringExamples,
      description: "Geographic filtering and geolocation analysis",
    },
    {
      name: "Error Handling Examples",
      runner: runErrorHandlingExamples,
      description: "Comprehensive error handling strategies",
    },
    {
      name: "List Management Examples",
      runner: runListManagementExamples,
      description: "Whitelist and blacklist management",
    },
    {
      name: "Advanced Configuration Examples",
      runner: runAdvancedConfigurationExamples,
      description: "Enterprise configurations and client customization",
    },
    {
      name: "Rules Management Examples",
      runner: runRulesManagementExamples,
      description: "Custom security rules and threat detection policies",
    },
    {
      name: "Statistics Monitoring Examples",
      runner: runStatisticsMonitoringExamples,
      description: "API usage analytics and performance monitoring",
    },
    {
      name: "Real-time Monitoring Examples",
      runner: runRealtimeMonitoringExamples,
      description: "Event-driven monitoring and live threat detection",
    },
    {
      name: "Enterprise Security Examples",
      runner: runEnterpriseSecurityExamples,
      description: "Enterprise-grade security and compliance features",
    },
  ];

  let successCount = 0;
  let failureCount = 0;
  const results: Array<{ name: string; status: "success" | "failed"; error?: string }> = [];

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📖 Running: ${example.name}`);
    console.log(`📝 Description: ${example.description}`);
    console.log(`📊 Progress: ${i + 1}/${examples.length}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const startTime = Date.now();
      await example.runner();
      const endTime = Date.now();

      console.log(`\n✅ ${example.name} completed successfully in ${endTime - startTime}ms`);
      results.push({ name: example.name, status: "success" });
      successCount++;
    } catch (error) {
      console.error(`\n❌ ${example.name} failed:`, error.message);
      results.push({ name: example.name, status: "failed", error: error.message });
      failureCount++;
    }

    // Add a pause between examples to be respectful of rate limits
    if (i < examples.length - 1) {
      console.log("\n⏳ Pausing 2 seconds between examples...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 FINAL RESULTS SUMMARY");
  console.log("=".repeat(60));

  console.log("\n🎯 Overall Statistics:");
  console.log(`   Total Examples: ${examples.length}`);
  console.log(`   Successful: ${successCount} ✅`);
  console.log(`   Failed: ${failureCount} ❌`);
  console.log(`   Success Rate: ${Math.round((successCount / examples.length) * 100)}%`);

  console.log("\n📋 Detailed Results:");
  results.forEach((result) => {
    const status = result.status === "success" ? "✅" : "❌";
    console.log(`   ${status} ${result.name}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  if (failureCount === 0) {
    console.log("\n🎉 All examples completed successfully!");
    console.log("🚀 The ProxyCheck.io TypeScript SDK is ready for production use!");
  } else {
    console.log("\n⚠️  Some examples failed. This might be due to:");
    console.log("   • Missing or invalid API key");
    console.log("   • Network connectivity issues");
    console.log("   • Rate limiting");
    console.log("   • API service issues");
    console.log("\n💡 Check the individual error messages above for details.");
  }

  console.log("\n📚 For more information:");
  console.log("   • API Documentation: https://proxycheck.io/api");
  console.log("   • GitHub: https://github.com/johanviberg/proxycheck-sdk");
  console.log("   • ProxyCheck.io: https://proxycheck.io");

  process.exit(failureCount === 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error running examples:", error);
    process.exit(1);
  });
}

export { main as runAllExamples };
