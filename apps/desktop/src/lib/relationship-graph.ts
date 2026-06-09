export type RelationshipNode = {
  datasetId: string;
};

export type EvidenceItem = {
  type: "semantic" | "name" | "datatype" | "profile" | "pattern" | "overlap";
  score: number;
  message: string;
};

export type RelationshipConfidence = "HIGH" | "MEDIUM" | "LOW";

export type RelationshipRisk = "HIGH" | "MEDIUM" | "LOW";

export type RelationshipCardinality = "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many" | "unknown";

export type RelationshipStatus =
  | "suggested"
  | "confirmed"
  | "edited"
  | "ignored"
  | "rejected";

export type RelationshipEdge = {
  relationshipId: string;
  leftDatasetId: string;
  rightDatasetId: string;
  leftColumnId: string;
  rightColumnId: string;
  score: number;
  confidence: RelationshipConfidence;
  cardinality: RelationshipCardinality;
  risk: RelationshipRisk;
  status: RelationshipStatus;
  evidence: EvidenceItem[];
};

export type RelationshipGraph = {
  nodes: Map<string, RelationshipNode>;
  edges: RelationshipEdge[];
};

export type ConnectedComponent = {
  componentId: string;
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
};

export type DatasetCollectionCandidate = {
  collectionId: string;
  datasetIds: string[];
  relationships: RelationshipEdge[];
};

export function buildRelationshipGraph(edges: RelationshipEdge[]): RelationshipGraph {
  const nodes = new Map<string, RelationshipNode>();
  
  for (const edge of edges) {
    if (!nodes.has(edge.leftDatasetId)) {
      nodes.set(edge.leftDatasetId, { datasetId: edge.leftDatasetId });
    }
    if (!nodes.has(edge.rightDatasetId)) {
      nodes.set(edge.rightDatasetId, { datasetId: edge.rightDatasetId });
    }
  }

  return { nodes, edges };
}

export function findConnectedComponents(graph: RelationshipGraph): ConnectedComponent[] {
  const adjacencyList = new Map<string, RelationshipEdge[]>();
  for (const datasetId of graph.nodes.keys()) {
    adjacencyList.set(datasetId, []);
  }

  for (const edge of graph.edges) {
    adjacencyList.get(edge.leftDatasetId)!.push(edge);
    adjacencyList.get(edge.rightDatasetId)!.push(edge);
  }

  const visited = new Set<string>();
  const components: ConnectedComponent[] = [];
  let componentCounter = 1;

  for (const startNode of graph.nodes.keys()) {
    if (!visited.has(startNode)) {
      const componentNodes: RelationshipNode[] = [];
      const componentEdges = new Set<RelationshipEdge>();
      
      const queue = [startNode];
      visited.add(startNode);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        componentNodes.push(graph.nodes.get(currentId)!);

        for (const edge of adjacencyList.get(currentId)!) {
          componentEdges.add(edge);
          const neighborId = edge.leftDatasetId === currentId ? edge.rightDatasetId : edge.leftDatasetId;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      components.push({
        componentId: `comp_${componentCounter++}_${Date.now()}`,
        nodes: componentNodes,
        edges: Array.from(componentEdges)
      });
    }
  }

  return components;
}
