/**
 * action-adapter.ts
 *
 * Typed bridge: converts understanding-next AnalysisAction → legacy analysis-opportunity-actions AnalysisAction.
 *
 * Rules:
 * - data_quality_review → legacy actionType: "table_preview" + metadata preserved via sourceUnderstandingActionKind
 * - All other actionKinds → same name if compatible, else "table_preview"
 * - Source metadata (questionId, executionScope, sourceUnderstandingActionKind) is always preserved
 *   as a typed LegacyActionMetadata extension on the returned object.
 *
 * DO NOT hardcode filenames, sheet names, or sample file paths in this adapter.
 */

import type { AnalysisAction as NextAnalysisAction } from './contracts';
import type { AnalysisAction as LegacyAnalysisAction } from '../analysis-opportunity-actions';

/**
 * Extended metadata preserved from the understanding-next AnalysisAction.
 * Typed explicitly so callers (Investigation.tsx) can read it without `as any`.
 */
export interface NextActionMetadata {
  sourceUnderstandingActionKind: NextAnalysisAction['actionKind'];
  questionId: string;
  executionScope: NextAnalysisAction['executionScope'];
}

/**
 * The legacy action type extended with understanding-next metadata.
 * Investigation.tsx should cast to this type (not `any`) when checking source kind.
 */
export type AdaptedAnalysisAction = LegacyAnalysisAction & {
  _nextMetadata: NextActionMetadata;
};

const VIRTUAL_COUNT_MEASURES = new Set(['record_count', 'row_count']);

const LEGACY_ACTION_TYPE_MAP: Record<
  NextAnalysisAction['actionKind'],
  LegacyAnalysisAction['actionType']
> = {
  trend: 'trend',
  group_by: 'group_by',
  distribution: 'distribution',
  relationship: 'relationship',
  table_preview: 'table_preview',
  // data_quality_review has no direct legacy equivalent — downgrade to table_preview
  data_quality_review: 'table_preview',
};

/**
 * Adapts a single understanding-next AnalysisAction to the legacy action type,
 * preserving next metadata in `_nextMetadata`.
 */
export function adaptNextActionToLegacy(action: NextAnalysisAction): AdaptedAnalysisAction {
  const legacyActionType = LEGACY_ACTION_TYPE_MAP[action.actionKind];
  const measureAggregations =
    legacyActionType === 'group_by' || legacyActionType === 'trend'
      ? action.measureAggregations
        ? { ...action.measureAggregations }
        : Object.fromEntries(
            action.measures.map(measure => [
              measure,
              VIRTUAL_COUNT_MEASURES.has(measure) ? 'COUNT' : 'SUM',
            ])
          ) as Record<string, 'SUM' | 'COUNT' | 'AVG'>
      : undefined;

  const description =
    action.actionKind === 'data_quality_review'
      ? 'Needs data quality review before running aggregates.'
      : action.label;

  return {
    id: action.id,
    opportunityName: action.label,
    label: action.label,
    description,
    actionType: legacyActionType,
    dimensions: action.dimensions,
    measures: action.measures,
    measureAggregations,
    derivedMeasures: action.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
    confidenceScore: 100,
    source: 'dataset_understanding',
    _nextMetadata: {
      sourceUnderstandingActionKind: action.actionKind,
      questionId: action.questionId,
      executionScope: action.executionScope,
    },
  };
}

/**
 * Adapts an array of understanding-next AnalysisActions to legacy actions.
 */
export function adaptNextActionsToLegacy(actions: NextAnalysisAction[]): AdaptedAnalysisAction[] {
  return actions.map(adaptNextActionToLegacy);
}

/**
 * Type guard: returns true if the given legacy action was produced by the understanding-next adapter.
 */
export function isAdaptedFromUnderstandingNext(
  action: LegacyAnalysisAction
): action is AdaptedAnalysisAction {
  return '_nextMetadata' in action;
}

/**
 * Returns true if the action was a data_quality_review in understanding-next.
 * Use this in Investigation.tsx instead of `(action as any)._originalNextAction`.
 */
export function isDataQualityReviewAction(action: LegacyAnalysisAction): boolean {
  return (
    isAdaptedFromUnderstandingNext(action) &&
    (action as AdaptedAnalysisAction)._nextMetadata.sourceUnderstandingActionKind ===
      'data_quality_review'
  );
}
