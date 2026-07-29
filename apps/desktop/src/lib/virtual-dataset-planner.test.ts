import { describe, it, expect } from 'vitest';
import {
  createVirtualDatasetPlan
} from './virtual-dataset-planner';
import type { RelationshipGraph, RelationshipEdge } from './relationship-graph';
import type { BusinessViewCandidate, QuestionSuggestion } from './business-view-generator';
import { createWorkspaceUnderstandingState, applyRelationshipStatusUpdate, applyBusinessViewSelection } from './workspace-understanding-state';

describe('Virtual Dataset Planner', () => {
  const mockEdge1: RelationshipEdge = {
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

  const mockEdge2: RelationshipEdge = {
    relationshipId: 'rel-2',
    leftDatasetId: 'ds-2',
    rightDatasetId: 'ds-3',
    leftColumnId: 'id',
    rightColumnId: 'ds2_id',
    score: 75,
    confidence: 'MEDIUM',
    cardinality: 'many_to_many',
    risk: 'HIGH',
    status: 'suggested',
    evidence: []
  };

  const mockGraph: RelationshipGraph = {
    nodes: new Map(),
    edges: [mockEdge1, mockEdge2]
  };

  const logisticsView: BusinessViewCandidate = {
    id: 'view-logistics',
    type: 'logistics_journey',
    title: 'Logistics Journey',
    description: 'Logistics view',
    status: 'suggested',
    confidence: 'HIGH',
    score: 90,
    domains: ['logistics', 'order'],
    datasets: ['ds-1', 'ds-2'],
    supportingRelationshipIds: ['rel-1'],
    evidence: [],
    suggestedQuestions: []
  };

  const productView: BusinessViewCandidate = {
    id: 'view-product',
    type: 'product_performance',
    title: 'Product Performance',
    description: 'Product view',
    status: 'suggested',
    confidence: 'HIGH',
    score: 90,
    domains: ['product', 'inventory'],
    datasets: ['ds-2', 'ds-3'],
    supportingRelationshipIds: ['rel-2'],
    evidence: [],
    suggestedQuestions: []
  };

  it('1. Logistics Journey + route delay question', () => {
    const question: QuestionSuggestion = {
      id: 'q-delay',
      question: 'What are the route delays?',
      intent: 'diagnose',
      requiredDomains: ['logistics'],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: logisticsView,
      question,
      graph: mockGraph
    });

    expect(plan.status).toBe('ready');
    expect(plan.steps.some(s => s.type === 'select_dataset')).toBe(true);
    expect(plan.steps.some(s => s.type === 'use_relationship')).toBe(true);
    expect(plan.steps.some(s => s.type === 'group_by')).toBe(true);
    expect(plan.steps.some(s => s.type === 'validate')).toBe(true);
    expect(plan.relationshipIds).toContain('rel-1');
  });

  it('2. Product Performance + inventory risk question', () => {
    const question: QuestionSuggestion = {
      id: 'q-risk',
      question: 'Show inventory risk levels',
      intent: 'risk',
      requiredDomains: ['inventory'],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: productView,
      question,
      graph: mockGraph
    });

    expect(plan.status).toBe('draft');
    expect(plan.warnings.some(w => w.includes('many-to-many'))).toBe(true);
    expect(plan.steps.some(s => s.type === 'filter')).toBe(true);
    expect(plan.steps.some(s => s.type === 'sort')).toBe(true);
  });

  it('3. Profitability Analysis question', () => {
    const question: QuestionSuggestion = {
      id: 'q-profit',
      question: 'Analyze product profitability',
      intent: 'summary',
      requiredDomains: ['product'],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: productView,
      question,
      graph: mockGraph
    });

    expect(plan.steps.some(s => s.type === 'derive_metric')).toBe(true);
    expect(plan.warnings.some(w => w.includes('profit'))).toBe(true);
  });

  it('4. Rejected relationship', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'g-1' });
    let ws = applyBusinessViewSelection(initialState, logisticsView, mockGraph);
    ws = applyRelationshipStatusUpdate(ws, mockEdge1, 'rejected');

    const question: QuestionSuggestion = {
      id: 'q-1',
      question: 'Test',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: logisticsView,
      question,
      graph: mockGraph,
      workspaceState: ws
    });

    expect(plan.status).toBe('blocked');
    expect(plan.warnings.some(w => w.includes('rejected'))).toBe(true);
  });

  it('5. Ignored relationship', () => {
    const initialState = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'g-1' });
    let ws = applyBusinessViewSelection(initialState, logisticsView, mockGraph);
    ws = applyRelationshipStatusUpdate(ws, mockEdge1, 'ignored');

    const question: QuestionSuggestion = {
      id: 'q-1',
      question: 'Test',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: logisticsView,
      question,
      graph: mockGraph,
      workspaceState: ws
    });

    expect(plan.relationshipIds).not.toContain('rel-1');
  });

  it('6. Many-to-many relationship', () => {
    const question: QuestionSuggestion = {
      id: 'q-1',
      question: 'Test',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: productView,
      question,
      graph: mockGraph
    });

    expect(plan.warnings.some(w => w.includes('many-to-many'))).toBe(true);
    expect(plan.status).toBe('draft'); // Requires review before execution
  });

  it('7. Missing required domain', () => {
    const question: QuestionSuggestion = {
      id: 'q-miss',
      question: 'Test',
      intent: 'summary',
      requiredDomains: ['finance'],
      explanation: ''
    };

    const plan = createVirtualDatasetPlan({
      businessView: productView,
      question,
      graph: mockGraph
    });

    expect(plan.status).toBe('draft');
    expect(plan.warnings.some(w => w.includes('finance'))).toBe(true);
  });

  it('8. Deterministic ID', () => {
    const question: QuestionSuggestion = {
      id: 'q-test-id',
      question: 'Test',
      intent: 'summary',
      requiredDomains: [],
      explanation: ''
    };

    const plan1 = createVirtualDatasetPlan({
      businessView: logisticsView,
      question,
      graph: mockGraph
    });

    const plan2 = createVirtualDatasetPlan({
      businessView: logisticsView,
      question,
      graph: mockGraph
    });

    expect(plan1.id).toBe(plan2.id);
    expect(plan1.id).toBe('view-logistics_q-test-id');
  });
});
