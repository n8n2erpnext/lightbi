import { describe, it, expect } from 'vitest';
import { createSafeSqlPreview } from './safe-sql-preview';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('Safe SQL Preview', () => {
  const basePlan: RuntimePlanPreview = {
    id: 'p1',
    sourceIntentId: 'i1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [],
    expectedOutput: { shape: 'table', dimensions: [], measures: [] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  it('group_by plan produces expected quoted SQL', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['driver', 'shipment'] },
      { type: 'group_by', dimensions: ['driver'], measures: ['shipment'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['driver', 'shipment']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "driver", COUNT("shipment") AS "shipment_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nGROUP BY "driver"\nLIMIT 100;');
  });

  it('trend plan produces ORDER BY time dimension', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['report_date', 'shipment'] },
      { type: 'trend', timeDimension: 'report_date', measures: ['shipment'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['report_date', 'shipment']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "report_date", COUNT("shipment") AS "shipment_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nGROUP BY "report_date"\nORDER BY "report_date"\nLIMIT 100;');
  });

  it('distribution plan uses COUNT(*)', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['dimension1'] },
      { type: 'distribution', dimension: 'dimension1' },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['dimension1']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "dimension1", COUNT(*) AS "row_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nGROUP BY "dimension1"\nLIMIT 100;');
  });

  it('relationship plan includes IS NOT NULL filters', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['measure1', 'measure2'] },
      { type: 'relationship', measures: ['measure1', 'measure2'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['measure1', 'measure2']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "measure1", "measure2"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "measure1" IS NOT NULL\n  AND "measure2" IS NOT NULL\nLIMIT 100;');
  });

  it('blocked plan produces null SQL', () => {
    const plan: RuntimePlanPreview = { ...basePlan, status: 'blocked', blockedReasons: ['missing dimension'] };
    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('blocked');
    expect(sqlPreview.sql).toBeNull();
    expect(sqlPreview.blockedReasons).toContain('missing dimension');
  });

  it('column names with spaces or Vietnamese characters are safely quoted', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Tên lái xe', 'Đánh giá'] },
      { type: 'group_by', dimensions: ['Tên lái xe'], measures: ['Đánh giá'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Tên lái xe', 'Đánh giá']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "Tên lái xe", COUNT("Đánh giá") AS "Đánh giá_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nGROUP BY "Tên lái xe"\nLIMIT 100;');
  });

  it('unsupported operation blocks', () => {
    // @ts-ignore testing unsupported
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [ { type: 'unsupported' } ] };
    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('blocked');
    expect(sqlPreview.blockedReasons).toContain('Unsupported operation type');
  });

});
