export type SemanticNodeType = "dimension" | "measure" | "time" | "unknown";

export type SemanticEdgeType = "co_occurrence" | "workflow" | "relationship";

export interface SemanticNode {
  id: string;           // canonicalId from signal
  label: string;
  type: SemanticNodeType;
  domain: string;       // from TAXONOMY domain
  confidenceScore: number;
}

export interface SemanticEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: SemanticEdgeType;
  label?: string;
}

export interface SemanticGraph {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
  grain: string;
}
