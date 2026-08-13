import type { BusinessViewCandidate, QuestionSuggestion } from './business-view-generator';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { RuntimePreview } from './runtime-preview';
import type { ExecutionGuardResult } from './execution-guard';
import type { DuckDBLogicalPlan } from './duckdb-logical-plan';

export type RuntimeBoundaryStatus =
  | "handoff_ready"
  | "handoff_warning"
  | "handoff_blocked";

export type RuntimeBoundaryArtifact = {
  id: string;
  version: "runtime-boundary/v1";
  createdAt: string;
  source: {
    questionId: string;
    businessViewId: string;
    virtualPlanId: string;
    runtimePreviewId: string;
    logicalPlanId: string;
  };
  approvals: {
    runtimePreviewAccepted: boolean;
    executionGuardDecision: "allow" | "warn" | "block";
    canExecute: boolean;
  };
  datasets: string[];
  relationships: string[];
  logicalPlan: DuckDBLogicalPlan;
  warnings: string[];
  status: RuntimeBoundaryStatus;
};

export type CreateRuntimeBoundaryInput = {
  businessView: BusinessViewCandidate;
  question: QuestionSuggestion;
  virtualPlan: VirtualDatasetPlan;
  runtimePreview: RuntimePreview;
  executionGuard: ExecutionGuardResult;
  logicalPlan: DuckDBLogicalPlan;
  runtimePreviewAccepted: boolean; // explicitly pass this so we can validate it
};

export function createRuntimeBoundaryArtifact(input: CreateRuntimeBoundaryInput): RuntimeBoundaryArtifact {
  const { businessView, question, virtualPlan, runtimePreview, executionGuard, logicalPlan, runtimePreviewAccepted } = input;

  const warnings: string[] = [];
  let status: RuntimeBoundaryStatus = "handoff_ready";

  if (executionGuard.canExecute === false || executionGuard.decision === "block") {
    status = "handoff_blocked";
    warnings.push("Execution guard blocked the plan.");
  } else if (executionGuard.decision === "warn" || logicalPlan.status === "draft") {
    status = "handoff_warning";
    warnings.push("Execution guard or logical plan issued warnings.");
  }

  // Cross-layer validation
  if (!runtimePreviewAccepted) {
    status = "handoff_blocked";
    warnings.push("Runtime preview was not accepted.");
  }
  if (logicalPlan.status === "blocked") {
    status = "handoff_blocked";
    warnings.push("Logical plan is blocked.");
  }
  if (logicalPlan.sourcePlanId !== virtualPlan.id) {
    status = "handoff_blocked";
    warnings.push("Logical plan source does not match virtual plan ID.");
  }
  if (logicalPlan.sourcePreviewId !== runtimePreview.id) {
    status = "handoff_blocked";
    warnings.push("Logical plan source preview does not match runtime preview ID.");
  }
  if (runtimePreview.planId !== virtualPlan.id) {
    status = "handoff_blocked";
    warnings.push("Runtime preview plan ID does not match virtual plan ID.");
  }
  if (question.id !== virtualPlan.questionId) {
    status = "handoff_blocked";
    warnings.push("Question ID does not match virtual plan question ID.");
  }
  if (businessView.id !== virtualPlan.businessViewId) {
    status = "handoff_blocked";
    warnings.push("Business view ID does not match virtual plan business view ID.");
  }

  const id = `runtime-boundary:${businessView.id}:${question.id}:${logicalPlan.id}`;

  return {
    id,
    version: "runtime-boundary/v1",
    createdAt: new Date().toISOString(),
    source: {
      questionId: question.id,
      businessViewId: businessView.id,
      virtualPlanId: virtualPlan.id,
      runtimePreviewId: runtimePreview.id,
      logicalPlanId: logicalPlan.id
    },
    approvals: {
      runtimePreviewAccepted,
      executionGuardDecision: executionGuard.decision,
      canExecute: executionGuard.canExecute
    },
    datasets: [...logicalPlan.datasets],
    relationships: [...logicalPlan.relationshipIds],
    logicalPlan,
    warnings,
    status
  };
}

export type RuntimeBoundaryValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateRuntimeBoundaryArtifact(artifact: RuntimeBoundaryArtifact): RuntimeBoundaryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (artifact.version !== "runtime-boundary/v1") {
    errors.push("Invalid version. Must be runtime-boundary/v1.");
  }

  if (artifact.status === "handoff_ready" && artifact.approvals.canExecute === false) {
    errors.push("Status cannot be handoff_ready if canExecute is false.");
  }

  if (artifact.datasets.length === 0) {
    errors.push("Artifact must include at least one dataset.");
  }

  if (artifact.datasets.length > 1 && artifact.relationships.length === 0) {
    errors.push("Multi-dataset artifact must include at least one relationship.");
  }

  if (!artifact.source.questionId || !artifact.source.businessViewId || !artifact.source.virtualPlanId || !artifact.source.runtimePreviewId || !artifact.source.logicalPlanId) {
    errors.push("Missing required source IDs.");
  }

  const logicalPlanStr = JSON.stringify(artifact.logicalPlan).toLowerCase();
  if (logicalPlanStr.includes("select *") || logicalPlanStr.includes("from ") || logicalPlanStr.includes("join ")) {
     // A bit hacky string check, but enforcing "no raw SQL" as requested by the prompt
     // Since 'join' is a logical op type, it might appear as "type":"join", but not as raw sql string "join table"
     // We'll relax "join" string match to avoid false positive on JSON structure, and look for SQL patterns.
     if (logicalPlanStr.match(/select\s+.*\s+from/)) {
        errors.push("Logical plan contains raw SQL string.");
     }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function summarizeRuntimeBoundaryArtifact(artifact: RuntimeBoundaryArtifact): string {
  if (artifact.status === "handoff_ready") {
    return "This analysis is ready for the runtime boundary. No query has been executed yet.";
  }
  if (artifact.status === "handoff_warning") {
    return "This analysis can be handed off with warnings. Review risks before execution.";
  }
  return "This analysis cannot be handed off because required approvals or relationships are missing.";
}
