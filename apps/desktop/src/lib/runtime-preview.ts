import type { VirtualDatasetPlan } from './virtual-dataset-planner';

export type RuntimePreviewStatus = "ready" | "warning" | "blocked";

export type RuntimePreviewOperation = {
  id: string;
  title: string;
  description: string;
  risk?: "LOW" | "MEDIUM" | "HIGH";
};

export type RuntimePreview = {
  id: string;
  planId: string;
  status: RuntimePreviewStatus;
  question: string;
  datasets: { id: string; label: string; }[];
  relationships: { id: string; label: string; confidence: string; risk: string; }[];
  operations: RuntimePreviewOperation[];
  warnings: string[];
  explanation: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

export function createRuntimePreview(plan: VirtualDatasetPlan): RuntimePreview {
  const operations: RuntimePreviewOperation[] = [];
  
  for (const step of plan.steps) {
    let title = "";
    let description = "";
    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    switch (step.type) {
      case "select_dataset":
        title = "Select Datasets";
        description = "Retrieve records from the selected datasets.";
        break;
      case "use_relationship":
        title = "Connect Data";
        description = "Use a relationship to link related records.";
        risk = "MEDIUM"; // Joins always carry some risk
        break;
      case "group_by":
        title = "Group Records";
        description = "Group records to calculate summaries.";
        break;
      case "sort":
        title = "Sort Results";
        description = "Sort results logically.";
        break;
      case "filter":
        title = "Filter Records";
        description = "Filter records matching specific criteria.";
        break;
      case "derive_metric":
        title = "Prepare Metric";
        description = "Prepare derived business metric.";
        break;
      case "validate":
        title = "Validate Results";
        description = "Validate result assumptions.";
        break;
      case "limit":
        title = "Limit Output";
        description = "Limit the number of returned records.";
        break;
      default:
        title = "Process Data";
        description = "Perform necessary data operations.";
        break;
    }

    operations.push({
      id: `op_${step.id}`,
      title,
      description,
      risk
    });
  }

  let status: RuntimePreviewStatus = "ready";
  if (plan.status === "blocked" || plan.warnings.some(w => w.includes("rejected"))) {
    status = "blocked";
  } else if (plan.status === "draft" || plan.warnings.length > 0) {
    status = "warning";
  }

  return {
    id: `preview_${plan.id}`,
    planId: plan.id,
    status,
    question: plan.title.replace("Analysis Plan: ", ""),
    datasets: plan.datasets.map(d => ({ id: d, label: d })),
    relationships: plan.relationshipIds.map(r => ({ 
      id: r, 
      label: r, 
      confidence: "UNKNOWN", 
      risk: "UNKNOWN" 
    })),
    operations,
    warnings: [...plan.warnings],
    explanation: "LightBI has translated your business question into a sequence of safe, logical steps.",
    confidence: plan.confidence
  };
}

export function summarizeRuntimePreview(preview: RuntimePreview): string {
  const dsCount = preview.datasets.length;
  return `LightBI understands your question and is preparing an analysis plan using ${dsCount} connected dataset${dsCount === 1 ? '' : 's'}.`;
}

export function canProceedToExecution(preview: RuntimePreview, isAccepted: boolean): boolean {
  return preview.status !== "blocked" && isAccepted;
}
