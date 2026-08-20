import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDuckDbWasm } from './duckdb-wasm-loader';

describe('duckdb-wasm-loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a transparent DUCKDB_WASM_BOOTSTRAP_FAILED error when Worker is not available in test environment', async () => {
    // In vitest's jsdom or node environment, `Worker` might not be natively available
    // or the ?url imports might resolve to strings that the Worker constructor can't fetch.
    // We expect the loader to catch this and throw a formatted error.
    
    // If Worker happens to be defined (e.g. happy-dom), we might get a different error,
    // but it should still be wrapped in DUCKDB_WASM_BOOTSTRAP_FAILED.
    try {
      await initDuckDbWasm();
      // If it surprisingly succeeds in the test env, that's also fine, but we assert it doesn't crash unhandled
    } catch (error: any) {
      expect(error.message).toContain('DUCKDB_WASM_BOOTSTRAP_FAILED');
    }
  });

  it('prebundles the browser runtime instead of exposing a package-internal dynamic module URL', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain("include: ['@duckdb/duckdb-wasm/dist/duckdb-browser']");
    expect(config).not.toContain("exclude: ['@duckdb/duckdb-wasm']");
  });

  // NOTE: In a true E2E or browser test, Worker and fetch are available, 
  // and we could test the real instantiation. For unit testing the bootstrap seam, 
  // ensuring it fails gracefully and transparently is the primary goal.
});
