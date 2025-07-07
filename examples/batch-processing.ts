/**
 * Batch Processing Examples
 * 
 * This example demonstrates how to efficiently process multiple IP addresses
 * and email addresses in batch operations.
 */

import { ProxyCheckClient, type CheckResponse } from '../src';

const client = new ProxyCheckClient({
  apiKey: process.env.PROXYCHECK_API_KEY || 'your-api-key-here'
});

// Sample data for testing
const testIPs = [
  '8.8.8.8',      // Google DNS (should be clean)
  '1.1.1.1',      // Cloudflare DNS (should be clean)  
  '192.168.1.1',  // Private IP (might be blocked)
  '127.0.0.1',    // Localhost (might be blocked)
];

const testEmails = [
  'user@gmail.com',
  'test@10minutemail.com',  // Known disposable
  'user@tempmail.org',      // Known disposable
  'admin@company.com',
];

const mixedAddresses = [
  '8.8.8.8',
  'user@gmail.com',
  '1.2.3.4',
  'test@tempmail.org'
];

async function batchIPProcessing() {
  console.log('📦 Batch IP Processing\n');

  try {
    // Process multiple IPs with advanced options
    const results = await client.check.checkAddresses(testIPs, {
      vpnDetection: 2,
      asnData: true,
      riskData: 2,
      queryTagging: true,
      customTag: 'batch-ip-check'
    });

    console.log('Batch IP Results:');
    console.log('================');

    for (const [address, data] of Object.entries(results)) {
      if (address === 'status') continue; // Skip status field

      console.log(`\n🔍 ${address}:`);
      console.log(`   Proxy: ${data.proxy}`);
      if (data.type) console.log(`   Type: ${data.type}`);
      if (data.risk !== undefined) console.log(`   Risk: ${data.risk}%`);
      if (data.country) console.log(`   Country: ${data.country} (${data.isocode})`);
      if (data.asn) console.log(`   ASN: ${data.asn}`);
      if (data.isp) console.log(`   ISP: ${data.isp}`);
    }

    // Summary statistics
    const addresses = Object.keys(results).filter(key => key !== 'status');
    const proxyCount = addresses.filter(addr => results[addr].proxy === 'yes').length;
    const cleanCount = addresses.length - proxyCount;

    console.log('\n📊 Summary:');
    console.log(`   Total checked: ${addresses.length}`);
    console.log(`   Clean IPs: ${cleanCount}`);
    console.log(`   Proxy/VPN IPs: ${proxyCount}`);

  } catch (error) {
    console.error('Batch IP processing failed:', error.message);
  }
}

async function batchEmailProcessing() {
  console.log('\n📧 Batch Email Processing\n');

  try {
    const results = await client.check.checkAddresses(testEmails, {
      maskAddress: true, // Mask emails for privacy
      queryTagging: true,
      customTag: 'batch-email-check'
    });

    console.log('Batch Email Results:');
    console.log('===================');

    for (const [address, data] of Object.entries(results)) {
      if (address === 'status') continue;

      console.log(`\n📮 ${address}:`);
      console.log(`   Disposable: ${data.disposable || 'unknown'}`);
      if (data.proxy) console.log(`   Proxy: ${data.proxy}`);
    }

    // Check block status
    if (results.block) {
      console.log(`\n🚫 Block Status: ${results.block}`);
      console.log(`   Block Reason: ${results.block_reason}`);
    }

  } catch (error) {
    console.error('Batch email processing failed:', error.message);
  }
}

async function mixedBatchProcessing() {
  console.log('\n🔀 Mixed Batch Processing (IPs + Emails)\n');

  try {
    const results = await client.check.checkAddresses(mixedAddresses, {
      vpnDetection: 1,
      riskData: 1,
      asnData: true,
      queryTagging: true,
      customTag: 'mixed-batch-check'
    });

    console.log('Mixed Batch Results:');
    console.log('===================');

    for (const [address, data] of Object.entries(results)) {
      if (address === 'status') continue;

      const isEmail = address.includes('@');
      console.log(`\n${isEmail ? '📧' : '🌐'} ${address}:`);

      if (isEmail) {
        console.log(`   Disposable: ${data.disposable || 'unknown'}`);
      } else {
        console.log(`   Proxy: ${data.proxy}`);
        if (data.risk !== undefined) console.log(`   Risk: ${data.risk}%`);
        if (data.country) console.log(`   Country: ${data.country}`);
      }
    }

  } catch (error) {
    console.error('Mixed batch processing failed:', error.message);
  }
}

// Advanced batch processing with error handling
async function robustBatchProcessing() {
  console.log('\n💪 Robust Batch Processing with Error Handling\n');

  const addresses = ['8.8.8.8', 'invalid-ip', 'test@example.com', '1.2.3.4'];
  
  // Process addresses one by one with individual error handling
  const results: Array<{ address: string; result?: any; error?: string }> = [];

  for (const address of addresses) {
    try {
      console.log(`Checking ${address}...`);
      const result = await client.check.checkAddress(address, {
        vpnDetection: 1,
        riskData: 1
      });
      
      results.push({ address, result });
      console.log(`✅ ${address}: Success`);
      
    } catch (error) {
      results.push({ address, error: error.message });
      console.log(`❌ ${address}: ${error.message}`);
    }
  }

  console.log('\n📋 Final Results Summary:');
  console.log('========================');
  
  results.forEach(({ address, result, error }) => {
    if (error) {
      console.log(`❌ ${address}: Failed - ${error}`);
    } else if (result) {
      // Check if the API returned an error status
      if (result.status === 'error') {
        console.log(`❌ ${address}: API Error - ${result.message || 'Unknown error'}`);
      } else {
        const addressData = result[address];
        if (addressData) {
          if (address.includes('@')) {
            console.log(`📧 ${address}: ${addressData.disposable === 'yes' ? 'Disposable' : 'Regular'}`);
          } else {
            console.log(`🌐 ${address}: ${addressData.proxy === 'yes' ? 'Proxy/VPN' : 'Clean'}`);
          }
        } else {
          console.log(`⚠️ ${address}: No data returned for this address`);
        }
      }
    } else {
      console.log(`⚠️ ${address}: No result received`);
    }
  });
}

// Demonstrate rate limiting and retry behavior
async function rateLimitDemo() {
  console.log('\n⏱️ Rate Limiting Demo\n');

  const addresses = Array.from({ length: 10 }, (_, i) => `1.2.3.${i + 1}`);
  
  console.log(`Processing ${addresses.length} addresses rapidly...`);
  const startTime = Date.now();

  try {
    // This might trigger rate limiting depending on your plan
    const promises = addresses.map(ip => 
      client.check.checkAddress(ip).catch(error => ({ error: error.message }))
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`\nCompleted in ${endTime - startTime}ms`);
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Show rate limit info if available
    const rateLimitInfo = client.getRateLimitInfo();
    if (rateLimitInfo) {
      console.log('\n📊 Rate Limit Status:');
      console.log(`   Remaining: ${rateLimitInfo.remaining}`);
      console.log(`   Reset: ${rateLimitInfo.reset}`);
    }

  } catch (error) {
    console.error('Rate limit demo failed:', error.message);
  }
}

async function main() {
  console.log('🚀 ProxyCheck.io TypeScript SDK - Batch Processing Examples\n');

  try {
    await batchIPProcessing();
    await batchEmailProcessing();
    await mixedBatchProcessing();
    await robustBatchProcessing();
    await rateLimitDemo();
    
    console.log('\n✨ All batch processing examples completed!');
    
  } catch (error) {
    console.error('Examples failed:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runBatchExamples };