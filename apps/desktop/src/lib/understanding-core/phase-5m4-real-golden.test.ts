import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import type { GovernedDuckDBBoundaryV1, GovernedMetricExecutionRequestV1 } from "./governed-runtime-contracts";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

const ROOT = path.resolve(__dirname, "../../../../..");
const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function quoteIdent(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function literal(value: unknown): string {
  if (value === null || value === undefined || value === "") return "NULL";
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
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
        conn.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdent(column)} ${types[index]}`).join(", ")})`);
        for (let offset = 0; offset < rows.length; offset += 250) {
          const values = rows.slice(offset, offset + 250).map((row) => `(${columns.map((column) => literal(row[column])).join(", ")})`).join(", ");
          conn.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${values}`);
        }
        let parameterIndex = 0;
        const sql = plan.sql.replace(/\?/g, () => literal(plan.parameters[parameterIndex++]));
        const table = conn.query(sql);
        return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => normalize(row.toJSON()) as Record<string, unknown>), error: null, executionScope: "full_file" };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file" };
      } finally { conn.close(); }
    },
  };
}

describe("Phase 5M4 real golden revenue acceptance closure", () => {
  it("executes the complete canonical governed path and matches verified revenue exactly", async () => {
    const truthDocument = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/ground-truth/revenue-sales.json"), "utf8"));
    const truth = truthDocument.samples.find((item: any) => item.id === "rev.sales_erp_may_2026");
    expect(truth).toBeDefined();
    const source = truth.sources[0];
    const file = path.join(ROOT, source.path);
    const bytes = fs.readFileSync(file);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
    const workbook = XLSX.readFile(file, { raw: true });
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[source.sheet], { header: 1, defval: "", raw: true, blankrows: true });
    const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: `${source.path}#${source.sheet}`, kind: "local_file", label: path.basename(source.path), path: source.path, sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows });
    expect(physical.sourceProfile.dataRegion.rowCount).toBe(truth.profilingExpectations.verifiedRowCount);
    expect(physical.sourceProfile.header.selectedHeaderRowIndex).toBe(truth.profilingExpectations.sourceProfiles[0].headerPosition.zeroBasedRowIndex);

    const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
    const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
    for (const expected of truth.recognition.requiredMappings) {
      const resolution = semantic.columns.find((column) => column.physicalColumn === expected.physicalColumn);
      expect(resolution?.selectedCandidateId, expected.physicalColumn).toBe(expected.canonicalSignal);
      expect(expected.allowedFinalStates, expected.physicalColumn).toContain(resolution?.finalState);
    }
    const grainCandidates = generateGrainCandidateArtifact(physical, semantic, rawRows);
    const grain = resolveGrainSignatureShadow(grainCandidates, { sourceId: grainCandidates.sourceId, sourceHash: grainCandidates.sourceHash });
    expect(grain.signature.structuralForm).toMatchObject({ value: "document", state: "confirmed" });
    expect(grain.signature.temporalMode).toMatchObject({ value: "event", state: "probable" });
    expect(grain.signature.aggregationForm).toMatchObject({ value: "atomic_rows", state: "probable" });
    expect(grain.signature.measureSafety.safeToAggregate).toBe(false);

    const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
    const canonicalSource = { physical, semantic, grain, readiness };
    const evaluationContext = { group: "golden", tuningUse: "allowed" } as const;
    const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext });
    expect(activation.state).toBe("conditional");
    const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], metricIds: ["sales_revenue"], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
    expect(metricPreflight.metrics[0]).toMatchObject({ metricId: "sales_revenue", state: "conditionally_ready", blockers: [], runtimeActionAuthorized: false });
    expect(metricPreflight.metricResultsProduced).toBe(false);

    const generation = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
    expect(generation.defaultQuestions.length).toBeLessThanOrEqual(5);
    const action = generation.actionCandidates.find((item) => item.questionId === "commerce.sales_revenue.by_product") ?? null;
    expect(action).not.toBeNull();
    expect(action?.actionCandidateState).toBe("conditional");
    expect(action?.metricPreflightState).toBe("conditionally_ready");
    const runtime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource, metricPreflight, questionGeneration: generation, actionCandidate: action, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
    expect(runtime).toMatchObject({ state: "conditionally_executable", planningAllowed: true, executionAllowed: true, decisionUseAuthorized: false, productionWiring: { executed: false } });
    expect(runtime.action?.operator).toBe("governed_sum");
    const planned = planGovernedMetricQuery(runtime);
    expect(planned.state).toBe("planned");
    if (planned.state !== "planned") throw new Error(`REAL_GOLDEN_PLAN_BLOCKED:${planned.blockers.join(",")}`);
    expect(planned.plan.sql).toContain("SUM(CAST");
    expect(planned.plan.metricId).toBe("sales_revenue");
    expect(planned.plan.decisionUseAuthorized).toBe(false);
    expect(planned.plan.productionWiring.executed).toBe(false);

    const headerIndex = physical.sourceProfile.header.selectedHeaderRowIndex;
    if (headerIndex === null) throw new Error("REAL_GOLDEN_HEADER_UNRESOLVED");
    const headers = physical.sourceProfile.header.physicalColumnNames;
    const rows = rawRows.slice(headerIndex + 1).filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
    expect(rows).toHaveLength(truth.profilingExpectations.verifiedRowCount);
    const request: GovernedMetricExecutionRequestV1 = { schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: "phase5m4:real-golden:revenue", plan: planned.plan, rows, groundTruth: { state: "verified", value: truth.verifiedMetricAnswers.revenue_sum, tolerance: 0, provenance: `${truth.id}:verifiedMetricAnswers.revenue_sum` } };
    const result = await executeGovernedMetricRequest(request, await actualDuckDBBoundary());
    expect(result).toMatchObject({ status: "executed", metricId: "sales_revenue", operator: "governed_sum", executionPerformed: true, decisionUseAuthorized: false, productionWiring: { executed: false }, groundTruthComparison: { state: "exact_match", expected: 22973896244, actual: 22973896244, tolerance: 0 } });
    expect(result.sourceReference).toBe(planned.plan.sourceReference);
    expect(result.dimensions).toContain("product");
    expect(result.evidence.map((item) => item.kind)).toEqual(expect.arrayContaining(["metric_definition", "metric_preflight", "canonical_binding", "grain", "duckdb_execution"]));
    expect(result.restrictions.map((item) => item.code)).toContain("DECISION_USE_PROHIBITED");
  }, 60000);
});
