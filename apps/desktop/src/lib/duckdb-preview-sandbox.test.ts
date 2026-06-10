import { describe, it, expect } from 'vitest';
import { executeDuckDBPreviewSandbox } from './duckdb-preview-sandbox';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('DuckDB Preview Sandbox', () => {

  const dummyPlan: RuntimePlanPreview = {
    id: 'test_plan',
    sourceIntentId: 'intent_1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [],
    expectedOutput: { shape: 'table', dimensions: [], measures: [] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  it('1. blocked runtimePlan blocks execution', async () => {
    const blockedPlan = { ...dummyPlan, status: "blocked" as const, blockedReasons: ["Test block"] };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: blockedPlan,
      rows: []
    });
    expect(result.status).toBe('blocked');
    expect(result.blockedReasons).toContain('Test block');
  });

  it('2. empty rows executes empty with warning', async () => {
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: dummyPlan,
      rows: []
    });
    expect(result.status).toBe('executed');
    expect(result.warnings).toContain('No dataset rows available for preview.');
    expect(result.rows).toHaveLength(0);
  });

  it('3. group_by count correct', async () => {
    const rows = [
      { route: "A", shipment: "S1" },
      { route: "A", shipment: "S2" },
      { route: "B", shipment: "S3" }
    ];
    const groupPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'bar_chart', dimensions: ['route'], measures: ['shipment'] },
      logicalOperations: [
        { type: "group_by", dimensions: ["route"], measures: ["shipment"] }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: groupPlan,
      rows
    });
    expect(result.status).toBe('executed');
    expect(result.rows).toHaveLength(2);
    expect(result.rows).toContainEqual({ route: "A", shipment_count: 2 });
    expect(result.rows).toContainEqual({ route: "B", shipment_count: 1 });
  });

  it('4. trend count correct', async () => {
    const rows = [
      { report_date: "2024-12-23", shipment: "S1" },
      { report_date: "2024-12-23", shipment: "S2" },
      { report_date: "2024-12-24", shipment: "S3" }
    ];
    const trendPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'line_chart', dimensions: ['report_date'], measures: ['shipment'] },
      logicalOperations: [
        { type: "trend", timeDimension: "report_date", measures: ["shipment"] }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: trendPlan,
      rows
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].report_date).toBe("2024-12-23");
    expect(result.rows[0].shipment_count).toBe(2);
    expect(result.rows[1].report_date).toBe("2024-12-24");
    expect(result.rows[1].shipment_count).toBe(1);
  });

  it('5. distribution count correct', async () => {
    const rows = [
      { stock_status: "Normal" },
      { stock_status: "Normal" },
      { stock_status: "Aged" }
    ];
    const distPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'bar_chart', dimensions: ['stock_status'], measures: ['record_count'] },
      logicalOperations: [
        { type: "distribution", dimension: "stock_status" }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: distPlan,
      rows
    });
    expect(result.rows).toHaveLength(2);
    const normal = result.rows.find(r => r.stock_status === "Normal");
    const aged = result.rows.find(r => r.stock_status === "Aged");
    
    // the mock executor renames row_count to record_count_count if record_count is the expected measure
    expect(normal).toBeDefined();
    if (normal?.row_count !== undefined) expect(normal?.row_count).toBe(2);
    else expect(normal?.record_count_count).toBe(2);

    expect(aged).toBeDefined();
    if (aged?.row_count !== undefined) expect(aged?.row_count).toBe(1);
    else expect(aged?.record_count_count).toBe(1);
  });

  it('6. relationship filters non-null pairs', async () => {
    const rows = [
      { cost: 100, revenue: 150 },
      { cost: null, revenue: 100 },
      { cost: 200, revenue: undefined },
      { cost: 50, revenue: 75 }
    ];
    const relPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'scatter_plot', dimensions: [], measures: ['cost', 'revenue'] },
      logicalOperations: [
        { type: "relationship", measures: ["cost", "revenue"] }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: relPlan,
      rows
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows).toContainEqual({ cost: 100, revenue: 150 });
    expect(result.rows).toContainEqual({ cost: 50, revenue: 75 });
  });

  it('7. max 100 rows enforced', async () => {
    const rows = Array.from({ length: 150 }).map((_, i) => ({ id: i }));
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: dummyPlan, // default dummy plan has no ops, just passes rows
      rows
    });
    expect(result.rows).toHaveLength(100);
  });

  it('8. input rows not mutated', async () => {
    const rows = [{ a: 1, b: 2 }];
    const rowsCopy = JSON.parse(JSON.stringify(rows));
    
    await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: {
        ...dummyPlan,
        logicalOperations: [{ type: "limit", rows: 1 }]
      },
      rows
    });

    expect(rows).toEqual(rowsCopy);
  });

  it('9. safeSqlPreview.sql nonsense does not affect result', async () => {
    const rows = [{ route: "A", shipment: "S1" }];
    const groupPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'bar_chart', dimensions: ['route'], measures: ['shipment'] },
      logicalOperations: [
        { type: "group_by", dimensions: ["route"], measures: ["shipment"] }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: groupPlan,
      rows,
      safeSqlPreview: {
        id: "sql1",
        sourcePlanId: "plan1",
        status: "ready",
        dialect: "duckdb",
        sql: "DROP TABLE users; SELECT * FROM nonsense", // complete nonsense
        parameters: {},
        referencedColumns: [],
        warnings: [],
        blockedReasons: [],
        source: "runtime_plan_preview"
      }
    });
    // Should still execute correctly based on RuntimePlan
    expect(result.status).toBe('executed');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].shipment_count).toBe(1);
  });

  it('10. count semantics correct', async () => {
    const rows = [
      { route: "A", shipment: "S1" },
      { route: "A", shipment: null },
      { route: "A", shipment: undefined }
    ];
    const groupPlan: RuntimePlanPreview = {
      ...dummyPlan,
      expectedOutput: { shape: 'bar_chart', dimensions: ['route'], measures: ['shipment'] },
      logicalOperations: [
        { type: "group_by", dimensions: ["route"], measures: ["shipment"] }
      ]
    };
    const result = await executeDuckDBPreviewSandbox({
      runtimeIntent: {} as any,
      runtimePlan: groupPlan,
      rows
    });
    // non-null count should be 1
    expect(result.rows[0].shipment_count).toBe(1);
  });

});
