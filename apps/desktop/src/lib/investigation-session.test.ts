import { describe, it, expect, beforeEach } from 'vitest';
import { createInvestigationSession, getCurrentInvestigationSession, clearInvestigationSession } from './investigation-session';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('Investigation Session', () => {
  beforeEach(() => {
    clearInvestigationSession();
  });

  const dummyAction: AnalysisAction = {
    id: 'a1',
    opportunityName: 'Test',
    label: 'Test',
    description: 'Test',
    actionType: 'group_by',
    dimensions: ['dim1'],
    measures: ['meas1'],
    confidenceScore: 0.9,
    source: 'dataset_understanding'
  };

  const dummyIntent: RuntimeIntent = {
    id: 'i1',
    sourceActionId: 'a1',
    type: 'group_by',
    dimensions: ['dim1'],
    measures: ['meas1'],
    expectedShape: 'bar_chart',
    status: 'ready',
    warnings: [],
    blockedReasons: [],
    source: 'analysis_action'
  };

  const dummyPlan: RuntimePlanPreview = {
    id: 'p1',
    sourceIntentId: 'i1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: ['dim1', 'meas1'],
    expectedOutput: {
      shape: 'bar_chart',
      dimensions: ['dim1'],
      measures: ['meas1']
    },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  it('creates and retrieves a session', () => {
    const session = createInvestigationSession('dataset1', dummyAction, dummyIntent, dummyPlan);
    expect(session.id).toBeDefined();
    expect(session.datasetId).toBe('dataset1');
    expect(session.analysisAction).toBe(dummyAction);

    const retrieved = getCurrentInvestigationSession();
    expect(retrieved).toBe(session);
  });

  it('clears session', () => {
    createInvestigationSession('dataset1', dummyAction, dummyIntent, dummyPlan);
    clearInvestigationSession();
    expect(getCurrentInvestigationSession()).toBeNull();
  });
});
