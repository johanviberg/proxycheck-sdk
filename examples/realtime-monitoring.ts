/**
 * Real-time Monitoring Examples
 *
 * This example demonstrates real-time monitoring, event-driven processing,
 * and live threat detection using the ProxyCheck.io SDK.
 */

import { EventEmitter } from "events";
import { ProxyCheckClient } from "../src";

// Event-driven monitoring system
class ProxyCheckMonitor extends EventEmitter {
  private client: ProxyCheckClient;
  private monitoringActive = false;
  private checkQueue: Array<{ address: string; timestamp: number; id: string }> = [];
  private stats = {
    totalChecks: 0,
    detections: 0,
    errors: 0,
    averageResponseTime: 0,
  };

  constructor(apiKey: string) {
    super();
    this.client = new ProxyCheckClient({
      apiKey,
      logging: {
        level: "warn",
        format: "json",
      },
    });
  }

  async startMonitoring(interval = 5000) {
    this.monitoringActive = true;
    console.log("🔴 Real-time monitoring started...");

    const monitoringLoop = async () => {
      if (!this.monitoringActive) {
        return;
      }

      try {
        await this.processQueue();
        await this.checkSystemHealth();

        // Emit monitoring heartbeat
        this.emit("heartbeat", {
          timestamp: new Date(),
          queueSize: this.checkQueue.length,
          stats: { ...this.stats },
        });
      } catch (error) {
        this.emit("error", { type: "monitoring", error: error.message });
      }

      setTimeout(monitoringLoop, interval);
    };

    monitoringLoop();
  }

  stopMonitoring() {
    this.monitoringActive = false;
    console.log("🟢 Real-time monitoring stopped.");
  }

  async checkAddress(address: string, priority = "normal") {
    const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to queue for batch processing or immediate check based on priority
    if (priority === "urgent") {
      return await this.performCheck(address, checkId);
    }
    this.checkQueue.push({
      address,
      timestamp: Date.now(),
      id: checkId,
    });

    return checkId;
  }

  private async processQueue() {
    if (this.checkQueue.length === 0) {
      return;
    }

    // Process up to 5 checks at once to respect rate limits
    const batch = this.checkQueue.splice(0, 5);

    for (const item of batch) {
      try {
        await this.performCheck(item.address, item.id);
      } catch (error) {
        this.emit("error", {
          type: "check_failed",
          checkId: item.id,
          address: item.address,
          error: error.message,
        });
      }

      // Small delay between checks
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  private async performCheck(address: string, checkId: string) {
    const startTime = Date.now();

    try {
      const result = await this.client.check.checkAddress(address, {
        vpnDetection: 2,
        riskData: 2,
        asnData: true,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update stats
      this.stats.totalChecks++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.totalChecks - 1) + responseTime) /
        this.stats.totalChecks;

      const addressData = result[address];

      if (addressData && typeof addressData === "object") {
        // Check for threats
        const isProxy = addressData.proxy === "yes";
        const riskScore = addressData.risk || 0;
        const isHighRisk = riskScore > 70;

        if (isProxy || isHighRisk) {
          this.stats.detections++;

          this.emit("threat_detected", {
            checkId,
            address,
            type: addressData.type || "unknown",
            riskScore,
            country: addressData.country,
            isocode: addressData.isocode,
            asn: addressData.asn,
            responseTime,
            timestamp: new Date(),
          });
        }

        this.emit("check_completed", {
          checkId,
          address,
          result: addressData,
          responseTime,
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  private async checkSystemHealth() {
    const rateLimitInfo = this.client.getRateLimitInfo();

    if (rateLimitInfo) {
      const usagePercent =
        ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100;

      this.emit("rate_limit_status", {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        usagePercent,
        resetTime: rateLimitInfo.reset,
        timestamp: new Date(),
      });

      // Alert if rate limit is critical
      if (rateLimitInfo.remaining < 10) {
        this.emit("rate_limit_critical", {
          remaining: rateLimitInfo.remaining,
          resetTime: rateLimitInfo.reset,
        });
      }
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

async function realtimeMonitoringExamples() {
  console.log("🔄 ProxyCheck.io TypeScript SDK - Real-time Monitoring Examples\n");

  // Example 1: Basic Real-time Monitor Setup
  console.log("1. Setting up Real-time Monitor...");

  const monitor = new ProxyCheckMonitor(process.env.PROXYCHECK_API_KEY || "your-api-key-here");

  // Set up event listeners
  monitor.on("heartbeat", (data) => {
    console.log(
      `💓 Heartbeat: Queue: ${data.queueSize}, Total Checks: ${data.stats.totalChecks}, Detections: ${data.stats.detections}`,
    );
  });

  monitor.on("threat_detected", (threat) => {
    console.log(`🚨 THREAT DETECTED: ${threat.address}`);
    console.log(
      `   Type: ${threat.type}, Risk: ${threat.riskScore}%, Country: ${threat.country || "unknown"}`,
    );
    console.log(`   Response Time: ${threat.responseTime}ms`);
  });

  monitor.on("check_completed", (check) => {
    const status = check.result.proxy === "yes" ? "❌" : "✅";
    console.log(`${status} Check: ${check.address} (${check.responseTime}ms)`);
  });

  monitor.on("rate_limit_status", (status) => {
    if (status.usagePercent > 80) {
      console.log(`⚠️  Rate Limit Warning: ${status.usagePercent.toFixed(1)}% used`);
    }
  });

  monitor.on("rate_limit_critical", (alert) => {
    console.log(`🔴 RATE LIMIT CRITICAL: Only ${alert.remaining} requests remaining!`);
  });

  monitor.on("error", (error) => {
    console.error(`❌ Monitor Error [${error.type}]: ${error.error}`);
  });

  // Start monitoring
  await monitor.startMonitoring(3000); // Check every 3 seconds

  // Example 2: Simulated Real-time Traffic
  console.log("\n2. Simulating Real-time Traffic...");

  const testAddresses = [
    "8.8.8.8", // Clean
    "1.1.1.1", // Clean
    "171.245.231.241", // Known proxy
    "185.220.101.1", // Tor node
    "test@mailinator.com", // Disposable email
    "test@gmail.com", // Clean email
  ];

  // Add addresses to monitoring queue
  for (const address of testAddresses) {
    const checkId = await monitor.checkAddress(address);
    console.log(`📋 Queued check: ${address} (ID: ${checkId})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Example 3: Priority Checking
  console.log("\n3. Urgent Priority Checks...");

  const urgentAddresses = ["3.96.211.99", "134.195.196.26"];

  for (const address of urgentAddresses) {
    console.log(`🚨 Urgent check: ${address}`);
    try {
      await monitor.checkAddress(address, "urgent");
    } catch (error) {
      console.error(`❌ Urgent check failed: ${error.message}`);
    }
  }

  // Let the monitor run for a bit
  console.log("\n⏳ Monitoring for 15 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Example 4: Monitor Statistics
  console.log("\n4. Monitor Statistics Summary...");
  const stats = monitor.getStats();
  console.log("Final Statistics:");
  console.log(`  Total Checks: ${stats.totalChecks}`);
  console.log(`  Detections: ${stats.detections}`);
  console.log(
    `  Detection Rate: ${stats.totalChecks > 0 ? ((stats.detections / stats.totalChecks) * 100).toFixed(2) : 0}%`,
  );
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Average Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);

  // Stop monitoring
  monitor.stopMonitoring();
  console.log("");
}

// Example 5: Stream Processing Simulation
async function streamProcessingExample() {
  console.log("5. Stream Processing Simulation...");

  const client = new ProxyCheckClient({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: { level: "error" },
  });

  // Simulate incoming stream of IP addresses
  const streamSimulation = () => {
    const sampleIPs = [
      "8.8.8.8",
      "1.1.1.1",
      "171.245.231.241",
      "185.220.101.1",
      "3.96.211.99",
      "134.195.196.26",
      "208.67.222.222",
    ];

    return new Promise((resolve) => {
      let processedCount = 0;
      const totalToProcess = 10;

      const processNext = async () => {
        if (processedCount >= totalToProcess) {
          resolve(processedCount);
          return;
        }

        const randomIP = sampleIPs[Math.floor(Math.random() * sampleIPs.length)];
        const startTime = Date.now();

        try {
          const result = await client.check.checkAddress(randomIP);
          const responseTime = Date.now() - startTime;
          const ipData = result[randomIP];

          if (ipData && typeof ipData === "object") {
            const status = ipData.proxy === "yes" ? "🔴 PROXY" : "🟢 CLEAN";
            const risk = ipData.risk ? ` (${ipData.risk}% risk)` : "";
            console.log(`  Stream: ${randomIP} → ${status}${risk} (${responseTime}ms)`);
          }
        } catch (error) {
          console.log(`  Stream: ${randomIP} → ❌ ERROR (${error.message})`);
        }

        processedCount++;

        // Random delay to simulate real traffic patterns
        const delay = Math.random() * 2000 + 500; // 500-2500ms
        setTimeout(processNext, delay);
      };

      processNext();
    });
  };

  const processed = await streamSimulation();
  console.log(`  Processed ${processed} addresses from simulated stream`);
  console.log("");
}

// Example 6: Alert System Integration
async function alertSystemExample() {
  console.log("6. Alert System Integration...");

  const alertSystem = {
    sendAlert: (
      type: string,
      message: string,
      severity: "low" | "medium" | "high" | "critical",
    ) => {
      const emoji = {
        low: "🟢",
        medium: "🟡",
        high: "🟠",
        critical: "🔴",
      }[severity];

      console.log(`  ${emoji} ALERT [${type.toUpperCase()}] ${severity.toUpperCase()}: ${message}`);
    },
  };

  // Simulate various alert conditions
  const alertConditions = [
    {
      type: "threat_detected",
      message: "High-risk proxy detected from China",
      severity: "high" as const,
    },
    { type: "rate_limit", message: "API rate limit at 85% capacity", severity: "medium" as const },
    {
      type: "system_health",
      message: "Average response time increased to 2.5s",
      severity: "medium" as const,
    },
    {
      type: "detection_spike",
      message: "Detection rate increased by 300% in last hour",
      severity: "critical" as const,
    },
    {
      type: "service_degradation",
      message: "Error rate increased to 5%",
      severity: "high" as const,
    },
  ];

  console.log("  Simulating alert conditions:");
  alertConditions.forEach((alert) => {
    alertSystem.sendAlert(alert.type, alert.message, alert.severity);
  });

  console.log("\n  Alert Integration Best Practices:");
  console.log("    - Use escalation policies for critical alerts");
  console.log("    - Implement alert deduplication");
  console.log("    - Set up notification channels (email, slack, etc.)");
  console.log("    - Include actionable information in alerts");
  console.log("    - Regular alert threshold review and tuning");
  console.log("");
}

// Example 7: Dashboard Data Generation
async function dashboardDataExample() {
  console.log("7. Real-time Dashboard Data...");

  // Simulate real-time dashboard metrics
  const generateMetrics = () => {
    const now = new Date();
    return {
      timestamp: now.toISOString(),
      requests_per_minute: Math.floor(Math.random() * 50) + 10,
      detection_rate: (Math.random() * 10 + 2).toFixed(2),
      average_response_time: Math.floor(Math.random() * 200) + 100,
      geographic_distribution: {
        US: Math.floor(Math.random() * 30) + 20,
        CN: Math.floor(Math.random() * 15) + 5,
        RU: Math.floor(Math.random() * 10) + 3,
        BR: Math.floor(Math.random() * 8) + 2,
        IN: Math.floor(Math.random() * 6) + 1,
      },
      threat_types: {
        proxy: Math.floor(Math.random() * 20) + 5,
        vpn: Math.floor(Math.random() * 15) + 8,
        tor: Math.floor(Math.random() * 5) + 1,
        hosting: Math.floor(Math.random() * 12) + 3,
      },
    };
  };

  console.log("  Real-time Dashboard Metrics:");
  for (let i = 0; i < 3; i++) {
    const metrics = generateMetrics();
    console.log(`\n  Update ${i + 1} (${new Date(metrics.timestamp).toLocaleTimeString()}):`);
    console.log(`    Requests/min: ${metrics.requests_per_minute}`);
    console.log(`    Detection Rate: ${metrics.detection_rate}%`);
    console.log(`    Avg Response: ${metrics.average_response_time}ms`);
    console.log(
      `    Top Countries: US(${metrics.geographic_distribution.US}), CN(${metrics.geographic_distribution.CN}), RU(${metrics.geographic_distribution.RU})`,
    );
    console.log(
      `    Threats: Proxy(${metrics.threat_types.proxy}), VPN(${metrics.threat_types.vpn}), Tor(${metrics.threat_types.tor})`,
    );

    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// Run examples
async function main() {
  await realtimeMonitoringExamples();
  await streamProcessingExample();
  await alertSystemExample();
  await dashboardDataExample();

  console.log("\n🎯 Real-time Monitoring Examples Complete!");
  console.log(
    "💡 Tip: Implement proper error handling and circuit breakers for production monitoring systems.",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runRealtimeMonitoringExamples };
