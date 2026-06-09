import { describe, it, expect } from 'vitest';
import { 
  createSandboxExecutionRequest, 
  evaluateSandboxPolicy, 
  summarizeSandboxEvaluation
} from './runtime-sandbox-policy';
import type { CompiledQueryContract } from './safe-sql-compiler';
import type { RuntimeBoundaryArtifact } from './runtime-boundary-contract';
import type { ExpectedResultContract } from './expected-result-contract';

describe('Runtime Sandbox Policy Contract', () => {
  const mockBoundary: RuntimeBoundaryArtifact = {
    id: 'rb_1',
    version: 'runtime-boundary/v1',
    createdAt: new Date().toISOString(),
    source: {
      questionId: 'q1',
      businessViewId: 'v1',
      virtualPlanId: 'vp1',
      runtimePreviewId: 'rp1',
      logicalPlanId: 'lp1'
    },
    approvals: {
      runtimePreviewAccepted: true,
      executionGuardDecision: 'allow',
      canExecute: true
    },
    datasets: ['d1'],
    relationships: [],
    logicalPlan: {
      id: 'lp_1',
      sourcePlanId: 'vp1',
      sourcePreviewId: 'rp1',
      status: 'ready',
      operations: [],
      datasets: ['d1'],
      relationshipIds: [],
      warnings: [],
      guardDecision: 'allow'
    },
    warnings: [],
    status: 'handoff_ready'
  };

  const mockExpectedResult: ExpectedResultContract = {
    id: 'er_1',
    questionId: 'q1',
    businessViewId: 'v1',
    shape: 'ranking',
    outputType: 'table',
    dimensions: [{ id: 'route', label: 'Route' }],
    measures: [{ id: 'delay', label: 'Delay' }],
    assumptions: [],
    warnings: [],
    confidence: 'HIGH'
  };

  const mockCompiledQuery: CompiledQueryContract = {
    id: 'cq_1',
    status: 'ready',
    boundaryArtifactId: 'rb_1',
    expectedResultContractId: 'er_1',
    sources: [{ datasetId: 'd1' }],
    joins: [],
    aggregates: [],
    sorts: [],
    warnings: [],
    sql: 'SELECT 1;'
  };

  it('1. Normal plan allowed', () => {
    const request = createSandboxExecutionRequest({
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });
    const evaluation = evaluateSandboxPolicy({
      request,
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });

    expect(evaluation.decision).toBe('allow');
    expect(evaluation.canExecute).toBe(true);
    expect(summarizeSandboxEvaluation(evaluation)).toBe('Runtime sandbox considers this analysis safe.');
  });

  it('2. Too many datasets warning', () => {
    const queryWithManySources: CompiledQueryContract = {
      ...mockCompiledQuery,
      sources: [
        { datasetId: 'd1' }, { datasetId: 'd2' }, { datasetId: 'd3' }, { datasetId: 'd4' }
      ]
    };
    const request = createSandboxExecutionRequest({
      compiledQuery: queryWithManySources,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });
    const evaluation = evaluateSandboxPolicy({
      request,
      compiledQuery: queryWithManySources,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });

    expect(evaluation.decision).toBe('warn');
    expect(evaluation.canExecute).toBe(true);
    expect(evaluation.warnings).toContain(`Dataset count (4) exceeds policy max (3).`);
  });

  it('3. Too many joins warning', () => {
    const queryWithManyJoins: CompiledQueryContract = {
      ...mockCompiledQuery,
      joins: [
        { relationshipId: 'r1' }, { relationshipId: 'r2' }, { relationshipId: 'r3' }
      ]
    };
    const request = createSandboxExecutionRequest({
      compiledQuery: queryWithManyJoins,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });
    const evaluation = evaluateSandboxPolicy({
      request,
      compiledQuery: queryWithManyJoins,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });

    expect(evaluation.decision).toBe('warn');
    expect(evaluation.canExecute).toBe(true);
    expect(evaluation.warnings).toContain(`Relationship count (3) exceeds policy max (2).`);
  });

  it('4. Invalid expected result blocked', () => {
    const invalidResult: ExpectedResultContract = {
      ...mockExpectedResult,
      dimensions: [],
      measures: []
    };
    const request = createSandboxExecutionRequest({
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: mockBoundary,
      expectedResult: invalidResult
    });
    const evaluation = evaluateSandboxPolicy({
      request,
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: mockBoundary,
      expectedResult: invalidResult
    });

    expect(evaluation.decision).toBe('block');
    expect(evaluation.canExecute).toBe(false);
    expect(evaluation.reasons).toContain('Expected result is invalid.');
  });

  it('5. Blocked artifact blocked', () => {
    const blockedBoundary: RuntimeBoundaryArtifact = { ...mockBoundary, status: 'handoff_blocked' };
    const request = createSandboxExecutionRequest({
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: blockedBoundary,
      expectedResult: mockExpectedResult
    });
    const evaluation = evaluateSandboxPolicy({
      request,
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: blockedBoundary,
      expectedResult: mockExpectedResult
    });

    expect(evaluation.decision).toBe('block');
    expect(evaluation.canExecute).toBe(false);
    expect(evaluation.reasons).toContain('Boundary artifact is blocked.');
  });

  it('6. Deterministic request id', () => {
    const req1 = createSandboxExecutionRequest({
      compiledQuery: mockCompiledQuery,
      boundaryArtifact: mockBoundary,
      expectedResult: mockExpectedResult
    });
    expect(req1.id).toBe(`sandbox-req:${mockCompiledQuery.id}`);
  });
});
