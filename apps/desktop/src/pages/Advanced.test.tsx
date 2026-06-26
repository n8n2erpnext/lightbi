// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Advanced } from './Advanced';
import { useAdvancedSourceStore } from '../stores/advanced-source-store';

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
    loadAdvancedSchema: vi.fn().mockResolvedValue({ connectionId: 'connection-1', connectionName: 'Warehouse', database: 'analytics', schemas: [] }),
    loadAdvancedHistory: vi.fn().mockResolvedValue([]),
    loadAdvancedFavorites: vi.fn().mockResolvedValue([]),
    closeAdvancedConnection: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Advanced workspace', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
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
  });
});
