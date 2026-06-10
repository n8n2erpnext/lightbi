import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeBackendPreview } from './backend-preview-executor';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('backend-preview-executor', () => {
  const mockPlan: RuntimePlanPreview = {
    id: 'plan_1',
    sourceIntentId: 'intent_1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [
      { type: 'scan', columns: ['region'] },
      { type: 'group_by', dimensions: ['region'], measures: ['sales'] }
    ],
    requiredColumns: ['region', 'sales'],
    expectedOutput: { shape: 'bar_chart', dimensions: ['region'], measures: ['sales'] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends runtimePlan only, no SQL, and maps executed response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 'executed',
      columns: ['region', 'sales_count'],
      rows: [{ region: 'North', sales_count: 5 }],
      row_count: 1,
      max_rows: 100,
      warnings: [],
      blocked_reasons: []
    })));

    const result = await executeBackendPreview({ runtimePlan: mockPlan });

    expect(fetchSpy).toHaveBeenCalledWith('/api/preview/execute', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runtime_plan: mockPlan, limit: 100 })
    }));

    expect(result.status).toBe('executed');
    expect(result.columns).toEqual(['region', 'sales_count']);
    expect(result.rows).toEqual([{ region: 'North', sales_count: 5 }]);
    expect(result.source).toBe('backend_duckdb_preview');
  });

  it('maps blocked response', async () => {
    const blockedPlan = { ...mockPlan, status: 'blocked' as const, blockedReasons: ['missing columns'] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 'blocked',
      columns: [],
      rows: [],
      row_count: 0,
      max_rows: 100,
      warnings: [],
      blocked_reasons: ['missing columns']
    })));

    const result = await executeBackendPreview({ runtimePlan: blockedPlan });
    expect(result.status).toBe('blocked');
    expect(result.blockedReasons).toEqual(['missing columns']);
  });

  it('network failure returns failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    
    const result = await executeBackendPreview({ runtimePlan: mockPlan });
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('Network error');
    expect(result.source).toBe('backend_duckdb_preview');
  });
});
