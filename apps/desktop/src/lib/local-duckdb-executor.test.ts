import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeLocalDuckDB } from './local-duckdb-executor';
import * as loader from './duckdb-wasm-loader';

describe('local-duckdb-executor', () => {
  const mockPlan: any = { id: 'plan_1', requiredColumns: ['route'], warnings: [] };
  const mockSqlPreview: any = { id: 'sql_1', sql: 'SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 5' };
  const mockRows = [{ 'Tuyến xe': 1 }];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes parser error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Parser Error: syntax error at or near'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_PARSER_ERROR');
  });

  it('normalizes binder error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Binder Error: Referenced column not found'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_BINDER_ERROR');
  });

  it('normalizes catalog error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Catalog Error: Function does not exist'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_CATALOG_ERROR');
  });

  it('normalizes bootstrap error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('DUCKDB_WASM_BOOTSTRAP_FAILED: Worker is not defined'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_BOOTSTRAP_ERROR');
  });

  it('normalizes worker error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Worker thread panic'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_WORKER_ERROR');
  });

  it('normalizes memory error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Out of Memory Error: memory limit exceeded'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_MEMORY_ERROR');
  });

  it('normalizes unknown runtime error', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockRejectedValue(new Error('Some weird error'));
    const result = await executeLocalDuckDB({ runtimePlan: mockPlan, safeSqlPreview: mockSqlPreview, rows: mockRows });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('DUCKDB_UNKNOWN_RUNTIME_ERROR');
  });

  it('executes analytical query and returns successful DuckDBPreviewResult when loader succeeds', async () => {
    const mockArrowResult = {
      toArray: () => [{ route: 1, toJSON: () => ({ route: 1 }) }],
      schema: { fields: [{ name: 'route' }] }
    };
    const mockConn = {
      query: vi.fn().mockResolvedValue(mockArrowResult),
      close: vi.fn()
    };
    const mockDb = {
      connect: vi.fn().mockResolvedValue(mockConn),
      registerFileText: vi.fn()
    };

    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue(mockDb as any);

    const result = await executeLocalDuckDB({
      runtimePlan: mockPlan,
      safeSqlPreview: mockSqlPreview,
      rows: mockRows,
      limit: 5
    });

    expect(loader.initDuckDbWasm).toHaveBeenCalled();
    expect(mockDb.registerFileText).toHaveBeenCalledWith('data.json', JSON.stringify([{ route: 1 }]));
    expect(mockConn.query).toHaveBeenCalledWith(`CREATE OR REPLACE VIEW __LIGHTBI_PREVIEW_TABLE__ AS SELECT * FROM read_json_auto('data.json')`);
    expect(mockConn.query).toHaveBeenCalledWith(`SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 5`);
    expect(mockConn.close).toHaveBeenCalled();

    expect(result.status).toBe('executed');
    expect(result.columns).toEqual(['route']);
    expect(result.rows).toEqual([{ route: 1 }]);
    expect(result.rowCount).toBe(1);
    expect(result.maxRows).toBe(5);
  });

  it('preserves CANONICAL_PROJECTION_MISSING error without DuckDB prefix', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue({ connect: vi.fn().mockResolvedValue({}) } as any);
    const result = await executeLocalDuckDB({
      runtimePlan: mockPlan,
      safeSqlPreview: mockSqlPreview,
      rows: [{ 'Ngẫu nhiên': 1 }] // Will cause CANONICAL_PROJECTION_MISSING for 'route'
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('CANONICAL_PROJECTION_MISSING');
    expect(result.errorMessage).not.toContain('DUCKDB_WASM_RUNTIME_FAILED');
  });

  it('preserves CANONICAL_PROJECTION_CONFLICT error without DuckDB prefix', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue({ connect: vi.fn().mockResolvedValue({}) } as any);
    const result = await executeLocalDuckDB({
      runtimePlan: mockPlan,
      safeSqlPreview: mockSqlPreview,
      rows: [{ 'Tuyến xe': 1, 'Route': 2 }] // Both map to 'route', causing conflict
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('CANONICAL_PROJECTION_CONFLICT');
    expect(result.errorMessage).not.toContain('DUCKDB_WASM_RUNTIME_FAILED');
  });
});
