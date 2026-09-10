// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import { createVisualNarrativeCompositionPlan, type VisualNarrativeCandidateV1 } from '../../lib/visual-narrative-composition';
import { VisualNarrativeCanvas } from './VisualNarrativeCanvas';

vi.mock('./ChartPreviewRenderer', () => ({
  ChartPreviewRenderer: ({ model, rendererFamilyOverride, heightClassName }: any) => (
    <div data-testid="mock-chart" data-title={model.title} data-family={rendererFamilyOverride ?? ''} data-height={heightClassName ?? ''} />
  ),
}));

afterEach(() => cleanup());

const model = (id: string, field = 'revenue'): ChartPreviewModel => ({
  id, sourceResultId: `result:${id}`, status: 'ready', chartType: 'bar', title: id,
  xField: 'month', yField: field, seriesFields: [field],
  rows: [{ month: 'May', [field]: 10 }, { month: 'Jun', [field]: 12 }],
  warnings: [], source: 'duckdb_preview_result',
});

const candidate = (overrides: Partial<VisualNarrativeCandidateV1> = {}): VisualNarrativeCandidateV1 => ({
  id: 'primary', isPrimary: true, managementQuestion: 'What changed?', storyRole: 'answer', analyticalIntent: 'period_comparison',
  dimensionField: 'month', metricIds: ['revenue'], unitFamily: 'currency', grainId: 'month', sourceScopeKey: 'source:1',
  evidenceBacked: true, evidenceRefs: ['result:primary'], decisionImportance: 100, rendererFamily: 'bar', pointCount: 2,
  ...overrides,
});
describe('VisualNarrativeCanvas', () => {
  it('renders one hero only when one visual fully answers the question', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [candidate()] });
    render(<VisualNarrativeCanvas plan={plan} items={[{ id: 'primary', label: 'Revenue', chartModel: model('primary') }]} />);
    expect(screen.getAllByTestId('mock-chart')).toHaveLength(1);
    expect(screen.queryByTestId('perspective-analysis-bundle')).toBeNull();
    expect(screen.getByTestId('visual-narrative-canvas').getAttribute('data-layout-count')).toBe('1');
  });

  it('renders a balanced hero plus two supports for a three-visual story', () => {
    const candidates = [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which product drives revenue?', storyRole: 'driver', dimensionField: 'product', grainId: 'product', decisionImportance: 90, officialComplementToPrimary: true }),
      candidate({ id: 'risk', isPrimary: false, managementQuestion: 'Where is revenue exposed?', storyRole: 'risk', dimensionField: 'region', grainId: 'region', decisionImportance: 80, officialComplementToPrimary: true }),
    ];
    const plan = createVisualNarrativeCompositionPlan({ candidates });
    render(<VisualNarrativeCanvas plan={plan} items={[
      { id: 'primary', label: 'Revenue', chartModel: model('primary') },
      { id: 'driver', label: 'Product driver', chartModel: { ...model('driver'), xField: 'product', rows: [{ product: 'A', revenue: 8 }] } },
      { id: 'risk', label: 'Regional risk', chartModel: { ...model('risk'), xField: 'region', rows: [{ region: 'North', revenue: 4 }] } },
    ]} />);
    expect(screen.getAllByTestId('mock-chart')).toHaveLength(3);
    expect(screen.getByTestId('perspective-analysis-bundle').children).toHaveLength(2);
    expect(screen.getByTestId('visual-narrative-canvas').getAttribute('data-layout-count')).toBe('3');
  });
  it('materializes two compatible governed results as one combined hero visual', () => {
    const candidates = [
      candidate({ combination: { groupId: 'finance:revenue-cost', mark: 'bar', explicitUnitLabel: true } }),
      candidate({ id: 'cost', isPrimary: false, managementQuestion: 'How does cost move with revenue?', storyRole: 'comparison', metricIds: ['cost'], decisionImportance: 95, combination: { groupId: 'finance:revenue-cost', mark: 'line', explicitUnitLabel: true } }),
    ];
    const plan = createVisualNarrativeCompositionPlan({ candidates });
    render(<VisualNarrativeCanvas plan={plan} items={[
      { id: 'primary', label: 'Revenue', chartModel: model('primary', 'revenue') },
      { id: 'cost', label: 'Cost', chartModel: model('cost', 'cost') },
    ]} />);
    expect(screen.getAllByTestId('mock-chart')).toHaveLength(1);
    expect(screen.getByTestId('mock-chart').getAttribute('data-family')).toBe('combo_bar_line');
    expect(screen.getByTestId('visual-narrative-canvas').getAttribute('data-layout-count')).toBe('1');
  });
});
