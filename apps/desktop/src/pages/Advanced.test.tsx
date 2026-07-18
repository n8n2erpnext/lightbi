// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Advanced } from './Advanced';
import { useAdvancedSourceStore } from '../stores/advanced-source-store';
import { commitAdvancedMutation, executeAdvancedQuery, loadAdvancedImportJob, previewAdvancedScript, startAdvancedSqlImport } from '../lib/advanced-api';

vi.mock('echarts-for-react', () => ({ default: () => <div>Chart</div> }));
vi.mock('../lib/advanced-file-session', () => ({
  AdvancedFileSession: class {
    open = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    execute = vi.fn().mockResolvedValue({
      runId: 'file-run',
      columns: [
        { id: 'region', name: 'region', logicalType: 'string', nativeType: 'VARCHAR' },
        { id: 'sales', name: 'sales', logicalType: 'number', nativeType: 'DOUBLE' },
      ],
      rows: [['North', 12], ['South', 20]],
      page: { offset: 0, limit: 200, hasMore: false },
      truncated: false,
      warnings: [],
      executionMs: 3,
    });
  },
}));
vi.mock('../lib/advanced-api', async importOriginal => {
  const original = await importOriginal<typeof import('../lib/advanced-api')>();
  return {
    ...original,
    createAdvancedConnection: vi.fn().mockResolvedValue({ connectionId: 'connection-1', name: 'Warehouse', database: 'analytics', provider: 'postgresql' }),
    loadAdvancedSchema: vi.fn().mockResolvedValue({
      connectionId: 'connection-1',
      connectionName: 'Warehouse',
      database: 'analytics',
      schemas: [{
        name: 'public',
        routines: [],
        tables: [{
          name: 'people',
          kind: 'base_table',
          estimatedRows: 1,
          writable: true,
          columns: [
            { name: 'id', nativeType: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'name', nativeType: 'TEXT', nullable: true },
          ],
          indexes: [],
          foreignKeys: [],
        }, {
          name: 'orders',
          kind: 'base_table',
          estimatedRows: 1,
          writable: false,
          columns: [
            { name: 'order_id', nativeType: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'customer_id', nativeType: 'INTEGER', nullable: false },
          ],
          indexes: [],
          foreignKeys: [{ name: 'orders_customer_id_fkey', columns: ['customer_id'], referencedTable: 'people', referencedColumns: ['id'] }],
        }],
      }],
    }),
    executeAdvancedQuery: vi.fn().mockImplementation((_, request: { sql: string }) => Promise.resolve(request.sql.includes('PARTIAL') ? {
      runId: 'partial-run',
      columns: [{ id: 'id', name: 'id', logicalType: 'number', nativeType: 'INTEGER' }],
      rows: [[1]],
      page: { offset: 0, limit: 1, hasMore: true, estimatedTotal: 2 },
      truncated: false,
      warnings: [],
      executionMs: 2,
    } : request.sql.includes('"orders"') ? {
      runId: 'db-run',
      columns: [
        { id: 'order_id', name: 'order_id', logicalType: 'number', nativeType: 'INTEGER' },
        { id: 'customer_id', name: 'customer_id', logicalType: 'number', nativeType: 'INTEGER' },
      ],
      rows: [[10, 1]],
      page: { offset: 0, limit: 200, hasMore: false },
      truncated: false,
      warnings: [],
      executionMs: 4,
    } : {
      runId: 'db-run',
      columns: [
        { id: 'id', name: 'id', logicalType: 'number', nativeType: 'INTEGER' },
        { id: 'name', name: 'name', logicalType: 'string', nativeType: 'TEXT' },
      ],
      rows: [[1, 'Alice']],
      page: { offset: 0, limit: 200, hasMore: false },
      truncated: false,
      warnings: [],
      executionMs: 4,
    })),
    previewAdvancedMutation: vi.fn().mockResolvedValue({ statements: ['INSERT INTO "people" ("name") VALUES (?)'], rowCount: 1, canCommit: true }),
    commitAdvancedMutation: vi.fn().mockResolvedValue({ updatedRows: 1 }),
    previewAdvancedScript: vi.fn().mockResolvedValue({ statements: ['CREATE TABLE "public"."demo" ("id" INTEGER);'], statementCount: 1, canCommit: true }),
    startAdvancedSqlImport: vi.fn().mockResolvedValue({ jobId: 'import-job-1' }),
    loadAdvancedImportJob: vi.fn().mockResolvedValue({ jobId: 'import-job-1', status: 'completed', statementCount: 1, executedStatements: 1 }),
    explainAdvancedQuery: vi.fn().mockResolvedValue({
      plan: [{
        Plan: {
          'Node Type': 'Seq Scan',
          'Relation Name': 'people',
          'Startup Cost': 0,
          'Total Cost': 12.5,
          'Plan Rows': 42,
          Plans: [{ 'Node Type': 'Filter', 'Startup Cost': 0, 'Total Cost': 4.2, 'Plan Rows': 5 }],
        },
        'Planning Time': 0.123,
        'Execution Time': 1.234,
      }],
      executionMs: 2,
    }),
    loadAdvancedTableCount: vi.fn().mockResolvedValue({ schema: 'public', table: 'people', exactRows: 1, cached: false }),
    loadAdvancedHistory: vi.fn().mockResolvedValue([]),
    loadAdvancedFavorites: vi.fn().mockResolvedValue([]),
    closeAdvancedConnection: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Advanced workspace', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    });
    useAdvancedSourceStore.setState({ sources: [], activeSourceId: null });
  });

  it('opens a connection into a lightweight multi-tab workspace', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());
    expect(screen.getByText('Query 1')).toBeTruthy();

    fireEvent.click(screen.getByTitle('New query tab'));
    expect(screen.getByText('Query 2')).toBeTruthy();
    expect(localStorage.getItem('lightbi.advanced.tabs.v1')).not.toContain('rows');
  });

  it('renders PostgreSQL explain as a plan tree', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Explain PostgreSQL query plan'));
    await waitFor(() => expect(screen.getByText('Plan tree')).toBeTruthy());
    expect(screen.getByText('Seq Scan')).toBeTruthy();
    expect(screen.getAllByText('people').length).toBeGreaterThan(0);
    expect(screen.getByText('Execution 1.234ms')).toBeTruthy();
  });

  it('opens SQL assistant with optimization hints', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('SQL query'), { target: { value: 'SELECT * FROM people ORDER BY name' } });
    fireEvent.click(screen.getByTitle('AI explain and optimize SQL'));
    expect(screen.getByRole('dialog', { name: 'SQL assistant' })).toBeTruthy();
    expect(screen.getByText(/Select only needed columns/)).toBeTruthy();
    expect(screen.getByText(/ORDER BY without LIMIT/)).toBeTruthy();
  });

  it('detects SQL parameters and executes with materialized values', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('SQL query'), { target: { value: 'SELECT * FROM people WHERE id = :id AND name = :name' } });
    fireEvent.change(screen.getByLabelText('Parameter id'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Parameter name'), { target: { value: "O'Reilly" } });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => expect(executeAdvancedQuery).toHaveBeenCalled());
    const [, request] = vi.mocked(executeAdvancedQuery).mock.calls.at(-1)!;
    expect(request.sql).toContain('id = 42');
    expect(request.sql).toContain("name = 'O''Reilly'");
    expect(request.sql).not.toContain(':id');
  });

  it('reviews and commits SQL scripts through a transaction flow', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('SQL query'), { target: { value: 'CREATE TABLE "public"."demo" ("id" INTEGER);' } });
    fireEvent.click(screen.getByTitle('Review SQL script transaction'));

    const dialog = await screen.findByRole('dialog', { name: 'Review SQL script transaction' });
    expect(within(dialog).getByText(/1 statement/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Commit script' }));

    await waitFor(() => expect(startAdvancedSqlImport).toHaveBeenCalledWith('connection-1', 'CREATE TABLE "public"."demo" ("id" INTEGER);'));
    expect(loadAdvancedImportJob).toHaveBeenCalledWith('import-job-1');
    expect(previewAdvancedScript).toHaveBeenCalled();
  });

  it('imports a SQL file into a reviewable transaction tab', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    const sql = 'CREATE TABLE "public"."demo" ("id" INTEGER);';
    fireEvent.change(screen.getByLabelText('SQL import file'), {
      target: { files: [new File([sql], 'demo.sql', { type: 'application/sql' })] },
    });

    const dialog = await screen.findByRole('dialog', { name: 'Review SQL script transaction' });
    expect(screen.getByText('demo')).toBeTruthy();
    expect((screen.getByLabelText('SQL query') as HTMLTextAreaElement).value).toBe(sql);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Commit script' }));

    await waitFor(() => expect(startAdvancedSqlImport).toHaveBeenCalledWith('connection-1', sql));
  });

  it('opens command switcher for table navigation', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Command switcher'));
    const dialog = screen.getByRole('dialog', { name: 'Command switcher' });
    fireEvent.change(within(dialog).getByLabelText('Command search'), { target: { value: 'people' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /people/ }));

    expect((screen.getByLabelText('SQL query') as HTMLTextAreaElement).value).toBe('SELECT *\nFROM "public"."people"');
    expect(screen.queryByRole('dialog', { name: 'Command switcher' })).toBeNull();
  });

  it('imports a Simple-understood source into a writable DB table', async () => {
    useAdvancedSourceStore.getState().registerSource({
      id: 'local:people-import',
      name: 'people-import.xlsx',
      sourceType: 'local_xlsx',
      sourceKind: 'local_file',
      tables: [{
        id: 'sheet:people',
        name: 'People',
        rowCount: 2,
        columns: ['name'],
        profiles: {},
        file: new File(['name\nBob'], 'people.csv', { type: 'text/csv' }),
        sheetName: 'People',
      }],
      semanticSample: { strategy: 'matrix_sample', sourceRowCount: 2, sampleRowCount: 2 },
      registeredAt: new Date().toISOString(),
    });

    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Import understood file into DB table'));
    const importDialog = screen.getByRole('dialog', { name: 'Import source into database' });
    expect(importDialog).toBeTruthy();
    expect(within(importDialog).getByText('1/1 mapped')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(commitAdvancedMutation).toHaveBeenCalled());
  });

  it('generates create-table import SQL from a Simple-understood source', async () => {
    useAdvancedSourceStore.getState().registerSource({
      id: 'local:orders-import',
      name: 'orders-import.xlsx',
      sourceType: 'local_xlsx',
      sourceKind: 'local_file',
      tables: [{
        id: 'sheet:orders-import',
        name: 'Orders',
        rowCount: 2,
        columns: ['region', 'sales'],
        profiles: {
          region: { name: 'region', dataType: 'string', distinctCount: 1, nullPercent: 0, topValues: ['North'], topValueCounts: [{ value: 'North', count: 1 }], isIdentifier: false, isCategorical: true },
          sales: { name: 'sales', dataType: 'number', distinctCount: 1, nullPercent: 0, topValues: ['12'], topValueCounts: [{ value: '12', count: 1 }], isIdentifier: false, isCategorical: false },
        },
        file: new File(['region,sales\nNorth,12'], 'orders.csv', { type: 'text/csv' }),
        sheetName: 'Orders',
      }],
      semanticSample: { strategy: 'matrix_sample', sourceRowCount: 2, sampleRowCount: 2 },
      registeredAt: new Date().toISOString(),
    });

    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Import understood file into DB table'));
    const importDialog = screen.getByRole('dialog', { name: 'Import source into database' });
    fireEvent.change(within(importDialog).getByLabelText('Target table'), { target: { value: '__create_new_table__' } });
    fireEvent.change(within(importDialog).getByLabelText('Import new table'), { target: { value: 'orders_imported' } });
    fireEvent.click(within(importDialog).getByRole('button', { name: 'Generate SQL' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Import source into database' })).toBeNull());
    const sql = (screen.getByLabelText('SQL query') as HTMLTextAreaElement).value;
    expect(sql).toContain('CREATE TABLE "public"."orders_imported"');
    expect(sql).toContain('"region" TEXT');
    expect(sql).toContain('"sales" DOUBLE PRECISION');
    expect(sql).toContain('INSERT INTO "public"."orders_imported" ("region", "sales") VALUES (\'North\', 12);');
  });

  it('opens a session-only file source inherited from Simple', async () => {
    useAdvancedSourceStore.getState().registerSource({
      id: 'local:orders',
      name: 'orders.xlsx',
      sourceType: 'local_xlsx',
      sourceKind: 'local_file',
      tables: [{
        id: 'sheet:orders',
        name: 'Orders',
        rowCount: 42,
        columns: ['region', 'sales'],
        profiles: {},
        file: new File(['region,sales\nNorth,12'], 'orders.csv', { type: 'text/csv' }),
        sheetName: 'Orders',
      }],
      semanticSample: { strategy: 'matrix_sample', sourceRowCount: 42, sampleRowCount: 20 },
      registeredAt: new Date().toISOString(),
    });

    render(<Advanced />);
    expect(screen.getByText('Datasets understood in Simple')).toBeTruthy();
    expect(screen.getByText(/42 rows/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(screen.getByText(/inherited Simple understanding/)).toBeTruthy());
    expect((screen.getByLabelText('SQL query') as HTMLTextAreaElement).value).toBe('SELECT *\nFROM "Orders"');

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByText('North')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    expect(screen.getByText(/"region": "North"/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Structure' }));
    expect(screen.getByRole('columnheader', { name: 'Distinct' })).toBeTruthy();
    expect(screen.getByText('DOUBLE')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    fireEvent.click(screen.getByTitle('Toggle result edit mode'));
    fireEvent.doubleClick(screen.getByText('12'));
    const editor = screen.getByDisplayValue('12');
    fireEvent.change(editor, { target: { value: '99' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(screen.getByText('1 changed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    expect(screen.getByText(/"sales": 99/)).toBeTruthy();
    fireEvent.click(screen.getByTitle('Undo edit'));
    expect(screen.getByText(/"sales": 12/)).toBeTruthy();
    fireEvent.click(screen.getByTitle('Redo edit'));
    expect(screen.getByText(/"sales": 99/)).toBeTruthy();
    fireEvent.click(screen.getByTitle('Discard result edits'));
    expect(screen.queryByText('1 changed')).toBeNull();
  });

  it('supports writable table insert, duplicate, and delete pending actions', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByTitle('Open public.people')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Open public.people'));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    fireEvent.click(screen.getByTitle('Toggle result edit mode'));

    fireEvent.click(screen.getByTitle('Insert new row'));
    const dialog = screen.getByRole('dialog', { name: 'Insert new row' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Bob' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add pending row' }));
    expect(screen.getByText('1 insert')).toBeTruthy();

    fireEvent.contextMenu(screen.getByText('Alice'));
    fireEvent.click(screen.getByText('Duplicate as insert'));
    expect(screen.getByText('2 insert')).toBeTruthy();
    fireEvent.contextMenu(screen.getByText('Alice'));
    fireEvent.click(screen.getByText('Mark row delete'));
    expect(screen.getByText('1 delete')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Close tab with unsaved changes'));
    const closeDialog = screen.getByRole('dialog', { name: 'Unsaved tab changes' });
    expect(closeDialog).toBeTruthy();
    fireEvent.click(within(closeDialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Unsaved tab changes' })).toBeNull();
  });

  it('navigates from a foreign-key cell to the referenced row', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByTitle('Open public.orders')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Open public.orders'));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByText('10')).toBeTruthy());

    fireEvent.contextMenu(screen.getByText('1'));
    fireEvent.click(screen.getByText('Open people'));

    expect((screen.getByLabelText('SQL query') as HTMLTextAreaElement).value).toBe('SELECT *\nFROM "public"."people"\nWHERE "id" = 1');
  });

  it('builds create-table SQL with keys, indexes, and foreign keys', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Create table SQL'));
    const dialog = screen.getByRole('dialog', { name: 'Create table SQL' });
    fireEvent.change(within(dialog).getByLabelText('Create table name'), { target: { value: 'shipments' } });
    fireEvent.change(within(dialog).getByLabelText('Column name'), { target: { value: 'customer_id' } });
    fireEvent.change(within(dialog).getByLabelText('Column type'), { target: { value: 'INTEGER' } });
    fireEvent.click(within(dialog).getByLabelText('Column primary key'));
    fireEvent.click(within(dialog).getByLabelText('Column indexed'));
    fireEvent.change(within(dialog).getByLabelText('References table'), { target: { value: 'people' } });
    fireEvent.change(within(dialog).getByLabelText('References column'), { target: { value: 'id' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open SQL in tab' }));

    const sql = (screen.getByLabelText('SQL query') as HTMLTextAreaElement).value;
    expect(sql).toContain('CREATE TABLE "public"."shipments"');
    expect(sql).toContain('PRIMARY KEY ("customer_id")');
    expect(sql).toContain('REFERENCES "public"."people" ("id")');
  });

  it('builds table-structure ALTER SQL from current schema metadata', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByTitle('Open public.people')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Open public.people'));
    fireEvent.click(screen.getByTitle('Edit table structure SQL'));
    const dialog = screen.getByRole('dialog', { name: 'Edit table structure SQL' });
    fireEvent.change(within(dialog).getByLabelText('Structure table name'), { target: { value: 'customers' } });
    fireEvent.change(within(dialog).getByLabelText('Structure column name name'), { target: { value: 'full_name' } });
    fireEvent.change(within(dialog).getByLabelText('Structure column name type'), { target: { value: 'VARCHAR(255)' } });
    fireEvent.click(within(dialog).getByLabelText('Structure column name nullable'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add column' }));
    fireEvent.change(within(dialog).getByLabelText('New structure column name'), { target: { value: 'email' } });
    fireEvent.change(within(dialog).getByLabelText('New structure column type'), { target: { value: 'TEXT' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open SQL in tab' }));

    const sql = (screen.getByLabelText('SQL query') as HTMLTextAreaElement).value;
    expect(sql).toContain('ALTER TABLE "public"."people" RENAME TO "customers";');
    expect(sql).toContain('ALTER TABLE "public"."customers" RENAME COLUMN "name" TO "full_name";');
    expect(sql).toContain('ALTER TABLE "public"."customers" ALTER COLUMN "full_name" TYPE VARCHAR(255);');
    expect(sql).toContain('ALTER TABLE "public"."customers" ALTER COLUMN "full_name" SET NOT NULL;');
    expect(sql).toContain('ALTER TABLE "public"."customers" ADD COLUMN "email" TEXT;');
  });

  it('supports grid range selection and TSV copy', async () => {
    useAdvancedSourceStore.getState().registerSource({
      id: 'local:grid',
      name: 'grid.xlsx',
      sourceType: 'local_xlsx',
      sourceKind: 'local_file',
      tables: [{
        id: 'sheet:grid',
        name: 'Grid',
        rowCount: 2,
        columns: ['region', 'sales'],
        profiles: {},
        file: new File(['region,sales\nNorth,12'], 'grid.csv', { type: 'text/csv' }),
        sheetName: 'Grid',
      }],
      semanticSample: { strategy: 'matrix_sample', sourceRowCount: 2, sampleRowCount: 2 },
      registeredAt: new Date().toISOString(),
    });

    render(<Advanced />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByText(/inherited Simple understanding/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByText('North')).toBeTruthy());

    fireEvent.click(screen.getByText('North'));
    fireEvent.click(screen.getByText('20'), { shiftKey: true });
    expect(screen.getByText('2x2')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('grid', { name: 'Result grid' }), { key: 'c', ctrlKey: true });
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('North\t12\nSouth\t20'));

    fireEvent.contextMenu(screen.getByText('North'));
    fireEvent.click(screen.getByText('Copy rows INSERT'));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('INSERT INTO "target_table" ("region", "sales") VALUES (\'North\', 12);\nINSERT INTO "target_table" ("region", "sales") VALUES (\'South\', 20);'));

    fireEvent.contextMenu(screen.getByText('North'));
    fireEvent.click(screen.getByText('Copy rows UPDATE'));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('UPDATE "target_table" SET "sales" = 12 WHERE "region" = \'North\';\nUPDATE "target_table" SET "sales" = 20 WHERE "region" = \'South\';'));

    fireEvent.contextMenu(screen.getByText('North'));
    fireEvent.click(screen.getByText('Copy column values'));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('North\nSouth'));
  });

  it('supports grid paste range and column reorder', async () => {
    useAdvancedSourceStore.getState().registerSource({
      id: 'local:grid-pro',
      name: 'grid-pro.xlsx',
      sourceType: 'local_xlsx',
      sourceKind: 'local_file',
      tables: [{
        id: 'sheet:grid-pro',
        name: 'GridPro',
        rowCount: 2,
        columns: ['region', 'sales'],
        profiles: {},
        file: new File(['region,sales\nNorth,12'], 'grid-pro.csv', { type: 'text/csv' }),
        sheetName: 'GridPro',
      }],
      semanticSample: { strategy: 'matrix_sample', sourceRowCount: 2, sampleRowCount: 2 },
      registeredAt: new Date().toISOString(),
    });

    render(<Advanced />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByText(/inherited Simple understanding/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByText('North')).toBeTruthy());
    fireEvent.click(screen.getByTitle('Toggle result edit mode'));

    vi.mocked(navigator.clipboard.readText).mockResolvedValue('East\t33\nWest\t44');
    fireEvent.click(screen.getByText('North'));
    fireEvent.keyDown(screen.getByRole('grid', { name: 'Result grid' }), { key: 'v', ctrlKey: true });
    await waitFor(() => expect(screen.getByText('4 changed')).toBeTruthy());
    expect(screen.getByText('East')).toBeTruthy();
    expect(screen.getByText('44')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Move region right'));
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0].textContent).toContain('sales');
    expect(headers[1].textContent).toContain('region');
  });

  it('keeps a bounded result visible but blocks full-source BA handoff', async () => {
    render(<Advanced />);
    fireEvent.change(screen.getByLabelText('Connection URL or SQLite path'), { target: { value: 'postgresql://example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.getByText('Warehouse · analytics')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('SQL query'), { target: { value: 'SELECT 1 /* PARTIAL */' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(screen.getByTestId('advanced-result-completeness').textContent).toContain('bounded result'));
    expect((screen.getByRole('button', { name: 'BA Brief' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
