import { describe, expect, it } from 'vitest';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';
import type { SingleSourceBAOverview } from './single-source-ba-overview';
import { buildComparisonAnalysisNarrativePlan, buildSingleSourceAnalysisNarrativePlan } from './analysis-narrative-plan';

const finding = (id: string, basis: 'evidence_backed' | 'hypothesis' | 'needs_verification' = 'evidence_backed', priorityScore?: number) => ({ id, title: id, statement: `statement:${id}`, confidence: 'high' as const, basis, evidenceFields: ['Amount'], evidenceRows: [{ rowIndex: 0, label: 'Row 1', values: { Amount: 10 } }], ...(priorityScore === undefined ? {} : { priorityScore }) });
const primary = finding('happened_0');
const driver = finding('where_0', 'evidence_backed', 80);
const risk = finding('unusual_concentration', 'evidence_backed', 60);
const hypothesis = finding('why_0', 'hypothesis');
const overview: SingleSourceBAOverview = {
  mode: 'commercial', analysisLabel: 'Revenue analysis', breakdownHeading: 'By product', rowCount: 10, sourceRowCount: 10, isRepresentativeSample: false,
  bindings: { selectedMeasure: 'Amount', selectedDimension1: 'Product' }, kpis: [{ id: 'revenue', label: 'Revenue', value: 100, kind: 'money' }], trend: [], trendChange: null,
  breakdowns: [{ id: 'product', label: 'Product', physicalColumn: 'Product', valueKind: 'money', top: [{ label: 'A', value: 80, share: 0.8, rowCount: 8 }], bottom: [] }], concentration: { label: 'A', share: 0.8 }, outlierCount: 0,
  findings: ['legacy duplicate'], recommendedActions: ['legacy action'], limitations: ['source limitation'],
  investigation: {
    domain: 'revenue', whatHappened: [primary], whereItHappened: [driver], whyItMayHaveHappened: [hypothesis], unusual: [risk], priorities: [driver, risk], decompositions: [], comparisons: [], followUpQuestions: [],
    actions: [{ priority: 'high', basis: 'evidence_backed', title: 'Inspect', action: 'Inspect A', verification: 'Verify rows' }], unknowns: [{ label: 'Target unavailable', missingSignals: ['target'], impact: 'No governed target.' }],
  },
};

function advice(priorities: string[]): MicroBrainPresentationAdviceV1 {
  return { brainVersion: 'test', indexVersion: 'test', candidates: [{ hit: { conceptId: 'concept.presentation.test', canonicalSignal: null, sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 99, sparseScore: 99, denseSimilarity: 0.99, positiveUnitIds: [], negativeUnitIds: [] }, labels: [], definition: '', presentation: { schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1', advisoryKind: 'perspective_profile', authority: 'advisory_only', priorities, abstainWhen: ['required evidence is missing'], mustNot: ['invent metrics'] } }], authorityNotes: ['advisory only'] };
}

describe('DPR-3 Analysis Narrative Planner', () => {
  it('keeps the primary answer first and preserves the exact upstream finding/evidence object', () => {
    const plan = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice(['drivers', 'risk', 'evidence']) });
    expect(plan.primaryAnswer?.role).toBe('primary_answer');
    expect(plan.primaryAnswer?.finding).toBe(primary);
    expect(plan.primaryAnswer?.finding.evidenceRows).toBe(primary.evidenceRows);
    expect(plan.policy.preserveFindingIdentity).toBe(true);
    expect(plan.policy.mbMayStrengthenAuthority).toBe(false);
  });

  it('deduplicates the same driver/risk finding when priority lists repeat upstream findings', () => {
    const plan = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice([]) });
    const ids = plan.sections.flatMap(section => section.findingItems.map(item => item.finding.id));
    expect(ids.filter(id => id === 'where_0')).toHaveLength(1);
    expect(ids.filter(id => id === 'unusual_concentration')).toHaveLength(1);
    expect(plan.supporting.showLegacyFindings).toBe(false);
    expect(plan.supporting.showLegacyActions).toBe(false);
  });

  it('allows MB ordinal role priority to reorder context but never changes basis or evidence authority', () => {
    const riskFirst = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice(['risk', 'exceptions', 'evidence']) });
    const driverFirst = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice(['drivers', 'throughput']) });
    expect(riskFirst.sections.findIndex(section => section.role === 'risk_exception')).toBeLessThan(riskFirst.sections.findIndex(section => section.role === 'key_driver'));
    expect(driverFirst.sections.findIndex(section => section.role === 'key_driver')).toBeLessThan(driverFirst.sections.findIndex(section => section.role === 'risk_exception'));
    const projectedHypothesis = riskFirst.sections.flatMap(section => section.findingItems).find(item => item.finding.id === 'why_0')!;
    expect(projectedHypothesis.finding).toBe(hypothesis);
    expect(projectedHypothesis.finding.basis).toBe('hypothesis');
    expect(projectedHypothesis.finding.evidenceRows).toBe(hypothesis.evidenceRows);
  });

  it('surfaces abstention/unknown context without inventing a finding or action', () => {
    const plan = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice(['evidence']) });
    expect(plan.advisory.abstainWhen).toContain('required evidence is missing');
    const unknown = plan.sections.find(section => section.role === 'unknown')!;
    expect(unknown.unknownItems[0].unknown).toBe(overview.investigation!.unknowns[0]);
    expect(plan.sections.flatMap(section => section.actionItems)).toHaveLength(1);
  });

  it('uses relevance gates to hide duplicate legacy findings/actions while retaining KPIs, diagnostics and useful breakdowns', () => {
    const plan = buildSingleSourceAnalysisNarrativePlan(overview, { advisor: () => advice([]) });
    expect(plan.supporting).toMatchObject({ showKpis: true, showDiagnostics: true, breakdownIds: ['product'], showLegacyFindings: false, showLegacyActions: false, showLimitations: true });
  });

  it('projects multi-source comparison narrative without recalculating headline or duplicating reason text already narrated', () => {
    const executive = { id: 'executive_answer', title: 'Executive answer', summary: 'Revenue changed.', severity: 'warning' as const, bullets: [] };
    const section = { id: 'where_changed', title: 'Where it changed', summary: 'Revenue declined in period 2.', severity: 'warning' as const, bullets: ['Revenue declined in period 2.'] };
    const safety = { id: 'decision_safety', title: 'Decision safety', summary: 'Review evidence.', severity: 'critical' as const, bullets: [] };
    const reason = { id: 'reason-1', label: 'Revenue movement', statement: 'Revenue declined in period 2.', severity: 'warning' as const, evidence: [] };
    const brief = { presetId: 'business_period_review' as const, businessQuestion: 'What changed?', domainId: 'revenue' as const, domainLabel: 'Revenue', periods: ['P1', 'P2'], periodMapping: [], periodMappingNeedsReview: false, headline: 'Revenue changed.', trustScore: 80, decisionReadinessScore: 80, profitEvidenceStatus: 'missing' as const, signalCoverage: { revenueField: 'Revenue', costFields: [], dimensionField: 'Product', quantityField: null, unitPriceField: null, discountField: null }, primaryDimension: 'Product', metricDeltas: [], topGrowthDrivers: [], topDeclineDrivers: [], topProfitDrivers: [], narrativeSections: [executive, section, safety], reasonCodes: [reason], caveats: [], recommendedCharts: [], exportableEvidence: [] };
    const plan = buildComparisonAnalysisNarrativePlan(brief, { advisor: () => advice(['risk', 'exceptions']) });
    expect(plan.primaryAnswer).toBe(brief.headline);
    expect(plan.narrativeSections).not.toContain(executive);
    expect(plan.narrativeSections[0]).toBe(safety);
    expect(plan.narrativeSections).toContain(section);
    expect(plan.reasonCodes).toHaveLength(0);
    expect(JSON.stringify(plan)).not.toContain('rrfScore');
    expect(JSON.stringify(plan)).not.toContain('denseSimilarity');
  });
});
