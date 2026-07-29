import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { materializeRuntimeFilePayloads } from "../full-file-runtime-parser";
import { inspectLocalFile } from "../local-file-inspector";
import { createFileSourceCandidate } from "../source-preflight";
import { getOrBuildCanonicalConsumerArtifact, resetCanonicalConsumerCacheForTests } from "./canonical-consumer-boundary";
import {
  buildCanonicalMultiSourceDataset,
  prepareCanonicalMultiSourceInvestigationHandoff,
  validateCanonicalMultiSourceDataset,
  validateCanonicalMultiSourceInvestigationHandoff,
  type CanonicalMultiSourceDatasetV1,
} from "./canonical-multisource-boundary";
import { createCanonicalSourceBoundary, type CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";
import {
  appendCanonicalEvidenceDeclaration,
  createCanonicalUserOverlay,
  removeCanonicalEvidenceDeclaration,
  type CanonicalEvidenceValueV1,
  type CanonicalUserOverlayV1,
} from "./canonical-user-overlay";
import { executeCanonicalMultiSourceMetric, type CanonicalMultiSourceRuntimeBoundaryV1 } from "./governed-multisource-duckdb-boundary";
import {
  buildCanonicalPeriodPartitionWorkspace,
  executeCanonicalPeriodPartitionWorkspace,
} from "./canonical-period-partition-boundary";

const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function quote(value: string): string { return `"${value.replace(/"/g, '""')}"`; }
function literal(value: unknown): string { return value == null || value === "" ? "NULL" : typeof value === "number" ? String(value) : typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : `'${String(value).replace(/'/g, "''")}'`; }

async function nativeRuntimeBoundary(): Promise<CanonicalMultiSourceRuntimeBoundaryV1> {
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    materialize: async (boundary, signal) => {
      signal?.throwIfAborted();
      const payloads = await Promise.all(boundary.runtimeSource.files.map(async (item) => ({ name: item.file.name, buffer: await item.file.arrayBuffer(), sheetName: item.sheetName })));
      return materializeRuntimeFilePayloads(payloads);
    },
    open: async () => {
      const connection = db.connect();
      return {
        registerJsonView: async (tableName, _fileName, jsonText) => {
          const rows = JSON.parse(jsonText) as Record<string, unknown>[];
          const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
          const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
          connection.query(`CREATE TABLE ${quote(tableName)} (${columns.map((column, index) => `${quote(column)} ${types[index]}`).join(",")})`);
          const chunkSize = 200;
          for (let offset = 0; offset < rows.length; offset += chunkSize) connection.query(`INSERT INTO ${quote(tableName)} VALUES ${rows.slice(offset, offset + chunkSize).map((row) => `(${columns.map((column) => literal(row[column])).join(",")})`).join(",")}`);
        },
        query: async (sql) => {
          const table = connection.query(sql);
          return { columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => row.toJSON()) };
        },
        close: async () => { connection.close(); },
      };
    },
  };
}

type Loaded = { boundary: CanonicalSourceBoundaryV1; rows: Record<string, unknown>[] };

async function load(relativePath: string): Promise<Loaded> {
  const absolute = join(process.cwd(), "../..", relativePath);
  const bytes = readFileSync(absolute);
  const name = relativePath.split("/").at(-1)!;
  const type = name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const file = new File([bytes], name, { type });
  const candidate = createFileSourceCandidate(file);
  if (!("rawUrl" in candidate)) throw new Error("local candidate required");
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== "accessible") throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const selected = metadata.is_workbook && metadata.default_sheet && metadata.sheets ? metadata.sheets[metadata.default_sheet] : metadata;
  const sample = selected.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: name,
    columns: selected.columns!,
    semanticRows: selected.semantic_rows!,
    semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
    fullFileProfile: selected.canonical_full_file_profile!,
    fullFileUnderstanding: selected.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file, sheetName: metadata.is_workbook ? metadata.default_sheet : undefined }],
  });
  const materialized = materializeRuntimeFilePayloads([{ name, buffer: await file.arrayBuffer(), sheetName: metadata.is_workbook ? metadata.default_sheet : undefined }]);
  return { boundary, rows: JSON.parse(materialized.jsonText) as Record<string, unknown>[] };
}

function evidence(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, value: CanonicalEvidenceValueV1, at: string): CanonicalUserOverlayV1 {
  const physicalColumn = "physicalColumn" in value ? value.physicalColumn : null;
  return appendCanonicalEvidenceDeclaration(overlay, boundary, {
    evidenceType: value.kind,
    value,
    scope: physicalColumn ? { level: "physical_column", physicalColumn } : { level: "source_file" },
    createdAt: at,
  });
}

function governedOverlay(
  boundary: CanonicalSourceBoundaryV1,
  role: "sales" | "accounting",
  moneyColumns: string[],
  period: { start: string; end: string } = { start: "2026-05-01", end: "2026-05-31" },
): CanonicalUserOverlayV1 {
  let overlay = createCanonicalUserOverlay(boundary, "2026-07-22T00:00:00.000Z");
  overlay = evidence(overlay, boundary, { kind: "source_role", role }, "2026-07-22T00:00:01.000Z");
  overlay = evidence(overlay, boundary, { kind: "document_identity", physicalColumn: "OrderID" }, "2026-07-22T00:00:02.000Z");
  overlay = evidence(overlay, boundary, { kind: "reporting_period", ...period }, "2026-07-22T00:00:03.000Z");
  overlay = evidence(overlay, boundary, { kind: "reporting_currency", currency: "VND", monetaryColumns: moneyColumns }, "2026-07-22T00:00:04.000Z");
  return overlay;
}

function artifact(loaded: Loaded, overlay: CanonicalUserOverlayV1) {
  const result = getOrBuildCanonicalConsumerArtifact({
    datasetId: loaded.boundary.datasetId,
    sourceKind: "local_file",
    sourceLabel: loaded.boundary.datasetId,
    columns: loaded.boundary.semanticSample.columns,
    rows: loaded.boundary.semanticSample.rows,
    sourceRowCount: loaded.boundary.sourceRowCount,
    sourceBoundary: loaded.boundary,
    userOverlay: overlay,
  });
  if (result.status !== "valid") throw new Error(result.blockers.join(","));
  return result;
}

async function positiveDataset() {
  const sales = await load("sample-corpus/anchors/1.3.0/Sales_ERP_May_2026.xlsx");
  const accounting = await load("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
  const salesOverlay = governedOverlay(sales.boundary, "sales", ["Revenue"]);
  const accountingOverlay = governedOverlay(accounting.boundary, "accounting", ["Revenue_Credit", "COGS_Debit"]);
  const result = await buildCanonicalMultiSourceDataset({
    multiSourceDatasetId: "commerce-may-2026",
    createdAt: "2026-07-22T00:01:00.000Z",
    members: [
      { artifact: artifact(accounting, accountingOverlay), overlay: accountingOverlay, required: true, fullRows: accounting.rows },
      { artifact: artifact(sales, salesOverlay), overlay: salesOverlay, required: true, fullRows: sales.rows },
    ],
  });
  if (result.status !== "valid") throw new Error(result.blockers.join(","));
  return { dataset: result.dataset, sales, accounting, salesOverlay, accountingOverlay };
}

describe("Phase 8D.1 canonical production multi-source boundary", () => {
  beforeEach(() => resetCanonicalConsumerCacheForTests());

  it("builds one order-independent Sales + Accounting state and carries unchanged M1/M2/M3 lineage", async () => {
    const { dataset, accounting } = await positiveDataset();
    expect(validateCanonicalMultiSourceDataset(dataset)).toEqual([]);
    expect(dataset.relationship).toMatchObject({ validationState: "confirmed", cardinalityHypothesis: "one_to_one", reportingPeriod: "2026-05-01/2026-05-31", currency: "VND", matchedDistinct: 1500 });
    expect(dataset.orderedSourceMemberships.map((item) => item.sourceRole).sort()).toEqual(["accounting", "sales"]);
    expect(dataset.orderedSourceMemberships.every((item) => item.sourceFingerprint === item.boundary.sourceFingerprint && item.runtimeSource.files.length === 1)).toBe(true);
    const analysis = dataset.analyses[0];
    expect(analysis).toMatchObject({ metricId: "gross_profit", state: "ready" });
    expect(analysis.requiredSourceIds).toHaveLength(2);
    expect(analysis.queryPlanSourceIds).toEqual(analysis.requiredSourceIds);
    expect(analysis.sourceLocalHandoff?.queryPlanning.state).toBe("planned");
    expect(analysis.sourceLocalHandoff?.sourceFingerprint).toBe(accounting.boundary.sourceFingerprint);
    const handoff = prepareCanonicalMultiSourceInvestigationHandoff(dataset, analysis.analysisId)!;
    expect(handoff.multiSource.sourceMemberships).toHaveLength(2);
    expect(validateCanonicalMultiSourceInvestigationHandoff(handoff, dataset)).toEqual([]);
  }, 120_000);

  it("changes no relationship truth when source order changes", async () => {
    const first = await positiveDataset();
    resetCanonicalConsumerCacheForTests();
    const salesArtifact = first.dataset.orderedSourceMemberships.find((item) => item.sourceRole === "sales")!;
    const accountingArtifact = first.dataset.orderedSourceMemberships.find((item) => item.sourceRole === "accounting")!;
    const reversed = await buildCanonicalMultiSourceDataset({
      multiSourceDatasetId: "commerce-may-2026",
      createdAt: first.dataset.createdAt,
      members: [
        { artifact: salesArtifact.artifact, overlay: salesArtifact.overlay, required: true, fullRows: first.sales.rows },
        { artifact: accountingArtifact.artifact, overlay: accountingArtifact.overlay, required: true, fullRows: first.accounting.rows },
      ],
    });
    expect(reversed.status).toBe("valid");
    if (reversed.status === "valid") {
      expect(reversed.dataset.identity).toBe(first.dataset.identity);
      expect(reversed.dataset.relationshipArtifactId).toBe(first.dataset.relationshipArtifactId);
    }
  }, 120_000);

  it("governs same-role files as independent period partitions and combines only metric results", async () => {
    const may = await load("sample-corpus/anchors/1.3.0/Sales_ERP_May_2026.xlsx");
    const june = await load("sample-corpus/anchors/1.3.0/Sales_ERP_June_2026.xlsx");
    const mayOverlay = governedOverlay(may.boundary, "sales", ["Revenue"]);
    const juneOverlay = governedOverlay(
      june.boundary,
      "sales",
      ["Revenue"],
      { start: "2026-06-01", end: "2026-06-30" },
    );
    const built = buildCanonicalPeriodPartitionWorkspace({
      workspaceId: "sales-may-june-2026",
      metricId: "sales_revenue",
      members: [
        { artifact: artifact(may, mayOverlay), overlay: mayOverlay },
        { artifact: artifact(june, juneOverlay), overlay: juneOverlay },
      ],
    });
    expect(built.status).toBe("valid");
    if (built.status !== "valid") throw new Error(built.blockers.join(","));
    expect(built.workspace.periodMembers.map((member) => member.period.label)).toEqual(["2026-05", "2026-06"]);
    expect(built.workspace.restrictions).toContain("no_cross_period_row_join");

    const totals = new Map([
      [built.workspace.periodMembers[0].sourceId, 100],
      [built.workspace.periodMembers[1].sourceId, 125],
    ]);
    const executed = await executeCanonicalPeriodPartitionWorkspace(built.workspace, {
      executeMember: async (member) => ({
        status: "executed",
        rows: [{ sales_revenue: totals.get(member.sourceId)! }],
      } as any),
    });
    expect(executed.status).toBe("executed");
    expect(executed.rows).toEqual([
      { reporting_period: "2026-05", sales_revenue: 100 },
      { reporting_period: "2026-06", sales_revenue: 125 },
    ]);
    expect(executed.evidence).toMatchObject({
      executionScope: "full_file_period_partitions",
      sourceIds: expect.arrayContaining(built.workspace.periodMembers.map((member) => member.sourceId)),
    });
  }, 120_000);

  it("supports logistics period partitions without inventing currency evidence", async () => {
    const makeLogisticsOverlay = (
      boundary: CanonicalSourceBoundaryV1,
      period: { start: string; end: string },
    ) => {
      let overlay = createCanonicalUserOverlay(boundary, "2026-07-22T03:00:00.000Z");
      overlay = evidence(overlay, boundary, { kind: "source_role", role: "logistics" }, "2026-07-22T03:00:01.000Z");
      overlay = evidence(overlay, boundary, { kind: "document_identity", physicalColumn: "ShipmentID" }, "2026-07-22T03:00:02.000Z");
      overlay = evidence(overlay, boundary, { kind: "reporting_period", ...period }, "2026-07-22T03:00:03.000Z");
      return overlay;
    };
    const may = await load("sample-corpus/anchors/1.3.0/Logistics_ERP_May_2026.csv");
    const june = await load("sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv");
    const mayOverlay = makeLogisticsOverlay(may.boundary, { start: "2026-05-01", end: "2026-05-31" });
    const juneOverlay = makeLogisticsOverlay(june.boundary, { start: "2026-06-01", end: "2026-06-30" });
    const built = buildCanonicalPeriodPartitionWorkspace({
      workspaceId: "logistics-may-june-2026",
      metricId: "delivery_count",
      members: [
        { artifact: artifact(may, mayOverlay), overlay: mayOverlay },
        { artifact: artifact(june, juneOverlay), overlay: juneOverlay },
      ],
    });
    expect(built.status).toBe("valid");
    if (built.status !== "valid") throw new Error(built.blockers.join(","));
    expect(built.workspace).toMatchObject({
      sourceRole: "logistics",
      metricId: "delivery_count",
      periodMembers: [
        expect.objectContaining({ currency: null, period: expect.objectContaining({ label: "2026-05" }) }),
        expect.objectContaining({ currency: null, period: expect.objectContaining({ label: "2026-06" }) }),
      ],
    });
  }, 120_000);

  it("materializes both complete sources and executes the unchanged exact gross-profit plan", async () => {
    const { dataset } = await positiveDataset();
    const analysis = dataset.analyses[0];
    const handoff = prepareCanonicalMultiSourceInvestigationHandoff(dataset, analysis.analysisId)!;
    if (handoff.queryPlanning.state !== "planned") throw new Error(handoff.queryPlanning.blockers.join(","));
    const result = await executeCanonicalMultiSourceMetric({
      dataset,
      handoff,
      runtimeBoundary: await nativeRuntimeBoundary(),
      request: {
        schemaVersion: "lightbi.governed-metric-execution-request.v1",
        requestId: "phase8d1:gross-profit",
        plan: handoff.queryPlanning.plan,
        rows: [],
        runtimeSource: handoff.sourceBoundary!.runtimeSource,
        expectedRuntimeBinding: handoff.sourceBoundary!.runtimeSource.binding,
        artifactIdentity: handoff.artifactIdentity,
        expectedSourceRowCount: handoff.sourceBoundary!.sourceRowCount,
        groundTruth: { state: "verified", value: 3_075_721_244, tolerance: 0, provenance: "phase7r34_independent_oracle" },
      },
    });
    expect(result.status, JSON.stringify(result.blockers)).toBe("executed");
    expect(result.metricResult.groundTruthComparison).toMatchObject({ state: "exact_match", expected: 3_075_721_244, actual: 3_075_721_244 });
    expect(result.evidence).toMatchObject({ executionScope: "full_file_multisource", metricId: "gross_profit", relationshipArtifactId: dataset.relationshipArtifactId });
    expect(result.evidence?.sourceIds).toHaveLength(2);
    expect(result.evidence?.rowCounts).toEqual(expect.arrayContaining([
      expect.objectContaining({ expected: 1500, actual: 1500 }),
      expect.objectContaining({ expected: 1500, actual: 1500 }),
    ]));
  }, 120_000);

  it("fails the required identity, role, period, currency, cardinality and staleness probes closed", async () => {
    const base = await positiveDataset();
    const sales = base.dataset.orderedSourceMemberships.find((item) => item.sourceRole === "sales")!;
    const accounting = base.dataset.orderedSourceMemberships.find((item) => item.sourceRole === "accounting")!;
    const probes: Array<{ id: string; pass: boolean }> = [];
    const record = (id: string, pass: boolean) => probes.push({ id, pass });

    const staleFingerprint: CanonicalMultiSourceDatasetV1 = { ...base.dataset, orderedSourceMemberships: base.dataset.orderedSourceMemberships.map((item) => item.sourceRole === "sales" ? { ...item, sourceFingerprint: "stale" } : item) };
    record("stale_source_fingerprint", validateCanonicalMultiSourceDataset(staleFingerprint).some((item) => item.startsWith("stale_source_fingerprint")));
    const staleGeneration: CanonicalMultiSourceDatasetV1 = { ...base.dataset, orderedSourceMemberships: base.dataset.orderedSourceMemberships.map((item) => item.sourceRole === "sales" ? { ...item, profileGeneration: "stale" } : item) };
    record("stale_source_generation", validateCanonicalMultiSourceDataset(staleGeneration).some((item) => item.startsWith("stale_source_generation")));
    const missingMembership: CanonicalMultiSourceDatasetV1 = { ...base.dataset, orderedSourceMemberships: [accounting] };
    record("missing_required_source", validateCanonicalMultiSourceDataset(missingMembership).includes("multi_source_membership_incomplete"));
    const omittedPlan: CanonicalMultiSourceDatasetV1 = { ...base.dataset, analyses: [{ ...base.dataset.analyses[0], queryPlanSourceIds: [accounting.sourceId] }] };
    record("sales_omitted_from_plan", validateCanonicalMultiSourceDataset(omittedPlan).includes("multi_source_query_plan_omits_required_source"));
    const staleRelationship: CanonicalMultiSourceDatasetV1 = { ...base.dataset, relationshipArtifactId: "stale" };
    record("stale_relationship", validateCanonicalMultiSourceDataset(staleRelationship).includes("relationship_artifact_identity_mismatch"));
    const staleArtifact: CanonicalMultiSourceDatasetV1 = { ...base.dataset, orderedSourceMemberships: base.dataset.orderedSourceMemberships.map((item) => item.sourceRole === "sales" ? { ...item, sourceLocalArtifactId: "stale" } : item) };
    record("stale_source_local_artifact", validateCanonicalMultiSourceDataset(staleArtifact).some((item) => item.startsWith("stale_source_local_artifact")));
    const handoff = prepareCanonicalMultiSourceInvestigationHandoff(base.dataset, base.dataset.analyses[0].analysisId)!;
    record("old_handoff_after_rebuild", validateCanonicalMultiSourceInvestigationHandoff(handoff, { ...base.dataset, identity: "rebuilt" }).includes("multisource_handoff_artifact_superseded"));

    const without = async (member: typeof sales, evidenceType: string) => {
      const declaration = member.overlay.sourceEvidenceDeclarations.find((item) => item.evidenceType === evidenceType)!;
      const overlay = removeCanonicalEvidenceDeclaration(member.overlay, member.boundary, declaration.declarationId, "2026-07-22T02:00:00.000Z");
      const memberArtifact = artifact(member.sourceRole === "sales" ? base.sales : base.accounting, overlay);
      return buildCanonicalMultiSourceDataset({ multiSourceDatasetId: `negative-${evidenceType}`, members: [
        { artifact: memberArtifact, overlay, required: true, fullRows: member.sourceRole === "sales" ? base.sales.rows : base.accounting.rows },
        { artifact: member.sourceRole === "sales" ? accounting.artifact : sales.artifact, overlay: member.sourceRole === "sales" ? accounting.overlay : sales.overlay, required: true, fullRows: member.sourceRole === "sales" ? base.accounting.rows : base.sales.rows },
      ] });
    };
    for (const evidenceType of ["source_role", "document_identity", "reporting_period", "reporting_currency"]) {
      const result = await without(sales, evidenceType);
      record(`missing_sales_${evidenceType}`, result.status === "valid" && result.dataset.analyses[0].state === "blocked");
    }
    for (const evidenceType of ["source_role", "document_identity", "reporting_period", "reporting_currency"]) {
      const result = await without(accounting, evidenceType);
      record(`missing_accounting_${evidenceType}`, result.status === "valid" && result.dataset.analyses[0].state === "blocked");
    }

    const replaceEvidence = (member: typeof sales, evidenceType: string, value: CanonicalEvidenceValueV1) => {
      const declaration = member.overlay.sourceEvidenceDeclarations.find((item) => item.evidenceType === evidenceType)!;
      const removed = removeCanonicalEvidenceDeclaration(member.overlay, member.boundary, declaration.declarationId, "2026-07-22T02:10:00.000Z");
      return evidence(removed, member.boundary, value, "2026-07-22T02:11:00.000Z");
    };
    const mismatchedPeriodOverlay = replaceEvidence(accounting, "reporting_period", { kind: "reporting_period", start: "2026-06-01", end: "2026-06-30" });
    const mismatchedPeriod = await buildCanonicalMultiSourceDataset({ multiSourceDatasetId: "period-mismatch", members: [
      { artifact: sales.artifact, overlay: sales.overlay, required: true, fullRows: base.sales.rows },
      { artifact: artifact(base.accounting, mismatchedPeriodOverlay), overlay: mismatchedPeriodOverlay, required: true, fullRows: base.accounting.rows },
    ] });
    record("reporting_period_mismatch", mismatchedPeriod.status === "valid" && mismatchedPeriod.dataset.relationship.refusalReasons.includes("reporting_period_mismatch"));
    const mismatchedCurrencyOverlay = replaceEvidence(accounting, "reporting_currency", { kind: "reporting_currency", currency: "USD", monetaryColumns: ["Revenue_Credit", "COGS_Debit"] });
    const mismatchedCurrency = await buildCanonicalMultiSourceDataset({ multiSourceDatasetId: "currency-mismatch", members: [
      { artifact: sales.artifact, overlay: sales.overlay, required: true, fullRows: base.sales.rows },
      { artifact: artifact(base.accounting, mismatchedCurrencyOverlay), overlay: mismatchedCurrencyOverlay, required: true, fullRows: base.accounting.rows },
    ] });
    record("reporting_currency_mismatch", mismatchedCurrency.status === "valid" && mismatchedCurrency.dataset.relationship.refusalReasons.includes("currency_mismatch"));
    const duplicateRoleOverlay = replaceEvidence(accounting, "source_role", { kind: "source_role", role: "sales" });
    const duplicateRole = await buildCanonicalMultiSourceDataset({ multiSourceDatasetId: "duplicate-role", members: [
      { artifact: sales.artifact, overlay: sales.overlay, required: true, fullRows: base.sales.rows },
      { artifact: artifact(base.accounting, duplicateRoleOverlay), overlay: duplicateRoleOverlay, required: true, fullRows: base.accounting.rows },
    ] });
    record("duplicate_sales_role", duplicateRole.status === "valid" && duplicateRole.dataset.relationship.refusalReasons.includes("multiple_sales_sources_not_supported"));

    const mismatchedRows = base.accounting.rows.map((row, index) => index === 0 ? { ...row, OrderID: "UNRELATED-ORDER" } : row);
    const mismatch = await buildCanonicalMultiSourceDataset({ multiSourceDatasetId: "unrelated-content", members: [
      { artifact: sales.artifact, overlay: sales.overlay, required: true, fullRows: base.sales.rows },
      { artifact: accounting.artifact, overlay: accounting.overlay, required: true, fullRows: mismatchedRows },
    ] });
    record("same_headers_unrelated_content", mismatch.status === "valid" && mismatch.dataset.relationship.validationState !== "confirmed");
    const duplicateRows = base.accounting.rows.map((row, index) => index === 1 ? { ...row, orderid: base.accounting.rows[0].orderid } : row);
    const duplicate = await buildCanonicalMultiSourceDataset({ multiSourceDatasetId: "many-to-many", members: [
      { artifact: sales.artifact, overlay: sales.overlay, required: true, fullRows: base.sales.rows },
      { artifact: accounting.artifact, overlay: accounting.overlay, required: true, fullRows: duplicateRows },
    ] });
    record("forbidden_many_to_many", duplicate.status === "valid" && duplicate.dataset.relationship.validationState !== "confirmed");
    record("no_filename_role_inference", base.dataset.orderedSourceMemberships.every((item) => item.sourceRoleProvenance?.startsWith("evidence-declaration:")));
    record("legacy_fusion_absent", base.dataset.orderedSourceMemberships.every((item) => item.boundary.runtimeSource.kind === "local_files"));
    record("sample_rows_not_runtime", base.dataset.orderedSourceMemberships.every((item) => item.runtimeSource.sourceRowCount === item.fullFileProfile.sourceRowCount));
    record("result_lineage_all_sources", handoff.multiSource.sourceMemberships.length === handoff.multiSource.requiredSourceIds.length);
    record("action_requires_m3", base.dataset.analyses[0].state === "ready" && base.dataset.analyses[0].sourceLocalHandoff?.runtimePreflight.executionAllowed === true);
    record("relationship_not_ui_confirmed", base.dataset.relationship.evidenceReferences.some((item) => item.startsWith("pair:")) && base.dataset.relationship.decisionUseAuthorized === false);
    record("source_currency_scoped", sales.overlay.sourceEvidenceDeclarations.some((item) => item.evidenceType === "reporting_currency" && item.binding.sourceId === sales.sourceId));
    record("source_period_scoped", accounting.overlay.sourceEvidenceDeclarations.some((item) => item.evidenceType === "reporting_period" && item.binding.sourceId === accounting.sourceId));
    record("unrelated_optional_source_not_required", base.dataset.analyses[0].requiredSourceIds.length === 2);
    record("source_local_inventory_not_reinterpreted", base.dataset.analyses.every((item) => String(item.metricId) !== "inventory_on_hand"));

    expect(probes).toHaveLength(30);
    expect(probes.filter((item) => !item.pass), JSON.stringify(probes.filter((item) => !item.pass))).toEqual([]);
  }, 120_000);
});
