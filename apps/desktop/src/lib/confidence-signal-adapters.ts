import type { DatasetHealthResult } from './dataset-health-engine';
import type { ConfidenceSignal } from './business-confidence-engine';
import type { BusinessViewCandidate } from './business-view-generator';
import type { RelationshipGraph } from './relationship-graph';
import type { ResultValidationResult } from './result-validator-contract';

export function createResultValidationSignal(validation: ResultValidationResult | null): ConfidenceSignal {
  if (!validation) {
    return {
      id: `sig-rv-${Date.now()}`,
      category: "result_validation",
      label: "Result Validation",
      score: 0,
      weight: 25,
      enabled: false,
      explanation: "No runtime validation available."
    };
  }
  
  return {
    id: `sig-rv-${Date.now()}`,
    category: "result_validation",
    label: "Result Validation",
    score: validation.score,
    weight: 25,
    enabled: true,
    explanation: validation.status === 'passed' 
      ? `Validation passed with score ${validation.score}` 
      : `Validation returned ${validation.status}. Warnings: ${validation.warnings.join(' ')}`
  };
}

export function createDatasetHealthSignal(healthResult: DatasetHealthResult): ConfidenceSignal {
  return {
    id: `sig-dh-${Date.now()}`,
    category: "dataset_health",
    label: "Data Quality",
    score: healthResult.overall,
    weight: 25,
    enabled: true,
    explanation: healthResult.warnings.length > 0 
      ? `Health score is ${healthResult.overall}. Warnings: ${healthResult.warnings.map(w => w.message).join(', ')}`
      : `Health score is ${healthResult.overall}. Dataset is healthy.`,
    sourceContract: "dataset_health_engine_v1"
  };
}

export function createRelationshipSignal(graph: RelationshipGraph | null, isMultiDataset: boolean): ConfidenceSignal {
  if (!isMultiDataset || !graph) {
    return {
      id: `sig-rel-${Date.now()}`,
      category: "relationship_quality",
      label: "Relationship Quality",
      score: 100, // Or 0, but usually single dataset doesn't need relationship quality penalty
      weight: 25,
      enabled: false,
      explanation: "Single dataset analysis requires no relationship joins.",
      sourceContract: "relationship_graph_v1"
    };
  }

  // Simple heuristic for Relationship Quality V1:
  // Start at 100. Apply penalties for many_to_many, suggested (unconfirmed), or unlinked.
  let score = 100;
  let explanation = "Relationships are confirmed and healthy.";
  
  if (graph.edges.length === 0) {
    score = 0;
    explanation = "Missing relationship definitions between datasets.";
  } else {
    for (const edge of graph.edges) {
      if (edge.cardinality === "many_to_many") {
        score -= 15;
        explanation = "Contains many_to_many relationships which carry risk.";
      }
      if (edge.confidence === "LOW") {
        score -= 20;
        explanation = "Contains low confidence relationships.";
      }
      if (edge.status === "suggested") {
        // No bonus, but maybe slight uncertainty. For now, no penalty.
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    id: `sig-rel-${Date.now()}`,
    category: "relationship_quality",
    label: "Relationship Quality",
    score,
    weight: 25,
    enabled: true,
    explanation,
    sourceContract: "relationship_graph_v1"
  };
}

export function createBusinessViewSignal(view: BusinessViewCandidate | null): ConfidenceSignal {
  if (!view) {
    return {
      id: `sig-bv-${Date.now()}`,
      category: "business_view",
      label: "Business View Match",
      score: 0,
      weight: 10,
      enabled: false,
      explanation: "No business view provided."
    };
  }

  let score = 100;
  let explanation = "Business view perfectly aligns with question.";

  if (view.confidence === "LOW") {
    score -= 40;
    explanation = "Business view has LOW confidence match for this question.";
  } else if (view.confidence === "MEDIUM") {
    score -= 20;
    explanation = "Business view has MEDIUM confidence match for this question.";
  }

  score = Math.max(0, Math.min(100, score));

  return {
    id: `sig-bv-${Date.now()}`,
    category: "business_view",
    label: "Business View Match",
    score,
    weight: 10,
    enabled: true,
    explanation
  };
}
