/**
 * Country-Based Filtering Examples
 *
 * This example demonstrates how to implement country-based filtering
 * and geolocation-based security policies.
 */

import { ProxyCheckClient } from "../src";

const client = new ProxyCheckClient({
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

      const result = await client.check.checkAddress(ip, {
        asnData: true, // Required for country detection
        blockedCountries,
        vpnDetection: 1,
        riskData: 1,
        queryTagging: true,
        customTag: "country-blocking",
      });

      const addressData = result[ip];

      console.log(
        `  Country: ${addressData.country || "Unknown"} (${addressData.isocode || "N/A"})`,
      );
      console.log(`  Proxy: ${addressData.proxy}`);
      console.log(`  Block Status: ${result.block}`);
      console.log(`  Block Reason: ${result.block_reason}`);

      if (result.block === "yes") {
        console.log(`  🚨 BLOCKED: ${result.block_reason}`);
      } else {
        console.log("  ✅ ALLOWED");
      }

      console.log("");
    }
  } catch (error) {
    console.error("Country blocking example failed:", error.message);
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

      const result = await client.check.checkAddress(ip, {
        asnData: true,
        allowedCountries,
        vpnDetection: 2,
        riskData: 2,
        queryTagging: true,
        customTag: "country-allowlist",
      });

      const addressData = result[ip];

      console.log(
        `  Country: ${addressData.country || "Unknown"} (${addressData.isocode || "N/A"})`,
      );
      console.log(`  Proxy: ${addressData.proxy}`);
      console.log(`  Risk: ${addressData.risk || "N/A"}%`);
      console.log(`  Block Status: ${result.block}`);
      console.log(`  Block Reason: ${result.block_reason}`);

      if (result.block === "yes") {
        console.log(`  🚨 BLOCKED: ${result.block_reason}`);
      } else {
        console.log("  ✅ ALLOWED");
      }

      console.log("");
    }
  } catch (error) {
    console.error("Country allowlist example failed:", error.message);
  }
}

async function geolocationAnalysisExample() {
  console.log("🌍 Geolocation Analysis Example\n");

  try {
    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Analyzing ${label} (${ip})...`);

      const result = await client.check.getDetailedInfo(ip, {
        asnData: true,
        riskData: 2,
        vpnDetection: 3,
      });

      if (result) {
        console.log(
          `  🌍 Location: ${result.city || "Unknown"}, ${result.region || "Unknown"}, ${result.country || "Unknown"}`,
        );
        console.log(`  🗺️  Coordinates: ${result.latitude || "N/A"}, ${result.longitude || "N/A"}`);
        console.log(`  🌐 Continent: ${result.continent || "Unknown"}`);
        console.log(`  🏢 ISP: ${result.isp || "Unknown"}`);
        console.log(`  🏛️  Organization: ${result.organisation || "Unknown"}`);
        console.log(`  🔢 ASN: ${result.asn || "Unknown"}`);
        console.log(
          `  💰 Currency: ${result.currency ? `${result.currency.name} (${result.currency.symbol})` : "Unknown"}`,
        );
        console.log(`  🕐 Timezone: ${result.timezone || "Unknown"}`);
        console.log(`  📱 Mobile: ${result.mobile ? "Yes" : "No"}`);
        console.log(`  ⚠️  Risk: ${result.risk || "N/A"}%`);
        console.log(`  🛡️  VPN: ${result.vpn || "N/A"}`);
        console.log(`  🚪 Port Open: ${result.port ? "Yes" : "No"}`);
        console.log(`  👁️  Recently Seen: ${result.seen ? "Yes" : "No"}`);

        if (result.last_seen) {
          console.log(`  ⏰ Last Seen: ${result.last_seen}`);
        }

        if (result.attack_history) {
          console.log(`  ⚔️  Attack History: ${result.attack_history}`);
        }
      }

      console.log("");
    }
  } catch (error) {
    console.error("Geolocation analysis failed:", error.message);
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
    vpnDetection: 2, // Enhanced VPN detection
    requireASN: true, // Always get ISP/ASN data

    // Tagging
    customTag: "hybrid-security-policy",
  };

  console.log("Security Policy:");
  console.log(`  Blocked Countries: ${securityPolicy.blockedCountries.join(", ")}`);
  console.log(`  Max Risk Score: ${securityPolicy.maxRiskScore}%`);
  console.log(`  VPN Detection: Level ${securityPolicy.vpnDetection}`);
  console.log("");

  try {
    const checkResults = [];

    for (const [label, ip] of Object.entries(testIPs)) {
      console.log(`Evaluating ${label} (${ip}) against security policy...`);

      const result = await client.check.checkAddress(ip, {
        asnData: securityPolicy.requireASN,
        blockedCountries: securityPolicy.blockedCountries,
        allowedCountries: securityPolicy.allowedCountries,
        vpnDetection: securityPolicy.vpnDetection,
        riskData: 2,
        queryTagging: true,
        customTag: securityPolicy.customTag,
      });

      const addressData = result[ip];

      // Custom risk evaluation
      const riskFactors = [];
      let totalRisk = 0;

      // Geographic risk
      if (securityPolicy.blockedCountries.includes(addressData.isocode)) {
        riskFactors.push("Blocked country");
        totalRisk += 30;
      }

      // Proxy/VPN risk
      if (addressData.proxy === "yes") {
        riskFactors.push(`Proxy/VPN (${addressData.type})`);
        totalRisk += addressData.type === "VPN" ? 25 : 20;
      }

      // Risk score
      if (addressData.risk && addressData.risk > securityPolicy.maxRiskScore) {
        riskFactors.push(`High risk score (${addressData.risk}%)`);
        totalRisk += 20;
      }

      // Mobile/suspicious patterns
      if (addressData.mobile) {
        riskFactors.push("Mobile connection");
        totalRisk += 5;
      }

      const decision = result.block === "yes" || totalRisk > 50 ? "BLOCK" : "ALLOW";

      console.log(`  Country: ${addressData.country} (${addressData.isocode})`);
      console.log(`  Risk Score: ${addressData.risk || "N/A"}%`);
      console.log(`  Risk Factors: ${riskFactors.length > 0 ? riskFactors.join(", ") : "None"}`);
      console.log(`  Total Risk: ${totalRisk}%`);
      console.log(`  Decision: ${decision === "BLOCK" ? "🚨" : "✅"} ${decision}`);

      checkResults.push({
        label,
        ip,
        country: addressData.country,
        risk: addressData.risk || 0,
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
    console.error("Hybrid security policy example failed:", error.message);
  }
}

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Country Filtering Examples\n");

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
