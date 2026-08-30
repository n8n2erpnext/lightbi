// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import { createDecisionVisualizationPlan } from '../../lib/decision-visualization-plan';
import * as cleanHandoff from '../../lib/clean-data-handoff';
import * as pivotExport from '../../lib/excel-pivot-export';
import { InvestigationDeepAnalysis } from './InvestigationDeepAnalysis';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const canonicalBoundary = { datasetId: 'sales.xlsx', sourceId: 'source:sales' } as any;

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
        canonicalSourceBoundary={canonicalBoundary}
        onClose={vi.fn()}
        preferences={DEFAULT_PREFERENCES}
      />,
    );

    expect(screen.getByTestId('filtered-deep-analysis-scope').textContent).toContain('Store = A');
    expect(screen.getByTestId('deep-analysis-export-excel')).not.toHaveProperty('disabled', true);
    fireEvent.click(screen.getByTestId('deep-analysis-export-excel'));
    expect(screen.getByTestId('deep-analysis-export-pivot-full')).toBeTruthy();
    expect(screen.getByTestId('deep-analysis-export-pivot-selection')).not.toHaveProperty('disabled', true);
    expect(screen.getByText('Deep BA analysis · Step 2')).toBeTruthy();
    expect(screen.queryByText('Run the preview first, then LightBI can explain this decision angle in depth.')).toBeNull();
    expect(screen.queryByTestId('deep-analysis-dashboard-cta')).toBeNull();
  });

  it('exports Excel Pivot with the governed perspective identity instead of the BA mode label', async () => {
    vi.spyOn(cleanHandoff, 'createCleanDataHandoffFromCanonicalBoundary').mockResolvedValue({ artifact: { source: { sourceRows: 1 }, lineage: [] }, cleanRows: [] } as any);
    const save = vi.spyOn(pivotExport, 'saveExcelPivotWorkbook').mockResolvedValue({ fileName: 'test.xlsx', locationLabel: 'test.xlsx', usedSaveAs: true, recipe: {} as any, exportedRowCount: 1 });
    const chartModel = {
      id: 'chart_result_sales', sourceResultId: 'result_sales', status: 'ready' as const, chartType: 'bar' as const,
      title: 'Sales by product', xField: 'Product', yField: 'sales_revenue', seriesFields: ['sales_revenue'],
      rows: [{ Product: 'Aqua 250L', sales_revenue: 100 }], warnings: [], source: 'duckdb_preview_result' as const,
    };
    const decisionVisualizationPlan = createDecisionVisualizationPlan({
      perspectiveId: 'action-sales-by-product', rows: chartModel.rows, sourceCount: 1,
      dimensionField: 'Product', metricIds: ['sales_revenue'],
    });

    render(
      <InvestigationDeepAnalysis
        action={{
          id: 'action-sales-by-product', opportunityName: 'Which products contribute the most sales revenue?',
          label: 'Sales by product', description: 'Compare sales by product', actionType: 'group_by',
          dimensions: ['product'], measures: ['sales_revenue'], confidenceScore: 100, source: 'dataset_understanding',
        }}
        brief={null}
        chartModel={chartModel}
        decisionVisualizationPlan={decisionVisualizationPlan}
        singleSourceBAOverview={{
          mode: 'commercial', analysisLabel: 'Revenue analysis', breakdownHeading: 'By product', rowCount: 1,
          sourceRowCount: 1, isRepresentativeSample: false, bindings: {},
          kpis: [{ id: 'revenue', label: 'Revenue', value: 100, format: 'number' }], trend: [], trendChange: null,
          breakdowns: [], concentration: null, outlierCount: 0, findings: [], recommendedActions: [], limitations: [],
        }}
        canonicalSourceBoundary={canonicalBoundary}
        onClose={vi.fn()}
        preferences={DEFAULT_PREFERENCES}
      />,
    );

    fireEvent.click(screen.getByTestId('deep-analysis-export-excel'));
    fireEvent.click(screen.getByTestId('deep-analysis-export-pivot-full'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save.mock.calls[0]?.[0].mode).toBe('full');
    expect(save.mock.calls[0]?.[0].action.id).toBe('action-sales-by-product');
    expect(save.mock.calls[0]?.[0].decisionVisualizationPlan?.perspectiveId).toBe('action-sales-by-product');
  });

});
