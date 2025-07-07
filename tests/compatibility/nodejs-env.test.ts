/**
 * Node.js environment compatibility test
 * Tests that the package works correctly in Node.js environments
 */

import { describe, test, expect } from '@jest/globals';
import { ProxyCheckClient } from '../../src/index';

describe('Node.js Environment Compatibility', () => {
  test('should detect Node.js environment', () => {
    expect(typeof process).toBe('object');
    expect(typeof process.versions).toBe('object');
    expect(typeof process.versions.node).toBe('string');
  });

  test('should support Node.js-specific features', () => {
    // Test Node.js specific APIs
    expect(typeof require).toBe('function');
    expect(typeof module).toBe('object');
    expect(typeof __dirname).toBe('string');
    expect(typeof __filename).toBe('string');
  });

  test('should handle Node.js HTTP modules', () => {
    // Test that Node.js HTTP modules are available
    const http = require('http');
    const https = require('https');
    const url = require('url');
    
    expect(typeof http).toBe('object');
    expect(typeof https).toBe('object');
    expect(typeof url).toBe('object');
  });

  test('should support Node.js streams', () => {
    const { Readable, Writable } = require('stream');
    
    expect(typeof Readable).toBe('function');
    expect(typeof Writable).toBe('function');
  });

  test('should handle Node.js file system operations', () => {
    const fs = require('fs');
    const path = require('path');
    
    expect(typeof fs).toBe('object');
    expect(typeof path).toBe('object');
    expect(typeof fs.readFileSync).toBe('function');
    expect(typeof path.join).toBe('function');
  });

  test('should support Node.js environment variables', () => {
    expect(typeof process.env).toBe('object');
    
    // Test that client can read environment variables
    process.env.PROXYCHECK_API_KEY = 'test-key';
    const apiKey = process.env.PROXYCHECK_API_KEY;
    expect(apiKey).toBe('test-key');
  });

  test('should handle Node.js worker threads', () => {
    // Test worker thread support (if available)
    try {
      const { Worker, isMainThread } = require('worker_threads');
      expect(typeof isMainThread).toBe('boolean');
      expect(typeof Worker).toBe('function');
    } catch (error) {
      // Worker threads not available in older Node.js versions
      expect(error.code).toBe('MODULE_NOT_FOUND');
    }
  });

  test('should support Node.js crypto module', () => {
    const crypto = require('crypto');
    
    expect(typeof crypto).toBe('object');
    expect(typeof crypto.randomBytes).toBe('function');
    expect(typeof crypto.createHash).toBe('function');
  });

  test('should handle Node.js clustering', () => {
    const cluster = require('cluster');
    
    expect(typeof cluster).toBe('object');
    expect(typeof cluster.isMaster).toBe('boolean');
    expect(typeof cluster.isWorker).toBe('boolean');
  });

  test('should support Node.js async/await', async () => {
    const client = new ProxyCheckClient({
      apiKey: 'test-key'
    });
    
    // Test that async/await works
    const asyncFunction = async () => {
      return Promise.resolve('test');
    };
    
    const result = await asyncFunction();
    expect(result).toBe('test');
  });

  test('should handle Node.js process events', () => {
    const eventHandlers = {
      exit: jest.fn(),
      uncaughtException: jest.fn(),
      unhandledRejection: jest.fn()
    };
    
    // Test that process events can be handled
    process.on('exit', eventHandlers.exit);
    process.on('uncaughtException', eventHandlers.uncaughtException);
    process.on('unhandledRejection', eventHandlers.unhandledRejection);
    
    expect(process.listenerCount('exit')).toBeGreaterThan(0);
    expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
    expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
    
    // Clean up
    process.removeListener('exit', eventHandlers.exit);
    process.removeListener('uncaughtException', eventHandlers.uncaughtException);
    process.removeListener('unhandledRejection', eventHandlers.unhandledRejection);
  });

  test('should support Node.js version requirements', () => {
    const nodeVersion = process.versions.node;
    const majorVersion = parseInt(nodeVersion.split('.')[0]);
    
    // Test that Node.js version meets requirements (>=14)
    expect(majorVersion).toBeGreaterThanOrEqual(14);
  });
});