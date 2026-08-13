import { describe, it, expect } from 'vitest';
import { 
  createPreviewResultContract, 
  validatePreviewResultContract, 
  summarizePreviewResultContract
} from './preview-result-contract';
import type { CompiledQueryContract } from './safe-sql-compiler';
import type { ExpectedResultContract } from './expected-result-contract';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from './runtime-sandbox-policy';

describe('Preview Result Contract', () => {
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

  const mockSandboxRequest: SandboxExecutionRequest = {
    id: 'sandbox-req:cq_1',
    compiledQueryId: 'cq_1',
    boundaryArtifactId: 'rb_1',
    expectedResultId: 'er_1',
    datasetCount: 1,
    relationshipCount: 0,
    policy: {
      maxDatasets: 3,
      maxRelationships: 2,
      maxRowsPreview: 100,
      maxExecutionMs: 15000,
      maxMemoryMB: 1024
    }
  };

  it('1. Ready preview contract from allow sandbox', () => {
    const sandboxEvaluation: SandboxEvaluationResult = {
      decision: 'allow',
      canExecute: true,
      reasons: [],
      warnings: []
    };
    
    const contract = createPreviewResultContract({
      compiledQuery: mockCompiledQuery,
      expectedResult: mockExpectedResult,
      sandboxRequest: mockSandboxRequest,
      sandboxEvaluation
    });

    expect(contract.status).toBe('ready');
    expect(contract.columns.length).toBe(2);
    expect(contract.rows).toEqual([]);
    expect(summarizePreviewResultContract(contract)).toBe('LightBI prepared the expected preview result structure. No data has been executed yet.');
  });

  it('2. Warning preview contract from warn sandbox', () => {
    const sandboxEvaluation: SandboxEvaluationResult = {
      decision: 'warn',
      canExecute: true,
      reasons: [],
      warnings: ['A warning']
    };
    
    const contract = createPreviewResultContract({
      compiledQuery: mockCompiledQuery,
      expectedResult: mockExpectedResult,
      sandboxRequest: mockSandboxRequest,
      sandboxEvaluation
    });

    expect(contract.status).toBe('warning');
    expect(contract.warnings).toContain('A warning');
    expect(summarizePreviewResultContract(contract)).toBe('LightBI prepared the preview structure with sandbox warnings.');
  });

  it('3. Blocked preview contract from block sandbox', () => {
    const sandboxEvaluation: SandboxEvaluationResult = {
      decision: 'block',
      canExecute: false,
      reasons: ['Blocked'],
      warnings: []
    };
    
    const contract = createPreviewResultContract({
      compiledQuery: mockCompiledQuery,
      expectedResult: mockExpectedResult,
      sandboxRequest: mockSandboxRequest,
      sandboxEvaluation
    });

    expect(contract.status).toBe('blocked');
    expect(contract.columns).toEqual([]);
    expect(summarizePreviewResultContract(contract)).toBe('Preview result cannot be prepared because sandbox validation blocked execution.');
  });

  it('4. Columns created from expected dimensions/measures', () => {
    const sandboxEvaluation: SandboxEvaluationResult = {
      decision: 'allow',
      canExecute: true,
      reasons: [],
      warnings: []
    };
    const contract = createPreviewResultContract({
      compiledQuery: mockCompiledQuery,
      expectedResult: mockExpectedResult,
      sandboxRequest: mockSandboxRequest,
      sandboxEvaluation
    });

    expect(contract.columns[0].id).toBe('route');
    expect(contract.columns[0].role).toBe('dimension');
    expect(contract.columns[1].id).toBe('delay');
    expect(contract.columns[1].role).toBe('measure');
  });

  it('5. No rows generated in Phase Q', () => {
    const sandboxEvaluation: SandboxEvaluationResult = { decision: 'allow', canExecute: true, reasons: [], warnings: [] };
    const contract = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    expect(contract.rows.length).toBe(0);
  });

  it('6. Validation fails on expectedResultId mismatch', () => {
    const sandboxEvaluation: SandboxEvaluationResult = { decision: 'allow', canExecute: true, reasons: [], warnings: [] };
    const contract = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    
    const wrongExpected: ExpectedResultContract = { ...mockExpectedResult, id: 'wrong_id' };
    const result = validatePreviewResultContract(contract, wrongExpected);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Contract expectedResultId mismatches expectedResult.id');
  });

  it('7. Validation fails if expected dimension missing', () => {
    const sandboxEvaluation: SandboxEvaluationResult = { decision: 'allow', canExecute: true, reasons: [], warnings: [] };
    const contract = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    
    // contract is missing the newly added dimension
    const modifiedExpected: ExpectedResultContract = { 
       ...mockExpectedResult, 
       dimensions: [...mockExpectedResult.dimensions, { id: 'time', label: 'Time' }] 
    };
    const result = validatePreviewResultContract(contract, modifiedExpected);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Expected dimension missing from columns: time');
  });

  it('8. Validation fails if expected measure missing', () => {
    const sandboxEvaluation: SandboxEvaluationResult = { decision: 'allow', canExecute: true, reasons: [], warnings: [] };
    const contract = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    
    const modifiedExpected: ExpectedResultContract = { 
       ...mockExpectedResult, 
       measures: [...mockExpectedResult.measures, { id: 'cost', label: 'Cost' }] 
    };
    const result = validatePreviewResultContract(contract, modifiedExpected);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Expected measure missing from columns: cost');
  });

  it('9. Deterministic contract id', () => {
    const sandboxEvaluation: SandboxEvaluationResult = { decision: 'allow', canExecute: true, reasons: [], warnings: [] };
    const c1 = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    const c2 = createPreviewResultContract({ compiledQuery: mockCompiledQuery, expectedResult: mockExpectedResult, sandboxRequest: mockSandboxRequest, sandboxEvaluation });
    expect(c1.id).toBe(`preview-result:${mockCompiledQuery.id}`);
    expect(c1.id).toBe(c2.id);
  });
});
