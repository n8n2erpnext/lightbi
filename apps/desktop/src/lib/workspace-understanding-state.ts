import type { RelationshipGraph, RelationshipEdge } from './relationship-graph';
import type { BusinessViewCandidate, QuestionSuggestion } from './business-view-generator';

export type WorkspaceRelationshipState = {
  graph: RelationshipGraph;
  confirmedRelationshipIds: string[];
  rejectedRelationshipIds: string[];
  ignoredRelationshipIds: string[];
};

export type WorkspaceBusinessViewState = {
  selectedBusinessViewId?: string;
  confirmedBusinessViews: BusinessViewCandidate[];
  ignoredBusinessViewIds: string[];
};

export type WorkspaceUnderstandingState = {
  relationshipState?: WorkspaceRelationshipState;
  businessViewState?: WorkspaceBusinessViewState;
  activeContext:
    | { type: "dataset"; datasetId: string }
    | { type: "dataset_group"; datasetGroupId: string }
    | { type: "business_view"; businessViewId: string };
};

export function createWorkspaceUnderstandingState(
  initialContext: WorkspaceUnderstandingState['activeContext']
): WorkspaceUnderstandingState {
  return {
    activeContext: initialContext,
  };
}

export function applyBusinessViewSelection(
  state: WorkspaceUnderstandingState,
  view: BusinessViewCandidate,
  graph: RelationshipGraph
): WorkspaceUnderstandingState {
  // Extract confirmed and ignored from the graph/view states if we tracked them,
  // but since we are given a confirmed view, we just set it.
  return {
    ...state,
    businessViewState: {
      selectedBusinessViewId: view.id,
      confirmedBusinessViews: [view],
      ignoredBusinessViewIds: [] // Can be expanded if UI tracks ignored views
    },
    relationshipState: {
      graph,
      confirmedRelationshipIds: graph.edges.filter(e => e.status === 'confirmed').map(e => e.relationshipId),
      rejectedRelationshipIds: graph.edges.filter(e => e.status === 'rejected').map(e => e.relationshipId),
      ignoredRelationshipIds: graph.edges.filter(e => e.status === 'ignored').map(e => e.relationshipId),
    },
    activeContext: { type: "business_view", businessViewId: view.id }
  };
}

export function applyRelationshipStatusUpdate(
  state: WorkspaceUnderstandingState,
  edge: RelationshipEdge,
  newStatus: 'confirmed' | 'rejected' | 'ignored' | 'suggested'
): WorkspaceUnderstandingState {
  if (!state.relationshipState) return state;

  const currentGraph = state.relationshipState.graph;
  const updatedEdges = currentGraph.edges.map(e => 
    e.relationshipId === edge.relationshipId ? { ...e, status: newStatus } : e
  );

  const newGraph = { ...currentGraph, edges: updatedEdges };

  return {
    ...state,
    relationshipState: {
      ...state.relationshipState,
      graph: newGraph,
      confirmedRelationshipIds: updatedEdges.filter(e => e.status === 'confirmed').map(e => e.relationshipId),
      rejectedRelationshipIds: updatedEdges.filter(e => e.status === 'rejected').map(e => e.relationshipId),
      ignoredRelationshipIds: updatedEdges.filter(e => e.status === 'ignored').map(e => e.relationshipId),
    }
  };
}

export function getSuggestedQuestionsForActiveContext(
  state: WorkspaceUnderstandingState,
  fallbackQuestions: QuestionSuggestion[] = []
): QuestionSuggestion[] {
  if (state.activeContext.type === "business_view" && state.businessViewState) {
    const viewId = (state.activeContext as { businessViewId: string }).businessViewId;
    const activeView = state.businessViewState.confirmedBusinessViews.find(
      v => v.id === viewId
    );
    if (activeView && activeView.suggestedQuestions.length > 0) {
      return activeView.suggestedQuestions;
    }
  }
  return fallbackQuestions;
}

export function getActiveAnalysisContextLabel(
  state: WorkspaceUnderstandingState,
  fallbackLabel: string = "Connected Data"
): string {
  if (state.activeContext.type === "business_view" && state.businessViewState) {
    const viewId = (state.activeContext as { businessViewId: string }).businessViewId;
    const activeView = state.businessViewState.confirmedBusinessViews.find(
      v => v.id === viewId
    );
    if (activeView) return activeView.title;
  }
  if (state.activeContext.type === "dataset_group") {
    return "Dataset Group";
  }
  return fallbackLabel;
}
