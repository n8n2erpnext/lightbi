// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import { InvestigationDeepAnalysis } from './InvestigationDeepAnalysis';

afterEach(cleanup);

describe('InvestigationDeepAnalysis export boundary', () => {
  it('keeps the dashboard CTA visible but outside the image/PDF capture surface', () => {
    render(
      <InvestigationDeepAnalysis
        action={{
          id: 'action-weight-by-route',
          opportunityName: 'Cargo weight by route',
          label: 'Cargo weight by route',
          description: 'Compare cargo weight by route',
          actionType: 'group_by',
          dimensions: ['route'],
          measures: ['weight'],
          confidenceScore: 100,
          source: 'dataset_understanding',
        }}
        brief={null}
        chartModel={null}
        onClose={vi.fn()}
        onCreateDashboard={vi.fn()}
        canCreateDashboard
        preferences={DEFAULT_PREFERENCES}
      />,
    );

    const exportSurface = screen.getByTestId('deep-analysis-export-surface');
    const dashboardCta = screen.getByTestId('deep-analysis-dashboard-cta');
    expect(dashboardCta).toBeTruthy();
    expect(exportSurface.contains(dashboardCta)).toBe(false);
  });

  it('reuses the existing deep-analysis surface for the selected-row scope without showing full-source decision content', () => {
    render(
      <InvestigationDeepAnalysis
        action={{
          id: 'action-stock-by-store',
          opportunityName: 'Stock by store',
          label: 'Stock by store',
          description: 'Compare stock by store',
          actionType: 'group_by',
          dimensions: ['store'],
          measures: ['stock_qty'],
          confidenceScore: 100,
          source: 'dataset_understanding',
        }}
        brief={null}
        chartModel={{
          id: 'chart_result_1', sourceResultId: 'result_1', status: 'ready', chartType: 'bar', title: 'Stock by store',
          xField: 'Store', yField: 'stock_qty', seriesFields: ['stock_qty'], rows: [{ Store: 'A', stock_qty: 12 }], warnings: [], source: 'duckdb_preview_result',
        }}
        filteredScope={{
          rows: [{ Store: 'A', Stock: 12 }],
          filters: [{ id: 'store-a', column: 'Store', operator: 'equals', value: 'A' }],
          point: { dimensionField: 'Store', value: 'A', label: 'A' },
          matchedRowCount: 3,
          selectedRowCount: 1,
          sourceResultRowCount: 3,
          maxRows: 50_000,
          isTruncated: false,
        }}
        onClose={vi.fn()}
        preferences={DEFAULT_PREFERENCES}
      />,
    );

    expect(screen.getByTestId('filtered-deep-analysis-scope').textContent).toContain('Store = A');
    expect(screen.getByTestId('deep-analysis-export-excel')).not.toHaveProperty('disabled', true);
    expect(screen.getByText('Deep BA analysis · Step 2')).toBeTruthy();
    expect(screen.queryByText('Run the preview first, then LightBI can explain this decision angle in depth.')).toBeNull();
    expect(screen.queryByTestId('deep-analysis-dashboard-cta')).toBeNull();
  });
});
