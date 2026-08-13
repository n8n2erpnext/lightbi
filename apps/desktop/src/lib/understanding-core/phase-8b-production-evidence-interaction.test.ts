import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLocalFile } from "../local-file-inspector";
import { materializeRuntimeFilePayloads } from "../full-file-runtime-parser";
import { createFileSourceCandidate } from "../source-preflight";
import { createCanonicalSourceBoundary, type CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";
import { getOrBuildCanonicalConsumerArtifact, prepareCanonicalInvestigationHandoff, resetCanonicalConsumerCacheForTests, validateCanonicalInvestigationHandoff } from "./canonical-consumer-boundary";
import {
  appendCanonicalEvidenceDeclaration,
  appendCanonicalMappingDecision,
  applyCanonicalUserOverlay,
  createCanonicalUserOverlay,
  parseCanonicalUserOverlay,
  removeCanonicalEvidenceDeclaration,
  resetCanonicalUserOverlay,
  validateCanonicalUserOverlay,
  type CanonicalEvidenceValueV1,
  type CanonicalUserOverlayV1,
} from "./canonical-user-overlay";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

async function boundaryFromCsv(name: string, csv: string): Promise<{ boundary: CanonicalSourceBoundaryV1; rows: Record<string, unknown>[] }> {
  const file = new File([csv], name, { type: "text/csv" });
  const candidate = createFileSourceCandidate(file);
  if (!("rawUrl" in candidate)) throw new Error("local source required");
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== "accessible") throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const sample = metadata.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: name,
    columns: metadata.columns!,
    semanticRows: metadata.semantic_rows!,
    semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
    fullFileProfile: metadata.canonical_full_file_profile!,
    fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file }],
  });
  return { boundary, rows: metadata.semantic_rows! };
}

async function boundaryFromRepositoryCsv(relativePath: string): Promise<{ boundary: CanonicalSourceBoundaryV1; rows: Record<string, unknown>[] }> {
  const absolutePath = join(process.cwd(), "../..", relativePath);
  const payload = fs.readFileSync(absolutePath);
  const file = new File([payload], relativePath.split("/").at(-1)!, { type: "text/csv" });
  const candidate = createFileSourceCandidate(file);
  if (!("rawUrl" in candidate)) throw new Error("local source required");
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== "accessible") throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const sample = metadata.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: file.name,
    columns: metadata.columns!,
    semanticRows: metadata.semantic_rows!,
    semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
    fullFileProfile: metadata.canonical_full_file_profile!,
    fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file }],
  });
  const materialized = materializeRuntimeFilePayloads([{ name: file.name, buffer: await file.arrayBuffer() }]);
  return { boundary, rows: JSON.parse(materialized.jsonText) as Record<string, unknown>[] };
}

function build(boundary: CanonicalSourceBoundaryV1, rows: Record<string, unknown>[], overlay?: CanonicalUserOverlayV1) {
  return getOrBuildCanonicalConsumerArtifact({ datasetId: boundary.datasetId, sourceKind: "local_file", sourceLabel: boundary.datasetId, columns: boundary.semanticSample.columns, rows, sourceRowCount: boundary.sourceRowCount, sourceBoundary: boundary, userOverlay: overlay });
}

function mapColumn(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, physicalColumn: string, selectedCanonicalSignal: string, createdAt?: string) {
  const inferred = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === physicalColumn)!;
  const candidates = inferred.candidateTraces.map((item) => item.candidateId);
  return appendCanonicalMappingDecision(overlay, boundary, { physicalColumn, sourceColumnIndex: inferred.sourceColumnIndex, selectedCanonicalSignal, decisionType: candidates.includes(selectedCanonicalSignal) ? "confirm_candidate" : "map_to_existing_signal", originalCandidateList: candidates, createdAt });
}

function addEvidence(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, value: CanonicalEvidenceValueV1, createdAt?: string) {
  const physicalColumn = "physicalColumn" in value ? value.physicalColumn : value.kind === "unit_of_measure" ? value.quantityColumn : null;
  return appendCanonicalEvidenceDeclaration(overlay, boundary, {
    evidenceType: value.kind,
    value,
    scope: physicalColumn ? { level: "physical_column", physicalColumn } : { level: "source_file" },
    createdAt,
  });
}

function quote(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function literal(value: unknown): string { return value == null || value === "" ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replace(/'/g, "''")}'`; }
async function duckBoundary(rows: Record<string, unknown>[]): Promise<GovernedDuckDBBoundaryV1> {
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return { async execute(plan) {
    const connection = db.connect();
    try {
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : "VARCHAR");
      connection.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quote(column)} ${types[index]}`).join(",")})`);
      connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.map((row) => `(${columns.map((column) => literal(row[column])).join(",")})`).join(",")}`);
      let parameterIndex = 0;
      const table = connection.query(plan.sql.replace(/\?/g, () => literal(plan.parameters[parameterIndex++])));
      return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => row.toJSON()), error: null, executionScope: "full_file", actualMaterializedRowCount: rows.length } as const;
    } catch (error) {
      return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file", actualMaterializedRowCount: rows.length } as const;
    } finally { connection.close(); }
  } };
}

describe("Phase 8B production source-bound evidence interaction", () => {
  it("unlocks gross profit only after source-bound user currency and period evidence, then executes exact DuckDB truth", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await boundaryFromRepositoryCsv("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
    const before = build(boundary, rows);
    expect(before.status).toBe("valid");
    if (before.status !== "valid") throw new Error(before.blockers.join(","));
    expect(before.questionGeneration.actionCandidates.filter((item) => item.metricId === "gross_profit")).toHaveLength(0);
    const initialMetric = before.metricPreflight.metrics.find((item) => item.metricId === "gross_profit")!;
    expect([...initialMetric.blockers.map((item) => item.code), ...initialMetric.limitations.map((item) => item.code)].some((code) => code.includes("currency"))).toBe(true);

    let overlay = createCanonicalUserOverlay(boundary, "2026-07-18T00:00:00.000Z");
    overlay = addEvidence(overlay, boundary, { kind: "reporting_period", start: "2026-05-01", end: "2026-05-31" }, "2026-07-18T00:00:01.000Z");
    overlay = addEvidence(overlay, boundary, { kind: "reporting_currency", currency: "VND", monetaryColumns: ["Revenue_Credit", "COGS_Debit"] }, "2026-07-18T00:00:02.000Z");
    const after = build(boundary, rows, overlay);
    expect(after.status).toBe("valid");
    if (after.status !== "valid") throw new Error(after.blockers.join(","));
    expect(after.overlayValidation, JSON.stringify(after.overlayValidation)).toMatchObject({ valid: true, stale: false });
    const evidence = after.canonicalSource.sourceEvidence!.currency[0];
    expect(evidence).toMatchObject({ currency: "VND", provenance: { kind: "user_confirmed" }, scope: "selected_columns", sourceHash: { value: boundary.sourceFingerprint } });
    expect(overlay.sourceEvidenceDeclarations.every((item) => item.validationStatus === "valid")).toBe(true);
    const action = after.questionGeneration.actionCandidates.find((item) => item.metricId === "gross_profit")!;
    expect(action, JSON.stringify(after.metricPreflight.metrics.find((item) => item.metricId === "gross_profit"))).toBeTruthy();
    const handoff = prepareCanonicalInvestigationHandoff(after, action.actionCandidateId);
    expect(handoff.runtimePreflight.executionAllowed, JSON.stringify(handoff.runtimePreflight)).toBe(true);
    expect(handoff.queryPlanning.state).toBe("planned");
    if (handoff.queryPlanning.state !== "planned") throw new Error(handoff.queryPlanning.blockers.join(","));
    const result = await executeGovernedMetricRequest({ schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: "phase8b:gross-profit", plan: handoff.queryPlanning.plan, rows: [], runtimeSource: boundary.runtimeSource, expectedRuntimeBinding: boundary.runtimeSource.binding, artifactIdentity: after.identity, expectedSourceRowCount: boundary.sourceRowCount, groundTruth: { state: "verified", value: 3_075_721_244, tolerance: 0, provenance: "phase7r34_independent_oracle" } }, await duckBoundary(rows));
    expect(result.status).toBe("executed");
    expect(result.groundTruthComparison).toMatchObject({ state: "exact_match", actual: 3_075_721_244, expected: 3_075_721_244 });
    expect(result.fullFileExecution).toMatchObject({ sourceFingerprint: boundary.sourceFingerprint, artifactIdentity: after.identity });

    const currencyDeclaration = overlay.sourceEvidenceDeclarations.find((item) => item.evidenceType === "reporting_currency")!;
    const removed = build(boundary, rows, removeCanonicalEvidenceDeclaration(overlay, boundary, currencyDeclaration.declarationId, "2026-07-18T00:00:03.000Z"));
    expect(removed.status).toBe("valid");
    if (removed.status === "valid") expect(removed.questionGeneration.actionCandidates.filter((item) => item.metricId === "gross_profit")).toHaveLength(0);
  }, 60_000);

  it("unlocks inventory only after mapping, identity, UOM, as-of and snapshot-role evidence", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await boundaryFromRepositoryCsv("sample-corpus/versions/1.3.0/derived/derived-inventory-snapshot-may.csv");
    const before = build(boundary, rows);
    expect(before.status).toBe("valid");
    if (before.status !== "valid") throw new Error(before.blockers.join(","));
    expect(before.questionGeneration.actionCandidates.filter((item) => item.metricId === "inventory_on_hand")).toHaveLength(0);

    let overlay = createCanonicalUserOverlay(boundary, "2026-07-18T01:00:00.000Z");
    for (const [physical, signal] of [["ItemID", "sku"], ["WarehouseID", "warehouse"], ["QuantityOnHand", "stock_qty"], ["AsOfDate", "time_period"], ["UOM", "uom"]] as const) overlay = mapColumn(overlay, boundary, physical, signal);
    overlay = addEvidence(overlay, boundary, { kind: "source_role", role: "inventory_snapshot" });
    overlay = addEvidence(overlay, boundary, { kind: "unit_of_measure", unit: "EA", quantityColumn: "QuantityOnHand", uomColumn: "UOM" });
    overlay = addEvidence(overlay, boundary, { kind: "snapshot_as_of_date", date: "2026-05-31", physicalColumn: "AsOfDate" });
    overlay = addEvidence(overlay, boundary, { kind: "item_identity", physicalColumn: "ItemID" });
    overlay = addEvidence(overlay, boundary, { kind: "warehouse_location_identity", physicalColumn: "WarehouseID" });
    const after = build(boundary, rows, overlay);
    expect(after.status).toBe("valid");
    if (after.status !== "valid") throw new Error(after.blockers.join(","));
    expect(after.canonicalSource.sourceEvidence?.inventorySnapshots?.[0], JSON.stringify({ validation: after.overlayValidation, declarations: overlay.sourceEvidenceDeclarations })).toMatchObject({ provenance: { kind: "user_confirmed" }, asOf: { value: "2026-05-31" }, unit: { value: "EA" } });
    expect(after.canonicalSource.semantic.columns.map((item) => [item.physicalColumn, item.selectedCandidateId, item.finalState]), JSON.stringify(after.overlayValidation)).toEqual(expect.arrayContaining([["ItemID", "sku", "confirmed"], ["WarehouseID", "warehouse", "confirmed"], ["QuantityOnHand", "stock_qty", "confirmed"], ["AsOfDate", "time_period", "confirmed"], ["UOM", "uom", "confirmed"]]));
    const action = after.questionGeneration.actionCandidates.find((item) => item.questionId === "commerce.inventory_on_hand.by_item_warehouse")!;
    expect(action, JSON.stringify(after.metricPreflight.metrics.find((item) => item.metricId === "inventory_on_hand"))).toBeTruthy();
    const handoff = prepareCanonicalInvestigationHandoff(after, action.actionCandidateId);
    expect(handoff.runtimePreflight.executionAllowed, JSON.stringify(handoff.runtimePreflight)).toBe(true);
    expect(handoff.queryPlanning.state).toBe("planned");
    if (handoff.queryPlanning.state !== "planned") throw new Error(handoff.queryPlanning.blockers.join(","));
    const result = await executeGovernedMetricRequest({ schemaVersion: "lightbi.governed-metric-execution-request.v1", requestId: "phase8b:inventory", plan: handoff.queryPlanning.plan, rows: [], runtimeSource: boundary.runtimeSource, expectedRuntimeBinding: boundary.runtimeSource.binding, artifactIdentity: after.identity, expectedSourceRowCount: boundary.sourceRowCount, groundTruth: { state: "verified", value: 211_067, tolerance: 0, provenance: "phase7r34_independent_oracle" } }, await duckBoundary(rows));
    expect(result.status).toBe("executed");
    expect(result.groundTruthComparison).toMatchObject({ state: "exact_match", actual: 211_067, expected: 211_067 });
    const oracle = JSON.parse(fs.readFileSync(join(process.cwd(), "../..", "docs/architecture/phase-7r34-independent-oracle-results.json"), "utf8"));
    const expectedRows = oracle.periods.may.metrics.itemWarehouseInventoryBalances as Array<{ itemId: string; warehouseId: string; asOfDate: string; quantityOnHand: number }>;
    const expectedByKey = new Map(expectedRows.map((row) => [`${row.itemId}\u0000${row.warehouseId}\u0000${row.asOfDate}`, row.quantityOnHand]));
    const actualKeys = result.rows.map((row) => `${String(row.sku)}\u0000${String(row.warehouse)}\u0000${String(row.time_period)}`);
    expect(new Set(actualKeys).size).toBe(actualKeys.length);
    expect(result.rows).toHaveLength(expectedRows.length);
    expect(result.rows.every((row) => expectedByKey.get(`${String(row.sku)}\u0000${String(row.warehouse)}\u0000${String(row.time_period)}`) === Number(row.inventory_on_hand))).toBe(true);

    for (const declaration of overlay.sourceEvidenceDeclarations) {
      const withoutRequiredEvidence = build(boundary, rows, removeCanonicalEvidenceDeclaration(overlay, boundary, declaration.declarationId));
      expect(withoutRequiredEvidence.status).toBe("valid");
      if (withoutRequiredEvidence.status === "valid") expect(withoutRequiredEvidence.questionGeneration.actionCandidates.filter((item) => item.metricId === "inventory_on_hand"), declaration.evidenceType).toHaveLength(0);
    }

    const removed = build(boundary, rows, resetCanonicalUserOverlay(overlay, boundary));
    if (removed.status === "valid") expect(removed.questionGeneration.actionCandidates.filter((item) => item.metricId === "inventory_on_hand")).toHaveLength(0);
  }, 60_000);

  it("fails all 24 required overlay and evidence probes closed", async () => {
    const { boundary, rows } = await boundaryFromCsv("phase8b-probes.csv", ["OrderID,Qty,Revenue,Period,UOM", "O-1,2,100,2026-05-01,EA", "O-2,3,200,2026-05-02,EA"].join("\n"));
    const inferred = boundary.fullFileUnderstanding.semantic;
    const base = createCanonicalUserOverlay(boundary, "2026-07-18T02:00:00.000Z");
    const qty = inferred.columns.find((item) => item.physicalColumn === "Qty")!;
    const revenue = inferred.columns.find((item) => item.physicalColumn === "Revenue")!;
    const record = (id: string, pass: boolean, blockers: string[] = []) => ({ id, pass, blockers });
    const probes: Array<{ id: string; pass: boolean; blockers: string[] }> = [];

    const wrongFingerprint = mapColumn(base, { ...boundary, sourceFingerprint: "f".repeat(64) }, "Qty", "stock_qty");
    probes.push(record("mapping_another_fingerprint", !validateCanonicalUserOverlay(boundary, wrongFingerprint).valid, validateCanonicalUserOverlay(boundary, wrongFingerprint).blockers));
    const staleGeneration = { ...mapColumn(base, boundary, "Qty", "stock_qty"), binding: { ...base.binding, profileGeneration: "stale" } };
    probes.push(record("mapping_stale_generation", !validateCanonicalUserOverlay(boundary, staleGeneration).valid, validateCanonicalUserOverlay(boundary, staleGeneration).blockers));
    const nonexistent = mapColumn(base, boundary, "Qty", "stock_qty"); nonexistent.mappingDecisions[0].selectedCanonicalSignal = "not_real";
    probes.push(record("nonexistent_signal", !validateCanonicalUserOverlay(boundary, nonexistent).valid, validateCanonicalUserOverlay(boundary, nonexistent).blockers));
    const derived = mapColumn(base, boundary, "Qty", "stock_quantity");
    probes.push(record("derived_metric_target", !validateCanonicalUserOverlay(boundary, derived).valid, validateCanonicalUserOverlay(boundary, derived).blockers));
    const textMoney = mapColumn(base, boundary, "OrderID", "revenue");
    probes.push(record("text_identifier_to_money", !validateCanonicalUserOverlay(boundary, textMoney).valid, validateCanonicalUserOverlay(boundary, textMoney).blockers));
    const first = mapColumn(base, boundary, "Qty", "stock_qty", "2026-07-18T02:00:01.000Z");
    const rogue = structuredClone(first.mappingDecisions[0]); rogue.decisionId = "rogue"; rogue.selectedCanonicalSignal = "sold_qty"; rogue.supersededDecisionReference = null;
    const conflicting = { ...first, mappingDecisions: [...first.mappingDecisions, rogue] };
    probes.push(record("conflicting_mappings", !validateCanonicalUserOverlay(boundary, conflicting).valid, validateCanonicalUserOverlay(boundary, conflicting).blockers));
    const otherBoundary = { ...boundary, datasetId: "other", sourceId: "other", sourceFingerprint: "a".repeat(64) };
    probes.push(record("same_header_other_file", validateCanonicalUserOverlay(otherBoundary, first).stale, validateCanonicalUserOverlay(otherBoundary, first).blockers));
    const invalidCurrency = addEvidence(base, boundary, { kind: "reporting_currency", currency: "XYZ", monetaryColumns: ["Revenue"] });
    probes.push(record("invalid_currency", !validateCanonicalUserOverlay(boundary, invalidCurrency).valid, validateCanonicalUserOverlay(boundary, invalidCurrency).blockers));
    const wrongCurrencySource = addEvidence(base, otherBoundary, { kind: "reporting_currency", currency: "VND", monetaryColumns: ["Revenue"] });
    probes.push(record("currency_wrong_source", validateCanonicalUserOverlay(boundary, wrongCurrencySource).stale, validateCanonicalUserOverlay(boundary, wrongCurrencySource).blockers));
    const nonMoneyCurrency = addEvidence(base, boundary, { kind: "reporting_currency", currency: "VND", monetaryColumns: ["OrderID"] });
    probes.push(record("currency_non_money", !validateCanonicalUserOverlay(boundary, nonMoneyCurrency).valid, validateCanonicalUserOverlay(boundary, nonMoneyCurrency).blockers));
    const shipmentUom = addEvidence(base, boundary, { kind: "unit_of_measure", unit: "EA", quantityColumn: "OrderID", uomColumn: "UOM" });
    probes.push(record("uom_shipment_count", !validateCanonicalUserOverlay(boundary, shipmentUom).valid, validateCanonicalUserOverlay(boundary, shipmentUom).blockers));
    const incompatibleUom = addEvidence(base, boundary, { kind: "unit_of_measure", unit: "USD", quantityColumn: "Qty", uomColumn: "UOM" });
    probes.push(record("uom_incompatible", !validateCanonicalUserOverlay(boundary, incompatibleUom).valid, validateCanonicalUserOverlay(boundary, incompatibleUom).blockers));
    const badAsOf = addEvidence(base, boundary, { kind: "snapshot_as_of_date", date: "31/05/2026", physicalColumn: "Period" });
    probes.push(record("invalid_as_of", !validateCanonicalUserOverlay(boundary, badAsOf).valid, validateCanonicalUserOverlay(boundary, badAsOf).blockers));
    const reversed = addEvidence(base, boundary, { kind: "reporting_period", start: "2026-06-30", end: "2026-05-01" });
    probes.push(record("reversed_period", !validateCanonicalUserOverlay(boundary, reversed).valid, validateCanonicalUserOverlay(boundary, reversed).blockers));
    let movement = addEvidence(base, boundary, { kind: "source_role", role: "inventory_movement" }); movement = addEvidence(movement, boundary, { kind: "snapshot_as_of_date", date: "2026-05-01", physicalColumn: "Period" });
    probes.push(record("snapshot_date_on_movement", applyCanonicalUserOverlay(boundary, inferred, movement).sourceEvidence?.inventorySnapshots?.length === 0));
    const roleOnly = addEvidence(base, boundary, { kind: "source_role", role: "inventory_snapshot" });
    const roleArtifact = build(boundary, rows, roleOnly);
    const inferredArtifact = build(boundary, rows);
    probes.push(record("role_cannot_activate_domain", roleArtifact.status === "valid" && inferredArtifact.status === "valid" && roleArtifact.domainActivation.identity === inferredArtifact.domainActivation.identity));
    probes.push(record("confirmation_cannot_mark_runnable", !("executionAllowed" in (roleOnly as unknown as Record<string, unknown>))));
    probes.push(record("file_replacement_invalidates", validateCanonicalUserOverlay(otherBoundary, first).stale));
    const older = build(boundary, rows, first); const newerOverlay = mapColumn(first, boundary, "Revenue", "revenue"); const newer = build(boundary, rows, newerOverlay);
    probes.push(record("stale_async_cannot_overwrite", older.identity !== newer.identity && newer.overlayIdentity === newerOverlay.overlayId));
    const oldAction = older.status === "valid" ? older.questionGeneration.actionCandidates[0] : null;
    const oldHandoff = oldAction ? prepareCanonicalInvestigationHandoff(older, oldAction.actionCandidateId) : prepareCanonicalInvestigationHandoff(older, "missing");
    probes.push(record("superseded_handoff", validateCanonicalInvestigationHandoff(oldHandoff, newer).includes("investigation_handoff_overlay_superseded")));
    const reset = appendCanonicalMappingDecision(first, boundary, { physicalColumn: "Qty", sourceColumnIndex: qty.sourceColumnIndex, selectedCanonicalSignal: null, decisionType: "reset_to_inferred", originalCandidateList: qty.candidateTraces.map((item) => item.candidateId) });
    probes.push(record("reset_restores_inferred", applyCanonicalUserOverlay(boundary, inferred, reset).semantic.columns.find((item) => item.physicalColumn === "Qty")?.finalState === qty.finalState));
    const ignored = appendCanonicalMappingDecision(base, boundary, { physicalColumn: "Revenue", sourceColumnIndex: revenue.sourceColumnIndex, selectedCanonicalSignal: null, decisionType: "ignore_for_semantic_analysis", originalCandidateList: revenue.candidateTraces.map((item) => item.candidateId) });
    probes.push(record("ignored_not_metric_eligible", applyCanonicalUserOverlay(boundary, inferred, ignored).semantic.columns.find((item) => item.physicalColumn === "Revenue")?.selectedCandidateId === null));
    const wrongSheet = { ...first, binding: { ...first.binding, sheetOrTable: "Other" } };
    probes.push(record("other_sheet_unchanged", validateCanonicalUserOverlay(boundary, wrongSheet).stale));
    const sourceBefore = JSON.stringify(boundary.semanticSample.rows); applyCanonicalUserOverlay(boundary, inferred, first);
    probes.push(record("source_data_immutable", JSON.stringify(boundary.semanticSample.rows) === sourceBefore));

    expect(probes).toHaveLength(24);
    expect(probes.filter((item) => !item.pass), JSON.stringify(probes, null, 2)).toEqual([]);
    expect(parseCanonicalUserOverlay(JSON.parse(JSON.stringify(first)))?.overlayId).toBe(first.overlayId);
    expect(parseCanonicalUserOverlay({ schemaVersion: "bad" })).toBeNull();
    expect(parseCanonicalUserOverlay({ ...first, overlayId: "tampered" })).toBeNull();
    expect(parseCanonicalUserOverlay({ ...first, mappingDecisions: [{ decisionId: "corrupt" }] })).toBeNull();
    expect(parseCanonicalUserOverlay({ ...first, sourceEvidenceDeclarations: [{ evidenceType: "reporting_currency" }] })).toBeNull();
  }, 60_000);
});
