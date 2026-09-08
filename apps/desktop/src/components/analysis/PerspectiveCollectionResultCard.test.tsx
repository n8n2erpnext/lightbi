// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCollectionResultCard } from './PerspectiveCollectionResultCard';
import { useAnalysisExportStore } from '../../stores/analysis-export-store';
import { createDomainComparisonBrief } from '../../lib/ba-comparison-engine';
import { useAppRuntime } from '@lightbi/runtime';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('echarts-for-react', () => ({
  default: (props: { option?: { series?: Array<{ type?: string }> }; onEvents?: { click?: (params: { dataIndex: number; seriesIndex: number }) => void } }) => (
    <button type="button" data-testid="collection-chart" data-series-type={props.option?.series?.[0]?.type} onClick={() => props.onEvents?.click?.({ dataIndex: 0, seriesIndex: 0 })}>Chart</button>
  ),
}));

afterEach(() => {
  cleanup();
  useAnalysisExportStore.getState().clearPlan();
  useAppRuntime.setState({ dashboards: {}, charts: {}, activeDashboardId: null, activeChartId: null });
});

describe('PerspectiveCollectionResultCard selected-data analysis', () => {
  it('opens source-bound evidence and enters selected-subject investigation for the selected multi-file chart point', () => {
    render(<PerspectiveCollectionResultCard
      perspectiveId="executive_overview"
      rows={[
        { reporting_period: '2026-05', sales_revenue: 300 },
        { reporting_period: '2026-06', sales_revenue: 250 },
      ]}
      sourceCount={2}
      evidenceSources={[{
        period: '2026-05',
        role: 'sales',
        sourceName: 'sales-2026-05.xlsx',
        sourceRowCount: 3,
        rows: [
          { Product: 'A', Revenue: 100 },
          { Product: 'A', Revenue: 120 },
          { Product: 'B', Revenue: 80 },
        ],
        semanticFields: [
          { canonicalId: 'product', label: 'Product', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Product', reason: 'test' },
          { canonicalId: 'revenue', label: 'Revenue', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Revenue', reason: 'test' },
        ],
      }]}
    />);

    fireEvent.click(screen.getByTestId('collection-chart'));
    expect(screen.getByTestId('collection-chart-drill')).toBeTruthy();
    expect(screen.getByText(/sales-2026-05\.xlsx/)).toBeTruthy();
    expect(screen.getByText('Product')).toBeTruthy();
    expect(screen.getByRole('table').parentElement?.className).toContain('max-h-[420px]');

    fireEvent.click(screen.getByRole('button', { name: /Investigate selected evidence/i }));
    expect(screen.getByTestId('collection-subset-deep-ba')).toBeTruthy();
    expect(screen.getByTestId('selected-subject-investigation')).toBeTruthy();
    expect(screen.getByTestId('selected-subject-benchmark').textContent).toContain('sales-2026-05.xlsx');
    expect(screen.queryByTestId('single-source-ba-overview')).toBeNull();
  });

  it('treats one reporting period as a snapshot and routes through evidence before selected-subject investigation', () => {
    render(<PerspectiveCollectionResultCard
      perspectiveId="executive_overview"
      rows={[{ reporting_period: '2026-06', sales_revenue: 250 }]}
      sourceCount={1}
      evidenceSources={[{
        period: '2026-06',
        role: 'sales',
        sourceName: 'current-period.xlsx',
        sourceRowCount: 3,
        rows: [
          { Product: 'A', Revenue: 100 },
          { Product: 'A', Revenue: 70 },
          { Product: 'B', Revenue: 80 },
        ],
        semanticFields: [
          { canonicalId: 'product', label: 'Product', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Product', reason: 'test' },
          { canonicalId: 'revenue', label: 'Revenue', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Revenue', reason: 'test' },
        ],
      }]}
    />);

    expect(screen.getByTestId('collection-chart').getAttribute('data-series-type')).toBe('bar');
    expect(screen.getByTestId('collection-export-excel-analysis')).toBeTruthy();
    expect(screen.getByText('Single-period snapshot')).toBeTruthy();
    expect(screen.queryByText(/0\.0%/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /What explains the composition/i }));
    expect(screen.getByTestId('collection-evidence-drill-surface')).toBeTruthy();
    expect(screen.getByTestId('collection-chart-drill')).toBeTruthy();
    expect(screen.queryByTestId('collection-subset-deep-ba')).toBeNull();
    expect(screen.queryByTestId('collection-decision-workspace')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Investigate selected evidence/i }));
    expect(screen.getByTestId('collection-deep-selected-surface')).toBeTruthy();
    expect(screen.getByTestId('collection-subset-deep-ba')).toBeTruthy();
    expect(screen.queryByTestId('collection-chart-drill')).toBeNull();
    expect(screen.getByTestId('collection-deep-export-image')).toBeTruthy();
    expect(screen.getByTestId('collection-deep-export-pdf')).toBeTruthy();
    expect(screen.getByTestId('collection-create-dashboard')).toBeTruthy();

    fireEvent.click(screen.getByTestId('collection-deep-selected-back'));
    expect(screen.getByTestId('collection-evidence-drill-surface')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Clean and export sources/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Clean and export sources/i }));
    const exportPlan = useAnalysisExportStore.getState().plan;
    expect(exportPlan?.perspectiveId).toBe('executive_overview');
    expect(exportPlan?.combinationPolicy).toBe('single_source');
    expect(exportPlan?.tables.some(table => table.kind === 'evidence')).toBe(true);
  });
  it('keeps full Deep BA and selected-subject investigation mutually exclusive and restores the exact evidence source on Back', () => {
    const deepDiveBrief = createDomainComparisonBrief({
      periods: [
        { id: 'may', label: '2026-05', labelConfidence: 'high', labelReason: 'test', sortableKey: '2026-05', rows: [{ Product: 'A', Revenue: 300 }] },
        { id: 'june', label: '2026-06', labelConfidence: 'high', labelReason: 'test', sortableKey: '2026-06', rows: [{ Product: 'A', Revenue: 250 }] },
      ],
      preferredDomain: 'revenue',
    });
    const semanticFields = [
      { canonicalId: 'product', label: 'Product', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Product', reason: 'test' },
      { canonicalId: 'revenue', label: 'Revenue', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Revenue', reason: 'test' },
    ] as const;

    render(<PerspectiveCollectionResultCard
      perspectiveId="executive_overview"
      rows={[{ reporting_period: '2026-05', sales_revenue: 300 }, { reporting_period: '2026-06', sales_revenue: 250 }]}
      sourceCount={2}
      deepDiveBrief={deepDiveBrief}
      evidenceSources={[
        { period: '2026-05', role: 'sales', sourceName: 'sales-a.xlsx', sourceRowCount: 2, rows: [{ Product: 'A', Revenue: 100 }, { Product: 'B', Revenue: 200 }], semanticFields: [...semanticFields] },
        { period: '2026-05', role: 'sales', sourceName: 'sales-b.xlsx', sourceRowCount: 2, rows: [{ Product: 'C', Revenue: 120 }, { Product: 'D', Revenue: 180 }], semanticFields: [...semanticFields] },
      ]}
    />);

    expect(screen.getByTestId('collection-decision-workspace')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /What drove the change/i }));
    expect(screen.getByTestId('collection-deep-perspective-surface')).toBeTruthy();
    expect(screen.getByTestId('governed-ba-deep-dive')).toBeTruthy();
    expect(screen.queryByTestId('collection-decision-workspace')).toBeNull();
    expect(screen.queryByTestId('collection-deep-selected-surface')).toBeNull();
    expect(screen.queryByTestId('collection-chart-drill')).toBeNull();

    fireEvent.click(screen.getByTestId('collection-deep-perspective-back'));
    expect(screen.getByTestId('collection-decision-workspace')).toBeTruthy();
    fireEvent.click(screen.getByTestId('collection-chart'));
    expect(screen.getByTestId('collection-evidence-drill-surface')).toBeTruthy();
    fireEvent.click(screen.getByTestId('collection-evidence-source-1'));
    expect(screen.getByTestId('collection-evidence-source-1').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('table').textContent).toContain('C');

    fireEvent.click(screen.getByRole('button', { name: /Investigate selected evidence/i }));
    expect(screen.getByTestId('collection-deep-selected-surface')).toBeTruthy();
    expect(screen.queryByTestId('collection-deep-perspective-surface')).toBeNull();
    expect(screen.queryByTestId('governed-ba-deep-dive')).toBeNull();
    expect(screen.queryByTestId('collection-chart-drill')).toBeNull();

    fireEvent.click(screen.getByTestId('collection-deep-selected-back'));
    expect(screen.getByTestId('collection-evidence-drill-surface')).toBeTruthy();
    expect(screen.getByTestId('collection-evidence-source-1').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('table').textContent).toContain('C');

    fireEvent.click(screen.getByTestId('collection-evidence-back'));
    expect(screen.getByTestId('collection-decision-workspace')).toBeTruthy();
    expect(screen.queryByTestId('collection-chart-drill')).toBeNull();
  });

  it('keeps governed summary totals unchanged while Focus scopes only exact source evidence', () => {
    const focusSubject = {
      schemaVersion: 'lightbi.multisource-focus-subject.v1' as const,
      candidateId: 'multisource:product', canonicalId: 'product', domain: 'inventory' as const,
      value: 'A', displayLabel: 'A — Widget',
      bindings: [
        { sourceKey: 'sales', sourceName: 'sales.xlsx', state: 'matched_exact' as const, field: 'Product' },
        { sourceKey: 'accounting', sourceName: 'accounting.xlsx', state: 'concept_unavailable' as const, field: null },
      ],
    };
    render(<PerspectiveCollectionResultCard
      perspectiveId="executive_overview"
      rows={[{ reporting_period: '2026-05', gross_profit: 300 }]}
      sourceCount={2}
      focusSubject={focusSubject}
      evidenceSources={[
        {
          period: '2026-05', role: 'sales', sourceName: 'sales.xlsx', sourceRowCount: 3,
          rows: [{ Product: 'A', Revenue: 100 }, { Product: 'A', Revenue: 120 }, { Product: 'B', Revenue: 80 }],
          semanticFields: [
            { canonicalId: 'product', label: 'Product', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Product', reason: 'test' },
            { canonicalId: 'revenue', label: 'Revenue', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Revenue', reason: 'test' },
          ],
          focusBinding: focusSubject.bindings[0],
        },
        {
          period: '2026-05', role: 'accounting', sourceName: 'accounting.xlsx', sourceRowCount: 2,
          rows: [{ Account: 'Revenue', Amount: 300 }, { Account: 'Cost', Amount: 200 }],
          semanticFields: [], focusBinding: focusSubject.bindings[1],
        },
      ]}
    />);

    expect(screen.getByTestId('collection-focus-badge').textContent).toContain('A — Widget');
    expect(screen.getByText(/\$300/)).toBeTruthy();
    expect(screen.getByText('Key attention')).toBeTruthy();
    expect(screen.queryByText('BA focus')).toBeNull();

    fireEvent.click(screen.getByTestId('collection-chart'));
    expect(screen.getByText(/sales\.xlsx.*2 focus matches/)).toBeTruthy();
    expect(screen.queryByText('B')).toBeNull();
    const salesButton = screen.getByRole('button', { name: /sales.*sales\.xlsx/i });
    fireEvent.click(salesButton);
    expect(screen.getByRole('table').textContent).toContain('A');
    expect(screen.getByRole('table').textContent).not.toContain('B');

    const accountingButton = screen.getByRole('button', { name: /accounting.*accounting\.xlsx/i });
    fireEvent.click(accountingButton);
    expect(screen.getByTestId('collection-focus-unavailable')).toBeTruthy();
    expect(screen.getByTestId('collection-focus-unavailable').textContent).toMatch(/will not infer a cross-source identity match/i);

    fireEvent.click(screen.getByRole('button', { name: /Clean and export sources/i }));
    const exportPlan = useAnalysisExportStore.getState().plan;
    expect(exportPlan?.tables.find(table => table.kind === 'summary')?.rows).toEqual([{ reporting_period: '2026-05', gross_profit: 300 }]);
    const evidenceTables = exportPlan?.tables.filter(table => table.kind === 'evidence') ?? [];
    expect(evidenceTables).toHaveLength(1);
    expect(evidenceTables[0].rows).toEqual([{ Product: 'A', Revenue: 100 }, { Product: 'A', Revenue: 120 }]);
    expect(exportPlan?.notes.join(' ')).toMatch(/Focus Subject: A — Widget.*summary metrics remain full-population/i);

    fireEvent.click(salesButton);
    fireEvent.click(screen.getByRole('button', { name: /Investigate selected evidence/i }));
    const investigation = screen.getByTestId('selected-subject-investigation');
    expect(investigation.textContent).toContain('sales.xlsx');
    expect(investigation.textContent).not.toContain('accounting.xlsx');
    expect(investigation.textContent).toContain('Source-separation policy');
  });

  it('composes a selected multi-file dashboard before materializing widgets and preserves ranked-driver visualization authority', () => {
    render(<PerspectiveCollectionResultCard
      perspectiveId="executive_overview"
      rows={[{ reporting_period: '2026-06', sales_revenue: 250 }]}
      sourceCount={1}
      evidenceSources={[{
        period: '2026-06', role: 'sales', sourceName: 'current-period.xlsx', sourceRowCount: 4,
        rows: [
          { Product: 'A', Revenue: 100 }, { Product: 'A', Revenue: 70 },
          { Product: 'B', Revenue: 50 }, { Product: 'C', Revenue: 30 },
        ],
        semanticFields: [
          { canonicalId: 'product', label: 'Product', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Product', reason: 'test' },
          { canonicalId: 'revenue', label: 'Revenue', domain: 'canonical', role: 'unknown', confidence: 100, physicalColumn: 'Revenue', reason: 'test' },
        ],
      }]}
    />);

    fireEvent.click(screen.getByTestId('collection-chart'));
    fireEvent.click(screen.getByRole('button', { name: /Investigate selected evidence/i }));
    fireEvent.click(screen.getByTestId('collection-create-dashboard'));

    const runtime = useAppRuntime.getState();
    const dashboard = runtime.dashboards[runtime.activeDashboardId ?? ''];
    expect(dashboard).toBeTruthy();
    const composition = dashboard.metadata?.dashboardCompositionPlan as any;
    expect(composition.schemaVersion).toBe('lightbi.dashboard-composition-plan.v1');
    expect(composition.governance).toMatchObject({ deterministicMembershipFinal: true, mbAuthority: 'advisory_only', mbMayChangeMembership: false });
    expect(composition.items.some((item: any) => item.semanticRole === 'ranked_driver')).toBe(true);

    const charts = dashboard.widgets.map(widget => runtime.charts[widget.referenceId ?? '']).filter(Boolean);
    expect(charts[0]?.type).toBe('Number');
    expect(charts.some(chart => chart.formatting?.lightbiData?.source === 'multifile_perspective_dashboard')).toBe(true);
    const breakdown = charts.find(chart => chart.formatting?.lightbiData?.source === 'multifile_selected_scope_ba_breakdown');
    expect(breakdown?.type).toBe('Bar');
    expect(breakdown?.formatting?.lightbiData?.decisionVisualizationPlan?.visualizationPlan?.patternId).toBe('ranking_bar');
    expect(breakdown?.formatting?.lightbiData?.sourceName).toBe('current-period.xlsx');
  });

});
