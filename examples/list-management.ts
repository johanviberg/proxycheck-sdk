/**
 * List Management Examples
 *
 * This example demonstrates whitelist and blacklist management
 * for advanced IP address filtering using the new API.
 */

import { ProxyCheck } from "../src";

const client = new ProxyCheck({
  apiKey: process.env.PROXYCHECK_API_KEY || "your-api-key-here",
});

// Sample IP addresses for testing
const sampleIPs = [
  "192.168.1.1", // Private network
  "10.0.0.1", // Private network
  "172.16.0.1", // Private network
  "8.8.8.8", // Google DNS
  "1.1.1.1", // Cloudflare DNS
];

const suspiciousIPs = ["1.2.3.4", "5.6.7.8", "9.10.11.12", "13.14.15.16"];

async function whitelistManagementExample() {
  console.log("✅ Whitelist Management Examples\n");

  try {
    // 1. Add individual IPs to whitelist
    console.log("1. Adding individual IPs to whitelist...");
    const addResult = await client.lists.whitelist.add(["192.168.1.1", "10.0.0.1"]);
    console.log(`   ✅ Added IPs to whitelist (${addResult.message})`);

    // 2. Add multiple IPs at once with options
    console.log("\n2. Adding multiple IPs to whitelist with validation...");
    const batchAddResult = await client.lists.whitelist.add(sampleIPs, {
      validateBeforeAdd: true,
      allowDuplicates: false,
      notes: "Trusted DNS servers and private networks"
    });
    console.log(`   ✅ ${batchAddResult.message}`);
    if (batchAddResult.added) {
      console.log(`   Added: ${batchAddResult.added} entries`);
    }
    if (batchAddResult.skipped) {
      console.log(`   Skipped: ${batchAddResult.skipped} duplicates`);
    }

    // 3. Get current whitelist
    console.log("\n3. Retrieving current whitelist...");
    const whitelistData = await client.lists.whitelist.get();
    console.log("   Current whitelist entries:");
    if (whitelistData.entries && whitelistData.entries.length > 0) {
      console.log(`   Total entries: ${whitelistData.count || whitelistData.entries.length}`);
      whitelistData.entries.forEach((entry, index) => {
        if (index < 10) { // Show first 10 entries
          console.log(`     ${index + 1}. ${entry}`);
        }
      });
      if (whitelistData.entries.length > 10) {
        console.log(`     ... and ${whitelistData.entries.length - 10} more`);
      }
    } else {
      console.log("     (No entries found)");
    }

    // 4. Remove specific IPs from whitelist
    console.log("\n4. Removing specific IPs from whitelist...");
    const removeResult = await client.lists.whitelist.remove(["192.168.1.1"]);
    console.log(`   ✅ ${removeResult.message}`);
    if (removeResult.removed) {
      console.log(`   Removed: ${removeResult.removed} entries`);
    }

    // 5. Set entire whitelist (replace all)
    console.log("\n5. Setting entire whitelist (replace all)...");
    const newWhitelist = ["8.8.8.8", "1.1.1.1", "10.0.0.0/8"];
    const setResult = await client.lists.whitelist.set(newWhitelist);
    console.log(`   ✅ ${setResult.message}`);
    console.log(`   New whitelist has ${setResult.count || newWhitelist.length} entries`);

    // 6. Clear whitelist
    console.log("\n6. Clearing whitelist...");
    const clearResult = await client.lists.whitelist.clear();
    console.log(`   ✅ ${clearResult.message}`);
  } catch (error) {
    console.error("Whitelist management failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("code" in error) {
        console.error("Error code:", error.code);
      }
    }
  }
}

async function blacklistManagementExample() {
  console.log("\n🚫 Blacklist Management Examples\n");

  try {
    // 1. Add suspicious IPs to blacklist
    console.log("1. Adding suspicious IPs to blacklist...");
    const addResult = await client.lists.blacklist.add(suspiciousIPs, {
      notes: "Suspicious activity detected",
      validateBeforeAdd: true
    });
    console.log(`   ✅ ${addResult.message}`);
    if (addResult.added) {
      console.log(`   Added: ${addResult.added} IPs to blacklist`);
    }

    // 2. Get current blacklist
    console.log("\n2. Retrieving current blacklist...");
    const blacklistData = await client.lists.blacklist.get();
    console.log("   Current blacklist entries:");
    if (blacklistData.entries && blacklistData.entries.length > 0) {
      console.log(`   Total entries: ${blacklistData.count || blacklistData.entries.length}`);
      blacklistData.entries.forEach((entry, index) => {
        if (index < 10) { // Show first 10 entries
          console.log(`     ${index + 1}. ${entry}`);
        }
      });
      if (blacklistData.entries.length > 10) {
        console.log(`     ... and ${blacklistData.entries.length - 10} more`);
      }
    } else {
      console.log("     (No entries found)");
      console.log("     Raw response:", JSON.stringify(blacklistData, null, 2));
    }

    // 3. Add additional IPs with CIDR notation
    console.log("\n3. Adding CIDR ranges to blacklist...");
    const cidrRanges = ["192.168.100.0/24", "172.16.0.0/16"];
    const cidrResult = await client.lists.blacklist.add(cidrRanges);
    console.log(`   ✅ ${cidrResult.message}`);

    // 4. Remove specific IP from blacklist
    console.log("\n4. Removing specific IP from blacklist...");
    const removeResult = await client.lists.blacklist.remove(["1.2.3.4"]);
    console.log(`   ✅ ${removeResult.message}`);

    // 5. Verify blacklist state
    console.log("\n5. Verifying blacklist state...");
    const updatedBlacklist = await client.lists.blacklist.get();
    console.log("   Updated blacklist:");
    if (updatedBlacklist.entries && updatedBlacklist.entries.length > 0) {
      console.log(`   Total entries: ${updatedBlacklist.count || updatedBlacklist.entries.length}`);
      updatedBlacklist.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`     ${index + 1}. ${entry}`);
      });
      if (updatedBlacklist.entries.length > 10) {
        console.log(`     ... and ${updatedBlacklist.entries.length - 10} more`);
      }
    } else {
      console.log("     (No entries found)");
    }
  } catch (error) {
    console.error("Blacklist management failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function listOperationsExample() {
  console.log("\n🔄 Advanced List Operations\n");

  try {
    // 1. Backup current lists
    console.log("1. Backing up current lists...");
    const whitelistBackup = await client.lists.whitelist.get();
    const blacklistBackup = await client.lists.blacklist.get();
    console.log(
      `   ✅ Backed up ${whitelistBackup.entries?.length || 0} whitelist entries`,
    );
    console.log(
      `   ✅ Backed up ${blacklistBackup.entries?.length || 0} blacklist entries`,
    );

    // 2. Bulk operations
    console.log("\n2. Performing bulk operations...");

    // Add multiple entries at once
    const bulkWhitelistAdditions = ["203.0.113.0/24", "198.51.100.0/24"];
    const bulkBlacklistAdditions = ["233.252.0.0/24", "224.0.0.0/24"];

    const [whitelistResult, blacklistResult] = await Promise.all([
      client.lists.whitelist.add(bulkWhitelistAdditions),
      client.lists.blacklist.add(bulkBlacklistAdditions),
    ]);

    console.log(`   ✅ Whitelist: ${whitelistResult.message}`);
    console.log(`   ✅ Blacklist: ${blacklistResult.message}`);

    // 3. List comparison and analysis
    console.log("\n3. Analyzing list contents...");

    const currentWhitelist = await client.lists.whitelist.get();
    const currentBlacklist = await client.lists.blacklist.get();

    console.log("   List Statistics:");
    console.log(
      `     Whitelist entries: ${currentWhitelist.entries?.length || 0}`,
    );
    console.log(
      `     Blacklist entries: ${currentBlacklist.entries?.length || 0}`,
    );

    // Check for overlaps (IPs in both lists)
    if (currentWhitelist.entries && currentBlacklist.entries) {
      const whitelistSet = new Set(currentWhitelist.entries);
      const overlaps = currentBlacklist.entries.filter(ip => whitelistSet.has(ip));
      if (overlaps.length > 0) {
        console.log(`   ⚠️ Overlapping entries found: ${overlaps.join(", ")}`);
      } else {
        console.log("   ✅ No overlapping entries found");
      }
    }

    // 4. Conditional operations
    console.log("\n4. Conditional list operations...");

    // Only add to whitelist if not already in blacklist
    const candidateIP = "203.0.113.1";
    const blacklistSet = new Set(currentBlacklist.entries || []);
    if (!blacklistSet.has(candidateIP)) {
      await client.lists.whitelist.add([candidateIP]);
      console.log(`   ✅ Added ${candidateIP} to whitelist (not in blacklist)`);
    } else {
      console.log(`   ⚠️ Skipped adding ${candidateIP} (already in blacklist)`);
    }
  } catch (error) {
    console.error("Advanced list operations failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function listMaintenanceExample() {
  console.log("\n🧹 List Maintenance Examples\n");

  try {
    // 1. List cleanup - remove duplicates and invalid entries
    console.log("1. Performing list cleanup...");

    const whitelistData = await client.lists.whitelist.get();
    if (whitelistData.entries && whitelistData.entries.length > 0) {
      // Remove duplicates and clean up
      const cleanWhitelist = [...new Set(whitelistData.entries)].filter((ip) => {
        // Basic validation - remove obviously invalid entries
        return ip && typeof ip === "string" && ip.trim().length > 0;
      });

      if (cleanWhitelist.length !== whitelistData.entries.length) {
        const setResult = await client.lists.whitelist.set(cleanWhitelist);
        console.log(
          `   ✅ Cleaned whitelist: ${whitelistData.entries.length} → ${cleanWhitelist.length} entries`,
        );
        console.log(`   ${setResult.message}`);
      } else {
        console.log("   ✅ Whitelist is already clean");
      }
    }

    // 2. Rotate lists - archive old entries
    console.log("\n2. List rotation example...");

    // This is a conceptual example - in practice you'd have your own archival logic
    const archiveDate = new Date();
    archiveDate.setMonth(archiveDate.getMonth() - 1); // Archive entries older than 1 month

    console.log(`   📅 Archiving entries older than ${archiveDate.toDateString()}`);
    console.log("   💡 In practice, you would implement your own timestamp tracking");

    // 3. List validation
    console.log("\n3. List validation...");

    const blacklistData = await client.lists.blacklist.get();
    if (blacklistData.entries && blacklistData.entries.length > 0) {
      console.log("   Validating blacklist entries...");

      const validEntries: string[] = [];
      const invalidEntries: string[] = [];

      for (const entry of blacklistData.entries.slice(0, 5)) {
        // Check first 5 for demo
        // Basic IP/CIDR validation
        const isValid =
          /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(entry) ||
          /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(entry);

        if (isValid) {
          validEntries.push(entry);
        } else {
          invalidEntries.push(entry);
        }
      }

      console.log(`     Valid entries: ${validEntries.length}`);
      console.log(`     Invalid entries: ${invalidEntries.length}`);

      if (invalidEntries.length > 0) {
        console.log(`     Invalid: ${invalidEntries.join(", ")}`);
      }
    }

    // 4. List export/import simulation
    console.log("\n4. List export/import simulation...");

    const whitelistExport = await client.lists.whitelist.get();
    const blacklistExport = await client.lists.blacklist.get();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      whitelist: whitelistExport.entries || [],
      blacklist: blacklistExport.entries || [],
    };

    console.log("   📤 Exported lists to backup:");
    console.log(`     Timestamp: ${exportData.timestamp}`);
    console.log(`     Whitelist entries: ${exportData.whitelist.length}`);
    console.log(`     Blacklist entries: ${exportData.blacklist.length}`);

    // In a real application, you would save this to a file or database
    console.log("     💡 Backup data ready for storage");
  } catch (error) {
    console.error("List maintenance failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function listTestingExample() {
  console.log("\n🧪 List Testing Examples\n");

  try {
    // Test how list entries affect IP checking
    console.log("1. Testing list effects on IP checking...");

    const testIP = "8.8.8.8";

    // Check IP normally first
    console.log(`\n   Testing IP: ${testIP}`);
    const normalResult = await client.check(testIP);
    console.log(`   Normal check result:`);
    console.log(`     Is Proxy: ${normalResult.isProxy}`);
    console.log(`     Is VPN: ${normalResult.isVPN}`);
    console.log(`     Risk Level: ${normalResult.risk.level}`);

    // Add to whitelist and test again
    await client.lists.whitelist.add([testIP]);
    console.log(`   ✅ Added ${testIP} to whitelist`);

    // Check again (whitelisted IPs might be treated differently)
    const whitelistedResult = await client.check(testIP);
    console.log(`   Whitelisted check result:`);
    console.log(`     Is Proxy: ${whitelistedResult.isProxy}`);
    console.log(`     Is VPN: ${whitelistedResult.isVPN}`);
    console.log(`     Risk Level: ${whitelistedResult.risk.level}`);

    // Test multiple IPs with different list statuses
    console.log("\n2. Testing multiple IPs with different list statuses...");

    const testIPs = ["8.8.8.8", "1.1.1.1", "1.2.3.4"];

    // Ensure different list statuses
    await client.lists.whitelist.add(["8.8.8.8"]);
    await client.lists.blacklist.add(["1.2.3.4"]);
    // 1.1.1.1 will be neutral

    console.log("   List status setup:");
    console.log("     8.8.8.8: Whitelisted");
    console.log("     1.1.1.1: Neutral");
    console.log("     1.2.3.4: Blacklisted");

    const batchResult = await client.checkBatch(testIPs, {
      enrich: {
        risk: "basic",
      },
    });

    console.log("\n   Batch check results:");
    for (const [ip, result] of batchResult) {
      console.log(
        `     ${ip}: proxy=${result.isProxy}, vpn=${result.isVPN}, risk=${result.risk.level} (${result.risk.score}%)`,
      );
    }
  } catch (error) {
    console.error("List testing failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function main() {
  console.log("🚀 ProxyCheck.io TypeScript SDK - List Management Examples (v0.9.2)\n");

  try {
    await whitelistManagementExample();
    await blacklistManagementExample();
    await listOperationsExample();
    await listMaintenanceExample();
    await listTestingExample();

    console.log("\n✨ All list management examples completed!");
    console.log(
      "\n💡 Note: List changes may take some time to propagate across ProxyCheck.io infrastructure.",
    );
  } catch (error) {
    console.error("Examples failed:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runListManagementExamples };
