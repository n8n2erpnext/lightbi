import { describe, expect, it } from 'vitest';
import type { SingleSourceBAOverview } from './single-source-ba-overview';
import { buildSelectedSubjectInvestigationPlan } from './selected-subject-investigation';

function overview(id: string, score: number, actionTitle = 'Check source evidence'): SingleSourceBAOverview {
  const finding = {
    id: `${id}:answer`, title: `${id} answer`, statement: `${id} observed statement`, confidence: 'medium' as const,
    basis: 'evidence_backed' as const, evidenceFields: ['Amount'], evidenceRows: [{ rowIndex: 0, label: id, values: { Amount: score } }], priorityScore: score,
  };
  return {
    mode: 'commercial', analysisLabel: id, breakdownHeading: 'Breakdown', rowCount: 5, sourceRowCount: 10, isRepresentativeSample: false,
    bindings: { revenue: 'Amount' }, kpis: [], trend: [], trendChange: null, breakdowns: [], concentration: null, outlierCount: 0,
    findings: [], recommendedActions: [], limitations: [], investigation: {
      domain: 'commercial', whatHappened: [finding], whereItHappened: [], whyItMayHaveHappened: [], unusual: [], priorities: [],
      decompositions: [{ id: `${id}:decomp`, label: 'Context decomposition', status: 'partial', components: [{ label: 'Observed field', field: 'Amount', status: 'observed', note: 'present' }, { label: 'Missing field', status: 'missing', note: 'missing' }] }],
      comparisons: [{ kind: 'baseline', label: 'Baseline context', status: 'available', statement: 'Baseline evidence is available.' }],
      followUpQuestions: [{ question: 'What should be verified next?', rationale: 'Verify context.', evidenceFields: ['Amount'] }],
      actions: [{ priority: 'high', basis: 'evidence_backed', title: actionTitle, action: 'Review the selected evidence.', verification: 'Re-run with source rows.' }],
      unknowns: [{ label: 'Profitability', missingSignals: ['cost'], impact: 'Profit cannot be established.' }],
    },
  };
}

const noAdvice = () => ({ schemaVersion: 'lightbi.micro-brain.presentation-advice.v1' as const, candidates: [], diagnostics: { queryTerms: [], retrieved: 0, eligible: 0 } });

describe('SelectedSubjectInvestigationPlan', () => {
  it('builds one answer-first single-source selected-subject investigation with benchmark context', () => {
    const plan = buildSelectedSubjectInvestigationPlan({ dimensionField: 'Store', label: 'A', metricId: 'sales_revenue' }, [{
      sourceKey: 'sales', sourceName: 'sales.xlsx', role: null, selectedRowCount: 4, matchedRowCount: 8, referenceRowCount: 20,
      referenceScope: 'chart_group_rows', overview: overview('sales', 20),
    }], { advisor: noAdvice as any });
    expect(plan.schemaVersion).toBe('lightbi.selected-subject-investigation.v1');
    expect(plan.sourceMode).toBe('single_source');
    expect(plan.primaryAnswer?.sourceName).toBe('sales.xlsx');
    expect(plan.sources[0].selectedOfMatchedRatio).toBe(0.5);
    expect(plan.sources[0].selectedOfReferenceRatio).toBe(0.2);
    expect(plan.sources[0].contextDecomposition[0]).toMatchObject({ observedComponents: ['Observed field'], missingComponents: ['Missing field'] });
    expect(plan.policy).toMatchObject({ crossSourceJoinAllowed: false, governedSummaryUnchanged: true, mbMayStrengthenAuthority: false });
  });

  it('synthesizes parallel source evidence without joining source facts and chooses the strongest attributed answer', () => {
    const plan = buildSelectedSubjectInvestigationPlan({ dimensionField: 'reporting_period', label: '2026-06', metricId: 'gross_profit' }, [
      { sourceKey: 'sales', sourceName: 'sales.xlsx', role: 'sales', selectedRowCount: 10, matchedRowCount: 10, referenceRowCount: 100, referenceScope: 'source_rows', overview: overview('sales', 10, 'Verify shared action') },
      { sourceKey: 'accounting', sourceName: 'accounting.xlsx', role: 'accounting', selectedRowCount: 8, matchedRowCount: 8, referenceRowCount: 80, referenceScope: 'source_rows', overview: overview('accounting', 40, 'Verify shared action') },
    ], { advisor: noAdvice as any });
    expect(plan.sourceMode).toBe('parallel_sources');
    expect(plan.primaryAnswer?.sourceName).toBe('accounting.xlsx');
    expect(plan.sources.map(source => source.sourceName)).toEqual(['sales.xlsx', 'accounting.xlsx']);
    expect(plan.nextActions).toHaveLength(1);
    expect(plan.nextActions[0].sourceNames).toEqual(['sales.xlsx', 'accounting.xlsx']);
    expect(plan.policy.preserveSourceSeparation).toBe(true);
    expect(plan.policy.crossSourceJoinAllowed).toBe(false);
  });

  it('retains truncation and representative-sample context instead of overstating selected scope completeness', () => {
    const sampled = overview('sampled', 10); sampled.isRepresentativeSample = true; sampled.rowCount = 1000; sampled.sourceRowCount = 5000;
    const plan = buildSelectedSubjectInvestigationPlan({ dimensionField: 'Route', label: 'R1' }, [{
      sourceKey: 'logistics', sourceName: 'logistics.xlsx', role: 'logistics', selectedRowCount: 1000, matchedRowCount: 5000, referenceRowCount: 5000,
      referenceScope: 'chart_group_rows', isTruncated: true, overview: sampled,
    }], { advisor: noAdvice as any });
    expect(plan.sources[0]).toMatchObject({ representativeSample: true, truncated: true, analysisRowCount: 1000 });
    expect(plan.sources[0].selectedOfMatchedRatio).toBe(0.2);
  });
});
