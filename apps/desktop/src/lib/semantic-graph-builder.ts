import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { SemanticGraph, SemanticNode, SemanticEdge, SemanticNodeType } from './semantic-graph-model';
import { TAXONOMY } from './business-signal-detector';

export function buildSemanticGraph(understanding: DatasetUnderstanding): SemanticGraph {
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (sourceId: string, targetId: string, type: "co_occurrence" | "workflow" | "relationship", label?: string) => {
    if (sourceId === targetId) return; // filter self-loops
    const edgeId = `${sourceId}-${targetId}`;
    if (!edgeSet.has(edgeId)) {
      edgeSet.add(edgeId);
      edges.push({ id: edgeId, sourceId, targetId, type, label });
    }
  };

  // 1. Nodes
  for (const concept of understanding.detectedConcepts || []) {
    const signalInfo = TAXONOMY[concept.signalId];
    
    let type: SemanticNodeType = "unknown";
    if (signalInfo && (signalInfo.type === 'time' || signalInfo.type === 'dimension' || signalInfo.type === 'measure')) {
        type = signalInfo.type as SemanticNodeType;
    }
    
    const domain = signalInfo?.domain || "unknown";

    nodes.push({
      id: concept.signalId,
      label: concept.label,
      type,
      domain,
      confidenceScore: concept.confidenceScore
    });
  }

  // 2. Edges from relationshipHints
  if (understanding.relationshipHints) {
    for (const hint of understanding.relationshipHints) {
      addEdge(hint.sourceSignal, hint.targetSignal, "relationship", hint.description);
    }
  }

  // 3. Edges from workflowHints
  if (understanding.workflowHints) {
    for (const hint of understanding.workflowHints) {
      addEdge(hint.sourceSignal, hint.targetSignal, "workflow", hint.description);
    }
  }

  // 4. Edges from availableAnalysis (co_occurrence)
  if (understanding.availableAnalysis) {
    for (const analysis of understanding.availableAnalysis) {
      if (analysis.dimensions && analysis.dimensions.length > 0 && analysis.measures && analysis.measures.length > 0) {
        addEdge(analysis.dimensions[0], analysis.measures[0], "co_occurrence");
      }
    }
  }

  return {
    nodes,
    edges,
    grain: understanding.grain || "unknown"
  };
}
