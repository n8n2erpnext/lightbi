import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeLocalDuckDB } from './local-duckdb-executor';
import * as loader from './duckdb-wasm-loader';
import * as materializer from './full-file-runtime-materializer';

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

  it('executes against a worker-materialized full local file', async () => {
    const mockArrowResult = {
      toArray: () => [{ month: 'may', duration: 2, toJSON: () => ({ month: 'may', duration: 2 }) }],
      schema: { fields: [{ name: 'month' }, { name: 'duration' }] }
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
    vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
      jsonText: '[{"month":"may","duration":120},{"month":"may","duration":240}]',
      rowCount: 2
    });

    const source = {
      kind: 'local_files' as const,
      files: [{ file: new File(['stub'], 'campaign.xlsx') }],
      sourceRowCount: 2
    };
    const result = await executeLocalDuckDB({
      runtimePlan: { ...mockPlan, requiredColumns: ['month', 'duration'] },
      safeSqlPreview: mockSqlPreview,
      runtimeDatasetSource: source,
      rows: [{ month: 'sample', duration: 1 }]
    });

    expect(materializer.materializeRuntimeDatasetSource).toHaveBeenCalledWith(source, undefined);
    expect(mockDb.registerFileText).toHaveBeenCalledWith(
      'data.json',
      '[{"month":"may","duration":120},{"month":"may","duration":240}]'
    );
    expect(result.status).toBe('executed');
    expect(result.executionScope).toBe('full_file');
    expect(result.warnings).toContain('Preview executed against the full local file through the worker-backed DuckDB runtime.');
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

  it('closes the connection when execution fails after connect', async () => {
    const mockConn = {
      query: vi.fn().mockRejectedValue(new Error('Binder Error: broken query')),
      close: vi.fn()
    };
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue({
      connect: vi.fn().mockResolvedValue(mockConn),
      registerFileText: vi.fn()
    } as any);

    const result = await executeLocalDuckDB({
      runtimePlan: { ...mockPlan, requiredColumns: [] },
      safeSqlPreview: mockSqlPreview,
      rows: [{ route: 1 }]
    });

    expect(result.status).toBe('failed');
    expect(mockConn.close).toHaveBeenCalledOnce();
  });

  it('preserves CANONICAL_PROJECTION_CONFLICT error without DuckDB prefix', async () => {
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue({ connect: vi.fn().mockResolvedValue({}) } as any);
    const result = await executeLocalDuckDB({
      runtimePlan: mockPlan,
      safeSqlPreview: mockSqlPreview,
      rows: [{ 'Tuyến xe': 1, 'Khu vực phát': 2 }] // Both map to 'route', causing conflict
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('CANONICAL_PROJECTION_CONFLICT');
    expect(result.errorMessage).not.toContain('DUCKDB_WASM_RUNTIME_FAILED');
  });

  it('table_preview executes successfully on arbitrary raw rows without CANONICAL_PROJECTION_MISSING', async () => {
    const mockArrowResult = {
      toArray: () => [{ 'lạ hoắc': 1, toJSON: () => ({ 'lạ hoắc': 1 }) }],
      schema: { fields: [{ name: 'lạ hoắc' }] }
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
      runtimePlan: { ...mockPlan, requiredColumns: [] }, // table_preview has no required columns
      safeSqlPreview: { ...mockSqlPreview, sql: 'SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 5' },
      rows: [{ 'Lạ hoắc': 1 }], // Arbitrary rows that don't match taxonomy
      limit: 5
    });

    expect(result.status).toBe('executed');
    expect(result.errorMessage).toBeUndefined();
    expect(result.rows).toEqual([{ 'lạ hoắc': 1 }]);
  });

  it('executes physical upload headers that are not in canonical taxonomy', async () => {
    const physicalDimension = 'Business: Internet users (per 100 people)';
    const physicalMeasure = 'Health: Health expenditure, total (% GDP)';
    const mockArrowResult = {
      toArray: () => [{
        [physicalDimension]: 72,
        [physicalMeasure]: 8.5,
        toJSON: () => ({ [physicalDimension]: 72, [physicalMeasure]: 8.5 })
      }],
      schema: { fields: [{ name: physicalDimension }, { name: physicalMeasure }] }
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
      runtimePlan: {
        id: 'plan_world_bank',
        requiredColumns: [physicalDimension, physicalMeasure],
        warnings: []
      } as any,
      safeSqlPreview: {
        id: 'sql_world_bank',
        sql: `SELECT "${physicalDimension.toLowerCase()}" AS "${physicalDimension}", "${physicalMeasure.toLowerCase()}" AS "${physicalMeasure}" FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 5`
      } as any,
      rows: [{ [physicalDimension]: 72, [physicalMeasure]: 8.5 }],
      limit: 5
    });

    expect(result.status).toBe('executed');
    expect(result.errorMessage).toBeUndefined();
    expect(mockDb.registerFileText).toHaveBeenCalledWith(
      'data.json',
      JSON.stringify([{ [physicalDimension.toLowerCase()]: 72, [physicalMeasure.toLowerCase()]: 8.5 }])
    );
    expect(result.rows).toEqual([{ [physicalDimension]: 72, [physicalMeasure]: 8.5 }]);
  });

  it('normalizes BigInt values from DuckDB rows before returning to React', async () => {
    const mockArrowResult = {
      toArray: () => [{
        row_count: 82n,
        gross_sales: 12345.67,
        toJSON: () => ({ row_count: 82n, gross_sales: 12345.67 })
      }],
      schema: { fields: [{ name: 'row_count' }, { name: 'gross_sales' }] }
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
      runtimePlan: { ...mockPlan, requiredColumns: [] },
      safeSqlPreview: { ...mockSqlPreview, sql: 'SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 5' },
      rows: [{ Segment: 'Consumer' }],
      limit: 5
    });

    expect(result.status).toBe('executed');
    expect(result.rows).toEqual([{ row_count: 82, gross_sales: 12345.67 }]);
    expect(typeof result.rows[0].row_count).toBe('number');
  });
});
