// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FocusSubjectComparisonCard } from './FocusSubjectComparisonCard';
import type { FocusComparisonState } from '../../hooks/useFocusSubjectComparison';

const readyState: FocusComparisonState = {
  status: 'ready', error: '',
  comparison: {
    subject: {
      candidateId: 'employee_id:MSNV', canonicalId: 'employee_id', domain: 'performance',
      field: 'MSNV QUẢN LÝ', value: '24128', displayLabel: '24128 — Thái Đăng Duy',
      metricFields: ['TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ'], rankField: 'RANKING',
    },
    populationRowCount: 2200, matchedSubjectRowCount: 1, rankValue: '1769',
    metrics: [{
      field: 'TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ', subjectValue: 8.7667, populationAverage: 8.2369,
      topAverage: 9.4, bottomAverage: 6.8, deltaFromAverage: 0.5298, percentile: 73.2, populationCount: 2200, cohortSize: 10,
    }],
  },
};

afterEach(cleanup);

describe('FocusSubjectComparisonCard primary readout', () => {
  it('renders focus versus population benchmarks as the primary analysis', () => {
    render(<FocusSubjectComparisonCard state={readyState} />);
    expect(screen.getByText('Primary focus analysis')).toBeTruthy();
    expect(screen.getByText('24128 — Thái Đăng Duy')).toBeTruthy();
    expect(screen.getByTestId('focus-primary-benchmark')).toBeTruthy();
    expect(screen.getAllByText('Average').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Top 10 avg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bottom 10 avg').length).toBeGreaterThan(0);
  });
  it('renders the actual cohort size instead of a hard-coded Top/Bottom 10 label', () => {
    const smallState: FocusComparisonState = {
      ...readyState,
      comparison: {
        ...readyState.comparison,
        metrics: readyState.comparison.metrics.map(metric => ({ ...metric, cohortSize: 1 })),
      },
    };
    render(<FocusSubjectComparisonCard state={smallState} />);
    expect(screen.getAllByText('Top 1 avg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bottom 1 avg').length).toBeGreaterThan(0);
    expect(screen.queryByText('Top 10 avg')).toBeNull();
  });

});
