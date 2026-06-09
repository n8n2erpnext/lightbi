import { describe, it, expect } from 'vitest';
import { createRuntimePreview, summarizeRuntimePreview, canProceedToExecution } from './runtime-preview';
import type { VirtualDatasetPlan } from './virtual-dataset-planner';

describe('Runtime Preview', () => {
  const basePlan: VirtualDatasetPlan = {
    id: 'plan_1',
    status: 'ready',
    businessViewId: 'view_1',
    questionId: 'q_1',
    title: 'Analysis Plan: How many orders?',
    datasets: ['orders', 'customers'],
    relationshipIds: ['rel_1'],
    requiredDomains: ['order'],
    steps: [
      { id: '1', type: 'select_dataset', description: 'Select dataset' },
      { id: '2', type: 'use_relationship', description: 'Join data' },
      { id: '3', type: 'group_by', description: 'Group by region' }
    ],
    warnings: [],
    confidence: 'HIGH'
  };

  it('1. Ready plan', () => {
    const preview = createRuntimePreview(basePlan);
    expect(preview.status).toBe('ready');
    expect(preview.operations.length).toBe(3);
    expect(preview.id).toBe('preview_plan_1');
    expect(canProceedToExecution(preview, true)).toBe(true);
  });

  it('2. Warning plan', () => {
    const plan = { ...basePlan, status: 'draft' as const, warnings: ['Missing domain'] };
    const preview = createRuntimePreview(plan);
    expect(preview.status).toBe('warning');
  });

  it('3. Blocked plan', () => {
    const plan = { ...basePlan, status: 'blocked' as const };
    const preview = createRuntimePreview(plan);
    expect(preview.status).toBe('blocked');
    expect(canProceedToExecution(preview, true)).toBe(false);
  });

  it('4. Many-to-many warning', () => {
    const plan = { ...basePlan, warnings: ['This relationship may duplicate rows because it looks many-to-many.'] };
    const preview = createRuntimePreview(plan);
    expect(preview.status).toBe('warning');
    expect(preview.warnings).toContain('This relationship may duplicate rows because it looks many-to-many.');
  });

  it('5. Rejected relationship blocked', () => {
    const plan = { ...basePlan, warnings: ['Required relationship rel_1 is rejected.'] };
    const preview = createRuntimePreview(plan);
    expect(preview.status).toBe('blocked');
  });

  it('6. Explanation generated', () => {
    const preview = createRuntimePreview(basePlan);
    expect(preview.explanation).toBeTruthy();
    expect(summarizeRuntimePreview(preview)).toContain('preparing an analysis plan');
  });

  it('7. Deterministic preview id', () => {
    const preview1 = createRuntimePreview(basePlan);
    const preview2 = createRuntimePreview(basePlan);
    expect(preview1.id).toBe(preview2.id);
  });
});
