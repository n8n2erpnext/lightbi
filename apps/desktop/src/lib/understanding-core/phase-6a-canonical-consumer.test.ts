import fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { generateCanonicalAIBriefing } from "../canonical-ai-briefing";
import { projectCanonicalArtifactToUnderstandingNext } from "../canonical-consumer-presentation-adapter";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import {
  canonicalConsumerCacheStats,
  getOrBuildCanonicalConsumerArtifact,
  prepareCanonicalInvestigationHandoff,
  resetCanonicalConsumerCacheForTests,
  type CanonicalDatasetStateInputV1,
} from "./canonical-consumer-boundary";

const ROOT = path.resolve(__dirname, "../../../../..");
const SALES_PATH = path.join(ROOT, "sample data/Sales_ERP_May_2026.xlsx");
const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function quoteIdentifier(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function sqlLiteral(value: unknown): string {
  if (value == null || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(normalizeDuckDBValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalizeDuckDBValue(nested)]));
  return value;
}
async function nodeDuckDBBoundary(): Promise<GovernedDuckDBBoundaryV1> {
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan, rows) {
      const connection = db.connect();
      try {
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
        connection.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdentifier(column)} ${types[index]}`).join(", ")})`);
        for (let offset = 0; offset < rows.length; offset += 250) {
          connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.slice(offset, offset + 250).map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(", ")})`).join(", ")}`);
        }
        let parameterIndex = 0;
        const table = connection.query(plan.sql.replace(/\?/g, () => sqlLiteral(plan.parameters[parameterIndex++])));
        return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => normalizeDuckDBValue(row.toJSON()) as Record<string, unknown>), error: null, executionScope: "full_file" };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file" };
      } finally { connection.close(); }
    },
  };
}

function goldenInput(): CanonicalDatasetStateInputV1 {
  const workbook = XLSX.readFile(SALES_PATH, { raw: true });
  const sheetName = workbook.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true, blankrows: false });
  const columns = matrix[0].map(String);
  const rows = matrix.slice(1).map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
  return { datasetId: "phase6a:golden-sales", sourceKind: "local_file", sourceLabel: path.basename(SALES_PATH), path: SALES_PATH, sheet: sheetName, columns, rows, sourceRowCount: rows.length };
}

describe("Phase 6A canonical artifact consumer cutover", () => {
  it("builds once, projects Home, hands the same identity to Investigation, and executes golden revenue", async () => {
    resetCanonicalConsumerCacheForTests();
    const input = goldenInput();
    const first = getOrBuildCanonicalConsumerArtifact(input);
    const second = getOrBuildCanonicalConsumerArtifact(input);
    expect(first).toBe(second);
    expect(canonicalConsumerCacheStats()).toEqual({ buildCount: 1, datasetStateCount: 1 });
    expect(first.status).toBe("valid");
    if (first.status !== "valid") throw new Error(first.blockers.join(","));
    expect(first.provenance.legacyDetectorInvoked).toBe(false);

    const home = projectCanonicalArtifactToUnderstandingNext(first);
    expect(home.recommendedQuestions.length).toBeGreaterThan(0);
    expect(home.quality.blockedReasons).toEqual(first.blockers);
    const revenueAction = first.questionGeneration.actionCandidates.find((item) => item.questionId === "commerce.sales_revenue.by_product");
    expect(revenueAction).toBeDefined();
    const handoff = prepareCanonicalInvestigationHandoff(first, revenueAction!.actionCandidateId);
    expect(handoff.artifactIdentity).toBe(first.identity);
    expect(handoff.datasetStateIdentity).toBe(first.datasetStateIdentity);
    expect(handoff.runtimePreflight.state).toBe("conditionally_executable");
    expect(handoff.queryPlanning.state).toBe("planned");
    if (handoff.queryPlanning.state !== "planned") throw new Error(handoff.queryPlanning.blockers.join(","));

    const result = await executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1",
      requestId: "phase6a:golden-revenue",
      plan: handoff.queryPlanning.plan,
      rows: input.rows,
      groundTruth: { state: "verified", value: 22_973_896_244, tolerance: 0, provenance: "rev.sales_erp_may_2026" },
    }, await nodeDuckDBBoundary());
    expect(result.status, result.error ?? result.limitations.join(",")).toBe("executed");
    expect(result).toMatchObject({ executionPerformed: true, decisionUseAuthorized: false, groundTruthComparison: { state: "exact_match", expected: 22_973_896_244, actual: 22_973_896_244 } });
    expect(result.restrictions.length).toBeGreaterThan(0);
    expect(result.evidence.some((item) => item.kind === "duckdb_execution")).toBe(true);
  }, 60_000);

  it("fails all required consumer-integrity negative probes closed", () => {
    resetCanonicalConsumerCacheForTests();
    const input = goldenInput();
    const artifact = getOrBuildCanonicalConsumerArtifact(input);
    expect(artifact.status).toBe("valid");
    if (artifact.status !== "valid") throw new Error(artifact.blockers.join(","));

    // 1. A source change produces a different artifact identity; stale reuse is impossible.
    const changed = getOrBuildCanonicalConsumerArtifact({ ...input, rows: input.rows.map((row, index) => index === 0 ? { ...row, Product: "changed-source" } : row) });
    expect(changed.identity).not.toBe(artifact.identity);
    expect(changed.datasetStateIdentity).not.toBe(artifact.datasetStateIdentity);

    // 2. The selected Home path has no independent legacy/next understanding invocation.
    const homeSource = fs.readFileSync(path.join(ROOT, "apps/desktop/src/pages/Home.tsx"), "utf8");
    for (const forbidden of ["runGuidedInvestigationPipeline(", "createDatasetUnderstanding(", "createUnderstandingCoreResult(", "adaptCoreToUnderstandingNext(", "generateAIBriefingFromUnderstandingNext("]) expect(homeSource).not.toContain(forbidden);

    // 3. A blocked or unknown action cannot be sent to planning.
    const blocked = prepareCanonicalInvestigationHandoff(artifact, "not-a-governed-action");
    expect(blocked.runtimePreflight.executionAllowed).toBe(false);
    expect(blocked.queryPlanning.state).toBe("blocked");

    const action = artifact.questionGeneration.actionCandidates.find((item) => item.questionId === "commerce.sales_revenue.by_product")!;
    const handoff = prepareCanonicalInvestigationHandoff(artifact, action.actionCandidateId);
    expect(handoff.queryPlanning.state).toBe("planned");
    if (handoff.queryPlanning.state !== "planned" || !handoff.runtimePreflight.action) throw new Error("expected governed plan");

    // 4/5. Consumer operator mutation cannot create a silent SUM/COUNT fallback.
    const mutatedRuntime = { ...handoff.runtimePreflight, action: { ...handoff.runtimePreflight.action, operator: "governed_identity_count" as const } };
    expect(planGovernedMetricQuery(mutatedRuntime)).toMatchObject({ state: "blocked", blockers: ["runtime_preflight_identity_mismatch"] });

    // 6. Invalid/incomplete canonical inputs advertise no question or action.
    const invalid = getOrBuildCanonicalConsumerArtifact({ ...input, datasetId: "invalid-partial", rows: input.rows.slice(0, 10) });
    expect(invalid.status).toBe("invalid");
    expect(projectCanonicalArtifactToUnderstandingNext(invalid).availableActions).toEqual([]);

    // 7. Covered by the changed-source identity assertion above.
    expect(changed.sourceFingerprint).not.toBe(artifact.sourceFingerprint);

    // 8. AI receives a bounded briefing, not formula or execution authority.
    const briefing = generateCanonicalAIBriefing(artifact);
    const briefingJson = JSON.stringify(briefing);
    expect(briefingJson).not.toContain("aggregationOperator");
    expect(briefingJson).not.toContain("runtimeActionAuthorized");
    expect(briefingJson).not.toContain("rawRows");

    // 9. Restrictions remain attached to both runtime preflight and query plan.
    expect(handoff.runtimePreflight.restrictions.length).toBeGreaterThan(0);
    expect(handoff.queryPlanning.plan.restrictions).toEqual(handoff.runtimePreflight.restrictions);

    // 10. Re-requesting an unchanged state is a cache hit, not a duplicate build.
    const before = canonicalConsumerCacheStats();
    expect(getOrBuildCanonicalConsumerArtifact(input)).toBe(artifact);
    expect(canonicalConsumerCacheStats()).toEqual(before);
  }, 60_000);
});
