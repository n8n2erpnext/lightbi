import { describe, expect, it } from 'vitest';
import {
  createQueryResultBuffer,
  ExecutionRunCoordinator,
  queryResultBufferToRows
} from '@lightbi/runtime';

describe('shared execution core', () => {
  it('invalidates and aborts an older run when a newer run begins', () => {
    const coordinator = new ExecutionRunCoordinator('test');
    const first = coordinator.begin();
    const second = coordinator.begin();

    expect(first.signal.aborted).toBe(true);
    expect(coordinator.isCurrent(first)).toBe(false);
    expect(coordinator.isCurrent(second)).toBe(true);
    expect(second.generation).toBeGreaterThan(first.generation);
  });

  it('cancels the current run and rejects stale completion', () => {
    const coordinator = new ExecutionRunCoordinator('test');
    const run = coordinator.begin();

    coordinator.cancel();

    expect(run.signal.aborted).toBe(true);
    expect(coordinator.finish(run)).toBe(false);
  });

  it('normalizes object rows into a compact matrix and reconstructs view rows', () => {
    const buffer = createQueryResultBuffer({
      runId: 'run:1',
      columns: ['region', 'sales', 'active'],
      rows: [
        { region: 'North', sales: 10, active: true },
        { region: 'South', sales: null, active: false }
      ],
      limit: 100,
      totalRowCount: 250,
      truncated: true
    });

    expect(buffer.rows).toEqual([
      ['North', 10, true],
      ['South', null, false]
    ]);
    expect(buffer.columns.map(column => column.logicalType)).toEqual(['string', 'number', 'boolean']);
    expect(buffer.page).toEqual({ offset: 0, limit: 100, hasMore: true, estimatedTotal: 250 });
    expect(queryResultBufferToRows(buffer)).toEqual([
      { region: 'North', sales: 10, active: true },
      { region: 'South', sales: null, active: false }
    ]);
  });
});
