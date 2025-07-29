/**
 * Statistics and Monitoring Examples
 *
 * This example demonstrates how to use the ProxyCheck.io SDK for monitoring,
 * analytics, and statistical analysis of your API usage and threat detection.
 */

import { ProxyCheck } from "../src";

async function statisticsMonitoringExamples() {
  console.log("📊 ProxyCheck.io TypeScript SDK - Statistics and Monitoring Examples (v0.9.2)\n");

  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "info",
      format: "pretty",
    },
  });

  try {
    // Example 1: Basic Usage Statistics from Dashboard
    console.log("1. Retrieving Basic Usage Statistics from Dashboard...");
    try {
      const usageStats = await client.dashboard.getUsage();
      console.log("Current Usage Statistics:");
      console.log(`  Burst Tokens Available: ${usageStats.burstTokensAvailable}`);
      console.log(`  Burst Token Allowance: ${usageStats.burstTokenAllowance}`);
      console.log(`  Queries Today: ${usageStats.queriesToday.toLocaleString()}`);
      console.log(`  Daily Limit: ${usageStats.dailyLimit.toLocaleString()}`);
      console.log(`  Total Queries: ${usageStats.queriesTotal.toLocaleString()}`);
      console.log(`  Plan Tier: ${usageStats.planTier}`);
      
      const usagePercent = ((usageStats.queriesToday / usageStats.dailyLimit) * 100).toFixed(1);
      console.log(`  Daily Usage: ${usagePercent}%`);
    } catch (_error) {
      console.log("Note: Dashboard API requires valid API key. Simulating data...");

      // Simulated usage data
      const simulatedUsage = {
        burstTokensAvailable: 45,
        burstTokenAllowance: 100,
        queriesToday: 3850,
        dailyLimit: 10000,
        queriesTotal: 145280,
        planTier: "Professional" as const
      };

      console.log("Simulated Usage Statistics:");
      console.log(`  Burst Tokens Available: ${simulatedUsage.burstTokensAvailable}`);
      console.log(`  Queries Today: ${simulatedUsage.queriesToday.toLocaleString()}`);
      console.log(`  Daily Limit: ${simulatedUsage.dailyLimit.toLocaleString()}`);
      console.log(`  Plan Tier: ${simulatedUsage.planTier}`);
    }
    console.log("");

    // Example 2: Detection Analytics from Dashboard
    console.log("2. Analyzing Detection Patterns from Recent Activity...");
    
    try {
      // Get recent detections from dashboard
      const detections = await client.dashboard.getDetections({ limit: 100 });
      
      // Analyze detection patterns
      const detectionTypes = new Map<string, number>();
      const countries = new Map<string, number>();
      
      detections.forEach(detection => {
        // Count detection types
        const type = detection.detectionType || 'unknown';
        detectionTypes.set(type, (detectionTypes.get(type) || 0) + 1);
        
        // Extract country from address data if available
        // This is simplified - in real usage you'd check the full result
      });
      
      console.log("Recent Detection Patterns:");
      console.log(`  Total Recent Detections: ${detections.length}`);
      console.log("  Detection Types:");
      detectionTypes.forEach((count, type) => {
        console.log(`    ${type}: ${count}`);
      });
    } catch (_error) {
      // Simulated analytics for demo
      const detectionAnalytics = {
        totalChecks: 5000,
        totalDetections: 187,
        detectionRate: 3.74,
        breakdown: {
          vpn: 89,
          proxy: 45,
          tor: 23,
          hosting: 30,
        },
        geographicDistribution: {
          US: 45,
          CN: 32,
          RU: 28,
          BR: 15,
          IN: 12,
          others: 55,
        },
        riskScoreDistribution: {
          "low (0-30)": 2834,
          "medium (31-70)": 1979,
          "high (71-100)": 187,
        },
      };

      console.log("\nDetection Analytics (Simulated):");
      console.log(`  Total Checks: ${detectionAnalytics.totalChecks.toLocaleString()}`);
      console.log(`  Total Detections: ${detectionAnalytics.totalDetections}`);
      console.log(`  Detection Rate: ${detectionAnalytics.detectionRate}%`);

      console.log("\n  Detection Breakdown:");
      Object.entries(detectionAnalytics.breakdown).forEach(([type, count]) => {
        const percentage = ((count / detectionAnalytics.totalDetections) * 100).toFixed(1);
        console.log(`    ${type.toUpperCase()}: ${count} (${percentage}%)`);
      });

      console.log("\n  Geographic Distribution:");
      Object.entries(detectionAnalytics.geographicDistribution).forEach(([country, count]) => {
        const percentage = ((count / detectionAnalytics.totalDetections) * 100).toFixed(1);
        console.log(`    ${country}: ${count} (${percentage}%)`);
      });
    }
    console.log("");

    // Example 3: Real-time Rate Limiting Monitoring
    console.log("3. Real-time Rate Limiting Monitoring...");

    // Make a test request to get rate limit info
    await client.check("8.8.8.8");
    const rateLimitInfo = client.getRateLimitInfo();

    if (rateLimitInfo) {
      console.log("Current Rate Limit Status:");
      console.log(`  Limit: ${rateLimitInfo.limit} requests`);
      console.log(`  Remaining: ${rateLimitInfo.remaining} requests`);
      console.log(`  Reset Time: ${new Date(Number(rateLimitInfo.reset) * 1000).toISOString()}`);

      const usagePercent = (
        ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) *
        100
      ).toFixed(1);
      console.log(`  Usage: ${usagePercent}%`);

      // Rate limit alerts
      if (rateLimitInfo.remaining < rateLimitInfo.limit * 0.1) {
        console.log("  🔴 Alert: Rate limit critical (< 10% remaining)");
      } else if (rateLimitInfo.remaining < rateLimitInfo.limit * 0.25) {
        console.log("  🟡 Warning: Rate limit high (< 25% remaining)");
      } else {
        console.log("  🟢 Status: Rate limit healthy");
      }
    } else {
      console.log("Rate limit information not available");
    }
    console.log("");

    // Example 4: Performance Monitoring
    console.log("4. API Performance Monitoring...");

    const performanceTests = [
      { ip: "8.8.8.8", description: "Clean IP (Fast)" },
      { ip: "1.1.1.1", description: "Clean IP (Fast)" },
      { ip: "171.245.231.241", description: "Proxy IP (Detailed)" },
    ];

    const performanceResults = [];

    for (const test of performanceTests) {
      const startTime = Date.now();

      try {
        const result = await client.check(test.ip, {
          detection: {
            mode: "comprehensive"
          },
          enrich: {
            risk: "basic",
            network: true
          }
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        performanceResults.push({
          ...test,
          responseTime,
          status: "ok",
          success: true,
        });

        console.log(`  ${test.description}: ${responseTime}ms (success)`);
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        performanceResults.push({
          ...test,
          responseTime,
          status: "error",
          success: false,
          error: (error as Error).message,
        });

        console.log(`  ${test.description}: ${responseTime}ms (error: ${(error as Error).message})`);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Performance summary
    const avgResponseTime =
      performanceResults.reduce((sum, result) => sum + result.responseTime, 0) /
      performanceResults.length;
    const successRate =
      (performanceResults.filter((r) => r.success).length / performanceResults.length) * 100;

    console.log("\n  Performance Summary:");
    console.log(`    Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`    Success Rate: ${successRate.toFixed(1)}%`);
    console.log("");

    // Example 5: Cost Monitoring
    console.log("5. API Cost Monitoring...");

    const costAnalysis = {
      plan: "Professional",
      monthlyLimit: 10000,
      currentUsage: 3750,
      costPerRequest: 0.001,
      estimatedMonthlyCost: 3.75,
      projectedUsage: 8500,
      projectedCost: 8.5,
    };

    console.log("Cost Analysis:");
    console.log(`  Plan: ${costAnalysis.plan}`);
    console.log(`  Monthly Limit: ${costAnalysis.monthlyLimit.toLocaleString()} requests`);
    console.log(`  Current Usage: ${costAnalysis.currentUsage.toLocaleString()} requests`);
    console.log(
      `  Usage Percentage: ${((costAnalysis.currentUsage / costAnalysis.monthlyLimit) * 100).toFixed(1)}%`,
    );
    console.log(`  Cost per Request: $${costAnalysis.costPerRequest}`);
    console.log(`  Current Month Cost: $${costAnalysis.estimatedMonthlyCost.toFixed(2)}`);
    console.log(`  Projected Monthly Cost: $${costAnalysis.projectedCost.toFixed(2)}`);

    if (costAnalysis.projectedUsage > costAnalysis.monthlyLimit) {
      console.log("  🔴 Warning: Projected usage exceeds monthly limit");
    } else if (costAnalysis.projectedUsage > costAnalysis.monthlyLimit * 0.8) {
      console.log("  🟡 Alert: Projected usage approaching limit");
    } else {
      console.log("  🟢 Status: Usage within expected range");
    }
    console.log("");

    // Example 6: Security Metrics Dashboard
    console.log("6. Security Metrics Dashboard...");

    // Get recent query data for analysis
    let queryHistory;
    try {
      queryHistory = await client.dashboard.getQueries({ days: 7 });
    } catch (_error) {
      // Simulated data for demo
      queryHistory = null;
    }

    const securityMetrics = {
      totalRequests: 5000,
      blockedRequests: 187,
      blockedPercentage: 3.74,
      threatTypes: {
        highRiskCountry: 45,
        knownProxy: 67,
        vpnDetected: 42,
        torNode: 23,
        disposableEmail: 10,
      },
      falsePositives: 5,
      falsePositiveRate: 2.67,
      topBlockedCountries: [
        { country: "CN", name: "China", blocks: 32 },
        { country: "RU", name: "Russia", blocks: 28 },
        { country: "BR", name: "Brazil", blocks: 15 },
      ],
    };

    console.log("Security Dashboard:");
    console.log(`  Total Requests: ${securityMetrics.totalRequests.toLocaleString()}`);
    console.log(`  Blocked Requests: ${securityMetrics.blockedRequests}`);
    console.log(`  Block Rate: ${securityMetrics.blockedPercentage}%`);
    console.log(`  False Positive Rate: ${securityMetrics.falsePositiveRate}%`);

    console.log("\n  Threat Type Distribution:");
    Object.entries(securityMetrics.threatTypes).forEach(([type, count]) => {
      const percentage = ((count / securityMetrics.blockedRequests) * 100).toFixed(1);
      const formattedType = type.replace(/([A-Z])/g, " $1").trim();
      console.log(`    ${formattedType.toUpperCase()}: ${count} (${percentage}%)`);
    });

    console.log("\n  Top Blocked Countries:");
    securityMetrics.topBlockedCountries.forEach((country, index) => {
      console.log(
        `    ${index + 1}. ${country.name} (${country.country}): ${country.blocks} blocks`,
      );
    });
    console.log("");

    // Example 7: Alerting System with Dashboard Integration
    console.log("7. Automated Alerting System...");

    const alertThresholds = {
      highDetectionRate: 10, // Alert if detection rate > 10%
      lowApiCalls: 100, // Alert if daily calls < 100
      highErrorRate: 5, // Alert if error rate > 5%
      rateLimitCritical: 10, // Alert if remaining requests < 10%
    };

    const currentMetrics = {
      detectionRate: 12.5,
      dailyCalls: 850,
      errorRate: 2.1,
      remainingRequests: 5,
    };

    console.log("Alert Status:");

    // Check detection rate
    if (currentMetrics.detectionRate > alertThresholds.highDetectionRate) {
      console.log(
        `  🔴 HIGH DETECTION RATE: ${currentMetrics.detectionRate}% (threshold: ${alertThresholds.highDetectionRate}%)`,
      );
    } else {
      console.log(`  🟢 Detection rate normal: ${currentMetrics.detectionRate}%`);
    }

    // Check API call volume
    if (currentMetrics.dailyCalls < alertThresholds.lowApiCalls) {
      console.log(
        `  🟡 LOW API USAGE: ${currentMetrics.dailyCalls} calls (threshold: ${alertThresholds.lowApiCalls})`,
      );
    } else {
      console.log(`  🟢 API usage healthy: ${currentMetrics.dailyCalls} calls`);
    }

    // Check error rate
    if (currentMetrics.errorRate > alertThresholds.highErrorRate) {
      console.log(
        `  🔴 HIGH ERROR RATE: ${currentMetrics.errorRate}% (threshold: ${alertThresholds.highErrorRate}%)`,
      );
    } else {
      console.log(`  🟢 Error rate acceptable: ${currentMetrics.errorRate}%`);
    }

    // Check rate limits
    if (currentMetrics.remainingRequests < alertThresholds.rateLimitCritical) {
      console.log(
        `  🔴 RATE LIMIT CRITICAL: ${currentMetrics.remainingRequests} requests remaining`,
      );
    } else {
      console.log(
        `  🟢 Rate limits healthy: ${currentMetrics.remainingRequests} requests remaining`,
      );
    }
  } catch (error) {
    console.error("Error in statistics monitoring:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("code" in error) {
        console.error("Error code:", error.code);
      }
    }
  }
}

// Example 8: Historical Trend Analysis with Tags
async function historicalTrendAnalysis() {
  console.log("\n8. Historical Trend Analysis with Tag Analytics...");

  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
  });

  // Try to get tag statistics from dashboard
  try {
    const tagStats = await client.dashboard.getTags({ days: 30 });
    console.log("  Tag Statistics (Last 30 days):");
    Object.entries(tagStats).forEach(([tag, stats]) => {
      console.log(`    ${tag}:`);
      console.log(`      Total Queries: ${stats.queries.toLocaleString()}`);
      console.log(`      VPN Detections: ${stats.detections.vpn}`);
      console.log(`      Proxy Detections: ${stats.detections.proxy}`);
      console.log(`      Detection Rate: ${((stats.detections.total / stats.queries) * 100).toFixed(2)}%`);
    });
  } catch (_error) {
    console.log("  Note: Tag statistics require API access. Using historical data...");
  }

  const historicalData = [
    { month: "2024-01", requests: 15420, detections: 578, avgResponse: 145 },
    { month: "2024-02", requests: 18350, detections: 692, avgResponse: 132 },
    { month: "2024-03", requests: 22100, detections: 845, avgResponse: 128 },
    { month: "2024-04", requests: 19800, detections: 756, avgResponse: 139 },
    { month: "2024-05", requests: 25200, detections: 967, avgResponse: 125 },
  ];

  console.log("\n  Monthly Trends:");
  historicalData.forEach((month) => {
    const detectionRate = ((month.detections / month.requests) * 100).toFixed(2);
    console.log(
      `    ${month.month}: ${month.requests.toLocaleString()} requests, ${month.detections} detections (${detectionRate}%), ${month.avgResponse}ms avg`,
    );
  });

  // Calculate growth
  const firstMonth = historicalData[0];
  const lastMonth = historicalData[historicalData.length - 1];
  const requestGrowth = (
    ((lastMonth.requests - firstMonth.requests) / firstMonth.requests) *
    100
  ).toFixed(1);
  const detectionGrowth = (
    ((lastMonth.detections - firstMonth.detections) / firstMonth.detections) *
    100
  ).toFixed(1);

  console.log("\n  Growth Analysis:");
  console.log(`    Request Volume Growth: ${requestGrowth}%`);
  console.log(`    Detection Growth: ${detectionGrowth}%`);
  console.log(
    `    Performance Improvement: ${(((firstMonth.avgResponse - lastMonth.avgResponse) / firstMonth.avgResponse) * 100).toFixed(1)}%`,
  );
}

// Example 9: Real-time Detection Monitoring with New API
async function realtimeDetectionMonitoring() {
  console.log("\n9. Real-time Detection Monitoring with Enhanced API...");

  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
  });

  // Test addresses for monitoring
  const testAddresses = [
    "8.8.8.8",      // Clean IP
    "1.2.3.4",      // Potentially suspicious
    "test@temp-mail.org"  // Disposable email
  ];

  console.log("\n  Real-time Detection Results:");
  
  for (const address of testAddresses) {
    try {
      // Use comprehensive detection for monitoring
      const result = await client.check(address, {
        detection: { mode: "comprehensive" },
        enrich: {
          risk: "detailed",
          location: true,
          network: true
        },
        tagging: {
          enabled: true,
          tag: "monitoring-system"
        }
      });

      console.log(`\n  ${address}:`);
      console.log(`    Type: ${address.includes("@") ? "Email" : "IP Address"}`);
      
      if (address.includes("@")) {
        console.log(`    Disposable: ${result.isDisposableEmail ? "Yes ⚠️" : "No ✅"}`);
      } else {
        console.log(`    Is Proxy: ${result.isProxy ? "Yes ⚠️" : "No ✅"}`);
        console.log(`    Is VPN: ${result.isVPN ? "Yes ⚠️" : "No ✅"}`);
      }
      
      console.log(`    Risk Level: ${result.risk.level} (${result.risk.score}%)`);
      
      if (result.location) {
        console.log(`    Location: ${result.location.city || "Unknown"}, ${result.location.country || "Unknown"}`);
      }
      
      if (result.detection.type) {
        console.log(`    Detection Type: ${result.detection.type}`);
      }

      // Alert based on risk
      if (result.risk.level === "critical" || result.risk.level === "high") {
        console.log(`    🔴 ALERT: High risk detected!`);
      } else if (result.risk.level === "medium") {
        console.log(`    🟡 WARNING: Medium risk detected`);
      } else {
        console.log(`    🟢 Status: Low risk`);
      }

    } catch (error) {
      console.log(`\n  ${address}: Error - ${(error as Error).message}`);
    }

    // Small delay between checks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Run examples
async function main() {
  await statisticsMonitoringExamples();
  await historicalTrendAnalysis();
  await realtimeDetectionMonitoring();

  console.log("\n🎯 Statistics and Monitoring Examples Complete!");
  console.log("💡 Tip: Set up automated monitoring and alerting for production environments.");
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runStatisticsMonitoringExamples };
