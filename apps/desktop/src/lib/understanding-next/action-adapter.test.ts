/**
 * action-adapter.test.ts
 *
 * Unit tests for the understanding-next → legacy action-adapter bridge.
 *
 * Rules verified:
 * - data_quality_review → table_preview + metadata preserved
 * - revenue group_by/trend → valid legacy action
 * - executionScope and questionId preserved on all adapted actions
 * - isDataQualityReviewAction() type guard works correctly
 * - structurally blocked actions are NOT present in availableActions (via runtime-action-guard)
 */

import { describe, it, expect } from 'vitest';
import {
  adaptNextActionToLegacy,
  adaptNextActionsToLegacy,
  isAdaptedFromUnderstandingNext,
  isDataQualityReviewAction,
} from './action-adapter';
import type { AnalysisAction as NextAnalysisAction } from './contracts';
import { createGuardedActions } from './runtime-action-guard';
import type { BusinessQuestion } from './contracts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAction = (overrides: Partial<NextAnalysisAction>): NextAnalysisAction => ({
  id: 'action_test',
  questionId: 'q_test',
  label: 'Test Action',
  actionKind: 'group_by',
  dimensions: ['store'],
  measures: ['revenue'],
  executionScope: 'sample_preview',
  ...overrides,
});

// ---------------------------------------------------------------------------
// adaptNextActionToLegacy
// ---------------------------------------------------------------------------

describe('adaptNextActionToLegacy', () => {
  it('data_quality_review maps to table_preview as legacy actionType', () => {
    const action = makeAction({ actionKind: 'data_quality_review', dimensions: [], measures: [] });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('table_preview');
  });

  it('data_quality_review preserves sourceUnderstandingActionKind in _nextMetadata', () => {
    const action = makeAction({ actionKind: 'data_quality_review', dimensions: [], measures: [] });
    const result = adaptNextActionToLegacy(action);
    expect(result._nextMetadata.sourceUnderstandingActionKind).toBe('data_quality_review');
  });

  it('data_quality_review description says Needs data quality review', () => {
    const action = makeAction({ actionKind: 'data_quality_review', dimensions: [], measures: [] });
    const result = adaptNextActionToLegacy(action);
    expect(result.description).toContain('data quality review');
  });

  it('revenue group_by action maps to group_by legacy actionType', () => {
    const action = makeAction({
      id: 'action_revenue_group',
      questionId: 'q_revenue_group',
      label: 'Revenue by Store',
      actionKind: 'group_by',
      dimensions: ['store'],
      measures: ['revenue'],
      executionScope: 'sample_preview',
    });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('group_by');
    expect(result.dimensions).toContain('store');
    expect(result.measures).toContain('revenue');
    expect(result.measureAggregations).toEqual({ revenue: 'SUM' });
  });

  it('virtual count measures stay COUNT while physical measures default to SUM', () => {
    const action = makeAction({
      actionKind: 'group_by',
      dimensions: ['warehouse'],
      measures: ['record_count', 'Tổng tiền'],
    });
    const result = adaptNextActionToLegacy(action);
    expect(result.measureAggregations).toEqual({
      record_count: 'COUNT',
      'Tổng tiền': 'SUM',
    });
  });

  it('revenue trend action maps to trend legacy actionType', () => {
    const action = makeAction({
      id: 'action_revenue_trend',
      questionId: 'q_revenue_trend',
      label: 'Revenue Trend',
      actionKind: 'trend',
      dimensions: ['date'],
      measures: ['revenue'],
      executionScope: 'sample_preview',
    });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('trend');
    expect(result.measureAggregations).toEqual({ revenue: 'SUM' });
  });

  it('distribution action maps to distribution legacy actionType', () => {
    const action = makeAction({
      actionKind: 'distribution',
      dimensions: ['category'],
      measures: [],
    });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('distribution');
  });

  it('relationship action maps to relationship legacy actionType', () => {
    const action = makeAction({
      actionKind: 'relationship',
      dimensions: [],
      measures: ['revenue', 'quantity'],
    });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('relationship');
  });

  it('table_preview maps to table_preview', () => {
    const action = makeAction({ actionKind: 'table_preview', dimensions: [], measures: [] });
    const result = adaptNextActionToLegacy(action);
    expect(result.actionType).toBe('table_preview');
  });

  it('questionId is preserved in _nextMetadata', () => {
    const action = makeAction({ questionId: 'q_specific_123' });
    const result = adaptNextActionToLegacy(action);
    expect(result._nextMetadata.questionId).toBe('q_specific_123');
  });

  it('executionScope is preserved in _nextMetadata', () => {
    const action = makeAction({ executionScope: 'full_local_file' });
    const result = adaptNextActionToLegacy(action);
    expect(result._nextMetadata.executionScope).toBe('full_local_file');
  });

  it('source is always dataset_understanding', () => {
    const action = makeAction({});
    const result = adaptNextActionToLegacy(action);
    expect(result.source).toBe('dataset_understanding');
  });

  it('label and opportunityName match the original label', () => {
    const action = makeAction({ label: 'Revenue by Payment Method' });
    const result = adaptNextActionToLegacy(action);
    expect(result.label).toBe('Revenue by Payment Method');
    expect(result.opportunityName).toBe('Revenue by Payment Method');
  });
});

// ---------------------------------------------------------------------------
// adaptNextActionsToLegacy (array)
// ---------------------------------------------------------------------------

describe('adaptNextActionsToLegacy', () => {
  it('converts all actions in array', () => {
    const actions: NextAnalysisAction[] = [
      makeAction({ id: 'a1', actionKind: 'group_by' }),
      makeAction({ id: 'a2', actionKind: 'data_quality_review', dimensions: [], measures: [] }),
      makeAction({ id: 'a3', actionKind: 'trend', dimensions: ['date'], measures: ['revenue'] }),
    ];
    const result = adaptNextActionsToLegacy(actions);
    expect(result).toHaveLength(3);
    expect(result[0].actionType).toBe('group_by');
    expect(result[1].actionType).toBe('table_preview');
    expect(result[2].actionType).toBe('trend');
  });

  it('returns empty array for empty input', () => {
    expect(adaptNextActionsToLegacy([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isAdaptedFromUnderstandingNext
// ---------------------------------------------------------------------------

describe('isAdaptedFromUnderstandingNext', () => {
  it('returns true for adapted actions', () => {
    const adapted = adaptNextActionToLegacy(makeAction({}));
    expect(isAdaptedFromUnderstandingNext(adapted)).toBe(true);
  });

  it('returns false for plain legacy action without _nextMetadata', () => {
    const legacy = {
      id: 'x',
      opportunityName: 'X',
      label: 'X',
      description: 'X',
      actionType: 'table_preview' as const,
      dimensions: [],
      measures: [],
      confidenceScore: 50,
      source: 'dataset_understanding' as const,
    };
    expect(isAdaptedFromUnderstandingNext(legacy)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDataQualityReviewAction
// ---------------------------------------------------------------------------

describe('isDataQualityReviewAction', () => {
  it('returns true for data_quality_review adapted action', () => {
    const adapted = adaptNextActionToLegacy(
      makeAction({ actionKind: 'data_quality_review', dimensions: [], measures: [] })
    );
    expect(isDataQualityReviewAction(adapted)).toBe(true);
  });

  it('returns false for group_by adapted action', () => {
    const adapted = adaptNextActionToLegacy(makeAction({ actionKind: 'group_by' }));
    expect(isDataQualityReviewAction(adapted)).toBe(false);
  });

  it('returns false for trend adapted action', () => {
    const adapted = adaptNextActionToLegacy(
      makeAction({ actionKind: 'trend', dimensions: ['date'], measures: ['revenue'] })
    );
    expect(isDataQualityReviewAction(adapted)).toBe(false);
  });

  it('returns false for plain legacy action (not adapted)', () => {
    const legacy = {
      id: 'x',
      opportunityName: 'X',
      label: 'X',
      description: 'X',
      actionType: 'table_preview' as const,
      dimensions: [],
      measures: [],
      confidenceScore: 50,
      source: 'dataset_understanding' as const,
    };
    expect(isDataQualityReviewAction(legacy)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Structural blocking: actions with missing required fields should NOT be
// in availableActions (this is the runtime-action-guard's responsibility,
// but we verify the contract is respected end-to-end here)
// ---------------------------------------------------------------------------

describe('Structurally blocked actions do not reach availableActions', () => {
  const makeQuestion = (overrides: Partial<BusinessQuestion>): BusinessQuestion => ({
    id: 'q_blocked',
    label: 'Blocked Question',
    userPrompt: 'Test',
    domain: 'revenue',
    perspectiveId: 'p_revenue',
    requiredSignals: ['revenue'],
    optionalSignals: [],
    dimensions: [],
    measures: [],
    fitScore: 80,
    actionKind: 'group_by',
    executionScope: 'sample_preview',
    caveats: [],
    ...overrides,
  });

  it('group_by with no dimensions is NOT in availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({ actionKind: 'group_by', dimensions: [], measures: [] }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(0);
  });

  it('group_by with no measures is NOT in availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({ actionKind: 'group_by', dimensions: ['store'], measures: [] }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(0);
  });

  it('trend with no dimensions is NOT in availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({ actionKind: 'trend', dimensions: [], measures: ['revenue'] }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(0);
  });

  it('group_by with dimension AND measure IS in availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({
        actionKind: 'group_by',
        dimensions: ['store'],
        measures: ['revenue'],
      }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(1);
  });

  it('preserves explicit measure aggregation metadata when creating availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({
        actionKind: 'trend',
        dimensions: ['Order Date'],
        measures: ['Sales'],
        measureAggregations: { Sales: 'SUM' },
      }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(1);
    expect(availableActions[0].measureAggregations).toEqual({ Sales: 'SUM' });
  });

  it('preserves derived measures when creating availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({
        actionKind: 'group_by',
        dimensions: ['job'],
        measures: ['response_rate'],
        derivedMeasures: [
          {
            id: 'response_rate',
            label: 'response_rate',
            type: 'positive_rate',
            sourceColumn: 'y',
            positiveValues: ['yes'],
            numeratorLabel: 'yes',
            denominatorLabel: 'all rows',
          },
        ],
      }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(1);
    expect(availableActions[0].derivedMeasures?.[0]).toEqual({
      id: 'response_rate',
      label: 'response_rate',
      type: 'positive_rate',
      sourceColumn: 'y',
      positiveValues: ['yes'],
      numeratorLabel: 'yes',
      denominatorLabel: 'all rows',
    });
  });

  it('data_quality_review is always in availableActions regardless of dimensions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({
        id: 'q_dqr',
        label: 'Data Quality Review',
        actionKind: 'data_quality_review',
        dimensions: [],
        measures: [],
        fitScore: 100,
      }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(1);
    expect(availableActions[0].actionKind).toBe('data_quality_review');
  });

  it('question with fitScore < 40 is NOT in availableActions', () => {
    const questions: BusinessQuestion[] = [
      makeQuestion({
        actionKind: 'group_by',
        dimensions: ['store'],
        measures: ['revenue'],
        fitScore: 30,
      }),
    ];
    const { availableActions } = createGuardedActions(questions);
    expect(availableActions).toHaveLength(0);
  });
});
