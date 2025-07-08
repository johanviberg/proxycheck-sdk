# Integration Tests

These tests validate the ProxyCheck SDK against the live ProxyCheck.io API.

## Prerequisites

1. **ProxyCheck.io API Key**: You need a valid API key from [ProxyCheck.io](https://proxycheck.io)
2. **Environment Variables**: Set the following environment variables:
   - `PROXYCHECK_TEST_API_KEY`: Your API key for testing
   - `RUN_LIVE_API_TESTS`: Set to `true` to enable tests
   - `RUN_COMPREHENSIVE_TESTS`: Set to `true` for full test suite
   - `VERBOSE_TEST_LOGGING`: Set to `true` for detailed logs

## Running Tests

### Quick Smoke Tests
Run basic connectivity and functionality tests:
```bash
pnpm test:integration:quick
```

### Full Test Suite
Run all integration tests including comprehensive validation:
```bash
pnpm test:integration:full
```

### With Verbose Logging
Run tests with detailed debug output:
```bash
pnpm test:integration:verbose
```

### Manual Configuration
Set environment variables manually and run:
```bash
export PROXYCHECK_TEST_API_KEY="your-api-key"
export RUN_LIVE_API_TESTS=true
export RUN_COMPREHENSIVE_TESTS=true
pnpm test:integration
```

## Test Categories

### Smoke Tests
- Basic API connectivity
- Simple IP/email validation
- Configuration options

### Comprehensive Tests
- Known proxy/VPN detection
- Disposable email validation
- Country-based filtering
- Risk scoring
- Batch operations

## Test Data

Test vectors are maintained in `tests/data/test-vectors.ts`. These include:

- **Clean IPs**: Well-known public DNS servers (Google, Cloudflare)
- **Proxy/VPN IPs**: Known proxy and VPN servers (may change over time)
- **Disposable Emails**: Common temporary email services
- **Country-specific IPs**: For testing geographic restrictions

## Rate Limiting

Tests include built-in delays between requests to respect API rate limits:
- Default delay: 1 second between requests
- Tests run serially to avoid overwhelming the API
- Rate limit information is logged when available

## CI/CD Integration

Integration tests run:
- **Nightly**: Full test suite runs at 2 AM UTC
- **On Demand**: Manual workflow dispatch
- **PR Comments**: Trigger with `/test-integration` comment

## Troubleshooting

### Tests are skipped
- Ensure `RUN_LIVE_API_TESTS=true` is set
- Check that `PROXYCHECK_TEST_API_KEY` contains a valid API key

### Rate limiting errors
- Increase delays in `test-vectors.ts`
- Reduce concurrent test execution
- Check your API plan limits

### IP classification changes
- IP classifications can change over time
- Tests log warnings for classification mismatches
- Update test vectors if changes are permanent

## Cost Considerations

Each test run consumes API credits:
- Smoke tests: ~10-15 queries
- Full suite: ~50-100 queries
- Consider your API plan when scheduling automated tests