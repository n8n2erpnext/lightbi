import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as localExecutor from "../local-duckdb-executor";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { createGovernedLocalDuckDBBoundary } from "./governed-local-duckdb-boundary";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import type { GovernedDuckDBBoundaryV1, GovernedMetricExecutionRequestV1 } from "./governed-runtime-contracts";
import { createGovernedRuntimeFixture, RUNTIME_FIXTURES } from "./governed-runtime-test-support";

const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function quoteIdent(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalize(nested)]));
  return value;
}

async function actualDuckDBBoundary(): Promise<GovernedDuckDBBoundaryV1> {
  process.env.HOME = "/tmp";
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan, rows) {
      const conn = db.connect();
      try {
        conn.query("DROP TABLE IF EXISTS __LIGHTBI_PREVIEW_TABLE__");
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
        conn.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdent(column)} ${types[index]}`).join(", ")})`);
        for (const row of rows) conn.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES (${columns.map((column) => literal(row[column])).join(", ")})`);
        let parameterIndex = 0;
        const sql = plan.sql.replace(/\?/g, () => literal(plan.parameters[parameterIndex++]));
        const table = conn.query(sql);
        const outputRows = table.toArray().map((row: any) => normalize(row.toJSON()) as Record<string, unknown>);
        return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: outputRows, error: null, executionScope: "controlled_rows" };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "controlled_rows" };
      } finally { conn.close(); }
    },
  };
}

describe("Phase 5M3 verified local DuckDB execution", () => {
  it("executes all governed metric forms and compares verified answers", async () => {
    const boundary = await actualDuckDBBoundary();
    const cases = [
      [RUNTIME_FIXTURES.revenue(), 175], [RUNTIME_FIXTURES.quantity(), 5], [RUNTIME_FIXTURES.transaction(), 2],
      [RUNTIME_FIXTURES.inventory(), 30], [RUNTIME_FIXTURES.delivery(), 2], [RUNTIME_FIXTURES.sourceRecords(), 3], [RUNTIME_FIXTURES.profit(), 100],
    ] as const;
    for (const [fixture, expected] of cases) {
      const preflight = preflightGovernedRuntimeAction(fixture.runtimeInput);
      const planned = planGovernedMetricQuery(preflight);
      expect(planned.state, fixture.id).toBe("planned");
      if (planned.state !== "planned") continue;
      const request: GovernedMetricExecutionRequestV1 = { schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: `request:${fixture.id}`, plan: planned.plan, rows: fixture.rows, groundTruth: { state: "verified", value: expected, tolerance: 0, provenance: "controlled_fixture" } };
      const first = await executeGovernedMetricRequest(request, boundary);
      const second = await executeGovernedMetricRequest(request, boundary);
      expect(first.status, `${fixture.id}:${first.error ?? "no-error"}\n${planned.plan.sql}`).toBe("executed");
      expect(first.executionPerformed, fixture.id).toBe(true);
      expect(first.groundTruthComparison.state, fixture.id).toBe("exact_match");
      expect(first.resultId, fixture.id).toBe(second.resultId);
      expect(first.decisionUseAuthorized).toBe(false);
      expect(first.productionWiring.executed).toBe(false);
      expect(first.restrictions.map((item) => item.code)).toContain("DECISION_USE_PROHIBITED");
      if (fixture.metricId === "source_record_count") {
        expect(first.restrictions.map((item) => item.code)).toContain("SOURCE_RECORDS_ARE_NOT_BUSINESS_ENTITIES");
        expect(planned.plan.sql).toContain("COUNT(*)");
        expect(planned.plan.sql).not.toContain("DISTINCT");
      }
      expect(first.evidence.some((item) => item.kind === "duckdb_execution")).toBe(true);
    }
  }, 30000);

  it("fails closed on an altered plan and on DuckDB failure", async () => {
    const fixture = RUNTIME_FIXTURES.revenue();
    const planned = planGovernedMetricQuery(preflightGovernedRuntimeAction(fixture.runtimeInput));
    expect(planned.state).toBe("planned");
    if (planned.state !== "planned") return;
    const request: GovernedMetricExecutionRequestV1 = { schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: "request:invalid", plan: structuredClone(planned.plan), rows: fixture.rows, groundTruth: { state: "unavailable", value: null, tolerance: null, provenance: "none" } };
    request.plan.sql = request.plan.sql.replace("SUM", "AVG");
    const never: GovernedDuckDBBoundaryV1 = { execute: async () => { throw new Error("must not execute"); } };
    const blocked = await executeGovernedMetricRequest(request, never);
    expect(blocked.status).toBe("blocked");
    expect(blocked.executionPerformed).toBe(false);

    const validRequest = { ...request, plan: planned.plan };
    const failed = await executeGovernedMetricRequest(validRequest, { execute: async () => ({ engine: "duckdb", status: "failed", columns: [], rows: [], error: "controlled failure", executionScope: "controlled_rows" }) });
    expect(failed.status).toBe("failed");
    expect(failed.executionPerformed).toBe(false);
    expect(failed.decisionUseAuthorized).toBe(false);
  });

  it("compares grouped display results against the complete governed source scope", async () => {
    const boundary = await actualDuckDBBoundary();
    const rows = Array.from({ length: 150 }, (_, index) => ({
      OrderID: `O-${index + 1}`,
      OrderDate: `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
      Revenue: index + 1,
      Currency: "USD",
    }));
    const fixture = createGovernedRuntimeFixture({
      id: "phase7r3-full-scope-grouped-revenue",
      metricId: "sales_revenue",
      questionId: "commerce.sales_revenue.over_time",
      columns: [
        { physical: "OrderID", semantic: "order" },
        { physical: "OrderDate", semantic: "report_date" },
        { physical: "Revenue", semantic: "revenue", type: "number" },
        { physical: "Currency", semantic: "currency" },
      ],
      rows,
      currencyCompatible: true,
    });
    const planned = planGovernedMetricQuery(preflightGovernedRuntimeAction(fixture.runtimeInput));
    expect(planned.state).toBe("planned");
    if (planned.state !== "planned") return;

    const expected = rows.reduce((total, row) => total + row.Revenue, 0);
    const result = await executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1",
      requestId: "request:phase7r3-full-scope-grouped-revenue",
      plan: planned.plan,
      rows,
      groundTruth: { state: "verified", value: expected, tolerance: 0, provenance: "controlled_full_scope_fixture" },
    }, boundary);

    expect(result.rowCount, `${result.error ?? "no-error"}\n${planned.plan.sql}`).toBe(100);
    expect(result.groundTruthComparison).toEqual({ state: "exact_match", expected, actual: expected, tolerance: 0 });
    expect(result.columns).not.toContain("__lightbi_full_scope_metric_total__");
    expect(result.rows.every((row) => !("__lightbi_full_scope_metric_total__" in row))).toBe(true);
    expect(result.decisionUseAuthorized).toBe(false);
  });

  it("keeps full-scope governed identity counts distinct across display groups", async () => {
    const boundary = await actualDuckDBBoundary();
    const fixture = createGovernedRuntimeFixture({
      id: "phase7r3-full-scope-delivery-identity",
      metricId: "delivery_count",
      questionId: "commerce.delivery_count.by_status",
      columns: [
        { physical: "ShipmentID", semantic: "shipment" },
        { physical: "DeliveryStatus", semantic: "delivery_status" },
      ],
      rows: [
        { ShipmentID: "S-1", DeliveryStatus: "In transit" },
        { ShipmentID: "S-1", DeliveryStatus: "Delivered" },
        { ShipmentID: "S-2", DeliveryStatus: "Delivered" },
      ],
      identityIds: ["shipment"],
    });
    const planned = planGovernedMetricQuery(preflightGovernedRuntimeAction(fixture.runtimeInput));
    expect(planned.state).toBe("planned");
    if (planned.state !== "planned") return;

    const result = await executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1",
      requestId: "request:phase7r3-full-scope-delivery-identity",
      plan: planned.plan,
      rows: fixture.rows,
      groundTruth: { state: "verified", value: 2, tolerance: 0, provenance: "controlled_full_scope_fixture" },
    }, boundary);

    expect(result.rows.map((row) => row.delivery_count).reduce<number>((total, value) => total + Number(value), 0)).toBe(3);
    expect(result.groundTruthComparison).toEqual({ state: "exact_match", expected: 2, actual: 2, tolerance: 0 });
    expect(result.decisionUseAuthorized).toBe(false);
  });

  it("adapts a governed plan to the existing local DuckDB execution boundary", async () => {
    const fixture = RUNTIME_FIXTURES.revenue();
    const planned = planGovernedMetricQuery(preflightGovernedRuntimeAction(fixture.runtimeInput));
    expect(planned.state).toBe("planned");
    if (planned.state !== "planned") return;
    const spy = vi.spyOn(localExecutor, "executeLocalDuckDB").mockResolvedValue({
      id: "local", sourceSqlPreviewId: "sql", status: "executed", columns: ["report_date", "sales_revenue"], rows: [{ report_date: "2026-01-01", sales_revenue: 100 }], rowCount: 1,
      maxRows: 100, warnings: [], blockedReasons: [], executionScope: "retained_rows", source: "local_duckdb_preview",
    } as any);
    const output = await createGovernedLocalDuckDBBoundary().execute(planned.plan, fixture.rows);
    expect(output.status).toBe("executed");
    expect(spy).toHaveBeenCalledOnce();
    const call = spy.mock.calls[0][0];
    expect(call.safeSqlPreview.sql).toBe(planned.plan.sql);
    expect(call.runtimePlan.requiredColumns).toEqual(expect.arrayContaining(["Revenue", "OrderDate"]));
    expect(JSON.stringify(call)).not.toContain("isSafeForSum");
    vi.restoreAllMocks();
  });
});
