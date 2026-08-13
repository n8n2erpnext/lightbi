// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCollectionResultCard } from './PerspectiveCollectionResultCard';

vi.mock('echarts-for-react', () => ({
  default: (props: { onEvents?: { click?: (params: { dataIndex: number; seriesIndex: number }) => void } }) => (
    <button type="button" data-testid="collection-chart" onClick={() => props.onEvents?.click?.({ dataIndex: 0, seriesIndex: 0 })}>Chart</button>
  ),
}));

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
});
