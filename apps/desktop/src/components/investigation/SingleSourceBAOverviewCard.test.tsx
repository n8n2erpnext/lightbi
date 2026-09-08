// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import type { SingleSourceBAOverview } from '../../lib/single-source-ba-overview';
import { SingleSourceBAOverviewCard } from './SingleSourceBAOverviewCard';

describe('SingleSourceBAOverviewCard deep analysis', () => {
  it('surfaces the selected contract, diagnostics and low groups from evidence', () => {
    const overview: SingleSourceBAOverview = {
      mode: 'operations',
      analysisLabel: 'Phân tích vận hành & logistics',
      breakdownHeading: 'Hoạt động phân bố ở đâu?',
      rowCount: 3,
      sourceRowCount: 3,
      isRepresentativeSample: false,
      bindings: { selectedMeasure: 'Weight', selectedDimension1: 'Route' },
      kpis: [{ id: 'selected_measure', label: 'Tổng Weight', value: 60, kind: 'number' }],
      trend: [
        { period: '2026-06-01', value: 30, rowCount: 2 },
        { period: '2026-06-02', value: 30, rowCount: 1 },
      ],
      trendChange: 0,
      breakdowns: [{
        id: 'route', label: 'Tuyến', physicalColumn: 'Route', valueKind: 'number',
        top: [
          { label: 'North', value: 40, share: 2 / 3, rowCount: 2 },
          { label: 'South', value: 20, share: 1 / 3, rowCount: 1 },
        ],
        bottom: [{ label: 'South', value: 20, share: 1 / 3, rowCount: 1 }],
      }],
      concentration: { label: 'North', share: 2 / 3 },
      outlierCount: 1,
      findings: ['North là nhóm lớn nhất, chiếm 66.7% phạm vi đã phân tích.'],
      recommendedActions: ['Mở các bản ghi bất thường trước khi điều chỉnh năng lực vận hành.'],
      limitations: ['Kết quả mô tả phân bố và ngoại lệ trong dữ liệu, không tự khẳng định quan hệ nhân quả.'],
    };

    render(<SingleSourceBAOverviewCard overview={overview} preferences={DEFAULT_PREFERENCES} />);

    const scope = screen.getByTestId('deep-ba-selected-scope');
    expect(within(scope).getByText(/Weight/)).toBeTruthy();
    expect(within(scope).getByText(/Route/)).toBeTruthy();
    expect(screen.getByTestId('deep-ba-decision-diagnostics')).toBeTruthy();
    expect(within(screen.getByTestId('deep-ba-low-groups-route')).getByText('South')).toBeTruthy();
  });

  it('renders one answer-first narrative and demotes duplicate legacy findings/actions', () => {
    const primary = { id: 'happened_0', title: 'Observed result', statement: 'Revenue changed by 12.', confidence: 'high' as const, basis: 'evidence_backed' as const, evidenceFields: ['Revenue'], evidenceRows: [{ rowIndex: 0, label: 'Row 1', values: { Revenue: 112 } }] };
    const driver = { id: 'where_0', title: 'Largest contribution by Product', statement: 'A has the highest observed contribution.', confidence: 'high' as const, basis: 'evidence_backed' as const, evidenceFields: ['Product', 'Revenue'], evidenceRows: [], priorityScore: 80 };
    const overview: SingleSourceBAOverview = {
      mode: 'commercial', analysisLabel: 'Revenue analysis', breakdownHeading: 'By product', rowCount: 2, sourceRowCount: 2, isRepresentativeSample: false,
      bindings: { selectedMeasure: 'Revenue', selectedDimension1: 'Product' }, kpis: [{ id: 'revenue', label: 'Revenue', value: 112, kind: 'money' }], trend: [], trendChange: null,
      breakdowns: [{ id: 'product', label: 'Product', physicalColumn: 'Product', valueKind: 'money', top: [{ label: 'A', value: 112, share: 1, rowCount: 2 }], bottom: [] }], concentration: null, outlierCount: 0,
      findings: ['LEGACY_FINDING_SHOULD_NOT_REPEAT'], recommendedActions: ['LEGACY_ACTION_SHOULD_NOT_REPEAT'], limitations: ['Review source evidence before acting.'],
      investigation: { domain: 'revenue', whatHappened: [primary], whereItHappened: [driver], whyItMayHaveHappened: [], unusual: [], priorities: [driver], decompositions: [], comparisons: [], followUpQuestions: [], actions: [{ priority: 'high', basis: 'evidence_backed', title: 'Inspect', action: 'Inspect source rows', verification: 'Verify rows' }], unknowns: [] },
    };
    render(<SingleSourceBAOverviewCard overview={overview} preferences={DEFAULT_PREFERENCES} />);
    expect(screen.getByTestId('deep-ba-narrative-primary').textContent).toContain('Revenue changed by 12.');
    expect(screen.getByTestId('deep-ba-narrative-section-key_driver').textContent).toContain('A has the highest observed contribution.');
    expect(screen.queryByText('LEGACY_FINDING_SHOULD_NOT_REPEAT')).toBeNull();
    expect(screen.queryByText('LEGACY_ACTION_SHOULD_NOT_REPEAT')).toBeNull();
    expect(screen.getAllByText('A has the highest observed contribution.')).toHaveLength(1);
  });

});
