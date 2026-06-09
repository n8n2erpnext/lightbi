import { describe, it, expect } from 'vitest';
import { compileSafeQuery, validateCompiledQuery, summarizeCompiledQuery } from './safe-sql-compiler';
import type { RuntimeBoundaryArtifact } from './runtime-boundary-contract';
import type { ExpectedResultContract } from './expected-result-contract';

describe('Safe SQL Compiler Contract', () => {
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

  it('1. Ranking contract', () => {
    const contract = compileSafeQuery({ artifact: mockBoundary, expectedResult: mockExpectedResult });
    expect(contract.status).toBe('ready');
    expect(contract.aggregates[0].field).toBe('delay');
    expect(contract.sorts[0].direction).toBe('desc');
    expect(contract.sql).toContain('SELECT route, SUM(delay) AS delay');
    expect(contract.sql).toContain('ORDER BY delay DESC');
  });

  it('2. Trend contract', () => {
    const trendResult: ExpectedResultContract = { ...mockExpectedResult, shape: 'trend' };
    const contract = compileSafeQuery({ artifact: mockBoundary, expectedResult: trendResult });
    expect(contract.status).toBe('ready');
    expect(contract.sorts[0].field).toBe('route');
    expect(contract.sorts[0].direction).toBe('asc');
  });

  it('3. Blocked artifact', () => {
    const blockedBoundary: RuntimeBoundaryArtifact = { ...mockBoundary, status: 'handoff_blocked' };
    const contract = compileSafeQuery({ artifact: blockedBoundary, expectedResult: mockExpectedResult });
    expect(contract.status).toBe('blocked');
    expect(contract.sql).toBeNull();
  });

  it('4. Missing joins validation', () => {
    const multiDatasetBoundary: RuntimeBoundaryArtifact = { ...mockBoundary, datasets: ['d1', 'd2'], relationships: [] };
    const contract = compileSafeQuery({ artifact: multiDatasetBoundary, expectedResult: mockExpectedResult });
    const validation = validateCompiledQuery(contract);
    expect(validation.valid).toBe(false);
    expect(validation.warnings).toContain('Multi-dataset query requires joins.');
  });

  it('5. Invalid expected result blocks query', () => {
    const invalidExpected: ExpectedResultContract = { ...mockExpectedResult, shape: 'ranking', outputType: 'table', dimensions: [], measures: [] };
    const contract = compileSafeQuery({ artifact: mockBoundary, expectedResult: invalidExpected });
    expect(contract.status).toBe('blocked');
    expect(contract.warnings).toContain('Expected result contract is invalid.');
  });

  it('6. Placeholder SQL generated', () => {
    const contract = compileSafeQuery({ artifact: mockBoundary, expectedResult: mockExpectedResult });
    expect(contract.sql).toContain('SELECT');
    expect(contract.sql).toContain('FROM table_d1');
    expect(contract.sql).toContain('GROUP BY 1');
  });

  it('7. Deterministic ID', () => {
    const c1 = compileSafeQuery({ artifact: mockBoundary, expectedResult: mockExpectedResult });
    const c2 = compileSafeQuery({ artifact: mockBoundary, expectedResult: mockExpectedResult });
    expect(c1.id).toBe(`compiled-query:rb_1`);
    expect(c1.id).toBe(c2.id);
  });
  
  it('8. Summarize query output', () => {
     const c1 = compileSafeQuery({ artifact: mockBoundary, expectedResult: mockExpectedResult });
     expect(summarizeCompiledQuery(c1)).toContain('safe query contract');
  });
});
