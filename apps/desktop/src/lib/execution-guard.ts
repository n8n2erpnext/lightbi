import type { RuntimePreview } from './runtime-preview';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { WorkspaceUnderstandingState } from './workspace-understanding-state';

export type ExecutionGuardDecision = "allow" | "warn" | "block";

export type ExecutionGuardReasonType =
  | "missing_runtime_preview"
  | "runtime_preview_not_accepted"
  | "blocked_runtime_preview"
  | "blocked_virtual_plan"
  | "rejected_relationship"
  | "missing_relationship"
  | "many_to_many_risk"
  | "low_confidence"
  | "ok";

export type ExecutionGuardReason = {
  type: ExecutionGuardReasonType;
  message: string;
  severity: "info" | "warning" | "error";
};

export type ExecutionGuardResult = {
  decision: ExecutionGuardDecision;
  canExecute: boolean;
  previewId?: string;
  planId?: string;
  reasons: ExecutionGuardReason[];
};

export type ExecutionGuardInput = {
  preview?: RuntimePreview | null;
  previewAccepted: boolean;
  plan?: VirtualDatasetPlan | null;
  workspaceState?: WorkspaceUnderstandingState;
};

export function evaluateExecutionGuard(input: ExecutionGuardInput): ExecutionGuardResult {
  const { preview, previewAccepted, plan, workspaceState } = input;
  const reasons: ExecutionGuardReason[] = [];
  let decision: ExecutionGuardDecision = "allow";
  let canExecute = true;

  // 1. Missing preview
  if (!preview) {
    reasons.push({ type: "missing_runtime_preview", message: "Runtime preview is missing.", severity: "error" });
    decision = "block";
    canExecute = false;
  }
  // 2. Not accepted
  else if (!previewAccepted) {
    reasons.push({ type: "runtime_preview_not_accepted", message: "Runtime preview was not accepted by the user.", severity: "error" });
    decision = "block";
    canExecute = false;
  }
  // 3. Blocked preview
  else if (preview.status === "blocked") {
    reasons.push({ type: "blocked_runtime_preview", message: "Runtime preview has a blocked status.", severity: "error" });
    decision = "block";
    canExecute = false;
  }

  // 4. Blocked virtual plan
  if (plan && plan.status === "blocked") {
    reasons.push({ type: "blocked_virtual_plan", message: "Virtual dataset plan is blocked.", severity: "error" });
    decision = "block";
    canExecute = false;
  }

  // 5. Rejected relationships
  const rejectedIds = workspaceState?.relationshipState?.rejectedRelationshipIds || [];
  if (plan && rejectedIds.length > 0) {
    const hasRejected = plan.relationshipIds.some(r => rejectedIds.includes(r));
    if (hasRejected) {
      reasons.push({ type: "rejected_relationship", message: "Plan uses a relationship that was rejected by the user.", severity: "error" });
      decision = "block";
      canExecute = false;
    }
  }

  // 6. Multi-dataset without relationship
  if (plan && plan.datasets.length > 1 && plan.relationshipIds.length === 0) {
    reasons.push({ type: "missing_relationship", message: "Multiple datasets are used without a defined relationship.", severity: "error" });
    decision = "block";
    canExecute = false;
  }

  // Evaluate warnings only if not already blocked (or evaluate anyway, but keep block priority)
  const isManyToMany = (preview?.warnings.some(w => w.toLowerCase().includes("many-to-many")) || plan?.warnings.some(w => w.toLowerCase().includes("many-to-many")));
  if (isManyToMany) {
    reasons.push({ type: "many_to_many_risk", message: "Plan involves a many-to-many relationship risk.", severity: "warning" });
    if (decision !== "block") {
      decision = "warn";
    }
  }

  const isLowConfidence = (preview?.confidence === "LOW" || plan?.confidence === "LOW");
  if (isLowConfidence) {
    reasons.push({ type: "low_confidence", message: "The plan relies on low confidence relationships.", severity: "warning" });
    if (decision !== "block") {
      decision = "warn";
    }
  }

  if (reasons.length === 0) {
    reasons.push({ type: "ok", message: "All checks passed.", severity: "info" });
  }

  return {
    decision,
    canExecute,
    previewId: preview?.id,
    planId: plan?.id,
    reasons
  };
}

export function summarizeExecutionGuard(result: ExecutionGuardResult): string {
  switch (result.decision) {
    case "block":
      return "LightBI cannot run this yet because the analysis plan has not been accepted or has unresolved issues.";
    case "warn":
      return "LightBI can continue, but there are risks you should review first.";
    case "allow":
      return "LightBI can safely prepare this analysis.";
  }
}

export function assertExecutionAllowed(result: ExecutionGuardResult): boolean {
  if (!result.canExecute) {
    throw new Error(summarizeExecutionGuard(result));
  }
  return true;
}
