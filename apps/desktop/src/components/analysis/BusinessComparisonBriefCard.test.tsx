// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DomainComparisonBrief } from '../../lib/ba-comparison-engine';
import { BusinessComparisonBriefCard } from './BusinessComparisonBriefCard';

afterEach(() => cleanup());

const brief: DomainComparisonBrief = {
  presetId: 'business_period_review', businessQuestion: 'What changed?', domainId: 'revenue', domainLabel: 'Revenue', periods: ['P1', 'P2'],
  periodMapping: [{ periodId: 'P1', label: 'P1', sourceName: 'p1.xlsx', confidence: 'high', reason: 'declared' }, { periodId: 'P2', label: 'P2', sourceName: 'p2.xlsx', confidence: 'high', reason: 'declared' }], periodMappingNeedsReview: false,
  headline: 'Revenue decreased by 10.', trustScore: 90, decisionReadinessScore: 80, profitEvidenceStatus: 'missing',
  signalCoverage: { revenueField: 'Revenue', costFields: [], dimensionField: 'Product', quantityField: null, unitPriceField: null, discountField: null }, primaryDimension: 'Product',
  metricDeltas: [],
  topGrowthDrivers: [{ key: 'A', previousRevenue: 10, currentRevenue: 20, revenueDelta: 10, revenueDeltaPercent: 1, currentProfit: undefined }],
  topDeclineDrivers: [], topProfitDrivers: [],
  narrativeSections: [{ id: 'movement', title: 'Observed movement', summary: 'Revenue decreased by 10.', severity: 'warning', bullets: ['Revenue decreased by 10.'] }],
  reasonCodes: [{ id: 'movement-reason', label: 'Observed movement', statement: 'Revenue decreased by 10.', severity: 'warning', evidence: [] }],
  caveats: [], recommendedCharts: [], exportableEvidence: [],
};

describe('BusinessComparisonBriefCard DPR-3 narrative hierarchy', () => {
  it('keeps the answer primary, uses neutral contributor language, and collapses supporting context/reasons', () => {
    render(<BusinessComparisonBriefCard brief={brief} />);
    expect(screen.getByTestId('comparison-narrative-primary').textContent).toContain('Revenue decreased by 10.');
    expect(screen.getByTestId('comparison-supporting-context').hasAttribute('open')).toBe(false);
    expect(screen.getByTestId('comparison-supporting-reasons').hasAttribute('open')).toBe(false);
    expect(screen.getByTestId('comparison-narrative-contributors').textContent).toContain('Largest observed increases');
    expect(screen.queryByText('Top growth')).toBeNull();
    expect(screen.getByTestId('comparison-supporting-reasons').textContent).toContain('No additional reason code remains after narrative deduplication.');
  });
  it('renders Deep BA comparison as an ordered management document', () => {
    render(<BusinessComparisonBriefCard brief={brief} />);
    const document = screen.getByTestId('comparison-management-document');
    expect(document.getAttribute('data-layout')).toBe('management-document');
    expect(screen.getByTestId('comparison-management-section-01').getAttribute('data-section-number')).toBe('01');
    expect(screen.getByTestId('comparison-management-section-01').getAttribute('data-report-role')).toBe('executive_summary');
    expect(screen.getByTestId('comparison-management-section-03').getAttribute('data-section-number')).toBe('03');
    expect(screen.getByTestId('comparison-management-section-03').getAttribute('data-report-role')).toBe('explanation_status');
    expect(screen.getByTestId('comparison-management-section-04').getAttribute('data-section-number')).toBe('04');
    expect(screen.getByTestId('comparison-management-section-05').getAttribute('data-section-number')).toBe('05');
    expect(screen.getByTestId('comparison-supporting-context').getAttribute('data-report-role')).toBe('evidence_appendix');
    expect(screen.getByTestId('comparison-supporting-context').getAttribute('data-report-export-expand')).toBe('true');
  });

});
