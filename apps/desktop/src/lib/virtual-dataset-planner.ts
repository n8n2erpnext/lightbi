import type { RelationshipGraph } from './relationship-graph';
import type { BusinessViewCandidate, QuestionSuggestion, BusinessDomain } from './business-view-generator';
import type { WorkspaceUnderstandingState } from './workspace-understanding-state';

export type VirtualDatasetPlanStatus = "draft" | "ready" | "blocked";

export type VirtualDatasetPlanStepType =
  | "select_dataset"
  | "use_relationship"
  | "derive_metric"
  | "group_by"
  | "filter"
  | "sort"
  | "limit"
  | "validate";

export type VirtualDatasetPlanStep = {
  id: string;
  type: VirtualDatasetPlanStepType;
  description: string;
  datasetIds?: string[];
  relationshipIds?: string[];
  fields?: string[];
  warning?: string;
};

export type VirtualDatasetPlan = {
  id: string;
  status: VirtualDatasetPlanStatus;
  businessViewId: string;
  questionId: string;
  title: string;
  datasets: string[];
  relationshipIds: string[];
  requiredDomains: BusinessDomain[];
  steps: VirtualDatasetPlanStep[];
  warnings: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

export function createVirtualDatasetPlan({
  businessView,
  question,
  graph,
  workspaceState
}: {
  businessView: BusinessViewCandidate;
  question: QuestionSuggestion;
  graph: RelationshipGraph;
  workspaceState?: WorkspaceUnderstandingState;
}): VirtualDatasetPlan {
  const steps: VirtualDatasetPlanStep[] = [];
  const warnings: string[] = [];
  let status: VirtualDatasetPlanStatus = "ready";
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "HIGH";
  
  // A. Always add select_dataset step
  steps.push({
    id: `select_datasets`,
    type: "select_dataset",
    description: `Select datasets: ${businessView.datasets.join(', ')}`,
    datasetIds: businessView.datasets
  });

  const validRelationshipIds: string[] = [];
  let hasRejected = false;
  let hasLowConfidence = false;
  let hasManyToMany = false;
  
  const rejectedIds = workspaceState?.relationshipState?.rejectedRelationshipIds || [];
  const ignoredIds = workspaceState?.relationshipState?.ignoredRelationshipIds || [];
  
  for (const relId of businessView.supportingRelationshipIds) {
    if (ignoredIds.includes(relId)) {
      continue;
    }
    
    if (rejectedIds.includes(relId)) {
      hasRejected = true;
      warnings.push(`Required relationship ${relId} is rejected.`);
      continue;
    }

    const edge = graph.edges.find(e => e.relationshipId === relId);
    if (!edge) {
      continue;
    }
    
    if (edge.cardinality === "many_to_many") {
      hasManyToMany = true;
      warnings.push(`This relationship may duplicate rows because it looks many-to-many.`);
    }
    
    if (edge.confidence === "LOW") {
      hasLowConfidence = true;
    }

    validRelationshipIds.push(relId);
    
    // B. If supporting relationships exist, add use_relationship step per accepted/suggested relationship
    steps.push({
      id: `use_rel_${relId}`,
      type: "use_relationship",
      description: `Use relationship to join ${edge.leftDatasetId} and ${edge.rightDatasetId}`,
      relationshipIds: [relId]
    });
  }

  // Missing domains
  const missingDomains = question.requiredDomains.filter(d => !businessView.domains.includes(d));
  if (missingDomains.length > 0) {
    warnings.push(`Question requires domains not present in the business view: ${missingDomains.join(', ')}`);
  }

  // Determine status
  if (hasRejected || (businessView.datasets.length > 1 && validRelationshipIds.length === 0)) {
    status = "blocked";
  } else if (hasLowConfidence || missingDomains.length > 0 || businessView.status === "ignored" || businessView.status === "rejected") {
    status = "draft";
    if (hasLowConfidence) confidence = "LOW";
  } else {
    status = "ready";
    if (businessView.confidence === "LOW") confidence = "LOW";
    else if (businessView.confidence === "MEDIUM") confidence = "MEDIUM";
  }

  // C - H rules based on question intent
  if (question.intent === "rank") {
    steps.push({ id: `rank_group`, type: "group_by", description: "Group results for ranking" });
    steps.push({ id: `rank_sort`, type: "sort", description: "Sort results for ranking" });
    steps.push({ id: `rank_limit`, type: "limit", description: "Limit results for ranking" });
  } else if (question.intent === "compare") {
    steps.push({ id: `compare_group`, type: "group_by", description: "Group results to compare" });
  } else if (question.intent === "trend") {
    steps.push({ id: `trend_group`, type: "group_by", description: "Group by time period" });
    warnings.push("Trend analysis requires a date-like field.");
  } else if (question.intent === "diagnose") {
    steps.push({ id: `diagnose_group`, type: "group_by", description: "Group data to diagnose" });
    steps.push({ id: `diagnose_validate`, type: "validate", description: "Validate data anomalies" });
  } else if (question.intent === "risk") {
    steps.push({ id: `risk_filter`, type: "filter", description: "Filter for risk conditions" });
    steps.push({ id: `risk_sort`, type: "sort", description: "Sort by risk level" });
  } else if (question.intent === "summary") {
    steps.push({ id: `summary_validate`, type: "validate", description: "Validate data summary" });
  }

  // Profitability check for derive_metric warning
  if (question.question.toLowerCase().includes("profit") || question.question.toLowerCase().includes("margin")) {
    steps.push({ id: `derive_metric`, type: "derive_metric", description: "Plan includes metric derivation, but does not execute SQL." });
    warnings.push("This plan derives metrics but does not calculate profit or emit SQL.");
  }
  
  return {
    id: `${businessView.id}_${question.id}`,
    status,
    businessViewId: businessView.id,
    questionId: question.id,
    title: `Analysis Plan: ${question.question}`,
    datasets: businessView.datasets,
    relationshipIds: validRelationshipIds,
    requiredDomains: question.requiredDomains,
    steps,
    warnings,
    confidence
  };
}

export function getPlanWarnings(plan: VirtualDatasetPlan): string[] {
  return plan.warnings;
}

export function summarizeVirtualDatasetPlan(plan: VirtualDatasetPlan): string {
  const relCount = plan.relationshipIds.length;
  const dsCount = plan.datasets.length;
  return `LightBI can prepare a draft analysis using ${dsCount} dataset${dsCount === 1 ? '' : 's'} and ${relCount} relationship${relCount === 1 ? '' : 's'}. No data has been joined yet.`;
}

export function canExecuteVirtualDatasetPlan(plan: VirtualDatasetPlan): boolean {
  return plan.status === "ready" && plan.warnings.filter(w => w.includes("rejected")).length === 0;
}
