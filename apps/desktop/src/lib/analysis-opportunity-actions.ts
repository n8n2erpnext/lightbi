import type { DatasetUnderstanding } from './dataset-understanding-contract';

export interface AnalysisAction {
  id: string;
  opportunityName: string;
  label: string;
  description: string;
  actionType: "group_by" | "trend" | "distribution" | "relationship";
  dimensions: string[];
  measures: string[];
  confidenceScore: number;
  source: "dataset_understanding";
}

export function generateAnalysisActions(understanding: DatasetUnderstanding): AnalysisAction[] {
  const actions: AnalysisAction[] = [];

  for (const aa of understanding.availableAnalysis) {
    let actionType: AnalysisAction["actionType"] = "group_by";
    let dimensions: string[] = [];
    let measures: string[] = [];
    let description = "";

    // Specific mapping based on the labels or basedOnSignals
    if (aa.label === "Shipment activity by route") {
      actionType = "group_by";
      dimensions = ["route"];
      measures = ["shipment"];
      description = "Count shipments grouped by route.";
    } else if (aa.label === "Shipment activity by driver") {
      actionType = "group_by";
      dimensions = ["driver"];
      measures = ["shipment"];
      description = "Count shipments grouped by driver.";
    } else if (aa.label === "Satisfaction by route") {
      actionType = "group_by";
      dimensions = ["route"];
      measures = ["satisfaction"];
      description = "Analyze satisfaction grouped by route.";
    } else if (aa.label === "Satisfaction by driver") {
      actionType = "group_by";
      dimensions = ["driver"];
      measures = ["satisfaction"];
      description = "Analyze satisfaction grouped by driver.";
    } else if (aa.label === "Activity over report date") {
      actionType = "trend";
      dimensions = ["report_date"];
      measures = ["shipment"]; // Default measure for activity
      description = "Analyze trend over report date.";
    } else {
      // Fallback naive logic if we don't have hardcoded mappings
      const hasDate = aa.basedOnSignals.some(s => s.includes('date') || s.includes('time'));
      actionType = hasDate ? "trend" : "group_by";
      dimensions = aa.basedOnSignals.slice(0, 1);
      measures = aa.basedOnSignals.slice(1);
      if (measures.length === 0) measures = ["record_count"];
      description = `Analyze ${measures.join(", ")} by ${dimensions.join(", ")}.`;
    }

    actions.push({
      id: `action_${aa.id}`,
      opportunityName: aa.label,
      label: aa.label,
      description,
      actionType,
      dimensions,
      measures,
      confidenceScore: understanding.confidenceScore,
      source: "dataset_understanding"
    });
  }

  return actions;
}
