import { describe, expect, it } from 'vitest';
import { createAnalysisWorkbookPlan } from './analysis-workbook';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import {
  ANALYSIS_SESSION_IDENTITY_VERSION,
  createAnalysisSessionIdentity,
  parseAnalysisSessionIdentity,
  revalidateAnalysisSessionPlanIdentity,
  revalidateAnalysisSessionSourceIdentity,
} from './analysis-session-identity';

function plan() {
  const decision = createDecisionVisualizationPlan({
    perspectiveId: 'inventory', sourceCount: 1, dimensionField: 'Store', metricIds: ['stock_qty'],
    rows: [{ Store: 'A', stock_qty: 12 }],
  });
  return createAnalysisWorkbookPlan({
    title: 'Inventory', perspectiveId: 'inventory', sourceCount: 1,
    summaryRows: [{ Store: 'A', stock_qty: 12 }], decisionVisualizationPlan: decision,
  });
}

function boundary(overrides: Record<string, unknown> = {}) {
  return {
    datasetId: 'inventory.xlsx', sourceId: 'source-1', sourceFingerprint: 'fingerprint-1',
    inspectionGeneration: 'inspection-1', profileGeneration: 'profile-1',
    ...overrides,
  } as any;
}

describe('AnalysisSessionIdentityV1', () => {
  it('persists identity metadata without restoring execution authority', () => {
    const identity = createAnalysisSessionIdentity(plan(), { canonicalSourceBoundary: boundary() });
    expect(identity?.schemaVersion).toBe(ANALYSIS_SESSION_IDENTITY_VERSION);
    expect(identity?.sourceAnchor.kind).toBe('single_source');
    expect(identity?.authority).toEqual({ persistedExecutionAuthority: false, requiresRevalidation: true, decisionUseAuthorized: false });
    expect(parseAnalysisSessionIdentity(identity)).toEqual(identity);
  });

  it('refuses to persist an analysis identity without a canonical source or decision plan', () => {
    expect(createAnalysisSessionIdentity(plan(), {})).toBeNull();
    const weak = { ...plan(), decisionVisualizationPlan: null };
    expect(createAnalysisSessionIdentity(weak, { canonicalSourceBoundary: boundary() })).toBeNull();
  });

  it('invalidates source identity when fingerprint or generation changes', () => {
    const identity = createAnalysisSessionIdentity(plan(), { canonicalSourceBoundary: boundary() })!;
    expect(revalidateAnalysisSessionSourceIdentity(identity, { canonicalSourceBoundary: boundary() }).valid).toBe(true);
    const changed = revalidateAnalysisSessionSourceIdentity(identity, { canonicalSourceBoundary: boundary({ sourceFingerprint: 'fingerprint-2', profileGeneration: 'profile-2' }) });
    expect(changed.valid).toBe(false);
    expect(changed.blockers).toContain('analysis_source_fingerprint_changed');
    expect(changed.blockers).toContain('analysis_profile_generation_changed');
  });

  it('requires the current DecisionVisualizationPlan to match before export identity can be reused', () => {
    const savedPlan = plan();
    const identity = createAnalysisSessionIdentity(savedPlan, { canonicalSourceBoundary: boundary() })!;
    expect(revalidateAnalysisSessionPlanIdentity(identity, savedPlan).valid).toBe(true);
    const changedDecision = createDecisionVisualizationPlan({
      perspectiveId: 'inventory', sourceCount: 1, dimensionField: 'Store', metricIds: ['stock_qty'],
      rows: [{ Store: 'B', stock_qty: 99 }],
    });
    const changedPlan = createAnalysisWorkbookPlan({
      title: 'Inventory', perspectiveId: 'inventory', sourceCount: 1,
      summaryRows: [{ Store: 'B', stock_qty: 99 }], decisionVisualizationPlan: changedDecision,
    });
    const changed = revalidateAnalysisSessionPlanIdentity(identity, changedPlan);
    expect(changed.valid).toBe(false);
    expect(changed.blockers).toContain('analysis_decision_plan_id_changed');
  });

  it('fails multi-source restore until the governed relationship identity is rebuilt exactly', () => {
    const multiPlanDecision = createDecisionVisualizationPlan({
      perspectiveId: 'executive', sourceCount: 2, dimensionField: 'reporting_period', metricIds: ['gross_profit'],
      rows: [{ reporting_period: '2026-08', gross_profit: 42 }],
      sourceRefs: [
        { sourceId: 'sales', sourceName: 'sales.xlsx', role: 'sales', period: '2026-08', sourceRowCount: 10 },
        { sourceId: 'accounting', sourceName: 'accounting.xlsx', role: 'accounting', period: '2026-08', sourceRowCount: 10 },
      ],
    });
    const multiPlan = createAnalysisWorkbookPlan({
      title: 'Executive', perspectiveId: 'executive', sourceCount: 2,
      summaryRows: [{ reporting_period: '2026-08', gross_profit: 42 }], decisionVisualizationPlan: multiPlanDecision,
    });
    const multi = {
      multiSourceDatasetId: 'multi-1', identity: 'identity-1', stateGeneration: 'generation-1', relationshipArtifactId: 'rel-1',
      orderedSourceMemberships: [
        { sourceId: 'sales', sourceFingerprint: 'sales-fp', inspectionGeneration: 'i1', profileGeneration: 'p1' },
        { sourceId: 'accounting', sourceFingerprint: 'acct-fp', inspectionGeneration: 'i2', profileGeneration: 'p2' },
      ],
    } as any;
    const identity = createAnalysisSessionIdentity(multiPlan, { canonicalMultiSourceDataset: multi })!;
    expect(revalidateAnalysisSessionSourceIdentity(identity, { canonicalMultiSourceDataset: multi }).valid).toBe(true);
    expect(revalidateAnalysisSessionSourceIdentity(identity, {}).blockers).toEqual(['analysis_multisource_dataset_rebuild_required']);
    const changed = { ...multi, relationshipArtifactId: 'rel-2' };
    expect(revalidateAnalysisSessionSourceIdentity(identity, { canonicalMultiSourceDataset: changed }).blockers).toContain('analysis_relationship_artifact_changed');
    const membershipChanged = { ...multi, orderedSourceMemberships: [multi.orderedSourceMemberships[0], { ...multi.orderedSourceMemberships[1], sourceFingerprint: 'acct-fp-changed' }] };
    expect(revalidateAnalysisSessionSourceIdentity(identity, { canonicalMultiSourceDataset: membershipChanged }).blockers).toContain('analysis_membership_1_fingerprint_changed');
  });
});
