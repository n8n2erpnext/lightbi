// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import type { SingleSourceBAOverview } from '../../lib/single-source-ba-overview';
import { buildSelectedSubjectInvestigationPlan } from '../../lib/selected-subject-investigation';
import { SelectedSubjectInvestigationBoard } from './SelectedSubjectInvestigationBoard';

afterEach(cleanup);

const noAdvice = () => ({ schemaVersion: 'lightbi.micro-brain.presentation-advice.v1' as const, candidates: [], diagnostics: { queryTerms: [], retrieved: 0, eligible: 0 } });

function overview(name: string, priority: number): SingleSourceBAOverview {
  const finding = { id: `${name}:main`, title: `${name} finding`, statement: `${name} selected answer`, confidence: 'medium' as const, basis: 'evidence_backed' as const, evidenceFields: ['Amount'], evidenceRows: [{ rowIndex: 0, label: name, values: { Amount: priority } }], priorityScore: priority };
  return { mode: 'commercial', analysisLabel: name, breakdownHeading: 'Breakdown', rowCount: 2, sourceRowCount: 2, isRepresentativeSample: false, bindings: {}, kpis: [], trend: [], trendChange: null, breakdowns: [], concentration: null, outlierCount: 0, findings: [], recommendedActions: [], limitations: [], investigation: { domain: 'commercial', whatHappened: [finding], whereItHappened: [], whyItMayHaveHappened: [], unusual: [], priorities: [], decompositions: [], comparisons: [], followUpQuestions: [], actions: [], unknowns: [] } };
}

describe('SelectedSubjectInvestigationBoard', () => {
  it('renders one attributed answer and parallel-source benchmark without rendering two full overview cards', () => {
    const sales = overview('sales', 10); const accounting = overview('accounting', 30);
    const inputs = [
      { sourceKey: 'sales', sourceName: 'sales.xlsx', role: 'sales', selectedRowCount: 2, matchedRowCount: 4, referenceRowCount: 10, referenceScope: 'source_rows' as const, isTruncated: true, overview: sales },
      { sourceKey: 'accounting', sourceName: 'accounting.xlsx', role: 'accounting', selectedRowCount: 1, matchedRowCount: 2, referenceRowCount: 8, referenceScope: 'source_rows' as const, overview: accounting },
    ];
    const plan = buildSelectedSubjectInvestigationPlan({ dimensionField: 'reporting_period', label: '2026-06', metricId: 'gross_profit' }, inputs, { advisor: noAdvice as any });
    render(<SelectedSubjectInvestigationBoard plan={plan} sourceOverviews={[{ sourceKey: 'sales', overview: sales }, { sourceKey: 'accounting', overview: accounting }]} preferences={DEFAULT_PREFERENCES} />);
    const investigation = screen.getByTestId('selected-subject-investigation');
    expect(investigation.getAttribute('data-layout')).toBe('focused-investigation');
    const benchmarkNode = screen.getByTestId('selected-subject-benchmark');
    const answerNode = screen.getByTestId('selected-subject-main-answer');
    const synthesisNode = screen.getByTestId('selected-subject-source-synthesis');
    expect(benchmarkNode.compareDocumentPosition(answerNode) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(answerNode.compareDocumentPosition(synthesisNode) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByTestId('selected-subject-evidence-details')).not.toHaveProperty('open', true);
    expect(screen.getByTestId('selected-subject-main-answer').textContent).toContain('accounting selected answer');
    expect(screen.getByTestId('selected-subject-benchmark').textContent).toContain('sales.xlsx');
    expect(screen.getByTestId('selected-subject-benchmark').textContent).toContain('accounting.xlsx');
    expect(screen.getByTestId('selected-subject-benchmark').textContent).toContain('Available row evidence is bounded.');
    expect(screen.getByTestId('selected-subject-benchmark').textContent).toContain('Matched in available evidence');
    expect(screen.getByText('Parallel source evidence')).toBeTruthy();
    expect(screen.getByText(/do not rewrite the governed summary/i)).toBeTruthy();
    expect(screen.queryByTestId('single-source-ba-overview')).toBeNull();
  });
});
