import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { RuntimePreview } from './runtime-preview';
import type { ExecutionGuardResult } from './execution-guard';

export type DuckDBLogicalPlanStatus = "draft" | "ready" | "blocked";

export type DuckDBLogicalOperationType =
  | "scan"
  | "project"
  | "join"
  | "derive"
  | "aggregate"
  | "filter"
  | "sort"
  | "limit"
  | "validate";

export type DuckDBLogicalOperation = {
  id: string;
  type: DuckDBLogicalOperationType;
  description: string;
  datasetIds?: string[];
  relationshipIds?: string[];
  fields?: string[];
  dependsOn?: string[];
  warnings?: string[];
};

export type DuckDBLogicalPlan = {
  id: string;
  sourcePlanId: string;
  sourcePreviewId: string;
  status: DuckDBLogicalPlanStatus;
  operations: DuckDBLogicalOperation[];
  datasets: string[];
  relationshipIds: string[];
  warnings: string[];
  guardDecision: "allow" | "warn" | "block";
};

export type CreateDuckDBLogicalPlanInput = {
  plan: VirtualDatasetPlan;
  preview: RuntimePreview;
  guard: ExecutionGuardResult;
};

export function createDuckDBLogicalPlan(input: CreateDuckDBLogicalPlanInput): DuckDBLogicalPlan {
  const { plan, preview, guard } = input;

  let status: DuckDBLogicalPlanStatus = "ready";
  const warnings: string[] = [];

  if (guard.canExecute === false || guard.decision === "block") {
    status = "blocked";
    warnings.push("Execution guard blocked this plan.");
  } else if (guard.decision === "warn") {
    status = "draft";
    warnings.push(...guard.reasons.filter(r => r.severity === 'warning').map(r => r.message));
  }

  const operations: DuckDBLogicalOperation[] = [];
  let previousOpIds: string[] = [];
  
  for (const step of plan.steps) {
    let type: DuckDBLogicalOperationType | null = null;
    let description = step.description;

    switch (step.type) {
      case "select_dataset":
        type = "scan";
        break;
      case "use_relationship":
        type = "join";
        break;
      case "derive_metric":
        type = "derive";
        break;
      case "group_by":
        type = "aggregate";
        break;
      case "filter":
        type = "filter";
        break;
      case "sort":
        type = "sort";
        break;
      case "limit":
        type = "limit";
        break;
      case "validate":
        type = "validate";
        break;
      default:
        // skip unknown operations
        break;
    }

    if (type) {
      const opId = `log_${plan.id}_${step.id}_${type}`;
      operations.push({
        id: opId,
        type,
        description,
        dependsOn: previousOpIds.length > 0 ? [...previousOpIds] : undefined
      });
      // Simple dependency chain for now: next operation depends on this one
      previousOpIds = [opId];
    }
  }

  return {
    id: `log_plan_${plan.id}`,
    sourcePlanId: plan.id,
    sourcePreviewId: preview.id,
    status,
    operations,
    datasets: [...plan.datasets],
    relationshipIds: [...plan.relationshipIds],
    warnings,
    guardDecision: guard.decision
  };
}

export function summarizeDuckDBLogicalPlan(logicalPlan: DuckDBLogicalPlan): string {
  if (logicalPlan.status === "blocked") {
    return "This analysis cannot be prepared because the execution guard blocked it.";
  }
  if (logicalPlan.status === "draft") {
    return "LightBI prepared a logical runtime plan with warnings. No query has been executed.";
  }
  return "LightBI prepared a safe logical runtime plan. No query has been executed.";
}

export function canCompileToRuntime(logicalPlan: DuckDBLogicalPlan): boolean {
  if (logicalPlan.status === "ready") return true;
  if (logicalPlan.status === "draft") return true; // assuming draft is eligible but has non-blocking warnings
  return false;
}
