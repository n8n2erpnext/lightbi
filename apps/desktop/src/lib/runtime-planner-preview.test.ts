import { describe, it, expect } from 'vitest';
import { createRuntimePlanPreview } from './runtime-planner-preview';
import type { RuntimeIntent } from './analysis-runtime-contract';

describe('Runtime Planner Preview', () => {
  const baseIntent: RuntimeIntent = {
    id: 'i1',
    sourceActionId: 'a1',
    type: 'group_by',
    dimensions: [],
    measures: [],
    expectedShape: 'table',
    status: 'ready',
    warnings: [],
    blockedReasons: [],
    source: 'analysis_action'
  };

  it('group_by intent generates scan + group_by + limit', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'group_by', dimensions: ['route'], measures: ['shipment'], expectedShape: 'bar_chart' };
    const plan = createRuntimePlanPreview(intent);
    expect(plan.status).toBe('ready');
    expect(plan.logicalOperations).toHaveLength(3);
    expect(plan.logicalOperations[0].type).toBe('scan');
    expect(plan.logicalOperations[1].type).toBe('group_by');
    expect(plan.logicalOperations[2].type).toBe('limit');
  });

  it('trend intent generates scan + trend + limit', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'trend', dimensions: ['report_date'], measures: ['shipment'], expectedShape: 'line_chart' };
    const plan = createRuntimePlanPreview(intent);
    expect(plan.status).toBe('ready');
    expect(plan.logicalOperations).toHaveLength(3);
    expect(plan.logicalOperations[1].type).toBe('trend');
    if (plan.logicalOperations[1].type === 'trend') {
        expect(plan.logicalOperations[1].timeDimension).toBe('report_date');
    }
  });

  it('relationship intent generates relationship operation', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'relationship', dimensions: [], measures: ['cost', 'revenue'], expectedShape: 'scatter_plot' };
    const plan = createRuntimePlanPreview(intent);
    expect(plan.status).toBe('ready');
    expect(plan.logicalOperations).toHaveLength(3);
    expect(plan.logicalOperations[1].type).toBe('relationship');
  });

  it('blocked intent generates blocked preview with no operations', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'group_by', dimensions: [], measures: [], status: 'blocked', blockedReasons: ['missing dim'] };
    const plan = createRuntimePlanPreview(intent);
    expect(plan.status).toBe('blocked');
    expect(plan.logicalOperations).toHaveLength(0);
    expect(plan.blockedReasons).toContain('missing dim');
  });

  it('requiredColumns deduplicated', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'group_by', dimensions: ['route', 'route'], measures: ['shipment', 'route'] };
    const plan = createRuntimePlanPreview(intent);
    expect(plan.requiredColumns).toHaveLength(2); // route, shipment
    expect(plan.requiredColumns).toContain('route');
    expect(plan.requiredColumns).toContain('shipment');
  });

  it('preview contains no SQL or rows', () => {
    const intent: RuntimeIntent = { ...baseIntent, type: 'group_by', dimensions: ['route'], measures: ['shipment'] };
    const plan = createRuntimePlanPreview(intent);
    const keys = Object.keys(plan);
    expect(keys).not.toContain('sql');
    expect(keys).not.toContain('query');
    expect(keys).not.toContain('rows');
    expect(keys).not.toContain('data');
  });
});
