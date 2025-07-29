# ProxyCheck.io TypeScript SDK (Unofficial)

[![npm version](https://badge.fury.io/js/proxycheck-sdk.svg)](https://badge.fury.io/js/proxycheck-sdk)
[![CI](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/ci.yml)
[![CodeQL](https://github.com/johanviberg/proxycheck-sdk/actions/workflows/codeql.yml/badge.svg)](https://github.com/johanviberg/proxycheck-sdk/security/code-scanning)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An unofficial, modern, type-safe TypeScript/JavaScript SDK for the [ProxyCheck.io](https://proxycheck.io) API. Detect proxies, VPNs, and disposable email addresses with comprehensive error handling, retry logic, and full TypeScript support.

> **Note**: This is an unofficial third-party SDK and is not affiliated with or endorsed by ProxyCheck.io.

> **⚠️ Server-Side Only**: This SDK is designed for Node.js server environments and is **not suitable for browser/client-side use**. It requires server-side execution to protect your API key and avoid CORS restrictions.

## 🚀 Live Demo

**Try the SDK in action:** [ProxyCheck SDK Interactive Demo](https://proxycheck-sdk-demo-site.vercel.app/)

Experience the SDK features with a live, interactive demo site. Test IP address checking and email validation without any setup required.

## Features

### 🎯 **Developer Experience First**
- **Boolean Returns**: No more `proxy === "yes"` checks - use `isProxy: true`
- **Semantic Options**: Replace cryptic numbers with meaningful strings (`level: 'enhanced'` not `vpnDetection: 2`)
- **Single Entry API**: Direct `client.check()` instead of `client.check.checkAddress()`
- **Map-based Batch Results**: O(1) lookups with `results.get('8.8.8.8')` instead of object filtering
- **Enhanced Errors**: Detailed suggestions and recovery strategies included

### 🚀 **Core Features**
- **Modern TypeScript**: Full type safety with intelligent IntelliSense
- **Dual Module Support**: Works with both CommonJS and ESM
- **Built-in Error Handling**: Comprehensive error hierarchy with detailed context
- **Automatic Retries**: Smart retry logic with exponential backoff
- **Rate Limit Handling**: Automatic rate limit detection and retry delays
- **Batch Operations**: Efficiently check multiple IPs/emails at once
- **Complete API Coverage**: All ProxyCheck.io endpoints supported
- **Thoroughly Tested**: Comprehensive test suite with >90% coverage
- **Well Documented**: Complete API documentation and examples
- **Security**: Regular security scanning with CodeQL and dependency audits
- **CI/CD**: Automated testing, building, and publishing pipeline

## Quick Start

### Requirements

- **Node.js 18.12.0 or higher** (server-side only)
- TypeScript 4.5+ (for TypeScript users)
- **Not compatible with browsers** - API key must be protected on server-side

### Installation

```bash
# Using npm
npm install proxycheck-sdk

# Using yarn
yarn add proxycheck-sdk

# Using pnpm
pnpm add proxycheck-sdk
```

### Basic Usage

```typescript
import { ProxyCheck } from 'proxycheck-sdk';

// Initialize the client
const client = new ProxyCheck({
  apiKey: 'your-api-key-here'
});

// Check a single IP address - returns boolean values for better DX
const result = await client.check('8.8.8.8');
console.log('Is proxy:', result.isProxy);  // true/false instead of "yes"/"no"
console.log('Is VPN:', result.isVPN);      // true/false
console.log('Risk level:', result.risk.level); // "low", "medium", "high", "critical"

// Convenience methods for quick checks
const isProxy = await client.isProxy('1.2.3.4');
const isVPN = await client.isVPN('1.2.3.4');
const isSuspicious = await client.isSuspicious('1.2.3.4'); // proxy OR VPN OR high risk

// Check if an email is disposable
const isDisposable = await client.isDisposableEmail('test@tempmail.org');
console.log(`Is disposable: ${isDisposable}`);

// Get risk level as string
const riskLevel = await client.getRiskLevel('1.2.3.4'); // "low", "medium", "high", "critical"
```

## Configuration

### Environment Variables

You can set configuration options via environment variables:

```bash
export PROXYCHECK_API_KEY="your-api-key-here"
export PROXYCHECK_BASE_URL="proxycheck.io"
export PROXYCHECK_TIMEOUT="30000"
export PROXYCHECK_RETRIES="3"
export PROXYCHECK_RETRY_DELAY="1000"
export PROXYCHECK_TLS_SECURITY="true"
```

### Configuration Options

```typescript
const client = new ProxyCheck({
  apiKey: 'your-api-key',           // Your ProxyCheck.io API key
  baseUrl: 'proxycheck.io',         // API base URL (default: 'proxycheck.io')
  timeout: 30000,                   // Request timeout in ms (default: 30000)
  retries: 3,                       // Number of retries (default: 3)
  retryDelay: 1000,                 // Initial retry delay in ms (default: 1000)
  tlsSecurity: true,                // Use HTTPS (default: true)
  userAgent: 'proxycheck-sdk/0.9.2', // Custom user agent
  logging: {                        // Optional logging configuration
    level: 'info',                  // Log level: 'debug' | 'info' | 'warn' | 'error' | 'silent'
    format: 'pretty',              // Log format: 'json' | 'pretty'
    timestamp: true,                // Include timestamps
    colors: true,                   // Use colors in output
    output: (entry) => console.log(entry) // Custom output function
  }
});
```

## API Reference

### Core API Methods

The new API provides a simplified, DX-focused interface with boolean returns and semantic options.

#### Single Address Check

```typescript
// Check single IP address - returns CheckResult with boolean properties
const result = await client.check('8.8.8.8');
console.log(result.isProxy);    // boolean: true/false
console.log(result.isVPN);      // boolean: true/false  
console.log(result.risk.level); // string: "low" | "medium" | "high" | "critical"
console.log(result.risk.score); // number: 0-100

// With options
const result = await client.check('1.2.3.4', {
  // Semantic options for better DX
  detection: { 
    mode: 'vpn',  // 'proxy' | 'vpn' | 'both'
    level: 'enhanced' // 'basic' | 'enhanced' | 'paranoid'
  },
  enrich: {
    risk: 'detailed',    // 'basic' | 'detailed'
    location: true,      // Include country/city data
    network: true,       // Include ASN/ISP data
    lastSeen: true,      // Include last seen data
    port: true           // Include port scan data
  }
});
```

#### Batch Operations

```typescript
// Check multiple addresses - returns Map for O(1) lookup
const addresses = ['8.8.8.8', '1.1.1.1', 'test@example.com'];
const results = await client.checkBatch(addresses);

// Access individual results efficiently
const googleDNS = results.get('8.8.8.8');
if (googleDNS?.isProxy) {
  console.log('Google DNS is flagged as proxy');
}

// Iterate over all results
for (const [address, result] of results) {
  if (result.isSuspicious) {
    console.log(`${address} is suspicious: ${result.risk.level} risk`);
  }
}
```

#### Convenience Methods

```typescript
// Quick boolean checks - perfect for conditionals
if (await client.isProxy('1.2.3.4')) {
  // Block proxy access
}

if (await client.isVPN('1.2.3.4')) {
  // Handle VPN detection
}

if (await client.isSuspicious('1.2.3.4')) {
  // Triggers on: proxy OR VPN OR high risk
  // Perfect for general security checks
}

// Email validation
if (await client.isDisposableEmail('test@tempmail.org')) {
  // Reject disposable email
}

// Risk assessment
const riskLevel = await client.getRiskLevel('1.2.3.4'); 
// Returns: "low" | "medium" | "high" | "critical"
```

#### Advanced Options with Semantic API

```typescript
// Full semantic options for better developer experience
const result = await client.check('1.2.3.4', {
  // Detection configuration - no more cryptic numbers!
  detection: { 
    mode: 'both',          // 'proxy' | 'vpn' | 'both'
    level: 'paranoid'      // 'basic' | 'enhanced' | 'paranoid'
  },
  
  // Data enrichment options
  enrich: {
    risk: 'detailed',      // 'basic' | 'detailed' 
    location: true,        // Include geolocation
    network: true,         // Include ASN/ISP
    lastSeen: true,        // Include last detection
    port: true            // Include open port scan
  },
  
  // Country filtering
  countries: {
    allowed: ['US', 'CA', 'GB'],  // Whitelist countries
    blocked: ['CN', 'RU', 'KP']   // Blacklist countries
  },
  
  // Analytics and privacy
  analytics: {
    tag: true,                    // Enable query tagging
    customTag: 'signup-form'      // Custom tag for tracking
  },
  
  privacy: {
    maskEmail: true               // Mask email addresses
  },
  
  // Time-based filtering
  timeRange: 7                    // Days to look back
});

// The response includes all requested data
if (result.location) {
  console.log(`Location: ${result.location.city}, ${result.location.country}`);
}

if (result.network) {
  console.log(`ISP: ${result.network.provider}`);
  console.log(`ASN: ${result.network.asn}`);
}
```

### Dashboard & List Management

Access dashboard statistics and manage allow/deny lists through the simplified API.

#### Dashboard API

```typescript
// Access dashboard through the client
const usage = await client.dashboard.getUsage();
console.log(`Queries today: ${usage.queriesToday}/${usage.dailyLimit}`);
console.log(`Burst tokens: ${usage.burstTokensAvailable}`);

// Get recent detections
const detections = await client.dashboard.getDetections(100);
for (const detection of detections) {
  console.log(`Detection: ${detection.address}`);
  console.log(`  Type: ${detection.detectionType}`);
  console.log(`  Time: ${detection.timeFormatted}`);
}

// Query analytics - returns summary statistics
const queries = await client.dashboard.getQueries();
console.log(`Total queries: ${queries.totalQueries}`);
console.log(`Proxies detected: ${queries.proxies}`);
console.log(`VPNs detected: ${queries.vpns}`);

// Tag statistics
const tags = await client.dashboard.getTags();
```

#### List Management

```typescript
// Access lists through the client
const lists = client.lists;

// Whitelist operations - more intuitive API
await lists.whitelist.add(['192.168.1.1', '10.0.0.1']);
await lists.whitelist.remove(['192.168.1.1']);
const allowed = await lists.whitelist.get();
await lists.whitelist.set(['192.168.1.1']); // Replace entire list
await lists.whitelist.clear();

// Blacklist operations
await lists.blacklist.add(['1.2.3.4', '5.6.7.8']);
await lists.blacklist.remove(['1.2.3.4']);
const blocked = await lists.blacklist.get();
await lists.blacklist.set(['5.6.7.8']); // Replace entire list
await lists.blacklist.clear();

// Advanced list operations
const stats = await lists.whitelist.getStatistics();
const conflicts = await lists.findConflicts();
```


## Error Handling

The SDK provides enhanced error handling with detailed context and recovery suggestions:

```typescript
import { 
  ProxyCheckError,
  ProxyCheckConfigurationError,
  ProxyCheckAuthError,
  ProxyCheckRateLimitError,
  ProxyCheckNetworkError,
  ProxyCheckTimeoutError,
  ProxyCheckDataError
} from 'proxycheck-sdk';

try {
  const result = await client.check('invalid-ip');
} catch (error) {
  if (error instanceof ProxyCheckDataError) {
    console.log('Validation error:', error.message);
    console.log('Field:', error.field);
    console.log('Suggestions:', error.suggestions);
    // ["Check the data format and structure", "Ensure all required fields are present"]
  } else if (error instanceof ProxyCheckRateLimitError) {
    console.log('Rate limited for:', error.getFormattedTimeUntilReset());
    console.log('Retry after:', error.retryAfter, 'seconds');
    console.log('Window resets at:', error.reset);
    
    // SDK automatically handles retries with proper delays
    // Or manually wait:
    await new Promise(resolve => setTimeout(resolve, error.getRetryDelay()));
  } else if (error instanceof ProxyCheckAuthError) {
    console.log('Auth error type:', error.authType); // 'missing' | 'invalid' | 'expired'
    console.log('Suggestions:', error.suggestions);
    // ["Verify your API key is correct", "Check for any typos in the API key"]
  }
  
  // All errors include helpful context
  console.log('Error code:', error.code);
  console.log('Error category:', error.category);
  console.log('Is retryable:', error.isRetryable());
  console.log('Documentation:', error.documentation);
}
```

## Rate Limiting

The SDK automatically handles rate limiting:

```typescript
// Check rate limit info
const rateLimitInfo = client.getRateLimitInfo();
if (rateLimitInfo) {
  console.log(`Requests remaining: ${rateLimitInfo.remaining}`);
  console.log(`Reset time: ${rateLimitInfo.reset}`);
}

// The client automatically retries with proper delays when rate limited
// You can also manually handle rate limits in error handling
```

## TypeScript Support

The SDK is built with TypeScript and provides excellent type safety with the new API:

```typescript
import type { 
  CheckResult,
  SemanticCheckOptions,
  RiskLevel,
  DetectionType,
  ProxyCheckConfig 
} from 'proxycheck-sdk';

// All responses use boolean properties and enums
const result: CheckResult = await client.check('1.2.3.4');
// result.isProxy is boolean, not "yes"/"no" string
// result.risk.level is typed as "low" | "medium" | "high" | "critical"

// Semantic options with full IntelliSense support
const options: SemanticCheckOptions = {
  detection: {
    mode: 'both',          // ✅ Autocomplete: 'proxy' | 'vpn' | 'both'
    level: 'enhanced'      // ✅ Autocomplete: 'basic' | 'enhanced' | 'paranoid'
  },
  enrich: {
    risk: 'detailed',      // ✅ Autocomplete: 'basic' | 'detailed'
    location: true,        // ✅ Boolean, not 1/0
    network: true          // ✅ Clear intent
  }
};

// Type-safe risk levels
const risk: RiskLevel = result.risk.level; 
switch (risk) {
  case 'low':      // ✅ TypeScript knows all cases
  case 'medium':
  case 'high':
  case 'critical':
    break;
  // No default needed - TypeScript ensures exhaustiveness
}

// Proper type narrowing
if (result.detection?.type === 'VPN') {
  // TypeScript knows detection exists and type is 'VPN'
  console.log('VPN provider:', result.network?.provider);
}
```

## Examples

### Country-Based Filtering

```typescript
// Block traffic from specific countries with semantic options
const result = await client.check('1.2.3.4', {
  enrich: {
    location: true  // Required for country detection
  },
  countries: {
    allowed: ['US', 'CA', 'GB'],     // Whitelist countries
    blocked: ['CN', 'RU', 'KP']      // Blacklist countries
  }
});

// Check if blocked - boolean result!
if (result.isBlocked) {
  console.log(`Blocked due to: ${result.blockReason}`);
  // 'country' | 'proxy' | 'vpn' | 'risk' | 'blacklist'
}

// Access country info if available
if (result.location) {
  console.log(`Country: ${result.location.country} (${result.location.countryCode})`);
}
```

### Batch Processing with Map Returns

```typescript
// Process multiple IPs efficiently - returns Map for O(1) access
const addresses = ['1.2.3.4', '5.6.7.8', '8.8.8.8'];
const results = await client.checkBatch(addresses, {
  detection: { 
    mode: 'both',
    level: 'enhanced' 
  },
  enrich: { risk: 'detailed' }
});

// Clean, type-safe iteration
for (const [address, result] of results) {
  console.log(`${address}: ${result.isProxy ? 'PROXY' : 'CLEAN'}`);
  console.log(`  Risk: ${result.risk.level} (${result.risk.score}%)`);
  
  // Quick suspicious check
  if (result.isSuspicious) {
    console.warn(`⚠️  ${address} is suspicious!`);
  }
}

// Direct O(1) access to specific results
const googleDNS = results.get('8.8.8.8');
if (googleDNS && !googleDNS.isProxy) {
  console.log('Google DNS is clean ✅');
}
```

### Real-time Security Monitoring

```typescript
// Modern security monitoring with enhanced errors
async function monitorTraffic(ip: string) {
  try {
    const result = await client.check(ip, {
      detection: { 
        mode: 'both',
        level: 'paranoid'  // Maximum security
      },
      enrich: {
        risk: 'detailed',
        location: true,
        network: true
      },
      analytics: {
        tag: true,
        customTag: 'security-monitor'
      }
    });
    
    // Simple boolean checks
    if (result.isSuspicious) {
      console.warn(`⚠️ Suspicious activity detected: ${ip}`);
      console.warn(`  Type: ${result.detection?.type || 'Unknown'}`);
      console.warn(`  Risk: ${result.risk.level} (${result.risk.score}%)`);
      console.warn(`  Location: ${result.location?.country || 'Unknown'}`);
      
      // Take action based on risk level
      switch (result.risk.level) {
        case 'critical':
          // Block immediately
          await blockIP(ip);
          break;
        case 'high':
          // Add to watchlist
          await addToWatchlist(ip);
          break;
        case 'medium':
          // Log for review
          await logSuspiciousActivity(ip, result);
          break;
      }
    }
    
    return result;
  } catch (error) {
    if (error instanceof ProxyCheckRateLimitError) {
      console.log(`Rate limited. Waiting ${error.getFormattedTimeUntilReset()}`);
      // SDK handles retry automatically
    } else {
      console.error(`Failed to check ${ip}:`, error.message);
      console.error('Suggestions:', error.suggestions);
    }
  }
}
```

## Migration from v0.x to v0.9.2

The v0.9.2 release includes a completely redesigned API focused on developer experience. While this is a pre-1.0 release, breaking changes can be expected. Here's how to migrate:

### Import Changes

```typescript
// Old
import { ProxyCheckClient } from 'proxycheck-sdk';
const client = new ProxyCheckClient({ apiKey: 'key' });

// New
import { ProxyCheck } from 'proxycheck-sdk';
const client = new ProxyCheck({ apiKey: 'key' });
```

### API Method Changes

```typescript
// Old - nested service pattern with string returns
const result = await client.check.checkAddress('8.8.8.8');
if (result['8.8.8.8'].proxy === 'yes') { /* ... */ }

// New - direct methods with boolean returns
const result = await client.check('8.8.8.8');
if (result.isProxy) { /* ... */ }
```

### Options Changes

```typescript
// Old - cryptic numeric values
await client.check.checkAddress('1.2.3.4', {
  vpnDetection: 2,    // What does 2 mean?
  asnData: 1,         // Binary as number
  riskData: 1
});

// New - semantic, self-documenting options
await client.check('1.2.3.4', {
  detection: { 
    mode: 'both',
    level: 'enhanced'   // Clear meaning
  },
  enrich: {
    location: true,     // Boolean, not 1/0
    network: true,
    risk: 'detailed'    // Not just on/off
  }
});
```

### Response Changes

```typescript
// Old - string-based responses
{
  "8.8.8.8": {
    proxy: "yes",
    type: "VPN",
    risk: 75
  }
}

// New - boolean and typed responses
{
  address: "8.8.8.8",
  isProxy: true,
  isVPN: true,
  risk: {
    level: "high",    // Semantic level
    score: 75         // Numeric score
  }
}
```

### Batch Operations

```typescript
// Old - returns object, requires filtering
const results = await client.check.checkAddresses(['1.2.3.4', '5.6.7.8']);
for (const [ip, data] of Object.entries(results)) {
  if (ip === 'status') continue; // Skip status
  // Process...
}

// New - returns Map, clean iteration
const results = await client.checkBatch(['1.2.3.4', '5.6.7.8']);
for (const [address, result] of results) {
  // Direct iteration, no filtering needed
}
```

## Development

### Building from Source

```bash
git clone https://github.com/johanviberg/proxycheck-sdk.git
cd proxycheck-sdk
pnpm install
pnpm build
```

### Running Tests

```bash
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage
```

### Code Quality

```bash
pnpm lint           # Check code quality
pnpm lint:fix       # Fix linting issues
pnpm format         # Format code
pnpm type-check     # Type checking
```

### Git Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for git hooks to ensure code quality and consistent commit messages.

#### Automatic Setup

Git hooks are automatically installed when you run `pnpm install`. If you need to install them manually:

```bash
pnpm hooks:install   # Install git hooks
pnpm hooks:uninstall # Remove git hooks
pnpm hooks:run       # Run hooks manually
```

#### Active Hooks

- **pre-commit**: Runs automatically before each commit
  - Code formatting with Biome
  - TypeScript linting
  - Type checking
  - Secret detection
  - JSON validation

- **commit-msg**: Validates commit messages
  - Enforces [Conventional Commits](https://www.conventionalcommits.org/) format
  - Required format: `<type>(<scope>): <subject>`

- **pre-push**: Runs before pushing to remote
  - Runs all tests
  - Verifies build succeeds

#### Commit Message Format

All commits must follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test
- `revert`: Reverts a previous commit

**Examples:**
```bash
git commit -m "feat(check): add batch IP validation support"
git commit -m "fix: handle rate limit errors correctly"
git commit -m "docs(readme): update installation instructions"
git commit -m "chore(deps): update typescript to v5.3"
```

**Skip Hooks:** If needed, you can skip hooks with:
```bash
git commit --no-verify -m "your message"
```

### Continuous Integration

This project uses GitHub Actions for automated testing and deployment:

#### CI Pipeline

The CI pipeline runs on every push and pull request:

- **Linting & Type Checking**: Ensures code quality and type safety
- **Testing**: Runs tests across multiple Node.js versions (18, 20, 22)
- **Cross-Platform**: Tests on Ubuntu, Windows, and macOS
- **Coverage**: Generates code coverage reports with Codecov
- **Security**: Automated security scanning with CodeQL
- **Package Validation**: Validates package structure and TypeScript definitions

#### Automated Checks

- **Bundle Size**: Monitors package size to prevent bloat
- **Dependencies**: Automated updates via Dependabot and Renovate
- **Compatibility**: Verifies CommonJS/ESM compatibility
- **Performance**: Checks for performance regressions

### Publishing

Releases are automated using [Release Please](https://github.com/googleapis/release-please):

#### How it works:
1. **Push conventional commits** to the `main` branch
2. **Release Please automatically**:
   - Analyzes commits since last release
   - Calculates appropriate version bump (patch/minor/major)
   - Creates/updates a Release PR with changelog
3. **Review and merge** the Release PR to trigger:
   - Automatic tag creation
   - Package building and validation
   - NPM publishing with provenance
   - GitHub Release creation

#### Manual release (legacy):
For emergency releases, you can still manually create tags:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [ProxyCheck.io API Documentation](https://proxycheck.io/api)
- 🐛 [SDK Issues](https://github.com/johanviberg/proxycheck-sdk/issues)
- 🌐 [ProxyCheck.io Website](https://proxycheck.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

---

Made with ❤️ by [Johan Viberg](https://johanviberg.com)

*This is an unofficial third-party SDK and is not affiliated with ProxyCheck.io*