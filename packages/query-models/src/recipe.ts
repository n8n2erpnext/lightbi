export type RecipeOperation = 
  | 'Source'
  | 'Filter'
  | 'Sort'
  | 'GroupBy'
  | 'Aggregate'
  | 'RenameColumn'
  | 'SelectColumns'
  | 'Union'
  | 'Join'
  | 'Compare'
  | 'DateRange'
  | 'CalculatedField'
  | 'OutputDataset';

export type RecipeNodeType = 
  | 'Source'
  | 'Transform'
  | 'Output'
  | 'Preview'
  | 'Annotation';

export interface RecipeStep {
  id: string;
  operationType: RecipeOperation;
  config: Record<string, any>;
}

export interface RecipeNode {
  id: string;
  nodeType: RecipeNodeType;
  step?: RecipeStep;
  uiPosition?: { x: number; y: number };
}

export interface RecipeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface Recipe {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  schemaVersion: string;
  recipeVersion: string;
  nodes: RecipeNode[];
  edges: RecipeEdge[];
  createdAt: string;
  updatedAt: string;
}
