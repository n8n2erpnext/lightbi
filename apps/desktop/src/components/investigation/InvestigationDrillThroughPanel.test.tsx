// @vitest-environment jsdom
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import { InvestigationDrillThroughPanel, type FilteredDeepAnalysisScope } from './InvestigationDrillThroughPanel';

describe('InvestigationDrillThroughPanel selected-data analysis', () => {
  it('hands the existing BA flow only the rows selected after drill-through filters', async () => {
    const onAnalyzeSelection = vi.fn<(scope: FilteredDeepAnalysisScope) => void>();
    const rows = [
      { Store: 'A', Stock: 12 },
      { Store: 'B', Stock: 25 },
      { Store: 'A', Stock: 18 },
    ];
    const drillResult = {
      id: 'drill-store',
      sourceSqlPreviewId: 'sql-store',
      status: 'executed' as const,
      columns: ['Store', 'Stock'],
      rows,
      rowCount: rows.length,
      maxRows: 50_000,
      warnings: [],
      blockedReasons: [],
      executionScope: 'full_file' as const,
      source: 'local_duckdb_preview' as const,
      point: { dimensionField: 'Region', value: 'South', label: 'South' },
    };

    const Harness = () => {
      const [selected, setSelected] = useState(new Set(rows.map((_, index) => index)));
      return <InvestigationDrillThroughPanel
        drillError={null}
        drillExportBaseName="stores"
        drillResult={drillResult}
        isDrilling={false}
        onAnalyzeSelection={onAnalyzeSelection}
        onClose={vi.fn()}
        preferences={DEFAULT_PREFERENCES}
        selectedDrillRows={selected}
        selectedRows={rows.filter((_, index) => selected.has(index))}
        setSelectedDrillRows={setSelected}
      />;
    };

    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'Store' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    await waitFor(() => expect(screen.getByText('2 / 2 filtered rows selected for export')).toBeTruthy());
    fireEvent.click(screen.getByTestId('analyze-selected-rows'));

    expect(onAnalyzeSelection).toHaveBeenCalledTimes(1);
    expect(onAnalyzeSelection.mock.calls[0][0]).toMatchObject({
      rows: [{ Store: 'A', Stock: 12 }, { Store: 'A', Stock: 18 }],
      matchedRowCount: 2,
      selectedRowCount: 2,
      isTruncated: false,
      point: { dimensionField: 'Region', label: 'South' },
    });
    expect(onAnalyzeSelection.mock.calls[0][0].filters).toEqual([
      expect.objectContaining({ column: 'Store', operator: 'equals', value: 'A' }),
    ]);
  });
});
