/**
 * Batch Processing Examples
 *
 * This example demonstrates how to efficiently process multiple IP addresses
 * and email addresses in batch operations using the new API.
 */

import { ProxyCheck } from "../src";

const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
});

// Sample data for testing
const testIPs = [
  "8.8.8.8", // Google DNS (should be clean)
  "1.1.1.1", // Cloudflare DNS (should be clean)
  "192.168.1.1", // Private IP (might be blocked)
  "127.0.0.1", // Localhost (might be blocked)
];

const testEmails = [
  "user@gmail.com",
  "test@10minutemail.com", // Known disposable
  "user@tempmail.org", // Known disposable
  "admin@company.com",
];

const mixedAddresses = ["8.8.8.8", "user@gmail.com", "1.2.3.4", "test@tempmail.org"];

async function batchIPProcessing() {
  console.log("📦 Batch IP Processing\n");

  try {
    // Process multiple IPs with semantic options
    const results = await client.checkBatch(testIPs, {
      detection: {
        mode: "comprehensive"  // comprehensive mode includes both proxy and VPN with detailed info
      },
      enrich: {
        location: true,
        network: true,
        risk: "detailed"
      },
      tagging: {
        enabled: true,
        tag: "batch-ip-check"
      }
    });

    console.log("Batch IP Results:");
    console.log("================");

    // Results is now a Map for easy iteration
    for (const [address, data] of results) {
      console.log(`\n🔍 ${address}:`);
      console.log(`   Proxy: ${data.isProxy ? "Yes" : "No"}`);
      console.log(`   VPN: ${data.isVPN ? "Yes" : "No"}`);
      if (data.detection.type) {
        console.log(`   Type: ${data.detection.type}`);
      }
      console.log(`   Risk Level: ${data.risk.level}`);
      console.log(`   Risk Score: ${data.risk.score}%`);
      if (data.location) {
        console.log(`   Country: ${data.location.country} (${data.location.countryCode})`);
      }
      if (data.network?.asn) {
        console.log(`   ASN: ${data.network.asn}`);
      }
      if (data.network?.provider) {
        console.log(`   Provider: ${data.network.provider}`);
      }
    }

    // Summary statistics
    const proxyCount = Array.from(results.values()).filter(r => r.isProxy).length;
    const vpnCount = Array.from(results.values()).filter(r => r.isVPN).length;
    const cleanCount = results.size - proxyCount;

    console.log("\n📊 Summary:");
    console.log(`   Total checked: ${results.size}`);
    console.log(`   Clean IPs: ${cleanCount}`);
    console.log(`   Proxy IPs: ${proxyCount}`);
    console.log(`   VPN IPs: ${vpnCount}`);
  } catch (error) {
    console.error("Batch IP processing failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function batchEmailProcessing() {
  console.log("\n📧 Batch Email Processing\n");

  try {
    const results = await client.checkBatch(testEmails, {
      privacy: {
        maskEmails: true // Mask emails for privacy
      },
      tagging: {
        enabled: true,
        tag: "batch-email-check"
      }
    });

    console.log("Batch Email Results:");
    console.log("===================");

    for (const [address, data] of results) {
      console.log(`\n📮 ${address}:`);
      console.log(`   Disposable: ${data.isDisposableEmail ? "Yes" : "No"}`);
      if (data.isProxy !== undefined) {
        console.log(`   From Proxy: ${data.isProxy ? "Yes" : "No"}`);
      }
      console.log(`   Risk Level: ${data.risk.level}`);
    }

    // Count disposable emails
    const disposableCount = Array.from(results.values())
      .filter(r => r.isDisposableEmail === true).length;
    
    console.log("\n📊 Summary:");
    console.log(`   Total emails: ${results.size}`);
    console.log(`   Disposable: ${disposableCount}`);
    console.log(`   Regular: ${results.size - disposableCount}`);
  } catch (error) {
    console.error("Batch email processing failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function mixedBatchProcessing() {
  console.log("\n🔀 Mixed Batch Processing (IPs + Emails)\n");

  try {
    const results = await client.checkBatch(mixedAddresses, {
      detection: {
        mode: "both"
      },
      enrich: {
        location: true,
        network: true,
        risk: "basic"
      },
      tagging: {
        enabled: true,
        tag: "mixed-batch-check"
      }
    });

    console.log("Mixed Batch Results:");
    console.log("===================");

    for (const [address, data] of results) {
      const isEmail = address.includes("@");
      console.log(`\n${isEmail ? "📧" : "🌐"} ${address}:`);

      if (isEmail) {
        console.log(`   Disposable: ${data.isDisposableEmail ? "Yes" : "No"}`);
      } else {
        console.log(`   Proxy: ${data.isProxy ? "Yes" : "No"}`);
        console.log(`   Risk: ${data.risk.score}% (${data.risk.level})`);
        if (data.location) {
          console.log(`   Country: ${data.location.country}`);
        }
      }
    }
  } catch (error) {
    console.error("Mixed batch processing failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

// Advanced batch processing with error handling
async function robustBatchProcessing() {
  console.log("\n💪 Robust Batch Processing with Error Handling\n");

  const addresses = ["8.8.8.8", "invalid-ip", "test@example.com", "1.2.3.4"];

  // Process addresses one by one with individual error handling
  const results: Array<{ address: string; result?: import("../src").CheckResult; error?: string }> = [];

  for (const address of addresses) {
    try {
      console.log(`Checking ${address}...`);
      const result = await client.check(address, {
        detection: {
          mode: "both"
        },
        enrich: {
          risk: "basic"
        }
      });

      results.push({ address, result });
      console.log(`✅ ${address}: Success`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ address, error: errorMessage });
      console.log(`❌ ${address}: ${errorMessage}`);
    }
  }

  console.log("\n📋 Final Results Summary:");
  console.log("========================");

  results.forEach(({ address, result, error }) => {
    if (error) {
      console.log(`❌ ${address}: Failed - ${error}`);
    } else if (result) {
      if (address.includes("@")) {
        console.log(
          `📧 ${address}: ${result.isDisposableEmail ? "Disposable" : "Regular"}`,
        );
      } else {
        console.log(`🌐 ${address}: ${result.isProxy ? "Proxy/VPN" : "Clean"} (Risk: ${result.risk.level})`);
      }
    } else {
      console.log(`⚠️ ${address}: No result received`);
    }
  });
}

// Demonstrate rate limiting and retry behavior
async function rateLimitDemo() {
  console.log("\n⏱️ Rate Limiting Demo\n");

  const addresses = Array.from({ length: 10 }, (_, i) => `1.2.3.${i + 1}`);

  console.log(`Processing ${addresses.length} addresses rapidly...`);
  const startTime = Date.now();

  try {
    // This might trigger rate limiting depending on your plan
    const promises = addresses.map((ip) =>
      client.check(ip).catch((error) => ({ 
        error: error instanceof Error ? error.message : String(error) 
      })),
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    console.log(`\nCompleted in ${endTime - startTime}ms`);

    const successful = results.filter((r) => !("error" in r)).length;
    const failed = results.filter((r) => "error" in r).length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    // Show rate limit info if available
    const rateLimitInfo = client.getRateLimitInfo();
    if (rateLimitInfo) {
      console.log("\n📊 Rate Limit Status:");
      console.log(`   Remaining: ${rateLimitInfo.remaining}`);
      console.log(`   Limit: ${rateLimitInfo.limit}`);
      console.log(`   Reset: ${new Date(Number(rateLimitInfo.reset) * 1000).toLocaleString()}`);
    }
  } catch (error) {
    console.error("Rate limit demo failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - Batch Processing Examples (v0.9.2)\n");

  try {
    await batchIPProcessing();
    await batchEmailProcessing();
    await mixedBatchProcessing();
    await robustBatchProcessing();
    await rateLimitDemo();

    console.log("\n✨ All batch processing examples completed!");
  } catch (error) {
    console.error("Examples failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runBatchExamples };
