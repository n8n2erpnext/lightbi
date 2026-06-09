import { describe, it, expect } from 'vitest';
import { 
  createRuntimeBoundaryArtifact, 
  validateRuntimeBoundaryArtifact, 
  summarizeRuntimeBoundaryArtifact 
} from './runtime-boundary-contract';
import type { BusinessViewCandidate, QuestionSuggestion } from './business-view-generator';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { RuntimePreview } from './runtime-preview';
import type { ExecutionGuardResult } from './execution-guard';
import type { DuckDBLogicalPlan } from './duckdb-logical-plan';

describe('Runtime Boundary Contract', () => {
  const mockView: BusinessViewCandidate = {
    id: 'view_1',
    title: 'View',
    description: 'Desc',
    confidence: 'HIGH',
    relationshipIds: ['rel_1'],
    datasets: ['d1'],
    suggestedQuestions: [],
    coreDomains: []
  };

  const mockQuestion: QuestionSuggestion = {
    id: 'q_1',
    question: 'Question',
    intent: 'summary',
    requiredDomains: [],
    explanation: 'Exp'
  };

  const mockVirtualPlan: VirtualDatasetPlan = {
    id: 'vp_1',
    businessViewId: 'view_1',
    questionId: 'q_1',
    status: 'ready',
    title: 'Plan',
    datasets: ['d1'],
    relationshipIds: [],
    requiredDomains: [],
    steps: [],
    warnings: [],
    confidence: 'HIGH'
  };

  const mockRuntimePreview: RuntimePreview = {
    id: 'rp_1',
    planId: 'vp_1',
    status: 'ready',
    question: 'Q',
    datasets: [],
    relationships: [],
    operations: [],
    warnings: [],
    explanation: 'Exp',
    confidence: 'HIGH'
  };

  const mockExecutionGuard: ExecutionGuardResult = {
    decision: 'allow',
    canExecute: true,
    reasons: []
  };

  const mockLogicalPlan: DuckDBLogicalPlan = {
    id: 'lp_1',
    sourcePlanId: 'vp_1',
    sourcePreviewId: 'rp_1',
    status: 'ready',
    operations: [],
    datasets: ['d1'],
    relationshipIds: [],
    warnings: [],
    guardDecision: 'allow'
  };

  const baseInput = {
    businessView: mockView,
    question: mockQuestion,
    virtualPlan: mockVirtualPlan,
    runtimePreview: mockRuntimePreview,
    executionGuard: mockExecutionGuard,
    logicalPlan: mockLogicalPlan,
    runtimePreviewAccepted: true
  };

  it('1. Ready artifact from allow guard + ready logical plan', () => {
    const artifact = createRuntimeBoundaryArtifact(baseInput);
    expect(artifact.status).toBe('handoff_ready');
    const valid = validateRuntimeBoundaryArtifact(artifact);
    expect(valid.valid).toBe(true);
  });

  it('2. Warning artifact from warn guard', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      executionGuard: { ...mockExecutionGuard, decision: 'warn' }
    });
    expect(artifact.status).toBe('handoff_warning');
  });

  it('3. Blocked artifact from blocked guard', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      executionGuard: { ...mockExecutionGuard, decision: 'block', canExecute: false }
    });
    expect(artifact.status).toBe('handoff_blocked');
  });

  it('4. Mismatched logicalPlan.sourcePlanId blocks', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      logicalPlan: { ...mockLogicalPlan, sourcePlanId: 'bad_id' }
    });
    expect(artifact.status).toBe('handoff_blocked');
  });

  it('5. Mismatched runtimePreview.planId blocks', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      runtimePreview: { ...mockRuntimePreview, planId: 'bad_id' }
    });
    expect(artifact.status).toBe('handoff_blocked');
  });

  it('6. Mismatched question id blocks', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      question: { ...mockQuestion, id: 'bad_id' }
    });
    expect(artifact.status).toBe('handoff_blocked');
  });

  it('7. Mismatched businessView id blocks', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      businessView: { ...mockView, id: 'bad_id' }
    });
    expect(artifact.status).toBe('handoff_blocked');
  });

  it('8. validateRuntimeBoundaryArtifact rejects missing datasets', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      logicalPlan: { ...mockLogicalPlan, datasets: [] }
    });
    const valid = validateRuntimeBoundaryArtifact(artifact);
    expect(valid.valid).toBe(false);
    expect(valid.errors.some(e => e.includes('least one dataset'))).toBe(true);
  });

  it('9. validateRuntimeBoundaryArtifact rejects multi-dataset without relationship', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      logicalPlan: { ...mockLogicalPlan, datasets: ['d1', 'd2'], relationshipIds: [] }
    });
    const valid = validateRuntimeBoundaryArtifact(artifact);
    expect(valid.valid).toBe(false);
    expect(valid.errors.some(e => e.includes('Multi-dataset'))).toBe(true);
  });

  it('10. validateRuntimeBoundaryArtifact rejects raw SQL string inside logical plan serialized object', () => {
    const artifact = createRuntimeBoundaryArtifact({
      ...baseInput,
      logicalPlan: { 
        ...mockLogicalPlan, 
        operations: [{ id: 'op1', type: 'scan', description: 'SELECT * FROM test' }] 
      }
    });
    const valid = validateRuntimeBoundaryArtifact(artifact);
    expect(valid.valid).toBe(false);
    expect(valid.errors.some(e => e.includes('raw SQL string'))).toBe(true);
  });

  it('11. Deterministic artifact id', () => {
    const artifact = createRuntimeBoundaryArtifact(baseInput);
    expect(artifact.id).toBe(`runtime-boundary:view_1:q_1:lp_1`);
  });

  it('12. Summary output for all statuses', () => {
    const a1 = createRuntimeBoundaryArtifact(baseInput);
    expect(summarizeRuntimeBoundaryArtifact(a1)).toContain('ready for the runtime boundary');
    
    const a2 = createRuntimeBoundaryArtifact({
      ...baseInput,
      executionGuard: { ...mockExecutionGuard, decision: 'warn' }
    });
    expect(summarizeRuntimeBoundaryArtifact(a2)).toContain('with warnings');

    const a3 = createRuntimeBoundaryArtifact({
      ...baseInput,
      executionGuard: { ...mockExecutionGuard, decision: 'block', canExecute: false }
    });
    expect(summarizeRuntimeBoundaryArtifact(a3)).toContain('cannot be handed off');
  });
});
