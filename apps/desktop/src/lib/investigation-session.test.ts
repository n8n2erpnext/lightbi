import { describe, it, expect, beforeEach } from 'vitest';
import { createInvestigationSession, clearInvestigationSession } from './investigation-session';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('Investigation Session', () => {
  const dummyAction: AnalysisAction = {
    id: 'a1',
    opportunityName: 'Test',
    label: 'Test label',
    description: 'Test desc',
    actionType: 'group_by',
    dimensions: [],
    measures: [],
    confidenceScore: 0.9,
    source: 'dataset_understanding'
  };

  const dummyIntent: RuntimeIntent = {
    id: 'i1',
    sourceActionId: 'a1',
    status: 'ready',
    type: 'group_by',
    dimensions: [],
    measures: [],
    expectedShape: 'bar_chart',
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
    requiredColumns: [],
    expectedOutput: { shape: 'table', dimensions: [], measures: [] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  beforeEach(() => {
    clearInvestigationSession();
  });

  it('1. session can store rows', () => {
    const rows = [{ a: 1 }];
    const session = createInvestigationSession('d1', dummyAction, dummyIntent, dummyPlan, rows);
    expect(session.rows).toBeDefined();
    expect(session.rows).toHaveLength(1);
    expect(session.rows?.[0].a).toBe(1);
  });

  it('2. rows preserve the full analysis dataset', () => {
    const rows = Array.from({ length: 1500 }).map((_, i) => ({ id: i }));
    const session = createInvestigationSession('d1', dummyAction, dummyIntent, dummyPlan, rows);
    expect(session.rows).toHaveLength(1500);
    expect(session.rows?.[1499].id).toBe(1499);
  });

  it('3. rows are cloned or preserved safely', () => {
    const rows = [{ val: 'original' }];
    const session = createInvestigationSession('d1', dummyAction, dummyIntent, dummyPlan, rows);
    // Mutate original
    rows[0].val = 'mutated';
    expect(session.rows?.[0].val).toBe('original');
  });

  it('4. session without rows remains valid', () => {
    const session = createInvestigationSession('d1', dummyAction, dummyIntent, dummyPlan);
    expect(session.rows).toBeUndefined();
    expect(session.datasetId).toBe('d1');
  });

  it('5. creating session does not mutate input rows', () => {
    const rows = Array.from({ length: 1500 }).map((_, i) => ({ id: i }));
    const session = createInvestigationSession('d1', dummyAction, dummyIntent, dummyPlan, rows);
    expect(rows).toHaveLength(1500); // Original array size remains
    expect(session.rows).toHaveLength(1500);
  });
});
