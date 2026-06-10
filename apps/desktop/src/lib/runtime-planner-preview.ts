import type { RuntimeIntent } from './analysis-runtime-contract';

export type LogicalRuntimeOperation =
  | {
      type: "scan";
      columns: string[];
    }
  | {
      type: "group_by";
      dimensions: string[];
      measures: string[];
    }
  | {
      type: "trend";
      timeDimension: string;
      measures: string[];
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
  warnings: string[];
  blockedReasons: string[];
  source: "runtime_intent";
}

const TIME_LIKE_DIMENSIONS = [
  'report_date',
  'date',
  'order_date',
  'delivery_date',
  'created_at',
  'updated_at'
];

export function createRuntimePlanPreview(intent: RuntimeIntent): RuntimePlanPreview {
  const plan: RuntimePlanPreview = {
    id: `plan_${intent.id}`,
    sourceIntentId: intent.id,
    status: intent.status,
    executionMode: "preview_only",
    logicalOperations: [],
    requiredColumns: Array.from(new Set([...intent.dimensions, ...intent.measures])),
    expectedOutput: {
      shape: intent.expectedShape,
      dimensions: [...intent.dimensions],
      measures: [...intent.measures]
    },
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
    case "group_by":
      plan.logicalOperations.push({
        type: "group_by",
        dimensions: [...intent.dimensions],
        measures: [...intent.measures]
      });
      break;
    
    case "trend":
      const timeDim = intent.dimensions.find(dim => TIME_LIKE_DIMENSIONS.includes(dim) || dim.includes('time') || dim.includes('date')) || intent.dimensions[0];
      plan.logicalOperations.push({
        type: "trend",
        timeDimension: timeDim,
        measures: [...intent.measures]
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
