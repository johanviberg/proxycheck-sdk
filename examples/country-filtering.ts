/**
 * Country-Based Filtering Examples
 *
 * This example demonstrates how to implement country-based filtering
 * and geolocation-based security policies with the new API.
 */

import { ProxyCheck } from "../src";

const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
});

// Sample IPs from different countries for testing
const testIPs = {
  "US-IP": "8.8.8.8", // Google DNS (US)
  Cloudflare: "1.1.1.1", // Cloudflare (US)
  "Example-1": "1.2.3.4", // Generic test IP
  "Example-2": "5.6.7.8", // Generic test IP
  "Example-3": "9.10.11.12", // Generic test IP
};

async function countryBlockingExample() {
  console.log("🚫 Country Blocking Example\n");

  // Block specific high-risk countries
  const blockedCountries = ["CN", "RU", "KP", "IR"]; // China, Russia, North Korea, Iran

  console.log(`Blocked countries: ${blockedCountries.join(", ")}\n`);

  try {
    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Checking ${label} (${ip})...`);

      const result = await client.check(ip, {
        enrich: {
          location: true, // Required for country detection
          network: true,
          risk: "basic"
        },
        blockedCountries,
        detection: {
          mode: "both"
        },
        tagging: {
          enabled: true,
          tag: "country-blocking"
        }
      });

      if (result.location) {
        console.log(
          `  Country: ${result.location.country || "Unknown"} (${result.location.countryCode || "N/A"})`,
        );
      }
      console.log(`  Proxy: ${result.isProxy ? "Yes" : "No"}`);
      console.log(`  VPN: ${result.isVPN ? "Yes" : "No"}`);
      console.log(`  Risk Level: ${result.risk.level}`);

      // Check if country is blocked
      const isBlocked = result.location && blockedCountries.includes(result.location.countryCode || "");
      if (isBlocked) {
        console.log(`  🚨 BLOCKED: Country ${result.location?.countryCode} is on blocklist`);
      } else {
        console.log("  ✅ ALLOWED");
      }

      console.log("");
    }
  } catch (error) {
    console.error("Country blocking example failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function countryAllowlistExample() {
  console.log("✅ Country Allowlist Example\n");

  // Only allow specific trusted countries
  const allowedCountries = ["US", "CA", "GB", "AU", "DE", "NL"]; // Major allies

  console.log(`Allowed countries: ${allowedCountries.join(", ")}\n`);

  try {
    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Checking ${label} (${ip})...`);

      const result = await client.check(ip, {
        enrich: {
          location: true,
          network: true,
          risk: "detailed"
        },
        allowedCountries,
        detection: {
          mode: "comprehensive"
        },
        tagging: {
          enabled: true,
          tag: "country-allowlist"
        }
      });

      if (result.location) {
        console.log(
          `  Country: ${result.location.country || "Unknown"} (${result.location.countryCode || "N/A"})`,
        );
      }
      console.log(`  Proxy: ${result.isProxy ? "Yes" : "No"}`);
      console.log(`  Risk Score: ${result.risk.score}%`);
      console.log(`  Risk Level: ${result.risk.level}`);

      // Check if country is allowed
      const isAllowed = result.location && allowedCountries.includes(result.location.countryCode || "");
      if (!isAllowed && result.location?.countryCode) {
        console.log(`  🚨 BLOCKED: Country ${result.location.countryCode} is not on allowlist`);
      } else {
        console.log("  ✅ ALLOWED");
      }

      console.log("");
    }
  } catch (error) {
    console.error("Country allowlist example failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function geolocationAnalysisExample() {
  console.log("🌍 Geolocation Analysis Example\n");

  try {
    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Analyzing ${label} (${ip})...`);

      const result = await client.check(ip, {
        enrich: {
          location: true,
          network: true,
          risk: "detailed",
          lastSeen: true,
          port: true
        },
        detection: {
          mode: "comprehensive"
        }
      });

      if (result.location) {
        console.log(
          `  🌍 Location: ${result.location.city || "Unknown"}, ${result.location.region || "Unknown"}, ${result.location.country || "Unknown"}`,
        );
        if (result.location.coordinates) {
          console.log(`  🗺️  Coordinates: ${result.location.coordinates.latitude}, ${result.location.coordinates.longitude}`);
        }
        console.log(`  🌐 Continent: ${result.location.continent || "Unknown"}`);
        if (result.location.currency) {
          console.log(
            `  💰 Currency: ${result.location.currency.name} (${result.location.currency.symbol})`,
          );
        }
        console.log(`  🕐 Timezone: ${result.location.timezone || "Unknown"}`);
      }
      
      if (result.network) {
        console.log(`  🏢 Provider: ${result.network.provider || "Unknown"}`);
        console.log(`  🏛️  Organization: ${result.network.organization || "Unknown"}`);
        console.log(`  🔢 ASN: ${result.network.asn || "Unknown"}`);
      }
      
      console.log(`  ⚠️  Risk Score: ${result.risk.score}%`);
      console.log(`  🔴 Risk Level: ${result.risk.level}`);
      console.log(`  🛡️  VPN: ${result.isVPN ? "Yes" : "No"}`);
      console.log(`  🌐 Proxy: ${result.isProxy ? "Yes" : "No"}`);
      
      if (result.detection.type) {
        console.log(`  🔍 Detection Type: ${result.detection.type}`);
      }
      if (result.detection.port) {
        console.log(`  🚪 Port: ${result.detection.port}`);
      }
      if (result.detection.lastSeen) {
        console.log(`  ⏰ Last Seen: ${result.detection.lastSeen.toISOString()}`);
      }

      if (result.risk.attacks) {
        console.log(`  ⚔️  Attack History:`);
        console.log(`     Total attacks: ${result.risk.attacks.total}`);
        if (result.risk.attacks.loginAttempt) {
          console.log(`     Login attempts: ${result.risk.attacks.loginAttempt}`);
        }
        if (result.risk.attacks.registrationAttempt) {
          console.log(`     Registration attempts: ${result.risk.attacks.registrationAttempt}`);
        }
      }

      console.log("");
    }
  } catch (error) {
    console.error("Geolocation analysis failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function hybridSecurityPolicyExample() {
  console.log("🛡️ Hybrid Security Policy Example\n");

  // Comprehensive security policy
  const securityPolicy = {
    // Geographic restrictions
    blockedCountries: ["CN", "RU", "KP", "IR", "SY"],
    allowedCountries: [], // Empty = allow all except blocked

    // Risk thresholds
    maxRiskScore: 75,

    // Detection settings
    detectionMode: "comprehensive" as const,
    enrichData: true,

    // Tagging
    customTag: "hybrid-security-policy",
  };

  console.log("Security Policy:");
  console.log(`  Blocked Countries: ${securityPolicy.blockedCountries.join(", ")}`);
  console.log(`  Max Risk Score: ${securityPolicy.maxRiskScore}%`);
  console.log(`  Detection Mode: ${securityPolicy.detectionMode}`);
  console.log("");

  try {
    const checkResults = [];

    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Evaluating ${label} (${ip}) against security policy...`);

      const result = await client.check(ip, {
        enrich: {
          location: true,
          network: true,
          risk: "detailed",
          lastSeen: true
        },
        blockedCountries: securityPolicy.blockedCountries,
        allowedCountries: securityPolicy.allowedCountries,
        detection: {
          mode: securityPolicy.detectionMode
        },
        tagging: {
          enabled: true,
          tag: securityPolicy.customTag
        }
      });

      // Custom risk evaluation
      const riskFactors = [];
      let totalRisk = 0;

      // Geographic risk
      if (result.location && securityPolicy.blockedCountries.includes(result.location.countryCode || "")) {
        riskFactors.push("Blocked country");
        totalRisk += 30;
      }

      // Proxy/VPN risk
      if (result.isProxy) {
        riskFactors.push(`Proxy (${result.detection.type || "Unknown type"})`);
        totalRisk += 20;
      }
      
      if (result.isVPN) {
        riskFactors.push("VPN");
        totalRisk += 25;
      }

      // Risk score
      if (result.risk.score > securityPolicy.maxRiskScore) {
        riskFactors.push(`High risk score (${result.risk.score}%)`);
        totalRisk += 20;
      }

      // Determine decision based on total risk
      const decision = totalRisk > 50 ? "BLOCK" : "ALLOW";

      console.log(`  Country: ${result.location?.country || "Unknown"} (${result.location?.countryCode || "N/A"})`);
      console.log(`  Risk Score: ${result.risk.score}%`);
      console.log(`  Risk Level: ${result.risk.level}`);
      console.log(`  Risk Factors: ${riskFactors.length > 0 ? riskFactors.join(", ") : "None"}`);
      console.log(`  Total Risk: ${totalRisk}%`);
      console.log(`  Decision: ${decision === "BLOCK" ? "🚨" : "✅"} ${decision}`);

      checkResults.push({
        label,
        ip,
        country: result.location?.country || "Unknown",
        risk: result.risk.score,
        decision,
        riskFactors,
      });

      console.log("");
    }

    // Summary
    console.log("📊 Security Policy Summary:");
    console.log("==========================");

    const blocked = checkResults.filter((r) => r.decision === "BLOCK");
    const allowed = checkResults.filter((r) => r.decision === "ALLOW");

    console.log(`Total Evaluated: ${checkResults.length}`);
    console.log(`Blocked: ${blocked.length}`);
    console.log(`Allowed: ${allowed.length}`);

    if (blocked.length > 0) {
      console.log("\nBlocked IPs:");
      blocked.forEach((r) => {
        console.log(`  🚨 ${r.label} (${r.ip}) - ${r.riskFactors.join(", ")}`);
      });
    }
  } catch (error) {
    console.error("Hybrid security policy example failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Country Filtering Examples (v0.9.2)\n");

  try {
    await countryBlockingExample();
    await countryAllowlistExample();
    await geolocationAnalysisExample();
    await hybridSecurityPolicyExample();

    console.log("✨ All country filtering examples completed!");
  } catch (error) {
    console.error("Examples failed:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runCountryFilteringExamples };
