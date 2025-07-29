#!/usr/bin/env ts-node
/**
 * Performance benchmarks for ProxyCheck SDK
 * 
 * Run with: npm run benchmark
 */

import { ProxyCheck } from '../../src';

// Mock data for benchmarks
const testAddresses = [
  '8.8.8.8',
  '1.1.1.1', 
  '192.168.1.1',
  'test@example.com',
  'user@tempmail.org'
];

const largeBatch = Array.from({ length: 100 }, (_, i) => 
  `192.168.${Math.floor(i / 256)}.${i % 256}`
);

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

/**
 * Run a benchmark
 */
async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];
  
  // Warmup
  for (let i = 0; i < 5; i++) {
    await fn();
  }
  
  // Actual benchmark
  const startTotal = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to ms
  }
  const endTotal = process.hrtime.bigint();
  
  const totalTime = Number(endTotal - startTotal) / 1_000_000;
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;
  
  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond
  };
}

/**
 * Format benchmark results
 */
function formatResults(results: BenchmarkResult[]): void {
  console.log('\n=== ProxyCheck SDK Performance Benchmarks ===\n');
  
  const maxNameLength = Math.max(...results.map(r => r.name.length));
  
  results.forEach(result => {
    const padding = ' '.repeat(maxNameLength - result.name.length);
    console.log(
      `${result.name}${padding} | ` +
      `Avg: ${result.avgTime.toFixed(2)}ms | ` +
      `Min: ${result.minTime.toFixed(2)}ms | ` +
      `Max: ${result.maxTime.toFixed(2)}ms | ` +
      `Ops/sec: ${result.opsPerSecond.toFixed(0)}`
    );
  });
  
  console.log('\n');
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  const client = new ProxyCheck({
    apiKey: 'test-key',
    baseUrl: 'localhost', // Use mock server
    timeout: 5000
  });
  
  const results: BenchmarkResult[] = [];
  
  // Benchmark 1: Single address transformation
  results.push(await benchmark(
    'Single Address Transform',
    async () => {
      // This tests the transformation logic without actual API calls
      const mockResponse = {
        status: 'ok' as const,
        '8.8.8.8': {
          proxy: 'no' as const,
          risk: 0,
          country: 'US'
        }
      };
      // @ts-ignore - accessing private method for benchmarking
      client['_checkService']['processResponse'](mockResponse);
    },
    1000
  ));
  
  // Benchmark 2: Batch address transformation
  results.push(await benchmark(
    'Batch Transform (5 addresses)',
    async () => {
      const mockResponse = {
        status: 'ok' as const
      };
      testAddresses.forEach(addr => {
        mockResponse[addr] = {
          proxy: 'no' as const,
          risk: 0
        };
      });
      // @ts-ignore
      client['_checkService']['processResponse'](mockResponse);
    },
    1000
  ));
  
  // Benchmark 3: Large batch transformation
  results.push(await benchmark(
    'Large Batch Transform (100 addresses)',
    async () => {
      const mockResponse = {
        status: 'ok' as const
      };
      largeBatch.forEach(addr => {
        mockResponse[addr] = {
          proxy: 'no' as const,
          risk: 0
        };
      });
      // @ts-ignore
      client['_checkService']['processResponse'](mockResponse);
    },
    100
  ));
  
  // Benchmark 4: Options validation
  results.push(await benchmark(
    'Options Validation',
    async () => {
      const options = {
        enrich: {
          risk: 'detailed' as const,
          location: true,
          network: true
        },
        detection: {
          mode: 'comprehensive' as const
        },
        tag: 'benchmark-test'
      };
      // @ts-ignore
      client['_config']['validateOptions'](options);
    },
    10000
  ));
  
  // Benchmark 5: List validation
  results.push(await benchmark(
    'List Entry Validation (100 entries)',
    async () => {
      const entries = largeBatch;
      // @ts-ignore
      client['_listManagementService'].validateEntries(entries);
    },
    1000
  ));
  
  formatResults(results);
  
  // Memory usage
  const memUsage = process.memoryUsage();
  console.log('Memory Usage:');
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB\n`);
}

// Run benchmarks if called directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

export { benchmark, runBenchmarks };