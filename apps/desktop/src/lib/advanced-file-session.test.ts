// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedFileSession } from './advanced-file-session';
import * as loader from './duckdb-wasm-loader';
import * as materializer from './full-file-runtime-materializer';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { materializeAdvancedResultPages } from './advanced-result-handoff';

describe('AdvancedFileSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes original file headers in the advanced workspace view', async () => {
    const mockConn = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql === 'SELECT * FROM "__lightbi_source_0" LIMIT 0') {
          return {
            schema: { fields: [{ name: 'mã phiếu xuất' }, { name: 'ngày xuất' }] },
            toArray: () => [],
          };
        }
        return { schema: { fields: [] }, toArray: () => [] };
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockDb = {
      connect: vi.fn().mockResolvedValue(mockConn),
      registerFileText: vi.fn(),
    };
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof loader.initDuckDbWasm>>,
    );
    vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
      jsonText: '[{"mã phiếu xuất":1,"ngày xuất":"2021-09-20"}]',
      rowCount: 1,
    });

    const source: AdvancedWorkspaceSource = {
      id: 'source-1',
      name: 'Google Sheet',
      sourceType: 'Google Sheet',
      sourceKind: 'online_link',
      registeredAt: new Date().toISOString(),
      tables: [{
        id: 'table-1',
        name: 'data',
        rowCount: 1,
        columns: ['Mã phiếu xuất', 'Ngày xuất'],
        profiles: {},
        file: new File(['stub'], 'sheet.csv', { type: 'text/csv' }),
      }],
    };

    const session = new AdvancedFileSession();
    await session.open(source);

    expect(mockDb.registerFileText).toHaveBeenCalledWith(
      'advanced-source-0.json',
      '[{"mã phiếu xuất":1,"ngày xuất":"2021-09-20"}]',
    );
    expect(mockConn.query).toHaveBeenCalledWith(
      'CREATE OR REPLACE VIEW "__lightbi_source_0" AS SELECT * FROM read_json_auto(\'advanced-source-0.json\')',
    );
    expect(mockConn.query).toHaveBeenCalledWith(
      'CREATE OR REPLACE VIEW "data" AS SELECT "mã phiếu xuất" AS "Mã phiếu xuất", "ngày xuất" AS "Ngày xuất" FROM "__lightbi_source_0"',
    );
  });

  it('rebuilds the file workspace when the same source id is reopened with a different table', async () => {
    const mockConnOne = {
      query: vi.fn().mockResolvedValue({ schema: { fields: [{ name: 'first' }] }, toArray: () => [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockConnTwo = {
      query: vi.fn().mockResolvedValue({ schema: { fields: [{ name: 'second' }] }, toArray: () => [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockDb = {
      connect: vi.fn()
        .mockResolvedValueOnce(mockConnOne)
        .mockResolvedValueOnce(mockConnTwo),
      registerFileText: vi.fn(),
    };
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof loader.initDuckDbWasm>>,
    );
    vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
      jsonText: '[{"first":1}]',
      rowCount: 1,
    });

    const baseSource: AdvancedWorkspaceSource = {
      id: 'same-source',
      name: 'Local File',
      sourceType: 'Local File',
      sourceKind: 'local_file',
      registeredAt: new Date().toISOString(),
      tables: [{
        id: 'table-1',
        name: 'FirstTable',
        rowCount: 1,
        columns: ['first'],
        profiles: {},
        file: new File(['stub'], 'first.csv', { type: 'text/csv' }),
      }],
    };

    const session = new AdvancedFileSession();
    await session.open(baseSource);
    await session.open({
      ...baseSource,
      tables: [{
        ...baseSource.tables[0],
        id: 'table-2',
        name: 'SecondTable',
        columns: ['second'],
        file: new File(['stub'], 'second.csv', { type: 'text/csv' }),
      }],
    });

    expect(mockConnOne.close).toHaveBeenCalled();
    expect(mockDb.connect).toHaveBeenCalledTimes(2);
    expect(mockConnTwo.query).toHaveBeenCalledWith(
      'CREATE OR REPLACE VIEW "SecondTable" AS SELECT "second" AS "second" FROM "__lightbi_source_0"',
    );
  });

  it('keeps ordinary 1,500-row pagination recoverable for a complete Advanced to Easy handoff', async () => {
    const sourceRows = Array.from({ length: 1500 }, (_, index) => ({ id: index + 1 }));
    const fields = [{ name: 'id', type: 'INTEGER' }];
    const mockConn = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('LIMIT 0')) return { schema: { fields }, toArray: () => [] };
        const page = /LIMIT (\d+) OFFSET (\d+)/.exec(sql);
        if (page) {
          const limit = Number(page[1]);
          const offset = Number(page[2]);
          return {
            schema: { fields },
            toArray: () => sourceRows.slice(offset, offset + limit).map(row => ({ toJSON: () => row })),
          };
        }
        return { schema: { fields: [] }, toArray: () => [] };
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(loader, 'initDuckDbWasm').mockResolvedValue({
      connect: vi.fn().mockResolvedValue(mockConn),
      registerFileText: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof loader.initDuckDbWasm>>);
    vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
      jsonText: JSON.stringify(sourceRows),
      rowCount: sourceRows.length,
    });
    const source: AdvancedWorkspaceSource = {
      id: 'local:1500', name: 'orders.csv', sourceType: 'local_csv', sourceKind: 'local_file', registeredAt: new Date().toISOString(),
      tables: [{ id: 'data', name: 'data', rowCount: 1500, columns: ['id'], profiles: {}, file: new File(['id\n1'], 'orders.csv', { type: 'text/csv' }) }],
    };
    const session = new AdvancedFileSession();
    await session.open(source);
    const first = await session.execute({ runId: 'page-1', sql: 'SELECT * FROM "data"', limit: 1000, offset: 0 });
    const second = await session.execute({ runId: 'page-2', sql: 'SELECT * FROM "data"', limit: 1000, offset: 1000 });

    expect(first.rows).toHaveLength(1000);
    expect(first.page).toMatchObject({ offset: 0, limit: 1000, hasMore: true });
    expect(first.truncated).toBe(false);
    expect(second.rows).toHaveLength(500);
    expect(second.page).toMatchObject({ offset: 1000, limit: 1000, hasMore: false });
    expect(second.truncated).toBe(false);

    const complete = materializeAdvancedResultPages([first, second]);
    expect(complete.rows).toHaveLength(1500);
    expect(complete.rows[0]).toEqual([1]);
    expect(complete.rows.at(-1)).toEqual([1500]);
    expect(new Set(complete.rows.map(row => row[0])).size).toBe(1500);
    expect(complete.page).toEqual({ offset: 0, limit: 1500, hasMore: false, estimatedTotal: 1500 });
  });
});
