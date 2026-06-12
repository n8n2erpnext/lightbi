import { describe, it, expect } from 'vitest';
import { enhancePlanWithGuardedSum } from './guarded-sum-bridge';
import type { RuntimePlanPreview, LogicalRuntimeOperation } from './runtime-planner-preview';

describe('guarded-sum-bridge', () => {
  const basePlan: RuntimePlanPreview = {
    id: 'p1',
    sourceIntentId: 'i1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [],
    expectedOutput: { shape: 'bar_chart', dimensions: [], measures: [] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  it('promotes clean numeric columns to SUM', () => {
    const rawRows = [
      { revenue: 1000 },
      { revenue: 2000 },
      { revenue: '3000' }
    ];
    
    const plan: RuntimePlanPreview = {
      ...basePlan,
      logicalOperations: [
        { type: 'group_by', dimensions: ['driver'], measures: ['revenue'] }
      ]
    };

    const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
    const gbOp = enhanced.logicalOperations[0] as LogicalRuntimeOperation & { type: 'group_by' };
    
    expect(gbOp.measureAggregations).toBeDefined();
    expect(gbOp.measureAggregations!['revenue']).toBe('SUM');
  });

  it('downgrades dirty text columns to COUNT', () => {
    const rawRows = [
      { feedback: 'Good' },
      { feedback: 'Bad' },
      { feedback: 'Okay' }
    ];
    
    const plan: RuntimePlanPreview = {
      ...basePlan,
      logicalOperations: [
        { type: 'group_by', dimensions: ['driver'], measures: ['feedback'] }
      ]
    };

    const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
    const gbOp = enhanced.logicalOperations[0] as LogicalRuntimeOperation & { type: 'group_by' };
    
    expect(gbOp.measureAggregations).toBeDefined();
    expect(gbOp.measureAggregations!['feedback']).toBe('COUNT');
  });

  it('handles casing differences between measure name and raw row keys', () => {
    const rawRows = [
      { "Tên lái xe": 'A', "Doanh Thu": '1.000.000đ' },
      { "Tên lái xe": 'B', "Doanh Thu": '500.000đ' }
    ];
    
    // measure name is usually canonical lowercased
    const plan: RuntimePlanPreview = {
      ...basePlan,
      logicalOperations: [
        { type: 'trend', timeDimension: 'date', measures: ['doanh thu'] }
      ]
    };

    const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
    const trendOp = enhanced.logicalOperations[0] as LogicalRuntimeOperation & { type: 'trend' };
    
    expect(trendOp.measureAggregations).toBeDefined();
    expect(trendOp.measureAggregations!['doanh thu']).toBe('SUM');
    
    // It should push a warning because of the cleansing
    expect(enhanced.warnings.length).toBeGreaterThan(0);
    expect(enhanced.warnings[0]).toContain("underwent silent cleansing");
  });

  it('generates a warning when a measure passes SUM but drops rows', () => {
    // 95 rows valid, 5 rows invalid. success rate 0.95 -> passes SUM threshold
    const rawRows = Array(100).fill({ revenue: '1000' });
    for (let i = 0; i < 5; i++) {
      rawRows[i] = { revenue: 'not_a_number' };
    }
    
    const plan: RuntimePlanPreview = {
      ...basePlan,
      logicalOperations: [
        { type: 'group_by', dimensions: ['driver'], measures: ['revenue'] }
      ]
    };

    const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
    
    // Should be SUM
    const gbOp = enhanced.logicalOperations[0] as LogicalRuntimeOperation & { type: 'group_by' };
    expect(gbOp.measureAggregations!['revenue']).toBe('SUM');
    
    // Should have warning
    expect(enhanced.warnings.length).toBe(1);
    expect(enhanced.warnings[0]).toContain("drop rate: 5.0%");
  });

  it('does NOT generate a warning when measure fails the SUM threshold', () => {
    // 50 valid, 50 invalid. success rate 0.50 -> fails threshold -> COUNT
    const rawRows = Array(100).fill({ revenue: '1000' });
    for (let i = 0; i < 50; i++) {
      rawRows[i] = { revenue: 'not_a_number' };
    }
    
    const plan: RuntimePlanPreview = {
      ...basePlan,
      logicalOperations: [
        { type: 'group_by', dimensions: ['driver'], measures: ['revenue'] }
      ]
    };

    const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
    
    // Should be COUNT
    const gbOp = enhanced.logicalOperations[0] as LogicalRuntimeOperation & { type: 'group_by' };
    expect(gbOp.measureAggregations!['revenue']).toBe('COUNT');
    
    // NO cleansing warning because it was downgraded to COUNT
    expect(enhanced.warnings.length).toBe(0);
  });
});
