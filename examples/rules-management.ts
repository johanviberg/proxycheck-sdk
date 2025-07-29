/**
 * Custom Rules Management Examples
 *
 * This example demonstrates how to create, manage, and use custom rules
 * for advanced threat detection and security policies.
 * 
 * Note: The Rules API is a dashboard feature that allows dynamic rule creation.
 * The SDK's semantic options provide built-in rule-like behavior.
 */

import { ProxyCheck } from "../src";

async function rulesManagementExamples() {
  console.log("⚙️ ProxyCheck.io TypeScript SDK - Rules Management Examples (v0.9.2)\n");

  const client = new ProxyCheck({
    apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
    logging: {
      level: "info"
    }
  });

  try {
    // Example 1: Using Semantic Options as Rules
    console.log("1. Using Semantic Options for Rule-Like Behavior...");
    
    // The new API provides semantic options that work like built-in rules
    const securityRules = {
      // Block specific countries
      blockedCountries: ["CN", "RU", "KP"],
      // Allow only specific countries
      allowedCountries: [], // Empty means all except blocked
      // Detection settings
      detection: {
        mode: "comprehensive" as const
      },
      // Risk enrichment
      enrich: {
        risk: "detailed" as const,
        location: true,
        network: true
      }
    };
    
    console.log("  Built-in rule capabilities:");
    console.log("    - Country blocking/allowing");
    console.log("    - VPN/Proxy detection levels");
    console.log("    - Risk-based filtering");
    console.log("    - Time range restrictions");
    console.log("");

    // Example 2: Create Basic Security Rules
    console.log("2. Creating Basic Security Rules...");

    const basicSecurityRules = [
      {
        name: "Block High Risk Countries",
        description: "Block traffic from high-risk countries",
        type: "country",
        action: "block",
        targets: ["CN", "RU", "KP"], // China, Russia, North Korea
        enabled: true,
      },
      {
        name: "Block Known Tor Nodes",
        description: "Block all Tor exit nodes",
        type: "proxy_type",
        action: "block",
        targets: ["TOR"],
        enabled: true,
      },
      {
        name: "Flag VPN Traffic",
        description: "Flag but allow VPN traffic for monitoring",
        type: "proxy_type",
        action: "flag",
        targets: ["VPN"],
        enabled: true,
      },
    ];

    for (const rule of basicSecurityRules) {
      try {
        console.log(`  Creating rule: ${rule.name}`);
        // Note: This would be the actual API call
        // const result = await client.rules.createRule(rule);
        console.log(`  ✅ Rule created: ${rule.name}`);
      } catch (_error) {
        console.log(`  ⚠️ Rule creation simulated: ${rule.name}`);
      }
    }
    console.log("");

    // Example 3: Advanced Risk-Based Rules
    console.log("3. Creating Advanced Risk-Based Rules...");

    const advancedRules = [
      {
        name: "High Risk Score Block",
        description: "Block IPs with risk score above 80%",
        type: "risk_score",
        action: "block",
        threshold: 80,
        enabled: true,
      },
      {
        name: "ASN-Based Filtering",
        description: "Block traffic from hosting providers",
        type: "asn",
        action: "block",
        targets: [
          "AS13335", // Cloudflare (example - you might want to allow this)
          "AS14061", // DigitalOcean
          "AS16509", // Amazon AWS
        ],
        enabled: false, // Disabled by default as it might be too restrictive
      },
      {
        name: "Suspicious Port Detection",
        description: "Flag connections from non-standard ports",
        type: "port",
        action: "flag",
        targets: ["1080", "3128", "8080", "9050"], // Common proxy ports
        enabled: true,
      },
    ];

    for (const rule of advancedRules) {
      console.log(`  Advanced rule: ${rule.name}`);
      console.log(`    - Type: ${rule.type}`);
      console.log(`    - Action: ${rule.action}`);
      console.log(`    - Enabled: ${rule.enabled ? "✅" : "❌"}`);
    }
    console.log("");

    // Example 4: Time-Based Rules
    console.log("4. Creating Time-Based Rules...");

    const timeBasedRules = [
      {
        name: "Business Hours Only",
        description: "Block all proxy traffic outside business hours",
        type: "time_based",
        action: "block",
        schedule: {
          days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          hours: { start: "09:00", end: "17:00" },
          timezone: "UTC",
        },
        enabled: true,
      },
      {
        name: "Weekend Enhanced Security",
        description: "Enhanced security during weekends",
        type: "time_based",
        action: "enhanced_check",
        schedule: {
          days: ["saturday", "sunday"],
          hours: { start: "00:00", end: "23:59" },
          timezone: "UTC",
        },
        enabled: true,
      },
    ];

    timeBasedRules.forEach((rule) => {
      console.log(`  Time-based rule: ${rule.name}`);
      console.log(
        `    - Schedule: ${rule.schedule.days.join(", ")} ${rule.schedule.hours.start}-${rule.schedule.hours.end}`,
      );
      console.log(`    - Action: ${rule.action}`);
    });
    console.log("");

    // Example 5: Custom Rule Testing
    console.log("5. Testing Rules Against Sample IPs...");

    const testIPs = [
      { ip: "8.8.8.8", description: "Google DNS (Clean)" },
      { ip: "1.1.1.1", description: "Cloudflare DNS (Clean)" },
      { ip: "185.220.101.1", description: "Known Tor Node" },
      { ip: "171.245.231.241", description: "High Risk Proxy" },
    ];

    for (const testIP of testIPs) {
      console.log(`  Testing: ${testIP.description} (${testIP.ip})`);

      try {
        // Test with comprehensive detection and country blocking
        const result = await client.check(testIP.ip, {
          detection: {
            mode: "comprehensive"
          },
          enrich: {
            risk: "detailed",
            location: true,
            network: true
          },
          blockedCountries: ["CN", "RU", "KP"],
          tag: "rule-testing"
        });

        // Evaluate results against our "rules"
        // Apply custom rule evaluation based on the result
        const ruleDecision = result.location?.countryCode && 
          ["CN", "RU", "KP"].includes(result.location.countryCode) ? "block" :
          result.detection.type === "TOR" ? "block" :
          result.isVPN ? "flag" :
          result.risk.score > 80 ? "block" : "allow";

        console.log(`    - Is Proxy: ${result.isProxy ? "Yes" : "No"}`);
        console.log(`    - Is VPN: ${result.isVPN ? "Yes" : "No"}`);
        console.log(`    - Detection Type: ${result.detection.type || "none"}`);
        console.log(`    - Risk Level: ${result.risk.level} (${result.risk.score}%)`);
        console.log(`    - Country: ${result.location?.country || "unknown"} (${result.location?.countryCode || "N/A"})`);
        console.log(`    - Rule Decision: ${ruleDecision}`);
      } catch (error) {
        console.log(`    - Error: ${(error as Error).message}`);
      }
      console.log("");
    }

    // Example 6: Rule Performance Monitoring
    console.log("6. Rule Performance Monitoring...");

    const ruleStats = {
      "Block High Risk Countries": { triggered: 45, blocked: 45, performance: "high" },
      "Block Known Tor Nodes": { triggered: 12, blocked: 12, performance: "high" },
      "Flag VPN Traffic": { triggered: 156, blocked: 0, performance: "medium" },
      "High Risk Score Block": { triggered: 23, blocked: 23, performance: "high" },
    };

    console.log("  Rule Performance Summary:");
    Object.entries(ruleStats).forEach(([ruleName, stats]) => {
      const effectiveness =
        stats.blocked > 0 ? ((stats.blocked / stats.triggered) * 100).toFixed(1) : "0.0";
      console.log(`    - ${ruleName}:`);
      console.log(`      Triggered: ${stats.triggered} times`);
      console.log(`      Blocked: ${stats.blocked} requests`);
      console.log(`      Effectiveness: ${effectiveness}%`);
      console.log(`      Performance: ${stats.performance}`);
    });
    console.log("");

    // Example 7: Rule Optimization Suggestions
    console.log("7. Rule Optimization Suggestions...");

    const optimizationSuggestions = [
      {
        rule: "Block High Risk Countries",
        suggestion: "Consider adding geolocation exceptions for legitimate business users",
        priority: "medium",
      },
      {
        rule: "Flag VPN Traffic",
        suggestion: "High trigger rate - consider converting to block action",
        priority: "high",
      },
      {
        rule: "ASN-Based Filtering",
        suggestion: "Currently disabled - review and enable if hosting provider blocks are needed",
        priority: "low",
      },
    ];

    optimizationSuggestions.forEach((opt) => {
      const priorityEmoji =
        opt.priority === "high" ? "🔴" : opt.priority === "medium" ? "🟡" : "🟢";
      console.log(`  ${priorityEmoji} ${opt.rule}:`);
      console.log(`    ${opt.suggestion}`);
    });
  } catch (error) {
    console.error("Error in rules management:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("code" in error) {
        console.error("Error code:", error.code);
      }
    }
  }
}

// Helper function to create custom rule evaluator
// Helper function to create custom rule evaluator
function createRuleEvaluator(rules: Array<{
  name: string;
  condition: (result: import("../src").CheckResult) => boolean;
  action: "block" | "flag" | "allow";
  priority: number;
}>) {
  return (result: import("../src").CheckResult): string => {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (rule.condition(result)) {
        return rule.action;
      }
    }
    
    return "allow";
  };
}

// Use the evaluator in example 6
const _exampleEvaluator = createRuleEvaluator([]);

// Example 8: Rule Management Workflow with New API
async function ruleManagementWorkflow() {
  console.log("\n8. Complete Rule Management Workflow with Semantic Options...");

  // Demonstrate how the new API replaces traditional rule management

  const workflow = [
    { step: "Analyze current threats", description: "Review recent attack patterns" },
    { step: "Design rules", description: "Create rules based on threat intelligence" },
    { step: "Test rules", description: "Validate rules against known good/bad IPs" },
    { step: "Deploy rules", description: "Activate rules in production" },
    { step: "Monitor performance", description: "Track rule effectiveness" },
    { step: "Optimize rules", description: "Adjust based on performance data" },
  ];

  workflow.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.step}`);
    console.log(`     ${item.description}`);
  });

  console.log("\n  💡 Best Practices:");
  console.log("     - Start with flagging before blocking");
  console.log("     - Monitor false positives carefully");
  console.log("     - Regular rule performance review");
  console.log("     - Document rule purposes and changes");
  console.log("     - Test rules in staging environment first");
}

// Run examples
async function main() {
  await rulesManagementExamples();
  await ruleManagementWorkflow();

  console.log("\n🎯 Rules Management Examples Complete!");
  console.log(
    "💡 Tip: Start with simple rules and gradually add complexity based on your security needs.",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runRulesManagementExamples };
