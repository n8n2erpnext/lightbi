import type { AnalysisAction } from './analysis-opportunity-actions';

export type RuntimeIntentType =
  | "group_by"
  | "trend"
  | "distribution"
  | "relationship";

export type RuntimeIntentStatus =
  | "ready"
  | "blocked";

export interface RuntimeIntent {
  id: string;
  sourceActionId: string;
  type: RuntimeIntentType;
  dimensions: string[];
  measures: string[];
  expectedShape:
    | "table"
    | "bar_chart"
    | "line_chart"
    | "scatter_plot";
  status: RuntimeIntentStatus;
  warnings: string[];
  blockedReasons: string[];
  source: "analysis_action";
}

const TIME_LIKE_DIMENSIONS = [
  'report_date',
  'date',
  'order_date',
  'delivery_date',
  'created_at',
  'updated_at'
];

export function createRuntimeIntentFromAnalysisAction(action: AnalysisAction): RuntimeIntent {
  const intent: RuntimeIntent = {
    id: `intent_${action.id}`,
    sourceActionId: action.id,
    type: action.actionType,
    dimensions: [...action.dimensions],
    measures: [...action.measures],
    expectedShape: "table", // Default fallback
    status: "ready",
    warnings: [],
    blockedReasons: [],
    source: "analysis_action"
  };

  switch (action.actionType) {
    case "group_by":
      if (intent.dimensions.length < 1) {
        intent.blockedReasons.push("group_by requires at least 1 dimension");
      }
      if (intent.measures.length < 1) {
        intent.blockedReasons.push("group_by requires at least 1 measure");
      }
      intent.expectedShape = "bar_chart";
      break;

    case "trend":
      const hasTimeDimension = intent.dimensions.some(dim => TIME_LIKE_DIMENSIONS.includes(dim) || dim.includes('time') || dim.includes('date'));
      if (!hasTimeDimension) {
        intent.blockedReasons.push("trend requires at least 1 time-like dimension");
      }
      if (intent.measures.length < 1) {
        intent.blockedReasons.push("trend requires at least 1 measure");
      }
      intent.expectedShape = "line_chart";
      break;

    case "distribution":
      if (intent.dimensions.length < 1) {
        intent.blockedReasons.push("distribution requires at least 1 dimension");
      }
      intent.expectedShape = "bar_chart";
      break;

    case "relationship":
      if (intent.measures.length < 2) {
        intent.blockedReasons.push("relationship requires at least 2 measures");
      }
      intent.expectedShape = "scatter_plot";
      break;
  }

  if (intent.blockedReasons.length > 0) {
    intent.status = "blocked";
  }

  return intent;
}
