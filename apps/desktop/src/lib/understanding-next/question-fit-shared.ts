import type {
  AnalysisAction, BusinessPerspective, BusinessQuestion, BusinessSignal, DomainId,
  OrientationQuestion, QuestionIntent,
} from "./contracts";

export function has(signals: BusinessSignal[], id: string): boolean {
  return signals.some(signal => signal.canonicalId === id && signal.usableForDefaultQuestion);
}

/** Check if signal exists at all (regardless of usability flag). */
export function hasAny(signals: BusinessSignal[], id: string): boolean {
  return signals.some(signal => signal.canonicalId === id);
}

export function signalColumn(signals: BusinessSignal[], id: string): string | undefined {
  return signals.find(signal => signal.canonicalId === id)?.physicalColumn;
}

export function signalColumns(signals: BusinessSignal[], ids: string[]): string[] {
  const columns: string[] = [];
  for (const id of ids) {
    const column = signalColumn(signals, id);
    if (column && !columns.includes(column)) columns.push(column);
  }
  return columns;
}

export function fitScore(signals: BusinessSignal[], required: string[], base: number): number {
  const present = required.filter(id => has(signals, id)).length;
  return Math.round(base * (present / Math.max(required.length, 1)));
}

const VIRTUAL_COUNT_MEASURES = new Set(["record_count", "row_count"]);

export function defaultMeasureAggregations(
  actionKind: BusinessQuestion["actionKind"],
  measures: string[],
  explicit?: Record<string, "SUM" | "COUNT" | "AVG">
): Record<string, "SUM" | "COUNT" | "AVG"> | undefined {
  if (explicit) return explicit;
  if ((actionKind !== "trend" && actionKind !== "group_by") || measures.length === 0) return undefined;
  return Object.fromEntries(
    measures.map(measure => [
      measure,
      VIRTUAL_COUNT_MEASURES.has(measure) ? "COUNT" : "SUM"
    ])
  );
}

export function perspective(
  id: string,
  label: string,
  domain: DomainId,
  reason: string,
  signalIds: string[]
): BusinessPerspective {
  return { id, label, domain, reason, signalIds };
}

export function actionFromQuestion(question: BusinessQuestion): AnalysisAction {
  return {
    id: `action_${question.id}`,
    questionId: question.id,
    label: question.label,
    actionKind: question.actionKind,
    dimensions: question.dimensions,
    measures: question.measures,
    measureAggregations: question.measureAggregations ? { ...question.measureAggregations } : undefined,
    derivedMeasures: question.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
    executionScope: question.executionScope
  };
}

export function structuralBlocks(question: BusinessQuestion): string[] {
  const blocks: string[] = [];
  if (question.actionKind === "group_by") {
    if (question.dimensions.length < 1) blocks.push("group_by requires at least 1 dimension");
    if (question.measures.length < 1) blocks.push("group_by requires at least 1 measure");
  }
  if (question.actionKind === "trend") {
    if (question.dimensions.length < 1) blocks.push("trend requires at least 1 time dimension");
    if (question.measures.length < 1) blocks.push("trend requires at least 1 measure");
  }
  if (question.actionKind === "distribution" && question.dimensions.length < 1) {
    blocks.push("distribution requires at least 1 dimension");
  }
  if (question.actionKind === "relationship" && question.measures.length < 2) {
    blocks.push("relationship requires at least 2 measures");
  }
  return blocks;
}

export function intentFromQuestion(question: BusinessQuestion): QuestionIntent {
  if (question.actionKind === "trend") return "trend";
  if (question.actionKind === "distribution") return "mix";
  if (question.actionKind === "data_quality_review") return "quality_review";
  if (/exception|bất thường|lệch|round|change|fee/i.test(question.label)) return "exception_check";
  if (/top|ranking|rank|highest/i.test(question.label)) return "ranking";
  if (question.actionKind === "table_preview") return "lookup";
  return "compare";
}

export function orientationQuestion(
  lensId: string,
  question: BusinessQuestion | undefined,
  fallback: {
    id: string;
    label: string;
    userPrompt: string;
    intent: QuestionIntent;
    blockedReasons: string[];
  }
): OrientationQuestion {
  if (!question) {
    return {
      id: fallback.id,
      lensId,
      label: fallback.label,
      userPrompt: fallback.userPrompt,
      intent: fallback.intent,
      blockedReasons: fallback.blockedReasons
    };
  }

  const blocks = structuralBlocks(question);
  return {
    id: `oq_${question.id}`,
    lensId,
    label: question.label,
    userPrompt: question.userPrompt,
    intent: intentFromQuestion(question),
    defaultAction: blocks.length === 0 ? actionFromQuestion(question) : undefined,
    blockedReasons: [...question.caveats, ...blocks]
  };
}

export function tableOrientationQuestion(
  lensId: string,
  id: string,
  label: string,
  userPrompt: string,
  intent: QuestionIntent,
  columns: string[],
  executionScope: BusinessQuestion["executionScope"],
  blockedReasons: string[] = []
): OrientationQuestion {
  return {
    id,
    lensId,
    label,
    userPrompt,
    intent,
    defaultAction: blockedReasons.length === 0 ? {
      id: `action_${id}`,
      questionId: id,
      label,
      actionKind: "table_preview",
      dimensions: columns,
      measures: [],
      executionScope
    } : undefined,
    blockedReasons
  };
}

export function groupByCountOrientationQuestion(
  lensId: string,
  id: string,
  label: string,
  userPrompt: string,
  dimension: string | undefined,
  executionScope: BusinessQuestion["executionScope"],
  blockedReason: string
): OrientationQuestion {
  return {
    id,
    lensId,
    label,
    userPrompt,
    intent: "ranking",
    defaultAction: dimension ? {
      id: `action_${id}`,
      questionId: id,
      label,
      actionKind: "group_by",
      dimensions: [dimension],
      measures: ["record_count"],
      executionScope
    } : undefined,
    blockedReasons: dimension ? [] : [blockedReason]
  };
}
