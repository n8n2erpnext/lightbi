import { describe, expect, it } from 'vitest';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';
import type { CanonicalDatasetPresentationV1 } from './understanding-core/canonical-consumer-presentation-contract';
import type { DatasetUnderstandingResult } from './understanding-next/contracts';
import { buildQuestionPerspectiveIntelligence } from './question-perspective-intelligence';

const presentation: CanonicalDatasetPresentationV1 = {
  schemaVersion: 'lightbi.canonical-consumer-presentation.v1', artifactIdentity: 'artifact:1', overlayIdentity: null, datasetStateIdentity: 'dataset:1', sourceId: 'source:1', datasetState: 'understood', datasetBlockers: [], prohibitedUses: [],
  counts: { ready: 1, needs_user_evidence: 1, needs_mapping_review: 0, blocked_safety: 1, unsupported_mvp: 0, stale: 0, executing: 0, execution_failed: 0, completed: 0 },
  analyses: [
    { itemId: 'commerce.sales_revenue.by_product', questionId: 'commerce.sales_revenue.by_product', actionCandidateId: 'action:governed-revenue', businessPerspectiveIds: ['revenue'], metricId: 'sales_revenue', title: 'Which products contribute the most sales revenue?', description: 'Rank governed sales revenue by product.', state: 'ready', m1State: 'ready', m2State: 'ready', m3State: 'ready', executionReadiness: 'executable', primaryBlocker: null, secondaryBlockers: [], limitations: [], remediationOperations: [], physicalColumns: ['Product', 'Revenue'], canonicalSignals: ['product', 'sales_revenue'], sourceId: 'source:1', sheetOrTable: null, evidence: [{ evidenceId: 'metric:sales_revenue', references: ['Revenue'], provenance: 'governed_metric_catalog' }], decisionUseRestrictions: [], artifactIdentity: 'artifact:1', overlayIdentity: null, advertisedAsDefault: true, rank: 1 },
    { itemId: 'commerce.gross_profit.by_product', questionId: 'commerce.gross_profit.by_product', actionCandidateId: null, businessPerspectiveIds: ['finance'], metricId: 'gross_profit', title: 'Where is gross profit concentrated?', description: 'Gross profit by product.', state: 'needs_user_evidence', m1State: 'conditional', m2State: 'conditional', m3State: 'unavailable', executionReadiness: 'not_executable', primaryBlocker: { code: 'currency_required', message: 'Currency required.', severity: 'material', scope: 'source', source: 'metric_preflight', references: ['currency'], limitations: [], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: [], limitations: ['currency_basis_missing'], remediationOperations: [], physicalColumns: ['Revenue', 'Cost'], canonicalSignals: ['gross_profit'], sourceId: 'source:1', sheetOrTable: null, evidence: [], decisionUseRestrictions: [], artifactIdentity: 'artifact:1', overlayIdentity: null, advertisedAsDefault: false, rank: null },
    { itemId: 'commerce.inventory.blocked', questionId: 'commerce.inventory.blocked', actionCandidateId: null, businessPerspectiveIds: ['inventory'], metricId: 'inventory_on_hand', title: 'What is inventory on hand?', description: 'Snapshot inventory.', state: 'blocked_safety', m1State: 'blocked', m2State: 'blocked', m3State: 'blocked', executionReadiness: 'not_executable', primaryBlocker: { code: 'snapshot_basis_missing', message: 'Snapshot basis missing.', severity: 'critical', scope: 'metric', source: 'metric_preflight', references: [], limitations: [], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: [], limitations: [], remediationOperations: [], physicalColumns: [], canonicalSignals: ['stock_qty'], sourceId: 'source:1', sheetOrTable: null, evidence: [], decisionUseRestrictions: [], artifactIdentity: 'artifact:1', overlayIdentity: null, advertisedAsDefault: false, rank: null },
  ],
  understanding: {
    source: { label: 'sales.csv', kind: 'local_file', sheetOrTable: null, connectedFiles: ['sales.csv'], sourceRowCount: 2, profiledRowCount: 2, columnCount: 2, profileScope: 'full', profileConfidence: 'high', dataRegionState: 'confirmed' }, representativeEvidence: { strategy: 'bounded', sampledRowCount: 2, fullFileTruth: false, coveredRegions: ['head'] }, qualityIssues: [], mappings: [], mappingStateCounts: {}, unknownBusinessFields: [], ignoredFields: [], grain: { structuralForm: 'document', structuralState: 'confirmed', identityBasis: 'order', temporalMode: 'event', aggregationForm: 'atomic' }, relationships: { state: 'source_local_not_evaluated', sourceCount: 1, explanation: 'local' }, domainSupport: { packId: 'commerce_distribution_mvp', state: 'supported', concepts: [], metrics: [] }, domainInference: { primaryDomain: 'retail_commerce', primaryDomainSource: 'mixed', domains: [{ domainId: 'retail_commerce', source: 'mixed', evidenceRank: 1, canonicalSignalIds: ['product', 'sales_revenue'], physicalColumns: ['Product', 'Revenue'] }], semanticConcepts: { confirmed: 2, probable: 0, microBrainRecovered: 0, ambiguous: 0, unknown: 0, unresolved: 0 }, evidenceConflicts: 0, officialSupport: { packId: 'commerce_distribution_mvp', state: 'supported', productionActive: false }, analysisMode: 'canonical_detect_only', limitations: [] }, evidence: { observedEvidenceCount: 2, userConfirmedMappingCount: 0, userConfirmedDeclarationCount: 0 }, readinessRestrictions: [],
  },
};

const understanding: DatasetUnderstandingResult = {
  source: { fileNames: ['sales.csv'], sheetNames: [], sourceRowCount: 2, sourceColumnCount: 2, parsedRowCount: 2, sampleRowCount: 2 }, quality: { headerStatus: 'clean', dirtySignals: [], blockedReasons: [] }, profile: { grain: 'transaction', documentType: 'generic_table', detectedDomains: ['revenue'] }, columns: [],
  signals: [{ canonicalId: 'product', label: 'Product', domain: 'revenue', physicalColumn: 'Product', confidence: 100, evidence: [], cardinality: 2, role: 'dimension', usableForDefaultQuestion: true }, { canonicalId: 'sales_revenue', label: 'Revenue', domain: 'revenue', physicalColumn: 'Revenue', confidence: 100, evidence: [], cardinality: 2, role: 'measure', usableForDefaultQuestion: true }], stakeholderFits: [], lenses: [], perspectives: [],
  recommendedQuestions: [{ id: 'universal:revenue-by-product', label: 'Which products contribute the most sales revenue?', userPrompt: 'Compare revenue by product.', domain: 'revenue', perspectiveId: 'universal:revenue', requiredSignals: ['sales_revenue', 'product'], optionalSignals: [], dimensions: ['Product'], measures: ['Revenue'], fitScore: 100, actionKind: 'group_by', executionScope: 'full_local_file', caveats: [] }],
  availableActions: [{ id: 'action:governed-revenue', questionId: 'commerce.sales_revenue.by_product', label: 'Governed revenue', actionKind: 'group_by', dimensions: ['product'], measures: ['sales_revenue'], executionScope: 'full_local_file' }, { id: 'universal:action:revenue-by-product', questionId: 'universal:revenue-by-product', label: 'Revenue by product', actionKind: 'group_by', dimensions: ['Product'], measures: ['Revenue'], executionScope: 'full_local_file' }], unavailableActions: [],
};

function advisory(conceptId: string, perspective = 'revenue'): MicroBrainPresentationAdviceV1 {
  return { brainVersion: 'test', indexVersion: 'test', candidates: [{ hit: { conceptId, canonicalSignal: null, sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 99, sparseScore: 99, denseSimilarity: 0.99, positiveUnitIds: [], negativeUnitIds: [] }, labels: [], definition: '', presentation: { schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1', advisoryKind: 'perspective_profile', authority: 'advisory_only', perspectives: [perspective], priorities: ['rank relevant question'], evidenceRequirements: ['require source evidence'], abstainWhen: ['required evidence is missing'], mustNot: ['invent metrics'] } }], authorityNotes: ['advisory only'] };
}

function domainAdvisory(conceptId: string, analyticalIntents: string[]): MicroBrainPresentationAdviceV1 {
  return { brainVersion: 'test', indexVersion: 'test', candidates: [{ hit: { conceptId, canonicalSignal: null, sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 88, sparseScore: 88, denseSimilarity: 0.88, positiveUnitIds: [], negativeUnitIds: [] }, labels: [], definition: '', presentation: { schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1', advisoryKind: 'domain_profile', authority: 'advisory_only', analyticalIntents, evidenceRequirements: ['governed source evidence'], constraints: ['domain preference never authorizes a metric'] } }], authorityNotes: ['advisory only'] };
}

describe('DPR-2 Question/Perspective Intelligence', () => {
  it('deduplicates semantic siblings and prefers already-governed executable authority', () => {
    const result = buildQuestionPerspectiveIntelligence({ presentation, understanding, selectedPerspectiveId: 'revenue', advisor: () => advisory('concept.revenue') });
    const revenue = result.candidates.filter(item => item.metricId === 'sales_revenue' || item.metricId === 'Revenue');
    expect(revenue).toHaveLength(1);
    expect(revenue[0].source).toBe('merged');
    expect(revenue[0].answerability).toBe('executable_now');
    expect(revenue[0].actionAuthority).toBe('governed');
    expect(revenue[0].actionId).toBe('action:governed-revenue');
  });

  it('allows MB to contribute ordinal relevance/context but never to strengthen answerability or action authority', () => {
    const noAdvice = buildQuestionPerspectiveIntelligence({ presentation, understanding, selectedPerspectiveId: 'finance', advisor: () => ({ brainVersion: 'x', indexVersion: 'x', candidates: [], authorityNotes: [] }) });
    const withAdvice = buildQuestionPerspectiveIntelligence({ presentation, understanding, selectedPerspectiveId: 'finance', advisor: () => advisory('concept.finance', 'finance') });
    const before = noAdvice.candidates.find(item => item.metricId === 'gross_profit')!;
    const after = withAdvice.candidates.find(item => item.metricId === 'gross_profit')!;
    expect(after.advisoryRankPrior).toBeGreaterThan(before.advisoryRankPrior);
    expect(after.answerability).toBe(before.answerability);
    expect(after.actionAuthority).toBe('none');
    expect(after.actionId).toBeNull();
  });

  it('keeps open-world inferred domain separate from selected perspective and official support', () => {
    const healthcare = structuredClone(presentation);
    healthcare.understanding!.domainInference = { ...healthcare.understanding!.domainInference, primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation', analysisMode: 'evidence_bound_inferred_domain', officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false } };
    const result = buildQuestionPerspectiveIntelligence({ presentation: healthcare, understanding, selectedPerspectiveId: 'performance', advisor: () => advisory('concept.healthcare', 'performance') });
    expect(result.domainContext.primaryDomain).toBe('healthcare');
    expect(result.selectedPerspectiveId).toBe('performance');
    expect(result.domainContext.officialSupportProductionActive).toBe(false);
  });


  it('creates open-world domain-context questions as non-executable needs-evidence candidates', () => {
    const healthcare = structuredClone(presentation);
    healthcare.understanding!.domainInference = { ...healthcare.understanding!.domainInference, primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation', analysisMode: 'evidence_bound_inferred_domain', officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false } };
    const result = buildQuestionPerspectiveIntelligence({
      presentation: healthcare,
      understanding,
      selectedPerspectiveId: 'performance',
      advisor: () => domainAdvisory('concept.presentation_domain_healthcare_pharma', ['process_time', 'capacity_utilization']),
    });
    const contextOnly = result.candidates.filter(item => item.source === 'domain_context');
    expect(contextOnly.length).toBeGreaterThanOrEqual(2);
    expect(contextOnly.every(item => item.basis === 'domain_context')).toBe(true);
    expect(contextOnly.every(item => item.answerability === 'needs_more_evidence')).toBe(true);
    expect(contextOnly.every(item => item.actionAuthority === 'none' && item.actionId === null)).toBe(true);
    expect(contextOnly.every(item => item.perspectiveId === 'performance')).toBe(true);
    expect(contextOnly.flatMap(item => item.mbAdvice.analyticalIntents)).toEqual(expect.arrayContaining(['process_time', 'capacity_utilization']));
    expect(result.primary).toBeNull();
  });

  it('keeps safety-blocked questions unsupported even under strong MB advice', () => {
    const result = buildQuestionPerspectiveIntelligence({ presentation, understanding, selectedPerspectiveId: 'inventory', advisor: () => advisory('concept.inventory', 'inventory') });
    const inventory = result.candidates.find(item => item.metricId === 'inventory_on_hand')!;
    expect(inventory.answerability).toBe('unsupported');
    expect(inventory.actionAuthority).toBe('none');
    expect(inventory.actionId).toBeNull();
  });

  it('does not expose retrieval score or similarity as confidence in the public planner contract', () => {
    const result = buildQuestionPerspectiveIntelligence({ presentation, understanding, selectedPerspectiveId: 'revenue', advisor: () => advisory('concept.revenue') });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('rrfScore');
    expect(serialized).not.toContain('denseSimilarity');
    expect(serialized).not.toContain('sparseScore');
    expect(serialized).not.toMatch(/\"confidence\"\s*:/);
    expect(serialized).not.toContain('semanticKey');
    expect(result.policy.retrievalScoreIsConfidence).toBe(false);
    expect(result.policy.mbMayStrengthenAuthority).toBe(false);
  });
});
