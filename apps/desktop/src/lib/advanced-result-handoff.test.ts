import { describe, expect, it } from 'vitest';
import type { AdvancedQueryResult } from './advanced-api';
import { createAdvancedResultHandoff } from './advanced-result-handoff';

function result(overrides: Partial<AdvancedQueryResult> = {}): AdvancedQueryResult {
  return {
    runId: 'run-1',
    columns: [
      { id: 'country', name: 'Country', logicalType: 'string' },
      { id: 'discount', name: 'Discount', logicalType: 'number' },
    ],
    rows: [
      ['Vietnam', 10],
      ['Vietnam', 15],
      ['Thailand', 8],
    ],
    page: { offset: 0, limit: 200, hasMore: false },
    truncated: false,
    warnings: [],
    executionMs: 12,
    ...overrides,
  };
}

describe('advanced result handoff', () => {
  it('builds a Simple BA group-by action from categorical and numeric result columns', () => {
    const handoff = createAdvancedResultHandoff(
      { datasetId: 'advanced:sales', title: 'Sales', provider: 'duckdb', sql: 'select * from sales' },
      result(),
    );

    expect(handoff.rows).toHaveLength(3);
    expect(handoff.analysisAction.actionType).toBe('group_by');
    expect(handoff.analysisAction.dimensions).toEqual(['Country']);
    expect(handoff.analysisAction.measures).toEqual(['Discount']);
    expect(handoff.runtimePlanPreview.expectedOutput.shape).toBe('bar_chart');
    expect(handoff.rowScope).toBe('retained_rows');
  });

  it('prefers a trend action when the result has a date column and measure', () => {
    const handoff = createAdvancedResultHandoff(
      { datasetId: 'advanced:orders', title: 'Orders', provider: 'postgresql', sql: 'select * from orders' },
      result({
        columns: [
          { id: 'order_date', name: 'OrderDate', logicalType: 'date' },
          { id: 'total', name: 'TotalAmount', logicalType: 'number' },
        ],
        rows: [['2026-01-01', 100]],
      }),
    );

    expect(handoff.analysisAction.actionType).toBe('trend');
    expect(handoff.analysisAction.dimensions).toEqual(['OrderDate']);
    expect(handoff.analysisAction.measures).toEqual(['TotalAmount']);
    expect(handoff.runtimePlanPreview.expectedOutput.shape).toBe('line_chart');
  });

  it('records a bounded-buffer caveat when only part of the Advanced result is present', () => {
    const handoff = createAdvancedResultHandoff(
      { datasetId: 'advanced:paged', title: 'Paged', provider: 'mysql', sql: 'select * from big_table' },
      result({ truncated: true, page: { offset: 0, limit: 200, hasMore: true } }),
    );

    expect(handoff.aiBriefing?.caveats.join(' ')).toContain('current bounded result buffer');
    expect(handoff.aiBriefing?.readinessScore).toBeLessThan(78);
  });
});
