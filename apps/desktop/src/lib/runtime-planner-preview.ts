import type { RuntimeIntent } from './analysis-runtime-contract';
import { isTimeLikeDimension } from './time-dimension';

export type LogicalRuntimeOperation =
  | {
      type: "scan";
      columns: string[];
    }
  | {
      type: "table_preview";
    }
  | {
      type: "group_by";
      dimensions: string[];
      measures: string[];
      measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
      derivedMeasures?: DerivedMeasure[];
    }
  | {
      type: "trend";
      timeDimension: string;
      measures: string[];
      measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
    }
  | {
      type: "distribution";
      dimension: string;
    }
  | {
      type: "relationship";
      measures: string[];
    }
  | {
      type: "limit";
      rows: number;
    };

export interface RuntimePlanPreview {
  id: string;
  sourceIntentId: string;
  status: "ready" | "blocked";
  executionMode: "preview_only";
  logicalOperations: LogicalRuntimeOperation[];
  requiredColumns: string[];
  expectedOutput: {
    shape: "table" | "bar_chart" | "line_chart" | "scatter_plot";
    dimensions: string[];
    measures: string[];
  };
  measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
  derivedMeasures?: DerivedMeasure[];
  warnings: string[];
  blockedReasons: string[];
  source: "runtime_intent";
}

export interface DerivedMeasure {
  id: string;
  label: string;
  type: "positive_rate";
  sourceColumn: string;
  positiveValues: string[];
  numeratorLabel: string;
  denominatorLabel: string;
}

export const VIRTUAL_MEASURE_FIELDS = new Set(["record_count", "row_count"]);

export function createRuntimePlanPreview(intent: RuntimeIntent): RuntimePlanPreview {
  const plan: RuntimePlanPreview = {
    id: `plan_${intent.id}`,
    sourceIntentId: intent.id,
    status: intent.status,
    executionMode: "preview_only",
    logicalOperations: [],
    requiredColumns: Array.from(new Set([
      ...intent.dimensions,
      ...intent.measures,
      ...(intent.derivedMeasures ?? []).map(measure => measure.sourceColumn)
    ])).filter(col => !VIRTUAL_MEASURE_FIELDS.has(col)),
    expectedOutput: {
      shape: intent.expectedShape,
      dimensions: [...intent.dimensions],
      measures: [...intent.measures]
    },
    measureAggregations: intent.measureAggregations ? { ...intent.measureAggregations } : undefined,
    derivedMeasures: intent.derivedMeasures ? intent.derivedMeasures.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })) : undefined,
    warnings: [...intent.warnings],
    blockedReasons: [...intent.blockedReasons],
    source: "runtime_intent"
  };

  if (intent.status === "blocked") {
    return plan;
  }

  // Scan operation
  plan.logicalOperations.push({
    type: "scan",
    columns: [...plan.requiredColumns]
  });

  // Main logic operation
  switch (intent.type) {
    case "table_preview":
      plan.logicalOperations.push({
        type: "table_preview"
      });
      break;

    case "group_by":
      plan.logicalOperations.push({
        type: "group_by",
        dimensions: [...intent.dimensions],
        measures: [...intent.measures],
        measureAggregations: intent.measureAggregations,
        derivedMeasures: intent.derivedMeasures
      });
      break;
    
    case "trend":
      const timeDim = intent.dimensions.find(dim => isTimeLikeDimension(dim)) || intent.dimensions[0];
      plan.logicalOperations.push({
        type: "trend",
        timeDimension: timeDim,
        measures: [...intent.measures],
        measureAggregations: intent.measureAggregations
      });
      break;

    case "distribution":
      plan.logicalOperations.push({
        type: "distribution",
        dimension: intent.dimensions[0]
      });
      break;

    case "relationship":
      plan.logicalOperations.push({
        type: "relationship",
        measures: [...intent.measures]
      });
      break;
  }

  // Limit operation
  plan.logicalOperations.push({
    type: "limit",
    rows: 100
  });

  return plan;
}
