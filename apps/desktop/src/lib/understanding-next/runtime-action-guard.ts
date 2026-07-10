import type { AnalysisAction, BusinessQuestion, DatasetProfile, UnavailableAction } from "./contracts";

/**
 * Converts ranked questions into guarded actions.
 *
 * Rules:
 * - data_quality_review: ALWAYS becomes an availableAction for dirty exports.
 *   It must NEVER be silently blocked, because the user needs to see it first.
 * - Questions with fitScore < 40: become unavailableActions (gated).
 * - All other questions become availableActions in fitScore order.
 */
export function createGuardedActions(
  questions: BusinessQuestion[],
  _datasetProfile?: Pick<DatasetProfile, "profile" | "quality">
): {
  availableActions: AnalysisAction[];
  unavailableActions: UnavailableAction[];
} {
  const availableActions: AnalysisAction[] = [];
  const unavailableActions: UnavailableAction[] = [];

  for (const question of questions) {
    // data_quality_review is always an available action.
    // For dirty exports it must surface BEFORE aggregates, not be hidden.
    if (question.actionKind === "data_quality_review") {
      availableActions.push({
        id: `action_${question.id}`,
        questionId: question.id,
        label: question.label,
        actionKind: question.actionKind,
        dimensions: question.dimensions,
        measures: question.measures,
        measureAggregations: question.measureAggregations ? { ...question.measureAggregations } : undefined,
        derivedMeasures: question.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
        executionScope: question.executionScope
      });
      continue;
    }

    const structuralBlocks: string[] = [];
    if (question.actionKind === "group_by") {
      if (question.dimensions.length < 1) structuralBlocks.push("group_by requires at least 1 dimension");
      if (question.measures.length < 1) structuralBlocks.push("group_by requires at least 1 measure");
    }
    if (question.actionKind === "trend") {
      if (question.dimensions.length < 1) structuralBlocks.push("trend requires at least 1 time dimension");
      if (question.measures.length < 1) structuralBlocks.push("trend requires at least 1 measure");
    }
    if (question.actionKind === "distribution" && question.dimensions.length < 1) {
      structuralBlocks.push("distribution requires at least 1 dimension");
    }
    if (question.actionKind === "relationship" && question.measures.length < 2) {
      structuralBlocks.push("relationship requires at least 2 measures");
    }

    if (structuralBlocks.length > 0) {
      unavailableActions.push({
        id: `blocked_${question.id}`,
        label: question.label,
        reason: "Question cannot be executed by the current local runtime contract.",
        missingSignals: question.requiredSignals,
        blockedReasons: [...question.caveats, ...structuralBlocks]
      });
      continue;
    }

    // Questions whose fit is too low are gated.
    if (question.fitScore < 40) {
      unavailableActions.push({
        id: `blocked_${question.id}`,
        label: question.label,
        reason: "Question fit is too low for default execution.",
        missingSignals: question.requiredSignals,
        blockedReasons: question.caveats
      });
      continue;
    }

    availableActions.push({
      id: `action_${question.id}`,
      questionId: question.id,
      label: question.label,
      actionKind: question.actionKind,
      dimensions: question.dimensions,
      measures: question.measures,
      measureAggregations: question.measureAggregations ? { ...question.measureAggregations } : undefined,
      derivedMeasures: question.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
      executionScope: question.executionScope
    });
  }

  return { availableActions, unavailableActions };
}
