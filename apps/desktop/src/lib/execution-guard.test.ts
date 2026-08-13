import { describe, it, expect } from 'vitest';
import { evaluateExecutionGuard, assertExecutionAllowed } from './execution-guard';
import type { RuntimePreview } from './runtime-preview';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { WorkspaceUnderstandingState } from './workspace-understanding-state';

describe('Execution Guard', () => {
  const mockPlan: VirtualDatasetPlan = {
    id: 'plan_1',
    status: 'ready',
    businessViewId: 'view_1',
    questionId: 'q_1',
    title: 'Plan',
    datasets: ['d1'],
    relationshipIds: [],
    requiredDomains: [],
    steps: [],
    warnings: [],
    confidence: 'HIGH'
  };

  const mockPreview: RuntimePreview = {
    id: 'preview_1',
    planId: 'plan_1',
    status: 'ready',
    question: 'Q',
    datasets: [],
    relationships: [],
    operations: [],
    warnings: [],
    explanation: 'Exp',
    confidence: 'HIGH'
  };

  const mockWorkspace: WorkspaceUnderstandingState = {
    activeContext: { type: 'business_view', businessViewId: 'view_1' },
    relationshipState: {
      graph: { nodes: new Map(), edges: [] },
      rejectedRelationshipIds: [],
      ignoredRelationshipIds: [],
      confirmedRelationshipIds: []
    }
  };

  it('1. Missing runtime preview blocks', () => {
    const res = evaluateExecutionGuard({ preview: null, previewAccepted: false });
    expect(res.decision).toBe('block');
    expect(res.canExecute).toBe(false);
    expect(res.reasons.some(r => r.type === 'missing_runtime_preview')).toBe(true);
  });

  it('2. Preview not accepted blocks', () => {
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: false });
    expect(res.decision).toBe('block');
    expect(res.canExecute).toBe(false);
    expect(res.reasons.some(r => r.type === 'runtime_preview_not_accepted')).toBe(true);
  });

  it('3. Blocked preview blocks', () => {
    const blockedPreview = { ...mockPreview, status: 'blocked' as const };
    const res = evaluateExecutionGuard({ preview: blockedPreview, previewAccepted: true });
    expect(res.decision).toBe('block');
  });

  it('4. Blocked virtual plan blocks', () => {
    const blockedPlan = { ...mockPlan, status: 'blocked' as const };
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: true, plan: blockedPlan });
    expect(res.decision).toBe('block');
  });

  it('5. Rejected relationship blocks', () => {
    const plan = { ...mockPlan, relationshipIds: ['rel_1'] };
    const ws = { 
      ...mockWorkspace, 
      relationshipState: { 
        ...mockWorkspace.relationshipState!, 
        rejectedRelationshipIds: ['rel_1'] 
      } 
    };
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: true, plan, workspaceState: ws });
    expect(res.decision).toBe('block');
    expect(res.reasons.some(r => r.type === 'rejected_relationship')).toBe(true);
  });

  it('6. Multi-dataset plan without relationship blocks', () => {
    const plan = { ...mockPlan, datasets: ['d1', 'd2'] };
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: true, plan });
    expect(res.decision).toBe('block');
    expect(res.reasons.some(r => r.type === 'missing_relationship')).toBe(true);
  });

  it('7. Many-to-many warning returns decision warn and canExecute true', () => {
    const warnPreview = { ...mockPreview, warnings: ['Many-to-many relationship risk'] };
    const res = evaluateExecutionGuard({ preview: warnPreview, previewAccepted: true, plan: mockPlan });
    expect(res.decision).toBe('warn');
    expect(res.canExecute).toBe(true);
    expect(res.reasons.some(r => r.type === 'many_to_many_risk')).toBe(true);
  });

  it('8. Low confidence warning returns decision warn and canExecute true', () => {
    const lowConfPlan = { ...mockPlan, confidence: 'LOW' as const };
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: true, plan: lowConfPlan });
    expect(res.decision).toBe('warn');
    expect(res.canExecute).toBe(true);
  });

  it('9. Clean accepted preview returns allow and canExecute true', () => {
    const res = evaluateExecutionGuard({ preview: mockPreview, previewAccepted: true, plan: mockPlan });
    expect(res.decision).toBe('allow');
    expect(res.canExecute).toBe(true);
    expect(assertExecutionAllowed(res)).toBe(true);
  });

  it('10. Priority block over warn', () => {
    const warnPreview = { ...mockPreview, warnings: ['many-to-many'] };
    const res = evaluateExecutionGuard({ preview: warnPreview, previewAccepted: false, plan: mockPlan });
    expect(res.decision).toBe('block');
    expect(res.canExecute).toBe(false);
  });
});
