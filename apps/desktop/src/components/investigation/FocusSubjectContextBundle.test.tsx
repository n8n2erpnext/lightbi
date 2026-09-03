// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocusSubjectBAAnswerCard, FocusSubjectContextBundle } from './FocusSubjectContextBundle';
import { FocusSubjectDeepAnalysisPanel } from './FocusSubjectDeepAnalysisPanel';

const comparison = {
  subject: { candidateId: 'employee_id:MSNV', canonicalId: 'employee_id', domain: 'performance' as const, field: 'MSNV', value: '24128', displayLabel: '24128 — Thái Đăng Duy', metricFields: ['Score'] },
  populationRowCount: 2200, matchedSubjectRowCount: 1, rankValue: '1769',
  metrics: [
    { field: 'Quality score', canonicalId: 'average_quality_score', aggregation: 'AVG' as const, subjectValue: 8.767, populationAverage: 8.237, topAverage: 9.6, bottomAverage: 6.4, deltaFromAverage: 0.53, percentile: 72.727, populationCount: 2200 },
    { field: 'Star total', canonicalId: 'performance_star_total', aggregation: 'AVG' as const, subjectValue: 0, populationAverage: 1.77, topAverage: 5.2, bottomAverage: 0, deltaFromAverage: -1.77, percentile: 28.273, populationCount: 2200 },
  ],
};

const action = { id: 'quality', opportunityName: 'What is the governed average quality score?', label: 'Quality', description: '', actionType: 'summary' as const, dimensions: [], measures: ['average_quality_score'], measureAggregations: { average_quality_score: 'AVG' as const }, confidenceScore: 100, source: 'dataset_understanding' as const };

afterEach(() => cleanup());

describe('Focus Subject context propagation UI', () => {
  it('keeps supporting analysis anchored to the selected subject', () => {
    render(<FocusSubjectContextBundle comparison={comparison} />);
    expect(screen.getByTestId('focus-context-bundle').textContent).toContain('24128');
    expect(screen.getByText(/Rank and selected metric tell different stories/i)).toBeTruthy();
  });

  it('uses a focus-specific BA answer and deep-analysis surface', () => {
    const onAnalyze = vi.fn();
    const { rerender } = render(<FocusSubjectBAAnswerCard comparison={comparison} canAnalyzeDeeper onAnalyzeDeeper={onAnalyze} />);
    fireEvent.click(screen.getByRole('button', { name: /Analyze this focus deeper/i }));
    expect(onAnalyze).toHaveBeenCalledOnce();
    rerender(<FocusSubjectDeepAnalysisPanel action={action} comparison={comparison} />);
    expect(screen.getByTestId('focus-deep-analysis').textContent).toContain('24128');
    expect(screen.getByTestId('focus-deep-analysis').textContent).toContain('Top 10 avg');
  });
});
