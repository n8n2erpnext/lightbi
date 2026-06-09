import { describe, it, expect } from 'vitest';
import { createDuckDBLogicalPlan, canCompileToRuntime } from './duckdb-logical-plan';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';
import type { RuntimePreview } from './runtime-preview';
import type { ExecutionGuardResult } from './execution-guard';

describe('DuckDB Logical Plan Adapter', () => {
  const basePlan: VirtualDatasetPlan = {
    id: 'plan_1',
    status: 'ready',
    businessViewId: 'view_1',
    questionId: 'q_1',
    title: 'Analysis',
    datasets: ['d1'],
    relationshipIds: ['r1'],
    requiredDomains: [],
    steps: [
      { id: 's1', type: 'select_dataset', description: 'select' },
      { id: 's2', type: 'use_relationship', description: 'join' },
      { id: 's3', type: 'group_by', description: 'aggregate' },
      { id: 's4', type: 'derive_metric', description: 'derive' }
    ],
    warnings: [],
    confidence: 'HIGH'
  };

  const basePreview: RuntimePreview = {
    id: 'prev_1',
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

  const baseGuardAllow: ExecutionGuardResult = {
    decision: 'allow',
    canExecute: true,
    reasons: [{ type: 'ok', message: 'Ok', severity: 'info' }]
  };

  it('1. Guard allow creates ready logical plan', () => {
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    expect(plan.status).toBe('ready');
    expect(canCompileToRuntime(plan)).toBe(true);
    expect(plan.guardDecision).toBe('allow');
  });

  it('2. Guard warn creates draft logical plan with warnings', () => {
    const warnGuard: ExecutionGuardResult = {
      decision: 'warn',
      canExecute: true,
      reasons: [{ type: 'many_to_many_risk', message: 'M2M', severity: 'warning' }]
    };
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: warnGuard });
    expect(plan.status).toBe('draft');
    expect(plan.warnings).toContain('M2M');
    expect(canCompileToRuntime(plan)).toBe(true);
  });

  it('3. Guard block creates blocked logical plan', () => {
    const blockGuard: ExecutionGuardResult = {
      decision: 'block',
      canExecute: false,
      reasons: [{ type: 'blocked_runtime_preview', message: 'Blocked', severity: 'error' }]
    };
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: blockGuard });
    expect(plan.status).toBe('blocked');
    expect(plan.warnings).toContain('Execution guard blocked this plan.');
    expect(canCompileToRuntime(plan)).toBe(false);
  });

  it('4-7. Maps step types correctly', () => {
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    const types = plan.operations.map(op => op.type);
    expect(types).toEqual(['scan', 'join', 'aggregate', 'derive']);
  });

  it('8. Dependencies are deterministic and ordered', () => {
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    expect(plan.operations[0].dependsOn).toBeUndefined();
    expect(plan.operations[1].dependsOn).toEqual([plan.operations[0].id]);
    expect(plan.operations[2].dependsOn).toEqual([plan.operations[1].id]);
    expect(plan.operations[3].dependsOn).toEqual([plan.operations[2].id]);
  });

  it('9. No SQL string appears anywhere in plan output', () => {
    const plan = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    const str = JSON.stringify(plan).toLowerCase();
    expect(str).not.toContain('select *');
    expect(str).not.toContain('from');
  });

  it('10. Deterministic ID for same input', () => {
    const plan1 = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    const plan2 = createDuckDBLogicalPlan({ plan: basePlan, preview: basePreview, guard: baseGuardAllow });
    expect(plan1.id).toBe(plan2.id);
  });
});
