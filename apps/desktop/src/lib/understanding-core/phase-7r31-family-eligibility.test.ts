import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import type { CanonicalMetricSourceV1 } from "./governed-domain-metric-contracts";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type SampleTruth = {
  id: string;
  group: Group;
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: SourceTruth[];
  verifiedMetricAnswers: Record<string, number>;
};

const ROOT = path.resolve(__dirname, "../../../../..");
const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8")) as {
  groundTruthFiles: Array<{ path: string }>;
};
const samples = manifest.groundTruthFiles.flatMap((entry) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: SampleTruth[] }).samples,
);
const applicable = new Set([
  "inv.plu_product_master",
  "inv.provincial_aging_20241228",
  "inv.hublan_expected_stock",
  "inv.logistics_may_item_flow",
  "inv.logistics_june_item_flow",
  "ops.ttkt_20241219",
  "ops.ttkt_20241223",
  "ops.ttkt_20241224",
  "ops.logistics_may_2026",
  "ops.logistics_june_2026",
  "fin.accounting_may_2026",
  "fin.accounting_june_2026",
  "fin.bhx_tender_reconciliation",
  "fin.superstore_profit",
  "fin.sales_june_missing_cost",
]);

function quoteIdentifier(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined || value === "") return "NULL";
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
  process.env.HOME = "/tmp";
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan, rows) {
      const connection = db.connect();
      try {
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
        connection.query(`CREATE OR REPLACE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdentifier(column)} ${types[index]}`).join(", ")})`);
        for (let offset = 0; offset < rows.length; offset += 250) connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.slice(offset, offset + 250).map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(", ")})`).join(", ")}`);
        let parameterIndex = 0;
        const table = connection.query(plan.sql.replace(/\?/g, () => sqlLiteral(plan.parameters[parameterIndex++])));
        return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => normalizeDuckDBValue(row.toJSON()) as Record<string, unknown>), error: null, executionScope: "full_file" };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file" };
      } finally { connection.close(); }
    },
  };
}

function rowsFromRegion(rawRows: unknown[][], source: CanonicalMetricSourceV1): Record<string, unknown>[] {
  const first = source.physical.sourceProfile.dataRegion.firstSourceRowIndex;
  const last = source.physical.sourceProfile.dataRegion.lastSourceRowIndex;
  const columns = source.physical.sourceProfile.header.physicalColumnNames;
  if (first === null || last === null || columns.length === 0) return [];
  return rawRows.slice(first, last + 1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
}

function load(source: SourceTruth) {
  const file = path.join(ROOT, source.path);
  const bytes = fs.readFileSync(file);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  expect(sheet).toBeTruthy();
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  const sourceId = `${source.path}#${source.sheet}`;
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId, kind: "local_file", label: path.basename(source.path), path: source.path, sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } },
    rawRows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rawRows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const canonicalSource: CanonicalMetricSourceV1 = { physical, semantic, grain, readiness };
  const preflight = preflightGovernedMetrics({
    schemaVersion: "lightbi.governed-metric-preflight-input.v1",
    sources: [canonicalSource],
    evaluationContext: { group: "synthetic", tuningUse: "forbidden" },
    expectedPolicyHash: governedMetricPolicyHash(),
  });
  return { canonicalSource, grainCandidate, preflight, rows: rowsFromRegion(rawRows, canonicalSource) };
}

describe.sequential("Phase 7R3.1 required-family eligibility", () => {
  it("preserves source-by-source family blocker evidence", () => {
    const records = samples.filter((sample) => applicable.has(sample.id)).flatMap((sample) =>
      sample.sources.map((source) => {
        const loaded = load(source);
        const evaluationContext = { group: sample.group, tuningUse: sample.provenance.tuningUse } as const;
        const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [loaded.canonicalSource], evaluationContext });
        const preflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [loaded.canonicalSource], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
        const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource: loaded.canonicalSource, domainActivation: activation, metricPreflight: preflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
        return {
          sampleId: sample.id,
          group: sample.group,
          source: { path: source.path, sheet: source.sheet, sha256: source.sha256 },
          verifiedMetricAnswers: sample.verifiedMetricAnswers,
          columns: loaded.canonicalSource.physical.sourceProfile.columns.map((column) => ({
            index: column.sourceColumnIndex,
            physicalColumn: column.physicalColumnName,
            nonNullCount: column.nonNullCount,
            nullCount: column.nullCount,
            distinctCount: column.cardinality.distinctCount,
            cardinalityMode: column.cardinality.mode,
            uniquenessRatio: column.uniqueness.uniquenessRatio,
          })),
          semantics: loaded.canonicalSource.semantic.columns.map((column) => ({
            index: column.sourceColumnIndex,
            physicalColumn: column.physicalColumn,
            finalState: column.finalState,
            selectedCandidateId: column.selectedCandidateId,
          })),
          identityCandidates: loaded.grainCandidate.rowIdentityCandidates,
          parentIdentityCandidates: loaded.grainCandidate.parentIdentityCandidates,
          temporalBehaviors: loaded.grainCandidate.temporalBehaviors,
          measureBehaviors: loaded.grainCandidate.measureBehaviors,
          aggregationRisks: loaded.grainCandidate.aggregationRisks,
          grain: loaded.canonicalSource.grain.signature,
          readiness: loaded.canonicalSource.readiness.capabilities,
          metrics: preflight.metrics.filter((metric) => ["inventory_on_hand", "delivery_count", "gross_profit"].includes(metric.metricId)),
          questions: questions.candidateQuestions.filter((question) => ["inventory_on_hand", "delivery_count", "gross_profit"].includes(question.metricId)),
          actions: questions.actionCandidates.filter((action) => ["inventory_on_hand", "delivery_count", "gross_profit"].includes(action.metricId)),
        };
      }),
    );
    fs.writeFileSync("/tmp/phase7r31-family-eligibility-observation.json", `${JSON.stringify({ records }, null, 2)}\n`);
    expect(records).toHaveLength(15);
    for (const record of records.filter((item) => item.sampleId.startsWith("inv."))) {
      expect(record.metrics.find((metric) => metric.metricId === "inventory_on_hand")?.state, record.sampleId).toBe("blocked");
      expect(Object.keys(record.verifiedMetricAnswers).some((key) => /inventory_on_hand|stock_qty/.test(key)), record.sampleId).toBe(false);
    }
    for (const sampleId of ["ops.logistics_may_2026", "ops.logistics_june_2026"]) {
      const record = records.find((item) => item.sampleId === sampleId)!;
      const metric = record.metrics.find((item) => item.metricId === "delivery_count")!;
      expect(metric.state, sampleId).toBe("conditionally_ready");
      expect(metric.timeCompatible, sampleId).toBe(true);
      expect(record.semantics.some((item) => item.selectedCandidateId === "shipment" && item.finalState === "confirmed"), sampleId).toBe(true);
      expect(record.temporalBehaviors.some((item) => item.physicalColumn === "DeliveredAt" && item.role === "event_time"), sampleId).toBe(true);
      expect(record.actions.filter((item) => item.metricId === "delivery_count").map((item) => item.questionId).sort(), sampleId).toEqual([
        "commerce.delivery_count.by_status",
        "commerce.delivery_count.summary",
        "operations.delivery_count.over_time",
      ]);
    }
    for (const sampleId of ["fin.accounting_may_2026", "fin.accounting_june_2026"]) {
      const record = records.find((item) => item.sampleId === sampleId)!;
      const metric = record.metrics.find((item) => item.metricId === "gross_profit")!;
      expect(metric.state, sampleId).toBe("conditionally_ready");
      expect(metric.duplicateHandlingSatisfied, sampleId).toBe(true);
      expect(metric.currencyCompatible, sampleId).toBeNull();
      expect(record.actions.some((item) => item.metricId === "gross_profit"), sampleId).toBe(false);
      const question = record.questions.find((item) => item.metricId === "gross_profit")!;
      expect(question.questionState, sampleId).toBe("blocked");
      expect(question.blockers.some((item) => item.code === "gross_profit_currency_compatibility_not_proved"), sampleId).toBe(true);
    }
  }, 60_000);

  it("executes delivery identities through governed DuckDB and retains finance and inventory blockers", async () => {
    const boundary = await nodeDuckDBBoundary();
    const executions: Array<Record<string, unknown>> = [];
    for (const sample of samples.filter((item) => ["ops.logistics_may_2026", "ops.logistics_june_2026"].includes(item.id))) {
      const loaded = load(sample.sources[0]);
      const context = { group: sample.group, tuningUse: sample.provenance.tuningUse } as const;
      const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [loaded.canonicalSource], evaluationContext: context });
      const preflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [loaded.canonicalSource], evaluationContext: context, expectedPolicyHash: governedMetricPolicyHash() });
      const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource: loaded.canonicalSource, domainActivation: activation, metricPreflight: preflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
      const action = questions.actionCandidates.find((item) => item.questionId === "commerce.delivery_count.summary");
      expect(action, sample.id).toBeTruthy();
      if (!action) continue;
      const runtime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource: loaded.canonicalSource, metricPreflight: preflight, questionGeneration: questions, actionCandidate: action, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
      const planned = planGovernedMetricQuery(runtime);
      expect(planned.state, `${sample.id}:${runtime.blockers.map((item) => item.code).join(",")}`).toBe("planned");
      if (planned.state !== "planned") continue;
      const expected = sample.verifiedMetricAnswers.row_count;
      const result = await executeGovernedMetricRequest({
        schemaVersion: "lightbi.governed-metric-execution-request.v1",
        requestId: `phase7r31:${sample.id}:delivery_count`,
        plan: planned.plan,
        rows: loaded.rows,
        groundTruth: { state: "verified", value: expected, tolerance: 0, provenance: `${sample.id}:row_count:frozen-1.2.0` },
      }, boundary);
      expect(result.status, `${sample.id}:${result.error ?? "no-error"}`).toBe("executed");
      expect(result.groundTruthComparison.state, sample.id).toBe("exact_match");
      expect(result.decisionUseAuthorized).toBe(false);
      expect(result.productionWiring.executed).toBe(false);
      executions.push({ sampleId: sample.id, expected, runtime, plan: planned.plan, result });
    }
    expect(executions).toHaveLength(2);
    fs.writeFileSync("/tmp/phase7r31-family-execution-observation.json", `${JSON.stringify({ executions }, null, 2)}\n`);
  }, 60_000);
});
