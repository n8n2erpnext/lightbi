import { describe, expect, it } from 'vitest';
import type { BAAnalysisAuthorityContextV1 } from './understanding-core/ba-analysis-authority-context';
import { buildFocusSubjectComparison } from './focus-subject-analysis';
import type { FocusSubjectSelection } from './focus-subject-candidates';
import { createSingleSourceBAOverview } from './single-source-ba-overview';
import type { AnalysisAction } from './analysis-opportunity-actions';

const authority: BAAnalysisAuthorityContextV1 = {
  schemaVersion: 'lightbi.ba-analysis-authority-context.v1',
  artifactIdentity: 'canonical:test', datasetStateIdentity: 'dataset-state:test', sourceFingerprint: 'source:test',
  domain: {
    primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation',
    officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false },
    analysisMode: 'evidence_bound_inferred_domain',
    semanticConcepts: { confirmed: 1, probable: 1, microBrainRecovered: 1, ambiguous: 0, unknown: 0, unresolved: 0 },
    evidenceConflicts: 0,
    evidence: [{ domainId: 'healthcare', source: 'micro_brain_relation', canonicalSignalIds: ['sales_revenue'], physicalColumns: ['Revenue'], reasonCodes: ['brain_relation:test'] }],
  },
  authorization: {
    metric: { metricId: 'sales_revenue', metricVersion: '1.0.0', preflightState: 'conditionally_ready', preflightIdentity: 'preflight:test', runtimeState: 'conditionally_executable', runtimeExecutionAllowed: true, decisionUseAuthorized: false, selectedBindings: [], blockerCodes: [], limitationCodes: [], evidenceReferences: ['metric:test'] },
    formula: { state: 'not_independently_authorized', decisionUseAuthorized: false, reason: 'No independent formula authority.' },
  },
  limitations: ['Inferred domain is evidence-bound.'], evidenceReferences: ['canonical:test'], decisionUseAuthorized: false,
};

const action: AnalysisAction = {
  id: 'action:test-sales', opportunityName: 'Sales by store', label: 'Sales by store', description: 'Compare sales by store',
  actionType: 'group_by', dimensions: ['store'], measures: ['sales_revenue'], measureAggregations: { sales_revenue: 'SUM' },
  confidenceScore: 100, source: 'dataset_understanding',
};

const subject: FocusSubjectSelection = {
  candidateId: 'store:Store', canonicalId: 'store', domain: 'revenue', field: 'Store', value: 'A', displayLabel: 'Store A',
  metricFields: ['Revenue'], metricBindings: [{ canonicalId: 'sales_revenue', field: 'Revenue' }],
};

const rows = [
  { Store: 'A', OrderDate: '2026-01-01', Revenue: 10 },
  { Store: 'A', OrderDate: '2026-01-02', Revenue: 20 },
  { Store: 'B', OrderDate: '2026-01-01', Revenue: 5 },
  { Store: 'B', OrderDate: '2026-01-02', Revenue: 15 },
  { Store: 'C', OrderDate: '2026-01-01', Revenue: 8 },
  { Store: 'C', OrderDate: '2026-01-02', Revenue: 12 },
];

function withoutAuthority<T extends { analysisAuthority?: unknown }>(value: T): Omit<T, 'analysisAuthority'> {
  const { analysisAuthority: _ignored, ...rest } = value;
  return rest;
}

describe('MB-6 BA authority propagation', () => {
  it('adds authority to Focus without changing any factual comparison value', () => {
    const baseline = buildFocusSubjectComparison(rows, subject, action)!;
    const propagated = buildFocusSubjectComparison(rows, subject, action, 10, { kind: 'full_source', isTruncated: false }, authority)!;
    expect(propagated.analysisAuthority).toEqual(authority);
    expect(withoutAuthority(propagated)).toEqual(baseline);
    expect(propagated.metrics[0]).toMatchObject({ subjectValue: 30, populationAverage: 70 / 3, aggregation: 'SUM' });
  });

  it('adds the same authority to Deep BA and its investigation without changing computed facts', () => {
    const semanticFields = [
      { canonicalId: 'sales_revenue', physicalColumn: 'Revenue', role: 'measure' },
      { canonicalId: 'store', physicalColumn: 'Store', role: 'dimension' },
      { canonicalId: 'order_date', physicalColumn: 'OrderDate', role: 'time' },
    ];
    const baseline = createSingleSourceBAOverview(rows, { analysisAction: action, semanticFields })!;
    const propagated = createSingleSourceBAOverview(rows, { analysisAction: action, semanticFields, analysisAuthority: authority })!;
    expect(propagated.analysisAuthority).toEqual(authority);
    expect(propagated.investigation?.analysisAuthority).toEqual(authority);

    const baselineFacts = structuredClone(baseline) as typeof baseline;
    const propagatedFacts = structuredClone(propagated) as typeof propagated;
    delete propagatedFacts.analysisAuthority;
    if (propagatedFacts.investigation) delete propagatedFacts.investigation.analysisAuthority;
    expect(propagatedFacts).toEqual(baselineFacts);
    expect(propagated.kpis).toEqual(baseline.kpis);
    expect(propagated.breakdowns).toEqual(baseline.breakdowns);
    expect(propagated.findings).toEqual(baseline.findings);
  });
});
