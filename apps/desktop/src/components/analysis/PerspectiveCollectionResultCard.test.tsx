// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCollectionResultCard } from './PerspectiveCollectionResultCard';
import { useAnalysisExportStore } from '../../stores/analysis-export-store';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('echarts-for-react', () => ({
  default: (props: { option?: { series?: Array<{ type?: string }> }; onEvents?: { click?: (params: { dataIndex: number; seriesIndex: number }) => void } }) => (
    <button type="button" data-testid="collection-chart" data-series-type={props.option?.series?.[0]?.type} onClick={() => props.onEvents?.click?.({ dataIndex: 0, seriesIndex: 0 })}>Chart</button>
  ),
}));

afterEach(() => { cleanup(); useAnalysisExportStore.getState().clearPlan(); });

describe('PerspectiveCollectionResultCard selected-data analysis', () => {
  it('opens source-bound evidence and reuses Deep BA for the selected multi-file chart point', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Deep BA analysis · Step 2/i }));
    expect(screen.getByTestId('collection-subset-deep-ba')).toBeTruthy();
    expect(screen.getByTestId('single-source-ba-overview')).toBeTruthy();
    expect(screen.getByTestId('deep-ba-selected-scope')).toBeTruthy();
  });

  it('treats one reporting period as a snapshot and opens existing Deep BA from the BA focus', () => {
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
    expect(screen.getByTestId('collection-chart-drill')).toBeTruthy();
    expect(screen.getByTestId('collection-subset-deep-ba')).toBeTruthy();
    expect(screen.getByTestId('collection-deep-export-image')).toBeTruthy();
    expect(screen.getByTestId('collection-deep-export-pdf')).toBeTruthy();
    expect(screen.getByTestId('collection-create-dashboard')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Clean and export sources/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Clean and export sources/i }));
    const exportPlan = useAnalysisExportStore.getState().plan;
    expect(exportPlan?.perspectiveId).toBe('executive_overview');
    expect(exportPlan?.combinationPolicy).toBe('single_source');
    expect(exportPlan?.tables.some(table => table.kind === 'evidence')).toBe(true);
  });
});
