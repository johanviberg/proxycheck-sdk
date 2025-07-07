/**
 * List Management Examples
 * 
 * This example demonstrates whitelist and blacklist management
 * for advanced IP address filtering.
 */

import { ProxyCheckClient } from '../src';

const client = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || 'your-api-key-here'
});

// Sample IP addresses for testing
const sampleIPs = [
  '192.168.1.1',    // Private network
  '10.0.0.1',       // Private network
  '172.16.0.1',     // Private network
  '8.8.8.8',        // Google DNS
  '1.1.1.1',        // Cloudflare DNS
];

const suspiciousIPs = [
  '1.2.3.4',
  '5.6.7.8',
  '9.10.11.12',
  '13.14.15.16',
];

async function whitelistManagementExample() {
  console.log('✅ Whitelist Management Examples\n');

  try {
    // 1. Add individual IPs to whitelist
    console.log('1. Adding individual IPs to whitelist...');
    await client.listing.addToWhitelist(['192.168.1.1', '10.0.0.1']);
    console.log('   ✅ Added 192.168.1.1 and 10.0.0.1 to whitelist');

    // 2. Add multiple IPs at once
    console.log('\n2. Adding multiple IPs to whitelist...');
    await client.listing.addToWhitelist(sampleIPs);
    console.log(`   ✅ Added ${sampleIPs.length} IPs to whitelist`);

    // 3. Get current whitelist
    console.log('\n3. Retrieving current whitelist...');
    const whitelist = await client.listing.getWhitelist();
    console.log('   Current whitelist entries:');
    if (Array.isArray(whitelist) && whitelist.length > 0) {
      whitelist.forEach((ip, index) => {
        console.log(`     ${index + 1}. ${ip}`);
      });
    } else {
      console.log('     (No entries or unexpected format)');
      console.log('     Raw response:', JSON.stringify(whitelist, null, 2));
    }

    // 4. Remove specific IPs from whitelist
    console.log('\n4. Removing specific IPs from whitelist...');
    await client.listing.removeFromWhitelist(['192.168.1.1']);
    console.log('   ✅ Removed 192.168.1.1 from whitelist');

    // 5. Set entire whitelist (replace all)
    console.log('\n5. Setting entire whitelist...');
    const newWhitelist = ['8.8.8.8', '1.1.1.1', '10.0.0.0/8'];
    await client.listing.setWhitelist(newWhitelist);
    console.log(`   ✅ Set whitelist to: ${newWhitelist.join(', ')}`);

    // 6. Verify changes
    console.log('\n6. Verifying whitelist changes...');
    const updatedWhitelist = await client.listing.getWhitelist();
    console.log('   Updated whitelist:');
    if (Array.isArray(updatedWhitelist)) {
      updatedWhitelist.forEach((ip, index) => {
        console.log(`     ${index + 1}. ${ip}`);
      });
    } else {
      console.log('     Raw response:', JSON.stringify(updatedWhitelist, null, 2));
    }

  } catch (error) {
    console.error('Whitelist management failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
  }
}

async function blacklistManagementExample() {
  console.log('\n🚫 Blacklist Management Examples\n');

  try {
    // 1. Add suspicious IPs to blacklist
    console.log('1. Adding suspicious IPs to blacklist...');
    await client.listing.addToBlacklist(suspiciousIPs);
    console.log(`   ✅ Added ${suspiciousIPs.length} suspicious IPs to blacklist`);

    // 2. Get current blacklist
    console.log('\n2. Retrieving current blacklist...');
    const blacklist = await client.listing.getBlacklist();
    console.log('   Current blacklist entries:');
    if (Array.isArray(blacklist) && blacklist.length > 0) {
      blacklist.forEach((ip, index) => {
        console.log(`     ${index + 1}. ${ip}`);
      });
    } else {
      console.log('     (No entries or unexpected format)');
      console.log('     Raw response:', JSON.stringify(blacklist, null, 2));
    }

    // 3. Add additional IPs with CIDR notation
    console.log('\n3. Adding CIDR ranges to blacklist...');
    const cidrRanges = ['192.168.100.0/24', '172.16.0.0/16'];
    await client.listing.addToBlacklist(cidrRanges);
    console.log(`   ✅ Added CIDR ranges: ${cidrRanges.join(', ')}`);

    // 4. Remove specific IP from blacklist
    console.log('\n4. Removing specific IP from blacklist...');
    await client.listing.removeFromBlacklist(['1.2.3.4']);
    console.log('   ✅ Removed 1.2.3.4 from blacklist');

    // 5. Verify blacklist state
    console.log('\n5. Verifying blacklist state...');
    const updatedBlacklist = await client.listing.getBlacklist();
    console.log('   Updated blacklist:');
    if (Array.isArray(updatedBlacklist)) {
      updatedBlacklist.forEach((ip, index) => {
        console.log(`     ${index + 1}. ${ip}`);
      });
    } else {
      console.log('     Raw response:', JSON.stringify(updatedBlacklist, null, 2));
    }

  } catch (error) {
    console.error('Blacklist management failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
  }
}

async function listOperationsExample() {
  console.log('\n🔄 Advanced List Operations\n');

  try {
    // 1. Backup current lists
    console.log('1. Backing up current lists...');
    const whitelistBackup = await client.listing.getWhitelist();
    const blacklistBackup = await client.listing.getBlacklist();
    console.log(`   ✅ Backed up ${Array.isArray(whitelistBackup) ? whitelistBackup.length : 0} whitelist entries`);
    console.log(`   ✅ Backed up ${Array.isArray(blacklistBackup) ? blacklistBackup.length : 0} blacklist entries`);

    // 2. Bulk operations
    console.log('\n2. Performing bulk operations...');
    
    // Add multiple entries at once
    const bulkWhitelistAdditions = ['203.0.113.0/24', '198.51.100.0/24'];
    const bulkBlacklistAdditions = ['233.252.0.0/24', '224.0.0.0/24'];
    
    await Promise.all([
      client.listing.addToWhitelist(bulkWhitelistAdditions),
      client.listing.addToBlacklist(bulkBlacklistAdditions)
    ]);
    
    console.log('   ✅ Bulk additions completed');

    // 3. List comparison and analysis
    console.log('\n3. Analyzing list contents...');
    
    const currentWhitelist = await client.listing.getWhitelist();
    const currentBlacklist = await client.listing.getBlacklist();
    
    console.log('   List Statistics:');
    console.log(`     Whitelist entries: ${Array.isArray(currentWhitelist) ? currentWhitelist.length : 0}`);
    console.log(`     Blacklist entries: ${Array.isArray(currentBlacklist) ? currentBlacklist.length : 0}`);
    
    // Check for overlaps (IPs in both lists)
    if (Array.isArray(currentWhitelist) && Array.isArray(currentBlacklist)) {
      const overlaps = currentWhitelist.filter(ip => currentBlacklist.includes(ip));
      if (overlaps.length > 0) {
        console.log(`   ⚠️ Overlapping entries found: ${overlaps.join(', ')}`);
      } else {
        console.log('   ✅ No overlapping entries found');
      }
    }

    // 4. Conditional operations
    console.log('\n4. Conditional list operations...');
    
    // Only add to whitelist if not already in blacklist
    const candidateIP = '203.0.113.1';
    if (Array.isArray(currentBlacklist) && !currentBlacklist.includes(candidateIP)) {
      await client.listing.addToWhitelist([candidateIP]);
      console.log(`   ✅ Added ${candidateIP} to whitelist (not in blacklist)`);
    } else {
      console.log(`   ⚠️ Skipped adding ${candidateIP} (already in blacklist)`);
    }

  } catch (error) {
    console.error('Advanced list operations failed:', error.message);
  }
}

async function listMaintenanceExample() {
  console.log('\n🧹 List Maintenance Examples\n');

  try {
    // 1. List cleanup - remove duplicates and invalid entries
    console.log('1. Performing list cleanup...');
    
    const whitelist = await client.listing.getWhitelist();
    if (Array.isArray(whitelist)) {
      // Remove duplicates and clean up
      const cleanWhitelist = [...new Set(whitelist)].filter(ip => {
        // Basic validation - remove obviously invalid entries
        return ip && typeof ip === 'string' && ip.trim().length > 0;
      });
      
      if (cleanWhitelist.length !== whitelist.length) {
        await client.listing.setWhitelist(cleanWhitelist);
        console.log(`   ✅ Cleaned whitelist: ${whitelist.length} → ${cleanWhitelist.length} entries`);
      } else {
        console.log('   ✅ Whitelist is already clean');
      }
    }

    // 2. Rotate lists - archive old entries
    console.log('\n2. List rotation example...');
    
    // This is a conceptual example - in practice you'd have your own archival logic
    const archiveDate = new Date();
    archiveDate.setMonth(archiveDate.getMonth() - 1); // Archive entries older than 1 month
    
    console.log(`   📅 Archiving entries older than ${archiveDate.toDateString()}`);
    console.log('   💡 In practice, you would implement your own timestamp tracking');

    // 3. List validation
    console.log('\n3. List validation...');
    
    const blacklist = await client.listing.getBlacklist();
    if (Array.isArray(blacklist)) {
      console.log('   Validating blacklist entries...');
      
      const validEntries = [];
      const invalidEntries = [];
      
      for (const entry of blacklist.slice(0, 5)) { // Check first 5 for demo
        // Basic IP/CIDR validation
        const isValid = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(entry) ||
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
        console.log(`     Invalid: ${invalidEntries.join(', ')}`);
      }
    }

    // 4. List export/import simulation
    console.log('\n4. List export/import simulation...');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      whitelist: await client.listing.getWhitelist(),
      blacklist: await client.listing.getBlacklist()
    };
    
    console.log('   📤 Exported lists to backup:');
    console.log(`     Timestamp: ${exportData.timestamp}`);
    console.log(`     Whitelist entries: ${Array.isArray(exportData.whitelist) ? exportData.whitelist.length : 0}`);
    console.log(`     Blacklist entries: ${Array.isArray(exportData.blacklist) ? exportData.blacklist.length : 0}`);
    
    // In a real application, you would save this to a file or database
    console.log('     💡 Backup data ready for storage');

  } catch (error) {
    console.error('List maintenance failed:', error.message);
  }
}

async function listTestingExample() {
  console.log('\n🧪 List Testing Examples\n');

  try {
    // Test how list entries affect IP checking
    console.log('1. Testing list effects on IP checking...');
    
    const testIP = '8.8.8.8';
    
    // Check IP normally first
    console.log(`\n   Testing IP: ${testIP}`);
    const normalResult = await client.check.checkAddress(testIP);
    console.log(`   Normal check result: ${JSON.stringify(normalResult[testIP]?.proxy || 'unknown')}`);
    
    // Add to whitelist and test again
    await client.listing.addToWhitelist([testIP]);
    console.log(`   ✅ Added ${testIP} to whitelist`);
    
    // Check again (whitelisted IPs might be treated differently)
    const whitelistedResult = await client.check.checkAddress(testIP);
    console.log(`   Whitelisted check result: ${JSON.stringify(whitelistedResult[testIP]?.proxy || 'unknown')}`);
    
    // Test multiple IPs with different list statuses
    console.log('\n2. Testing multiple IPs with different list statuses...');
    
    const testIPs = ['8.8.8.8', '1.1.1.1', '1.2.3.4'];
    
    // Ensure different list statuses
    await client.listing.addToWhitelist(['8.8.8.8']);
    await client.listing.addToBlacklist(['1.2.3.4']);
    // 1.1.1.1 will be neutral
    
    console.log('   List status setup:');
    console.log('     8.8.8.8: Whitelisted');
    console.log('     1.1.1.1: Neutral');
    console.log('     1.2.3.4: Blacklisted');
    
    const batchResult = await client.check.checkAddresses(testIPs, {
      riskData: 1
    });
    
    console.log('\n   Batch check results:');
    for (const ip of testIPs) {
      const result = batchResult[ip];
      if (result && typeof result === 'object') {
        console.log(`     ${ip}: proxy=${result.proxy}, risk=${result.risk !== undefined ? `${result.risk}%` : 'N/A'}`);
      }
    }

  } catch (error) {
    console.error('List testing failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
  }
}

async function main() {
  console.log('🚀 ProxyCheck.io TypeScript SDK - List Management Examples\n');

  try {
    await whitelistManagementExample();
    await blacklistManagementExample();
    await listOperationsExample();
    await listMaintenanceExample();
    await listTestingExample();
    
    console.log('\n✨ All list management examples completed!');
    console.log('\n💡 Note: List changes may take some time to propagate across ProxyCheck.io infrastructure.');
    
  } catch (error) {
    console.error('Examples failed:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runListManagementExamples };