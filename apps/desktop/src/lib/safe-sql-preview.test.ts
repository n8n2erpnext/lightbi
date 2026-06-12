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

  it('group_by plan produces expected quoted SQL with COUNT default', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Driver', 'Shipment'] },
      { type: 'group_by', dimensions: ['Driver'], measures: ['Shipment'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Driver', 'Shipment']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "driver" AS "Driver", CAST(COUNT("shipment") AS INTEGER) AS "Shipment"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "driver" IS NOT NULL\nGROUP BY "driver"\nLIMIT 100;');
  });

  it('group_by plan produces SUM when metadata permits', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Driver', 'Revenue'] },
      { type: 'group_by', dimensions: ['Driver'], measures: ['Revenue'], measureAggregations: { 'Revenue': 'SUM' } },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Driver', 'Revenue']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "driver" AS "Driver", SUM(TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("revenue", \',\', \'\'), \'.\', \'\'), \'đ\', \'\'), \'VNĐ\', \'\'), \'$\', \'\'), \' \', \'\') AS DOUBLE)) AS "Revenue", SUM(CASE WHEN "revenue" IS NOT NULL AND TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("revenue", \',\', \'\'), \'.\', \'\'), \'đ\', \'\'), \'VNĐ\', \'\'), \'$\', \'\'), \' \', \'\') AS DOUBLE) IS NULL THEN 1 ELSE 0 END) AS "__malformed_Revenue"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "driver" IS NOT NULL\nGROUP BY "driver"\nLIMIT 100;');
  });

  it('trend plan produces ORDER BY time dimension', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Report_Date', 'Shipment'] },
      { type: 'trend', timeDimension: 'Report_Date', measures: ['Shipment'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Report_Date', 'Shipment']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT CAST("report_date" AS TIMESTAMP) AS "Report_Date", CAST(COUNT("shipment") AS INTEGER) AS "Shipment"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "report_date" IS NOT NULL\nGROUP BY CAST("report_date" AS TIMESTAMP)\nORDER BY CAST("report_date" AS TIMESTAMP)\nLIMIT 100;');
  });

  it('trend plan produces SUM when metadata permits', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Report_Date', 'Revenue'] },
      { type: 'trend', timeDimension: 'Report_Date', measures: ['Revenue'], measureAggregations: { 'Revenue': 'SUM' } },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Report_Date', 'Revenue']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT CAST("report_date" AS TIMESTAMP) AS "Report_Date", SUM(TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("revenue", \',\', \'\'), \'.\', \'\'), \'đ\', \'\'), \'VNĐ\', \'\'), \'$\', \'\'), \' \', \'\') AS DOUBLE)) AS "Revenue", SUM(CASE WHEN "revenue" IS NOT NULL AND TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("revenue", \',\', \'\'), \'.\', \'\'), \'đ\', \'\'), \'VNĐ\', \'\'), \'$\', \'\'), \' \', \'\') AS DOUBLE) IS NULL THEN 1 ELSE 0 END) AS "__malformed_Revenue"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "report_date" IS NOT NULL\nGROUP BY CAST("report_date" AS TIMESTAMP)\nORDER BY CAST("report_date" AS TIMESTAMP)\nLIMIT 100;');
  });

  it('distribution plan uses COUNT(*)', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Dimension1'] },
      { type: 'distribution', dimension: 'Dimension1' },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Dimension1']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "dimension1" AS "Dimension1", CAST(COUNT(*) AS INTEGER) AS "row_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "dimension1" IS NOT NULL\nGROUP BY "dimension1"\nLIMIT 100;');
  });

  it('relationship plan includes IS NOT NULL filters', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Measure1', 'Measure2'] },
      { type: 'relationship', measures: ['Measure1', 'Measure2'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Measure1', 'Measure2']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "measure1" AS "Measure1", "measure2" AS "Measure2"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "measure1" IS NOT NULL\n  AND "measure2" IS NOT NULL\nLIMIT 100;');
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
      { type: 'scan', columns: ['Tên Lái Xe', 'Đánh Giá'] },
      { type: 'group_by', dimensions: ['Tên Lái Xe'], measures: ['Đánh Giá'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Tên Lái Xe', 'Đánh Giá']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "tên lái xe" AS "Tên Lái Xe", CAST(COUNT("đánh giá") AS INTEGER) AS "Đánh Giá"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "tên lái xe" IS NOT NULL\nGROUP BY "tên lái xe"\nLIMIT 100;');
  });

  it('unsupported operation blocks', () => {
    // @ts-ignore testing unsupported
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [ { type: 'unsupported' } ] };
    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('blocked');
    expect(sqlPreview.blockedReasons).toContain('Unsupported operation type');
  });

});
