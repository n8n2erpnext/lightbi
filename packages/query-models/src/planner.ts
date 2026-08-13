export type RefreshStrategy = 
  | 'manual'
  | 'periodic'
  | 'live'
  | 'sourceTriggered';

export type MaterializationStrategy = 
  | 'virtual'
  | 'cached'
  | 'materialized'
  | 'temporary';

export interface ExecutionDependency {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface ExecutionNode {
  id: string;
  recipeNodeId: string;
  operationType: string;
  executionOrder: number;
  config: Record<string, any>;
  materialization: MaterializationStrategy;
}

export interface ExecutionPlan {
  id: string;
  recipeId: string;
  datasetId: string;
  refreshStrategy: RefreshStrategy;
  nodes: ExecutionNode[];
  dependencies: ExecutionDependency[];
  createdAt: string;
}
