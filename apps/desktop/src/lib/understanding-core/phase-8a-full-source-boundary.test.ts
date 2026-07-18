import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectLocalFile } from "../local-file-inspector";
import { materializeRuntimeFilePayloads } from "../full-file-runtime-parser";
import { materializeRuntimeDatasetSource } from "../full-file-runtime-materializer";
import { createFileSourceCandidate } from "../source-preflight";
import { createAdvancedResultHandoff } from "../advanced-result-handoff";
import type { AdvancedQueryResult } from "../advanced-api";
import { createCanonicalSourceBoundary, sourceBindingsMatch, validateCanonicalSourceBoundary, type CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";
import { getOrBuildCanonicalConsumerArtifact, prepareCanonicalInvestigationHandoff, resetCanonicalConsumerCacheForTests } from "./canonical-consumer-boundary";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));
const originalWorker = globalThis.Worker;

class ParserWorker {
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate() {}
  postMessage(message: { payloads: Array<{ name: string; buffer: ArrayBuffer; sheetName?: string }> }) {
    queueMicrotask(() => {
      try {
        this.onmessage?.({ data: { status: "success", result: materializeRuntimeFilePayloads(message.payloads) } } as MessageEvent);
      } catch (error) {
        this.onmessage?.({ data: { status: "error", message: error instanceof Error ? error.message : String(error) } } as MessageEvent);
      }
    });
  }
}

afterEach(() => {
  if (originalWorker) globalThis.Worker = originalWorker;
  else delete (globalThis as { Worker?: typeof Worker }).Worker;
});

function syntheticCommerceCsv(rowCount = 20_123): { file: File; oracle: number } {
  const lines = ["Order ID,Order Date,Product,Revenue"];
  let oracle = 0;
  for (let index = 0; index < rowCount; index += 1) {
    const revenue = 100 + (index % 97) * 3;
    oracle += revenue;
    lines.push(`ORD-${String(index + 1).padStart(6, "0")},2026-07-${String((index % 28) + 1).padStart(2, "0")},Product-${index % 17},${revenue}`);
  }
  return { file: new File([lines.join("\n")], "phase8a-commerce.csv", { type: "text/csv" }), oracle };
}

async function fingerprint(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function quote(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function literal(value: unknown): string {
  if (value == null || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fullRowsDuckDBBoundary(rows: Record<string, unknown>[]): Promise<GovernedDuckDBBoundaryV1> {
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan) {
      const connection = db.connect();
      try {
        const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
        const types = columns.map(column => rows.some(row => typeof row[column] === "number") ? "DOUBLE" : "VARCHAR");
        connection.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quote(column)} ${types[index]}`).join(", ")})`);
        for (let offset = 0; offset < rows.length; offset += 500) {
          connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.slice(offset, offset + 500).map(row => `(${columns.map(column => literal(row[column])).join(",")})`).join(",")}`);
        }
        let parameterIndex = 0;
        const table = connection.query(plan.sql.replace(/\?/g, () => literal(plan.parameters[parameterIndex++])));
        return {
          engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name),
          rows: table.toArray().map((row: any) => row.toJSON()), error: null, executionScope: "full_file",
          actualMaterializedRowCount: rows.length,
        };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file", actualMaterializedRowCount: rows.length };
      } finally { connection.close(); }
    },
  };
}

describe("Phase 8A production full-source canonical boundary", () => {
  it("reproduces the old retained-row blocker, then executes exact revenue from all source rows", async () => {
    resetCanonicalConsumerCacheForTests();
    const { file, oracle } = syntheticCommerceCsv();
    const candidate = createFileSourceCandidate(file);
    if (!("rawUrl" in candidate)) throw new Error("message" in candidate ? candidate.message : "local source candidate required");
    const inspected = await inspectLocalFile(candidate);
    expect(inspected.status).toBe("accessible");
    if (inspected.status !== "accessible") throw new Error(inspected.message);
    const metadata = inspected.metadata;
    const semanticRows = metadata.semantic_rows as Record<string, unknown>[];
    expect(metadata.rows_count).toBe(20_123);
    expect(semanticRows.length).toBeLessThan(metadata.rows_count!);
    expect(metadata.analysis_rows).toBeUndefined();

    const legacyDefect = getOrBuildCanonicalConsumerArtifact({
      datasetId: file.name, sourceKind: "local_file", sourceLabel: file.name,
      columns: metadata.columns!, rows: semanticRows, sourceRowCount: metadata.rows_count!,
    });
    expect(legacyDefect.status).toBe("invalid");
    expect(legacyDefect.blockers).toContain("full_file_row_coverage_required");

    const sample = metadata.semantic_sample!;
    const boundary = createCanonicalSourceBoundary({
      datasetId: file.name,
      columns: metadata.columns!,
      semanticRows,
      semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
      fullFileProfile: metadata.canonical_full_file_profile!,
      fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
      runtimeFiles: [{ file }],
    });
    expect(validateCanonicalSourceBoundary(boundary)).toMatchObject({ valid: true, blockers: [] });

    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: file.name, sourceKind: "local_file", sourceLabel: file.name,
      columns: metadata.columns!, rows: semanticRows, sourceRowCount: metadata.rows_count!, sourceBoundary: boundary,
    });
    expect(artifact.status, artifact.blockers.join(",")).toBe("valid");
    if (artifact.status !== "valid") throw new Error(artifact.blockers.join(","));
    const action = artifact.questionGeneration.actionCandidates.find(item => item.questionId === "commerce.sales_revenue.by_product");
    expect(action?.actionCandidateState).not.toBe("blocked");
    const handoff = prepareCanonicalInvestigationHandoff(artifact, action!.actionCandidateId);
    expect(handoff.queryPlanning.state).toBe("planned");
    if (handoff.queryPlanning.state !== "planned") throw new Error(handoff.queryPlanning.blockers.join(","));

    const payload = await file.arrayBuffer();
    const materialized = materializeRuntimeFilePayloads([{ name: file.name, buffer: payload }]);
    expect(materialized.rowCount).toBe(metadata.rows_count);
    const allRows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
    const result = await executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1",
      requestId: "phase8a:large-file-revenue",
      plan: handoff.queryPlanning.plan,
      rows: [],
      runtimeSource: boundary.runtimeSource,
      expectedRuntimeBinding: boundary.runtimeSource.binding,
      artifactIdentity: artifact.identity,
      expectedSourceRowCount: boundary.sourceRowCount,
      groundTruth: { state: "verified", value: oracle, tolerance: 0, provenance: "independent_synthetic_oracle" },
    }, await fullRowsDuckDBBoundary(allRows));
    expect(result.status, result.error ?? result.limitations.join(",")).toBe("executed");
    expect(result.groundTruthComparison).toMatchObject({ state: "exact_match", expected: oracle, actual: oracle });
    expect(result.fullFileExecution).toMatchObject({ executionScope: "full_file", expectedSourceRowCount: 20_123, actualMaterializedRowCount: 20_123, sourceFingerprint: boundary.sourceFingerprint });

    const missingMaterializationEvidence = await executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: "phase8a:missing-materialization-evidence",
      plan: handoff.queryPlanning.plan, rows: [], runtimeSource: boundary.runtimeSource,
      expectedRuntimeBinding: boundary.runtimeSource.binding, artifactIdentity: artifact.identity,
      expectedSourceRowCount: boundary.sourceRowCount,
      groundTruth: { state: "unavailable", value: null, tolerance: null, provenance: "negative_probe" },
    }, { execute: async () => ({ engine: "duckdb", status: "executed", columns: ["sales_revenue"], rows: [{ sales_revenue: oracle }], error: null, executionScope: "full_file" }) });
    expect(missingMaterializationEvidence).toMatchObject({
      status: "failed", error: "full_file_materialized_row_count_required", fullFileExecution: undefined,
    });
  }, 120_000);

  it("fails all canonical source-scope identity probes closed with stable blockers", async () => {
    const { file } = syntheticCommerceCsv(25);
    const candidate = createFileSourceCandidate(file);
    if (!("rawUrl" in candidate)) throw new Error("local source candidate required");
    const inspected = await inspectLocalFile(candidate);
    if (inspected.status !== "accessible") throw new Error("inspection failed");
    const metadata = inspected.metadata;
    const sample = metadata.semantic_sample!;
    const base = createCanonicalSourceBoundary({
      datasetId: file.name, columns: metadata.columns!, semanticRows: metadata.semantic_rows!,
      semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
      fullFileProfile: metadata.canonical_full_file_profile!,
      fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
      runtimeFiles: [{ file }],
    });
    const probes: Array<{ id: string; boundary: CanonicalSourceBoundaryV1; blocker: string }> = [
      { id: "sample_without_full_profile", boundary: { ...base, fullFileProfile: undefined as never }, blocker: "full_file_profile_required" },
      { id: "sample_without_profile", boundary: { ...base, semanticSample: { ...base.semanticSample, rows: [] } }, blocker: "semantic_sample_required" },
      { id: "profile_without_runtime", boundary: { ...base, runtimeSource: { ...base.runtimeSource, files: [] } }, blocker: "runtime_source_required" },
      { id: "profile_fingerprint_mismatch", boundary: { ...base, fullFileProfile: { ...base.fullFileProfile, sourceFingerprint: "stale" } }, blocker: "source_profile_fingerprint_mismatch" },
      { id: "profile_row_count_mismatch", boundary: { ...base, fullFileProfile: { ...base.fullFileProfile, sourceRowCount: base.sourceRowCount - 1 } }, blocker: "source_profile_row_count_mismatch" },
      { id: "stale_inspection", boundary: { ...base, fullFileProfile: { ...base.fullFileProfile, inspectionGeneration: "inspection:stale" } }, blocker: "stale_inspection_generation" },
      { id: "stale_profile", boundary: { ...base, fullFileProfile: { ...base.fullFileProfile, profileGeneration: "profile:stale" } }, blocker: "stale_profile_generation" },
      { id: "runtime_count_mismatch", boundary: { ...base, runtimeSource: { ...base.runtimeSource, sourceRowCount: base.sourceRowCount + 1 } }, blocker: "runtime_source_row_count_mismatch" },
      { id: "runtime_generation_mismatch", boundary: { ...base, runtimeSource: { ...base.runtimeSource, binding: { ...base.runtimeSource.binding!, inspectionGeneration: "inspection:newer" } } }, blocker: "runtime_source_binding_mismatch" },
    ];
    for (const probe of probes) {
      const result = validateCanonicalSourceBoundary(probe.boundary);
      expect(result.valid, probe.id).toBe(false);
      expect(result.blockers, probe.id).toContain(probe.blocker);
      expect(result.evidence.length, probe.id).toBeGreaterThan(0);
      expect(result.remediation.length, probe.id).toBeGreaterThan(0);
    }
    expect(sourceBindingsMatch(base, { ...base.runtimeSource, binding: { ...base.runtimeSource.binding!, sourceFingerprint: "replaced" } })).toBe(false);

    const previewOnly = getOrBuildCanonicalConsumerArtifact({
      datasetId: "preview-only", sourceKind: "online_file", sourceLabel: "preview-only",
      columns: metadata.columns!, rows: metadata.semantic_rows!.slice(0, 3), sourceRowCount: 25,
    });
    expect(previewOnly.status).toBe("invalid");
    expect(previewOnly.blockers).toContain("full_file_row_coverage_required");

    const smallComplete = getOrBuildCanonicalConsumerArtifact({
      datasetId: "small-complete", sourceKind: "local_file", sourceLabel: "small-complete",
      columns: metadata.columns!, rows: metadata.semantic_rows!, sourceRowCount: 25,
    });
    expect(smallComplete.status).toBe("valid");
  });

  it("preserves Advanced partial completeness and blocks decision support", () => {
    const result = (overrides: Partial<AdvancedQueryResult>): AdvancedQueryResult => ({
      runId: "phase8a-advanced", columns: [{ id: "column-0", name: "Revenue", logicalType: "number", nativeType: "number" }], rows: [[100]],
      page: { offset: 0, limit: 1, hasMore: false, estimatedTotal: 1 }, truncated: false, warnings: [], executionMs: 1,
      ...overrides,
    });
    const source = { datasetId: "advanced:test", title: "Advanced result", provider: "postgresql", sql: "select revenue from sales" };
    const paginated = createAdvancedResultHandoff(source, result({ page: { offset: 1, limit: 1, hasMore: true, estimatedTotal: 3 } }));
    const truncated = createAdvancedResultHandoff(source, result({ truncated: true, page: { offset: 0, limit: 1, hasMore: true, estimatedTotal: 3 } }));
    const unknown = createAdvancedResultHandoff(source, result({ page: { offset: 0, limit: 1, hasMore: false } }));
    expect(paginated.completeness).toMatchObject({ state: "paginated", blocker: "advanced_result_paginated" });
    expect(truncated.completeness).toMatchObject({ state: "truncated", blocker: "advanced_result_truncated" });
    expect(unknown.completeness).toMatchObject({ state: "unknown", blocker: "advanced_result_unknown" });
    expect([paginated, truncated, unknown].every(item => item.rowScope === "retained_rows" && item.canonicalHandoff.queryPlanning.state === "blocked")).toBe(true);
  });

  it("worker materialization verifies file identity and exact row count without sample fallback", async () => {
    globalThis.Worker = ParserWorker as unknown as typeof Worker;
    const { file } = syntheticCommerceCsv(25);
    const candidate = createFileSourceCandidate(file);
    if (!("rawUrl" in candidate)) throw new Error("local source candidate required");
    const inspected = await inspectLocalFile(candidate);
    if (inspected.status !== "accessible") throw new Error("inspection failed");
    const profile = inspected.metadata.canonical_full_file_profile!;
    const binding = {
      datasetId: file.name, sourceId: profile.sourceId, sourceFingerprint: profile.sourceFingerprint,
      inspectionGeneration: profile.inspectionGeneration, profileGeneration: profile.profileGeneration,
    };
    const source = { kind: "local_files" as const, files: [{ file }], sourceRowCount: 25, binding };
    await expect(materializeRuntimeDatasetSource(source, undefined, binding)).resolves.toMatchObject({ rowCount: 25 });

    const replaced = new File(["Order ID,Revenue\nORD-1,999"], file.name, { type: "text/csv" });
    await expect(materializeRuntimeDatasetSource({ ...source, files: [{ file: replaced }] }, undefined, binding)).rejects.toThrow("RUNTIME_SOURCE_FILE_REPLACED");
    await expect(materializeRuntimeDatasetSource({ ...source, sourceRowCount: 26 }, undefined, binding)).rejects.toThrow("RUNTIME_MATERIALIZATION_ROW_COUNT_SHORT");
    await expect(materializeRuntimeDatasetSource({ ...source, sourceRowCount: 24 }, undefined, binding)).rejects.toThrow("RUNTIME_MATERIALIZATION_ROW_COUNT_EXCESS");

    const malformed = new File(["{not-json"], "malformed.json", { type: "application/json" });
    const malformedBinding = { ...binding, sourceFingerprint: await fingerprint(malformed) };
    await expect(materializeRuntimeDatasetSource({
      kind: "local_files", files: [{ file: malformed }], sourceRowCount: 1, binding: malformedBinding,
    }, undefined, malformedBinding)).rejects.toThrow();

    const empty = new File(["Order ID,Revenue\n"], "empty.csv", { type: "text/csv" });
    const emptyBinding = { ...binding, sourceFingerprint: await fingerprint(empty) };
    await expect(materializeRuntimeDatasetSource({
      kind: "local_files", files: [{ file: empty }], sourceRowCount: 1, binding: emptyBinding,
    }, undefined, emptyBinding)).rejects.toThrow("RUNTIME_MATERIALIZATION_ROW_COUNT_SHORT");

    const executorSource = readFileSync(new URL("../local-duckdb-executor.ts", import.meta.url), "utf8");
    expect(executorSource).toContain("if (input.runtimeDatasetSource)");
    expect(executorSource).not.toMatch(/materializeRuntimeDatasetSource[\s\S]{0,500}catch[\s\S]{0,500}input\.rows/);
  });
});
