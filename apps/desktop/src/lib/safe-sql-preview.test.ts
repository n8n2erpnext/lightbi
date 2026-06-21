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
    expect(sqlPreview.sql).toContain('SUM(COALESCE(TRY_CAST');
    expect(sqlPreview.sql).toContain('AS "Revenue"');
    expect(sqlPreview.sql).toContain('AS "__malformed_Revenue"');
    expect(sqlPreview.sql).toContain('GROUP BY "driver"');
  });

  it('group_by plan produces AVG when metadata marks indicator measures', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Country Name', 'Business: Internet users (per 100 people)'] },
      {
        type: 'group_by',
        dimensions: ['Country Name'],
        measures: ['Business: Internet users (per 100 people)'],
        measureAggregations: { 'Business: Internet users (per 100 people)': 'AVG' }
      },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Country Name', 'Business: Internet users (per 100 people)']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('AVG(COALESCE(TRY_CAST');
    expect(sqlPreview.sql).toContain('"business: internet users (per 100 people)"');
  });

  it('group_by plan produces positive-rate derived metrics', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['job', 'y'] },
      {
        type: 'group_by',
        dimensions: ['job'],
        measures: [],
        derivedMeasures: [{
          id: 'response_rate',
          label: 'response_rate',
          type: 'positive_rate',
          sourceColumn: 'y',
          positiveValues: ['yes', 'y', 'true', '1'],
          numeratorLabel: 'positive_count',
          denominatorLabel: 'total_count',
        }]
      },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['job', 'y']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('"job" AS "job"');
    expect(sqlPreview.sql).toContain('AS "positive_count"');
    expect(sqlPreview.sql).toContain('AS "total_count"');
    expect(sqlPreview.sql).toContain('AS "response_rate"');
    expect(sqlPreview.sql).toContain('LOWER(TRIM(CAST("y" AS VARCHAR))) IN');
  });

  it('trend plan produces ORDER BY time dimension', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Report_Date', 'Shipment'] },
      { type: 'trend', timeDimension: 'Report_Date', measures: ['Shipment'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Report_Date', 'Shipment']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('DATE \'1899-12-30\'');
    expect(sqlPreview.sql).toContain("STRFTIME(CAST(CASE");
    expect(sqlPreview.sql).toContain('AS "Report_Date"');
    expect(sqlPreview.sql).toContain('CAST(COUNT("shipment") AS INTEGER) AS "Shipment"');
    expect(sqlPreview.sql).toContain('GROUP BY STRFTIME(CAST(CASE WHEN TRY_CAST(CAST("report_date" AS VARCHAR) AS DOUBLE)');
    expect(sqlPreview.sql).toContain('ORDER BY STRFTIME(CAST(CASE WHEN TRY_CAST(CAST("report_date" AS VARCHAR) AS DOUBLE)');
  });

  it('trend plan produces SUM when metadata permits', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Report_Date', 'Revenue'] },
      { type: 'trend', timeDimension: 'Report_Date', measures: ['Revenue'], measureAggregations: { 'Revenue': 'SUM' } },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Report_Date', 'Revenue']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('DATE \'1899-12-30\'');
    expect(sqlPreview.sql).toContain('AS "Report_Date"');
    expect(sqlPreview.sql).toContain('SUM(COALESCE(TRY_CAST');
    expect(sqlPreview.sql).toContain('AS "Revenue"');
  });

  it('trend plan handles Vietnamese Excel date headers', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Ngày xuất', 'Tổng tiền'] },
      { type: 'trend', timeDimension: 'Ngày xuất', measures: ['Tổng tiền'], measureAggregations: { 'Tổng tiền': 'SUM' } },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Ngày xuất', 'Tổng tiền']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('DATE \'1899-12-30\'');
    expect(sqlPreview.sql).toContain("STRFTIME(CAST(CASE");
    expect(sqlPreview.sql).toContain('"ngày xuất"');
    expect(sqlPreview.sql).toContain('AS "Ngày xuất"');
    expect(sqlPreview.sql).toContain('AS "Tổng tiền"');
  });

  it('trend plan handles month period labels without timestamp casting', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['month', 'duration'] },
      { type: 'trend', timeDimension: 'month', measures: ['duration'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['month', 'duration']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('TRIM(CAST("month" AS VARCHAR)) AS "month"');
    expect(sqlPreview.sql).toContain('CAST(COUNT("duration") AS INTEGER) AS "duration"');
    expect(sqlPreview.sql).toContain("WHEN 'may' THEN 5");
    expect(sqlPreview.sql).not.toContain("DATE '1899-12-30'");
    expect(sqlPreview.sql).not.toContain('TRY_CAST(CAST("month" AS VARCHAR) AS TIMESTAMP)');
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

  it('hidden malformed alias is safely quoted with complex characters', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Tên Lái Xe', 'Giá "Gốc"'] },
      { type: 'group_by', dimensions: ['Tên Lái Xe'], measures: ['Giá "Gốc"'], measureAggregations: { 'Giá "Gốc"': 'SUM' } },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Tên Lái Xe', 'Giá "Gốc"']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toContain('SUM(COALESCE(TRY_CAST');
    expect(sqlPreview.sql).toContain('"giá ""gốc"""');
    expect(sqlPreview.sql).toContain('AS "Giá ""Gốc"""');
    expect(sqlPreview.sql).toContain('AS "__malformed_Giá ""Gốc"""');
  });

  it('unsupported operation blocks', () => {
    // @ts-ignore testing unsupported
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [ { type: 'unsupported' } ] };
    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('blocked');
    expect(sqlPreview.blockedReasons).toContain('Unsupported operation type');
  });

  it('table_preview produces SELECT *', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: [] },
      { type: 'table_preview' },
      { type: 'limit', rows: 100 }
    ], requiredColumns: []};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 100;');
  });

  it('virtual measure counts map to COUNT(*)', () => {
    const plan: RuntimePlanPreview = { ...basePlan, logicalOperations: [
      { type: 'scan', columns: ['Driver'] },
      { type: 'group_by', dimensions: ['Driver'], measures: ['record_count'] },
      { type: 'limit', rows: 100 }
    ], requiredColumns: ['Driver']};

    const sqlPreview = createSafeSqlPreview(plan);
    expect(sqlPreview.status).toBe('ready');
    expect(sqlPreview.sql).toBe('SELECT "driver" AS "Driver", CAST(COUNT(*) AS INTEGER) AS "record_count"\nFROM __LIGHTBI_PREVIEW_TABLE__\nWHERE "driver" IS NOT NULL\nGROUP BY "driver"\nLIMIT 100;');
  });

});
