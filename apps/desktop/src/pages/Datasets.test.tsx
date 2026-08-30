// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Datasets } from './Datasets';
import { createAnalysisWorkbookPlan } from '../lib/analysis-workbook';
import * as materializer from '../lib/full-file-runtime-materializer';
import { useAdvancedSourceStore } from '../stores/advanced-source-store';
import { useAnalysisExportStore } from '../stores/analysis-export-store';

const sourceFile = new File(['stub'], 'sales.csv', { type: 'text/csv' });

beforeEach(() => {
  useAdvancedSourceStore.setState({
    sources: [{
      id: 'file:sales', name: 'sales.csv', sourceType: 'csv', sourceKind: 'local_file', registeredAt: '2026-08-30T00:00:00.000Z',
      tables: [{ id: '0:data', name: 'data', rowCount: 2, columns: ['Order ID', 'Revenue'], profiles: {}, file: sourceFile }],
    }],
    activeSourceId: 'file:sales',
  });
  useAnalysisExportStore.getState().setPlan(createAnalysisWorkbookPlan({
    title: 'Revenue review', perspectiveId: 'revenue', sourceCount: 1,
    summaryRows: [{ reporting_period: '2026-06', sales_revenue: 250 }],
    evidenceSources: [{ sourceName: 'sales.csv', role: 'sales', period: '2026-06', sourceRowCount: 2, rows: [{ 'Order ID': 'A-1', Revenue: 100 }] }],
    createdAt: '2026-08-30T00:00:00.000Z',
  }));
  vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
    jsonText: JSON.stringify([{ 'Order ID': 'A-1', Revenue: 100 }, { 'Order ID': 'A-2', Revenue: 150 }]),
    rowCount: 2,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAnalysisExportStore.getState().clearPlan();
  useAdvancedSourceStore.setState({ sources: [], activeSourceId: null });
});

describe('Datasets export handoff', () => {
  it('places the governed Excel Analysis/Pivot export beside the Power BI package after clean preparation', async () => {
    render(<Datasets />);
    fireEvent.click(screen.getByTestId('prepare-clean-handoff'));
    await waitFor(() => expect(screen.getByTestId('clean-handoff-result')).toBeTruthy());

    expect(screen.getByTestId('download-powerbi-package')).toBeTruthy();
    expect(screen.getByTestId('download-excel-analysis-package')).toBeTruthy();
    expect(screen.getByTestId('excel-analysis-context').textContent).toContain('Revenue review');
    expect(screen.getByTestId('excel-analysis-context').textContent).toContain('Pivot View');
  });
});
