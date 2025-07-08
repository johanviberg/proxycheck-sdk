/**
 * Statistics and Monitoring Examples
 *
 * This example demonstrates how to use the ProxyCheck.io SDK for monitoring,
 * analytics, and statistical analysis of your API usage and threat detection.
 */

import { ProxyCheckClient } from "../src";

async function statisticsMonitoringExamples() {
  console.log("📊 ProxyCheck.io TypeScript SDK - Statistics and Monitoring Examples\n");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "info",
      format: "pretty",
    },
  });

  try {
    // Example 1: Basic Usage Statistics
    console.log("1. Retrieving Basic Usage Statistics...");
    try {
      const usageStats = await client.stats.getUsageStats();
      console.log("Usage statistics:", JSON.stringify(usageStats, null, 2));
    } catch (_error) {
      console.log("Note: Stats API requires premium access. Simulating data...");

      // Simulated usage data
      const simulatedUsage = {
        status: "ok",
        data: [
          { date: "2024-01-01", queries: 1250, detections: 45, usage: 85.2 },
          { date: "2024-01-02", queries: 1180, detections: 38, usage: 78.9 },
          { date: "2024-01-03", queries: 1420, detections: 62, usage: 95.3 },
        ],
        total: 3850,
        detection_rate: 3.76,
      };

      console.log("Simulated usage stats:", JSON.stringify(simulatedUsage, null, 2));
    }
    console.log("");

    // Example 2: Detection Analytics
    console.log("2. Analyzing Detection Patterns...");

    const detectionAnalytics = {
      total_checks: 5000,
      total_detections: 187,
      detection_rate: 3.74,
      breakdown: {
        vpn: 89,
        proxy: 45,
        tor: 23,
        hosting: 30,
      },
      geographic_distribution: {
        US: 45,
        CN: 32,
        RU: 28,
        BR: 15,
        IN: 12,
        others: 55,
      },
      risk_score_distribution: {
        "low (0-30)": 2834,
        "medium (31-70)": 1979,
        "high (71-100)": 187,
      },
    };

    console.log("Detection Analytics:");
    console.log(`  Total Checks: ${detectionAnalytics.total_checks.toLocaleString()}`);
    console.log(`  Total Detections: ${detectionAnalytics.total_detections}`);
    console.log(`  Detection Rate: ${detectionAnalytics.detection_rate}%`);

    console.log("\n  Detection Breakdown:");
    Object.entries(detectionAnalytics.breakdown).forEach(([type, count]) => {
      const percentage = ((count / detectionAnalytics.total_detections) * 100).toFixed(1);
      console.log(`    ${type.toUpperCase()}: ${count} (${percentage}%)`);
    });

    console.log("\n  Geographic Distribution:");
    Object.entries(detectionAnalytics.geographic_distribution).forEach(([country, count]) => {
      const percentage = ((count / detectionAnalytics.total_detections) * 100).toFixed(1);
      console.log(`    ${country}: ${count} (${percentage}%)`);
    });
    console.log("");

    // Example 3: Real-time Rate Limiting Monitoring
    console.log("3. Real-time Rate Limiting Monitoring...");

    // Make a test request to get rate limit info
    await client.check.checkAddress("8.8.8.8");
    const rateLimitInfo = client.getRateLimitInfo();

    if (rateLimitInfo) {
      console.log("Current Rate Limit Status:");
      console.log(`  Limit: ${rateLimitInfo.limit} requests`);
      console.log(`  Remaining: ${rateLimitInfo.remaining} requests`);
      console.log(`  Reset Time: ${rateLimitInfo.reset.toISOString()}`);

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
        const result = await client.check.checkAddress(test.ip, {
          vpnDetection: 2,
          riskData: 1,
          asnData: true,
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        performanceResults.push({
          ...test,
          responseTime,
          status: result.status,
          success: true,
        });

        console.log(`  ${test.description}: ${responseTime}ms (${result.status})`);
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        performanceResults.push({
          ...test,
          responseTime,
          status: "error",
          success: false,
          error: error.message,
        });

        console.log(`  ${test.description}: ${responseTime}ms (error: ${error.message})`);
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
      monthly_limit: 10000,
      current_usage: 3750,
      cost_per_request: 0.001,
      estimated_monthly_cost: 3.75,
      projected_usage: 8500,
      projected_cost: 8.5,
    };

    console.log("Cost Analysis:");
    console.log(`  Plan: ${costAnalysis.plan}`);
    console.log(`  Monthly Limit: ${costAnalysis.monthly_limit.toLocaleString()} requests`);
    console.log(`  Current Usage: ${costAnalysis.current_usage.toLocaleString()} requests`);
    console.log(
      `  Usage Percentage: ${((costAnalysis.current_usage / costAnalysis.monthly_limit) * 100).toFixed(1)}%`,
    );
    console.log(`  Cost per Request: $${costAnalysis.cost_per_request}`);
    console.log(`  Current Month Cost: $${costAnalysis.estimated_monthly_cost.toFixed(2)}`);
    console.log(`  Projected Monthly Cost: $${costAnalysis.projected_cost.toFixed(2)}`);

    if (costAnalysis.projected_usage > costAnalysis.monthly_limit) {
      console.log("  🔴 Warning: Projected usage exceeds monthly limit");
    } else if (costAnalysis.projected_usage > costAnalysis.monthly_limit * 0.8) {
      console.log("  🟡 Alert: Projected usage approaching limit");
    } else {
      console.log("  🟢 Status: Usage within expected range");
    }
    console.log("");

    // Example 6: Security Metrics
    console.log("6. Security Metrics Dashboard...");

    const securityMetrics = {
      total_requests: 5000,
      blocked_requests: 187,
      blocked_percentage: 3.74,
      threat_types: {
        high_risk_country: 45,
        known_proxy: 67,
        vpn_detected: 42,
        tor_node: 23,
        disposable_email: 10,
      },
      false_positives: 5,
      false_positive_rate: 2.67,
      top_blocked_countries: [
        { country: "CN", code: "China", blocks: 32 },
        { country: "RU", code: "Russia", blocks: 28 },
        { country: "BR", code: "Brazil", blocks: 15 },
      ],
    };

    console.log("Security Dashboard:");
    console.log(`  Total Requests: ${securityMetrics.total_requests.toLocaleString()}`);
    console.log(`  Blocked Requests: ${securityMetrics.blocked_requests}`);
    console.log(`  Block Rate: ${securityMetrics.blocked_percentage}%`);
    console.log(`  False Positive Rate: ${securityMetrics.false_positive_rate}%`);

    console.log("\n  Threat Type Distribution:");
    Object.entries(securityMetrics.threat_types).forEach(([type, count]) => {
      const percentage = ((count / securityMetrics.blocked_requests) * 100).toFixed(1);
      console.log(`    ${type.replace("_", " ").toUpperCase()}: ${count} (${percentage}%)`);
    });

    console.log("\n  Top Blocked Countries:");
    securityMetrics.top_blocked_countries.forEach((country, index) => {
      console.log(
        `    ${index + 1}. ${country.code} (${country.country}): ${country.blocks} blocks`,
      );
    });
    console.log("");

    // Example 7: Alerting System
    console.log("7. Automated Alerting System...");

    const alertThresholds = {
      high_detection_rate: 10, // Alert if detection rate > 10%
      low_api_calls: 100, // Alert if daily calls < 100
      high_error_rate: 5, // Alert if error rate > 5%
      rate_limit_critical: 10, // Alert if remaining requests < 10%
    };

    const currentMetrics = {
      detection_rate: 12.5,
      daily_calls: 850,
      error_rate: 2.1,
      remaining_requests: 5,
    };

    console.log("Alert Status:");

    // Check detection rate
    if (currentMetrics.detection_rate > alertThresholds.high_detection_rate) {
      console.log(
        `  🔴 HIGH DETECTION RATE: ${currentMetrics.detection_rate}% (threshold: ${alertThresholds.high_detection_rate}%)`,
      );
    } else {
      console.log(`  🟢 Detection rate normal: ${currentMetrics.detection_rate}%`);
    }

    // Check API call volume
    if (currentMetrics.daily_calls < alertThresholds.low_api_calls) {
      console.log(
        `  🟡 LOW API USAGE: ${currentMetrics.daily_calls} calls (threshold: ${alertThresholds.low_api_calls})`,
      );
    } else {
      console.log(`  🟢 API usage healthy: ${currentMetrics.daily_calls} calls`);
    }

    // Check error rate
    if (currentMetrics.error_rate > alertThresholds.high_error_rate) {
      console.log(
        `  🔴 HIGH ERROR RATE: ${currentMetrics.error_rate}% (threshold: ${alertThresholds.high_error_rate}%)`,
      );
    } else {
      console.log(`  🟢 Error rate acceptable: ${currentMetrics.error_rate}%`);
    }

    // Check rate limits
    if (currentMetrics.remaining_requests < alertThresholds.rate_limit_critical) {
      console.log(
        `  🔴 RATE LIMIT CRITICAL: ${currentMetrics.remaining_requests} requests remaining`,
      );
    } else {
      console.log(
        `  🟢 Rate limits healthy: ${currentMetrics.remaining_requests} requests remaining`,
      );
    }
  } catch (error) {
    console.error("Error in statistics monitoring:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

// Example 8: Historical Trend Analysis
async function historicalTrendAnalysis() {
  console.log("\n8. Historical Trend Analysis...");

  const historicalData = [
    { month: "2024-01", requests: 15420, detections: 578, avg_response: 145 },
    { month: "2024-02", requests: 18350, detections: 692, avg_response: 132 },
    { month: "2024-03", requests: 22100, detections: 845, avg_response: 128 },
    { month: "2024-04", requests: 19800, detections: 756, avg_response: 139 },
    { month: "2024-05", requests: 25200, detections: 967, avg_response: 125 },
  ];

  console.log("  Monthly Trends:");
  historicalData.forEach((month) => {
    const detectionRate = ((month.detections / month.requests) * 100).toFixed(2);
    console.log(
      `    ${month.month}: ${month.requests.toLocaleString()} requests, ${month.detections} detections (${detectionRate}%), ${month.avg_response}ms avg`,
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
    `    Performance Improvement: ${(((firstMonth.avg_response - lastMonth.avg_response) / firstMonth.avg_response) * 100).toFixed(1)}%`,
  );
}

// Run examples
async function main() {
  await statisticsMonitoringExamples();
  await historicalTrendAnalysis();

  console.log("\n🎯 Statistics and Monitoring Examples Complete!");
  console.log("💡 Tip: Set up automated monitoring and alerting for production environments.");
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runStatisticsMonitoringExamples };
