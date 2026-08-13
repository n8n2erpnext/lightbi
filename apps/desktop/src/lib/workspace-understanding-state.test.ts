import { describe, it, expect } from 'vitest';
import {
  createWorkspaceUnderstandingState,
  applyBusinessViewSelection,
  applyRelationshipStatusUpdate,
  getSuggestedQuestionsForActiveContext,
  getActiveAnalysisContextLabel,
} from './workspace-understanding-state';
import type { RelationshipGraph, RelationshipEdge } from './relationship-graph';
import type { BusinessViewCandidate, QuestionSuggestion } from './business-view-generator';

const mockEdge: RelationshipEdge = {
  relationshipId: 'rel-1',
  leftDatasetId: 'ds-1',
  rightDatasetId: 'ds-2',
  leftColumnId: 'id',
  rightColumnId: 'ds1_id',
  score: 90,
  confidence: 'HIGH',
  cardinality: 'one_to_many',
  risk: 'LOW',
  status: 'suggested',
  evidence: []
};

const mockGraph: RelationshipGraph = {
  nodes: new Map(),
  edges: [mockEdge]
};

const mockQuestion: QuestionSuggestion = {
  id: 'q1',
  question: 'What is the total revenue?',
  intent: 'summary',
  requiredDomains: [],
  explanation: ''
};

const mockView: BusinessViewCandidate = {
  id: 'view-1',
  type: 'product_performance',
  title: 'Product Performance',
  description: 'Test view',
  status: 'confirmed',
  confidence: 'HIGH',
  score: 85,
  domains: ['product'],
  datasets: ['ds-1', 'ds-2'],
  supportingRelationshipIds: ['rel-1'],
  evidence: [],
  suggestedQuestions: [mockQuestion]
};

describe('Workspace Understanding State', () => {
  it('creates initial state', () => {
    const state = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    expect(state.activeContext.type).toBe('dataset_group');
    expect(state.businessViewState).toBeUndefined();
  });

  it('Selecting a BusinessView sets activeContext.type = "business_view"', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    const state = applyBusinessViewSelection(initialState, mockView, mockGraph);
    
    expect(state.activeContext.type).toBe('business_view');
    if (state.activeContext.type === 'business_view') {
      expect(state.activeContext.businessViewId).toBe('view-1');
    }
  });

  it('Selected BusinessView suggestedQuestions override field-level suggestions', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    const state = applyBusinessViewSelection(initialState, mockView, mockGraph);

    const fallback: QuestionSuggestion[] = [{
      id: 'q2',
      question: 'Fallback?',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    }];

    const qs = getSuggestedQuestionsForActiveContext(state, fallback);
    expect(qs.length).toBe(1);
    expect(qs[0].id).toBe('q1');
  });

  it('If no BusinessView is selected, fallback questions are used', () => {
    const state = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });

    const fallback: QuestionSuggestion[] = [{
      id: 'q2',
      question: 'Fallback?',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    }];

    const qs = getSuggestedQuestionsForActiveContext(state, fallback);
    expect(qs.length).toBe(1);
    expect(qs[0].id).toBe('q2');
  });

  it('Confirm relationship adds id to confirmedRelationshipIds', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    let state = applyBusinessViewSelection(initialState, mockView, mockGraph);
    
    state = applyRelationshipStatusUpdate(state, mockEdge, 'confirmed');
    
    expect(state.relationshipState?.confirmedRelationshipIds).toContain('rel-1');
    expect(state.relationshipState?.rejectedRelationshipIds).not.toContain('rel-1');
  });

  it('Reject relationship adds id to rejectedRelationshipIds', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    let state = applyBusinessViewSelection(initialState, mockView, mockGraph);
    
    state = applyRelationshipStatusUpdate(state, mockEdge, 'rejected');
    
    expect(state.relationshipState?.rejectedRelationshipIds).toContain('rel-1');
    expect(state.relationshipState?.confirmedRelationshipIds).not.toContain('rel-1');
  });

  it('business view context label returns title', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    const state = applyBusinessViewSelection(initialState, mockView, mockGraph);
    expect(getActiveAnalysisContextLabel(state)).toBe('Product Performance');
  });

  it('dataset group context label returns Dataset Group', () => {
    const state = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
    expect(getActiveAnalysisContextLabel(state)).toBe('Dataset Group');
  });

  it('dataset context label returns fallback', () => {
    const state = createWorkspaceUnderstandingState({ type: 'dataset', datasetId: 'ds-1' });
    expect(getActiveAnalysisContextLabel(state, 'My File.csv')).toBe('My File.csv');
  });
});
