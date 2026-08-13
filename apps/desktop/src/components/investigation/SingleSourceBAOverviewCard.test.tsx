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
});
