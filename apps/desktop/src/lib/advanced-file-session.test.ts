// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedFileSession } from './advanced-file-session';
import * as loader from './duckdb-wasm-loader';
import * as materializer from './full-file-runtime-materializer';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';

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
});
