import { describe, expect, it } from 'vitest';
import { createDashboardCompositionPlan, type DashboardCompositionCandidateV1 } from './dashboard-composition-plan';

const base = (overrides: Partial<DashboardCompositionCandidateV1> = {}): DashboardCompositionCandidateV1 => ({
  id: 'primary',
  managementQuestion: 'What changed in revenue?',
  semanticRole: 'primary_answer',
  artifactKind: 'visual',
  evidenceBacked: true,
  evidenceRefs: ['governed-result:test'],
  decisionImportance: 100,
  analysisShape: { dimension: 'Month', measure: 'sales_revenue' },
  advisoryRoles: ['overview'],
  reasonForInclusion: 'test evidence-backed management question',
  ...overrides,
});

describe('Dashboard Composition Plan V1', () => {
  it('orders an input-order-independent business story by stage and decision importance', () => {
    const candidates = [
      base({ id: 'evidence', managementQuestion: 'What evidence supports this?', semanticRole: 'evidence_table', artifactKind: 'evidence', decisionImportance: 70, analysisShape: undefined }),
      base({ id: 'driver-b', managementQuestion: 'Which product contributes?', semanticRole: 'ranked_driver', decisionImportance: 70, analysisShape: { dimension: 'Product', measure: 'sales_revenue' } }),
      base({ id: 'risk', managementQuestion: 'Where is revenue exposed?', semanticRole: 'risk_exception', decisionImportance: 80, analysisShape: { dimension: 'Region', measure: 'sales_revenue' } }),
      base(),
    ];
    const forward = createDashboardCompositionPlan({ candidates, decisionPerspective: 'Revenue review', informationBudget: { maxItems: 4 } });
    const reversed = createDashboardCompositionPlan({ candidates: [...candidates].reverse(), decisionPerspective: 'Revenue review', informationBudget: { maxItems: 4 } });
    expect(forward.items.map(item => item.candidateId)).toEqual(['primary', 'driver-b', 'risk', 'evidence']);
    expect(reversed.items.map(item => item.candidateId)).toEqual(forward.items.map(item => item.candidateId));
    expect(reversed.planId).toBe(forward.planId);
    expect(forward.context).toEqual({ decisionPerspective: 'Revenue review', audience: null, audienceSource: 'unavailable', domainId: null });
    expect(forward.policy.membershipBeforeAdvisoryOrdering).toBe(true);
    expect(forward.items[0]).toMatchObject({ placementGroup: null, widthIntent: 'wide', heightIntent: 'standard' });
  });

  it('rejects non-evidence items and narrative/visual duplicates instead of making a card dump', () => {
    const plan = createDashboardCompositionPlan({
      decisionPerspective: 'Revenue review',
      candidates: [
        base(),
        base({ id: 'duplicate-narrative', artifactKind: 'narrative', analysisShape: undefined }),
        base({ id: 'unsupported', managementQuestion: 'What might happen next?', semanticRole: 'risk_exception', evidenceBacked: false, analysisShape: undefined }),
      ],
      informationBudget: { maxItems: 5 },
    });
    expect(plan.items.map(item => item.candidateId)).toEqual(['primary']);
    expect(plan.rejected).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: 'duplicate-narrative', reason: 'duplicate_management_question' }),
      expect.objectContaining({ candidateId: 'unsupported', reason: 'evidence_required' }),
    ]));
  });
  it('keeps current analytical-shape dedup semantics across accent and case variants', () => {
    const plan = createDashboardCompositionPlan({
      decisionPerspective: 'Revenue review',
      candidates: [
        base({ id: 'first', managementQuestion: 'How many records by DVT?', analysisShape: { dimension: 'ĐVT', measure: 'record_count' } }),
        base({ id: 'second', managementQuestion: 'How many records by unit?', analysisShape: { dimension: 'dvt', measure: 'Record Count' }, decisionImportance: 90 }),
      ],
      informationBudget: { maxItems: 5 },
    });
    expect(plan.items.map(item => item.candidateId)).toEqual(['first']);
    expect(plan.rejected).toContainEqual(expect.objectContaining({ candidateId: 'second', reason: 'duplicate_analysis_shape' }));
  });

  it('enforces explicit information budgets without inventing a global card limit', () => {
    const plan = createDashboardCompositionPlan({
      decisionPerspective: 'Revenue review',
      candidates: [
        base(),
        base({ id: 'driver', managementQuestion: 'Which product drives revenue?', semanticRole: 'ranked_driver', analysisShape: { dimension: 'Product', measure: 'sales_revenue' }, decisionImportance: 90 }),
        base({ id: 'risk', managementQuestion: 'Which region is exposed?', semanticRole: 'risk_exception', analysisShape: { dimension: 'Region', measure: 'sales_revenue' }, decisionImportance: 80 }),
      ],
      informationBudget: { maxItems: 2 },
    });
    expect(plan.items.map(item => item.candidateId)).toEqual(['primary', 'driver']);
    expect(plan.rejected).toContainEqual(expect.objectContaining({ candidateId: 'risk', reason: 'item_budget_exceeded' }));
  });
  it('lets MB dashboard-role advice reorder only already-admitted equal-priority items', () => {
    const candidates = [
      base({ id: 'pipeline', managementQuestion: 'What is the pipeline shape?', semanticRole: 'ranked_driver', decisionImportance: 70, analysisShape: { dimension: 'Stage', measure: 'pipeline_value' }, advisoryRoles: ['pipeline'] }),
      base({ id: 'performance', managementQuestion: 'Where is sales performance concentrated?', semanticRole: 'ranked_driver', decisionImportance: 70, analysisShape: { dimension: 'Salesperson', measure: 'sales_revenue' }, advisoryRoles: ['performance'] }),
      base({ id: 'unsupported', managementQuestion: 'What causal factor explains conversion?', semanticRole: 'ranked_driver', decisionImportance: 70, evidenceBacked: false, analysisShape: undefined, advisoryRoles: ['pipeline'] }),
    ];
    const deterministic = createDashboardCompositionPlan({ candidates, decisionPerspective: 'Revenue review', informationBudget: { maxItems: 2 } });
    const advised = createDashboardCompositionPlan({ candidates, decisionPerspective: 'Revenue review', informationBudget: { maxItems: 2 }, advisoryRoleOrder: ['performance', 'pipeline'] });
    expect(new Set(advised.items.map(item => item.candidateId))).toEqual(new Set(deterministic.items.map(item => item.candidateId)));
    expect(advised.items.map(item => item.candidateId)).toEqual(['performance', 'pipeline']);
    expect(advised.rejected).toContainEqual(expect.objectContaining({ candidateId: 'unsupported', reason: 'evidence_required' }));
    expect(advised.governance.mbMayChangeMembership).toBe(false);
  });

  it('retains an explicit audience without turning it into membership authority', () => {
    const candidates = [base(), base({ id: 'driver', managementQuestion: 'Which product contributes?', semanticRole: 'ranked_driver', analysisShape: { dimension: 'Product', measure: 'sales_revenue' } })];
    const withoutAudience = createDashboardCompositionPlan({ candidates, decisionPerspective: 'Revenue review', informationBudget: { maxItems: 2 } });
    const withAudience = createDashboardCompositionPlan({ candidates, decisionPerspective: 'Revenue review', audience: 'finance_lead', domainId: 'finance', informationBudget: { maxItems: 2 } });
    expect(withAudience.context).toEqual({ decisionPerspective: 'Revenue review', audience: 'finance_lead', audienceSource: 'explicit', domainId: 'finance' });
    expect(withAudience.items.map(item => item.candidateId)).toEqual(withoutAudience.items.map(item => item.candidateId));
  });

  it('fails comparative groups closed when metric or grain is incompatible', () => {
    const plan = createDashboardCompositionPlan({
      decisionPerspective: 'Revenue review',
      candidates: [
        base({ id: 'actual', managementQuestion: 'How does actual revenue compare?', comparison: { groupId: 'actual-target', metricId: 'sales_revenue', grainId: 'month' } }),
        base({ id: 'target', managementQuestion: 'How does target compare?', semanticRole: 'ranked_driver', analysisShape: { dimension: 'Month', measure: 'target_margin' }, comparison: { groupId: 'actual-target', metricId: 'gross_margin', grainId: 'month' } }),
      ],
      informationBudget: { maxItems: 4 },
    });
    expect(plan.items).toHaveLength(0);
    expect(plan.rejected.map(item => item.reason)).toEqual(['comparison_metric_mismatch', 'comparison_metric_mismatch']);
  });
});
