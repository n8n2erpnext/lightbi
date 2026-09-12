import { describe, expect, it } from 'vitest';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import {
  buildPresentationCapabilityInventory,
  planPresentationStoryRequests,
  resolveRequestedSupportingAnalyses,
  type PresentationSupportAnalysisV1,
} from './presentation-capability-inventory';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';

function support(input: {
  id: string;
  label: string;
  actionType?: AnalysisAction['actionType'];
  dimensions?: string[];
  measures?: string[];
  confidence?: number;
  blocked?: boolean;
}): PresentationSupportAnalysisV1 {
  const actionType = input.actionType ?? 'group_by';
  const dimensions = input.dimensions ?? ['Product'];
  const measures = input.measures ?? ['Revenue'];
  const action: AnalysisAction = {
    id: input.id,
    opportunityName: input.label,
    label: input.label,
    description: input.label,
    actionType,
    dimensions,
    measures,
    confidenceScore: input.confidence ?? 80,
    source: 'dataset_understanding',
  };
  const runtimeIntent: RuntimeIntent = {
    id: `intent:${input.id}`,
    sourceActionId: input.id,
    type: actionType,
    dimensions,
    measures,
    expectedShape: actionType === 'trend' ? 'line_chart' : 'bar_chart',
    status: input.blocked ? 'blocked' : 'ready',
    warnings: [],
    blockedReasons: input.blocked ? ['fixture_blocked'] : [],
    source: 'analysis_action',
  };
  const runtimePlanPreview: RuntimePlanPreview = {
    id: `plan:${input.id}`,
    sourceIntentId: runtimeIntent.id,
    status: input.blocked ? 'blocked' : 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [...dimensions, ...measures],
    expectedOutput: { shape: runtimeIntent.expectedShape, dimensions, measures },
    warnings: [],
    blockedReasons: input.blocked ? ['fixture_blocked'] : [],
    source: 'runtime_intent',
  };
  return { analysisAction: action, runtimeIntent, runtimePlanPreview };
}

const primary = support({
  id: 'primary',
  label: 'Revenue over time',
  actionType: 'trend',
  dimensions: ['OrderDate'],
  measures: ['Revenue'],
  confidence: 100,
});

function controlledAdvice(requiredRoles: string[]): MicroBrainPresentationAdviceV1 {
  return {
    brainVersion: 'cpr7-compound-primary-test',
    indexVersion: 'cpr7-compound-primary-index',
    authorityNotes: [],
    candidates: [{
      hit: {
        conceptId: 'concept.cpr7.compound_primary', canonicalSignal: null,
        sparseRank: 1, denseRank: 1, fusedRank: 1, rrfScore: 1, sparseScore: 1, denseSimilarity: 1,
        positiveUnitIds: [], negativeUnitIds: [],
      },
      labels: ['CPR-7 compound-primary role diversity'],
      definition: 'Controlled presentation-only role advice.',
      presentation: {
        schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1',
        advisoryKind: 'domain_profile', authority: 'advisory_only',
        analyticalIntents: ['category_comparison'],
        requiredRoles,
      },
    }],
  };
}

describe('CPR-2 Presentation Capability Inventory and Story Request Planner', () => {
  it('is read-only over existing governed capabilities and never creates semantic authority', () => {
    const supporting = [support({ id: 'driver', label: 'Top products by Revenue' })];
    const inventory = buildPresentationCapabilityInventory({
      primaryAction: primary.analysisAction,
      primaryRuntimeIntent: primary.runtimeIntent,
      supportingAnalyses: supporting,
    });
    expect(inventory.governance).toEqual({
      authority: 'presentation_read_only',
      mayCreateMetric: false,
      mayCreateFormula: false,
      mayCreateJoin: false,
      mayMutateUnderstanding: false,
    });
    expect(inventory.candidates[0]).toMatchObject({ actionId: 'driver', storyRole: 'driver', runtimeReady: true });
  });

  it('requests a domain companion beyond the old first-six pool instead of blindly slicing by source order', () => {
    const firstSix = Array.from({ length: 6 }, (_, index) => support({
      id: `driver-${index + 1}`,
      label: `Top item ${index + 1} by Revenue`,
      confidence: 90 - index,
    }));
    const seventh = support({
      id: 'channel-mix-seventh',
      label: 'Revenue mix share by Channel',
      dimensions: ['Channel'],
      measures: ['Revenue'],
      confidence: 70,
    });
    const supporting = [...firstSix, seventh];
    const inventory = buildPresentationCapabilityInventory({
      primaryAction: primary.analysisAction,
      primaryRuntimeIntent: primary.runtimeIntent,
      supportingAnalyses: supporting,
    });
    const plan = planPresentationStoryRequests({ inventory, primaryDomain: 'revenue', budget: 6 });
    expect(plan.requestedRoles).toContain('composition');
    expect(plan.selections).toContainEqual(expect.objectContaining({
      actionId: 'channel-mix-seventh',
      storyRole: 'composition',
      reason: 'domain_requested_role',
      sourceIndex: 6,
    }));
    expect(plan.selections).toHaveLength(6);
    expect(plan.selections.map(item => item.actionId)).not.toEqual(firstSix.map(item => item.analysisAction.id));
    expect(resolveRequestedSupportingAnalyses({ supportingAnalyses: supporting, requestPlan: plan })
      .map(item => item.analysisAction.id)).toContain('channel-mix-seventh');
  });

  it('never requests blocked capabilities even when their role is preferred by the domain', () => {
    const supporting = [
      support({ id: 'blocked-mix', label: 'Revenue mix share by Channel', blocked: true }),
      support({ id: 'driver', label: 'Top products by Revenue' }),
    ];
    const inventory = buildPresentationCapabilityInventory({
      primaryAction: primary.analysisAction,
      primaryRuntimeIntent: primary.runtimeIntent,
      supportingAnalyses: supporting,
    });
    const plan = planPresentationStoryRequests({ inventory, primaryDomain: 'revenue' });
    expect(plan.selections.map(item => item.actionId)).not.toContain('blocked-mix');
    expect(plan.selections.map(item => item.actionId)).toContain('driver');
  });
  it('does not pad an already compound primary from generic MB role diversity without official-domain support', () => {
    const compoundPrimary = support({
      id: 'carrier-cost-impact',
      label: 'Carrier cost impact',
      dimensions: ['Carrier'],
      measures: ['Delivery Fee', 'record_count'],
      confidence: 100,
    });
    const supporting = [
      support({ id: 'location-volume', label: 'Operational volume by location', dimensions: ['Route'], measures: ['record_count'] }),
      support({ id: 'completion-mix', label: 'Delivery completion mix share by Status', dimensions: ['Delivery Status'], measures: ['record_count'] }),
    ];
    const inventory = buildPresentationCapabilityInventory({
      primaryAction: compoundPrimary.analysisAction,
      primaryRuntimeIntent: compoundPrimary.runtimeIntent,
      supportingAnalyses: supporting,
    });
    const plan = planPresentationStoryRequests({
      inventory, primaryDomain: 'operations', perspectiveId: 'operations', budget: 6,
      advisor: () => controlledAdvice(['driver', 'composition']),
    });
    expect(plan.ballotTrace.selectionBasis).toBe('mb_vote');
    expect(plan.ballotTrace.selectedOptionIds).toEqual(expect.arrayContaining(['driver', 'composition']));
    expect(plan.requestedRoles).toEqual(expect.arrayContaining(['risk', 'change', 'evidence']));
    expect(plan.targetLayoutCount).toBe(1);
    expect(plan.targetCompanionRoles).toEqual([]);
  });

});
