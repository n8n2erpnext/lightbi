import type { AnalysisOpportunity } from './dataset-capability-engine';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

export interface AnalysisAction {
  id: string;
  opportunityName: string;
  label: string;
  description: string;
  actionType: "group_by" | "trend" | "distribution" | "relationship" | "table_preview";
  dimensions: string[];
  measures: string[];
  measureAggregations?: Record<string, "SUM" | "COUNT" | "AVG">;
  derivedMeasures?: DerivedMeasure[];
  confidenceScore: number;
  source: "dataset_understanding";
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

export function generateAnalysisActions(understanding: DatasetUnderstanding): AnalysisAction[] {
  const actions: AnalysisAction[] = [];
  
  const allItems = [...(understanding.opportunities || []), ...(understanding.availableAnalysis || [])];
  const sourceItems = [];
  const seenIds = new Set();
  for (const item of allItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      sourceItems.push(item);
    }
  }
  

  for (const aa of sourceItems) {
    if ('requiredCapabilities' in aa) {
       const opp = aa as AnalysisOpportunity;
       let actionType: AnalysisAction["actionType"] = "group_by";
       if (opp.requiredCapabilities.includes("table_preview")) {
         actionType = "table_preview";
       } else if (opp.requiredCapabilities.includes("trend_over_time")) {
         actionType = "trend";
       } else if (opp.requiredCapabilities.includes("distribution")) {
         actionType = "distribution";
       } else if (opp.requiredCapabilities.includes("relationship")) {
         actionType = "relationship";
       }

       let dimensions: string[] = (opp as any).dimensions || [];
       let measures: string[] = (opp as any).measures || [];

       if (actionType === "trend" && (dimensions.length === 0 || measures.length === 0)) {
         actionType = "table_preview";
       }
       if (actionType === "distribution" && dimensions.length === 0) {
         actionType = "table_preview";
       }
       if (actionType === "group_by" && (dimensions.length === 0 || measures.length === 0)) {
         actionType = "table_preview";
       }
       if (actionType === "relationship" && measures.length < 2) {
         actionType = "table_preview";
       }

       actions.push({
         id: `action_${opp.id}`,
         opportunityName: opp.label,
         label: opp.label,
         description: opp.description,
         actionType,
         dimensions,
         measures,
         confidenceScore: opp.confidence === "high" ? 100 : opp.confidence === "medium" ? 80 : 50,
         source: "dataset_understanding"
       });
       continue;
    }

    let actionType: AnalysisAction["actionType"] = "group_by";
    let dimensions: string[] = [];
    let measures: string[] = [];
    let description = "";

    // Require explicit metadata. Do not guess.
    if (!aa.actionType) {
      continue; // Skip if metadata is missing
    }

    actionType = aa.actionType;
    dimensions = aa.dimensions || [];
    measures = aa.measures || [];
    
    // Provide a simple description based on action type
    if (actionType === "trend") {
      description = `Analyze trend of ${measures.join(", ")} over ${dimensions.join(", ")}.`;
    } else if (actionType === "distribution") {
      description = `Analyze distribution of ${dimensions.join(", ")}.`;
    } else {
      description = `Analyze ${measures.join(", ")} grouped by ${dimensions.join(", ")}.`;
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

  
  actions.push({
    id: 'fallback_analyze',
    opportunityName: 'Analyze Dataset',
    label: 'Analyze Dataset',
    description: 'Explore dataset structure and run general analysis.',
    actionType: 'table_preview',
    dimensions: [],
    measures: [],
    confidenceScore: 50,
    source: 'dataset_understanding'
  });

  return actions;

}
