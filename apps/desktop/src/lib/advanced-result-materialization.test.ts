import { describe, expect, it } from 'vitest';
import type { AdvancedQueryResult } from './advanced-api';
import { classifyAdvancedResultCompleteness, materializeAdvancedResultPages } from './advanced-result-handoff';

const page = (offset: number, rows: number[][], hasMore: boolean): AdvancedQueryResult => ({
  runId: `run-${offset}`, columns: [{ id: 'value', name: 'value', logicalType: 'number' }], rows,
  page: { offset, limit: 2, hasMore, estimatedTotal: 3 }, truncated: false, warnings: [], executionMs: 5,
});

describe('post-edit Advanced to Easy materialization', () => {
  it('combines continuous pages into a complete governed result', () => {
    const result = materializeAdvancedResultPages([page(0, [[1],[2]], true), page(2, [[3]], false)]);
    expect(result.rows).toEqual([[1],[2],[3]]);
    expect(result.page).toEqual({ offset: 0, limit: 3, hasMore: false, estimatedTotal: 3 });
    expect(classifyAdvancedResultCompleteness(result).state).toBe('complete');
  });

  it('fails closed when a page is missing or the final page is still partial', () => {
    expect(() => materializeAdvancedResultPages([page(0, [[1]], true), page(2, [[3]], false)])).toThrow('advanced_full_source_page_continuity_failed');
    expect(() => materializeAdvancedResultPages([page(0, [[1],[2]], true)])).toThrow('advanced_full_source_incomplete');
  });
});
