import { describe, expect, it, vi } from 'vitest';
import type { AdvancedQueryResult } from './advanced-api';
import { materializeDatabaseRows } from './database-runtime-snapshot';

function page(offset: number, rows: number[][], hasMore: boolean): AdvancedQueryResult {
  return {
    runId: `run-${offset}`,
    columns: [{ id: 'id', name: 'id', logicalType: 'number' }],
    rows,
    page: { offset, limit: rows.length, hasMore },
    truncated: hasMore,
    warnings: [],
    executionMs: 1,
  };
}

describe('materializeDatabaseRows', () => {
  it('collects every page and verifies exact row coverage', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(2, [[3], [4]], true)).mockResolvedValueOnce(page(4, [[5]], false));
    const result = await materializeDatabaseRows({ firstPage: page(0, [[1], [2]], true), expectedRows: 5, pageSize: 2, fetchPage });
    expect(result.rows).toEqual([[1], [2], [3], [4], [5]]);
    expect(result.page.hasMore).toBe(false);
    expect(result.truncated).toBe(false);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 2, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 4, 2);
  });

  it('fails closed when a source stops before the exact row count', async () => {
    await expect(materializeDatabaseRows({
      firstPage: page(0, [[1]], true), expectedRows: 2, pageSize: 1,
      fetchPage: vi.fn().mockResolvedValue(page(1, [], false)),
    })).rejects.toThrow('stopped returning rows');
  });

  it('refuses a partial snapshot above the governed cap', async () => {
    await expect(materializeDatabaseRows({
      firstPage: page(0, [[1]], true), expectedRows: 10, pageSize: 1,
      maxRows: 5, fetchPage: vi.fn(),
    })).rejects.toThrow('supports complete database snapshots up to 5 rows');
  });
});
