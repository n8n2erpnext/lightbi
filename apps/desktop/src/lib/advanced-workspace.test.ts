import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRenamedResultSql } from './advanced-workspace-helpers';
import { advancedResultToCsv, createAdvancedId, createAdvancedTab, prependAdvancedHistory, restoreAdvancedTabs, serializeAdvancedTabs, splitAdvancedStatements } from './advanced-workspace';

describe('advanced workspace persistence boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('persists only lightweight tab state', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'tab-1' });
    const tab = createAdvancedTab(1, { sql: 'SELECT 1', limit: 500 });
    const serialized = serializeAdvancedTabs([tab]);

    expect(JSON.parse(serialized)).toEqual([{ id: 'tab-1', title: 'Query 1', sql: 'SELECT 1', limit: 500 }]);
    expect(serialized).not.toContain('rows');
  });

  it('recovers safely from invalid persisted state', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'recovered-tab' });
    expect(restoreAdvancedTabs('{broken')[0].id).toBe('recovered-tab');
  });

  it('creates a run id when randomUUID is unavailable on an insecure origin', () => {
    vi.stubGlobal('crypto', {});
    expect(createAdvancedId()).toMatch(/^advanced-\d+-[a-z0-9]+$/);
  });

  it('bounds history independently from result buffers', () => {
    const history = Array.from({ length: 100 }, (_, index) => ({
      id: String(index), sql: `SELECT ${index}`, database: 'db', executedAt: '', executionMs: 1, rowCount: 1, successful: true
    }));
    const next = prependAdvancedHistory(history, { id: 'new', sql: 'SELECT now()', database: 'db', executedAt: '', executionMs: 2, rowCount: 1, successful: true });
    expect(next).toHaveLength(100);
    expect(next[0].id).toBe('new');
  });

  it('splits bounded statements without breaking quoted semicolons', () => {
    expect(splitAdvancedStatements("SELECT ';' AS value; SELECT 2; -- ;\nSELECT 3")).toEqual([
      "SELECT ';' AS value", 'SELECT 2', '-- ;\nSELECT 3'
    ]);
  });

  it('exports CSV with escaping and spreadsheet formula protection', () => {
    expect(advancedResultToCsv([{ name: 'value' }], [['=cmd'], ['a"b']])).toBe('"value"\r\n"\'=cmd"\r\n"a""b"');
  });

  it('builds a wrapped projection for result column rename aliases', () => {
    const sql = buildRenamedResultSql('SELECT *\nFROM "data";', {
      runId: 'run-1',
      columns: [
        { id: 'column:0:OrderID', name: 'OrderID', logicalType: 'string', nativeType: 'VARCHAR' },
        { id: 'column:1:CustomerName', name: 'CustomerName', logicalType: 'string', nativeType: 'VARCHAR' },
      ],
      rows: [],
      page: { offset: 0, limit: 200, hasMore: false },
      truncated: false,
      warnings: [],
      executionMs: 1,
    }, 'column:1:CustomerName', 'Name');

    expect(sql).toBe('SELECT\n  "OrderID" AS "OrderID",\n  "CustomerName" AS "Name"\nFROM (\nSELECT *\nFROM "data"\n) AS __lightbi_renamed_result');
  });
});
