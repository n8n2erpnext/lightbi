import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileSourceCandidate } from "../source-preflight";
import { inspectLocalFile } from "../local-file-inspector";
import { createLocalCanonicalSourceBoundary } from "../home-source-boundary";
import { materializeRuntimeFilePayloads } from "../full-file-runtime-parser";
import { projectCanonicalDomainPerspectives } from "../canonical-source-candidate-projection";
import { listDomainCatalogs } from "../domain-knowledge-catalog";
import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";
import { executeCanonicalConsumerMetricRequest, getOrBuildCanonicalConsumerArtifact, prepareCanonicalInvestigationHandoff, resetCanonicalConsumerCacheForTests } from "./canonical-consumer-boundary";
import { presentCanonicalConsumerArtifact } from "./canonical-consumer-presentation-contract";
import { appendCanonicalEvidenceDeclaration, appendCanonicalMappingDecision, createCanonicalUserOverlay } from "./canonical-user-overlay";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function quote(value: string): string { return `"${value.trim().toLowerCase().replace(/"/g, '""')}"`; }
function literal(value: unknown): string {
  return value == null || value === ""
    ? "NULL"
    : typeof value === "number"
      ? Number.isFinite(value) ? String(value) : "NULL"
      : `'${String(value).replace(/'/g, "''")}'`;
}
function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(normalizeDuckDBValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeDuckDBValue(nested)]));
  }
  return value;
}
async function nodeDuckDBBoundary(rows: Record<string, unknown>[]): Promise<GovernedDuckDBBoundaryV1> {
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return { async execute(plan) {
    const connection = db.connect();
    let phase = "prepare";
    try {
      const governedColumns = new Set([
        ...plan.metricBindings,
        ...plan.groupingBindings,
        ...(plan.timeBinding ? [plan.timeBinding] : []),
      ].map((binding) => binding.physicalColumn.trim().toLowerCase()));
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
        .filter((column) => governedColumns.has(column.trim().toLowerCase()));
      const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : "VARCHAR");
      phase = "create_table";
      connection.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quote(column)} ${types[index]}`).join(",")})`);
      phase = "insert_rows";
      connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.map((row) => `(${columns.map((column) => literal(row[column])).join(",")})`).join(",")}`);
      let parameterIndex = 0;
      phase = "execute_plan";
      const table = connection.query(plan.sql.replace(/\?/g, () => literal(plan.parameters[parameterIndex++])));
      return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => normalizeDuckDBValue(row.toJSON()) as Record<string, unknown>), error: null, executionScope: "full_file", actualMaterializedRowCount: rows.length } as const;
    } catch (error) {
      return { engine: "duckdb", status: "failed", columns: [], rows: [], error: `${phase}:${error instanceof Error ? error.message : String(error)}`, executionScope: "full_file", actualMaterializedRowCount: rows.length } as const;
    } finally { connection.close(); }
  } };
}

const SOURCES = [
  "2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx",
  "bank-additional-full.xlsx",
  "Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx",
  "bcctnhapTTKT_19122024.xlsx",
  "bcctnhapTTKT_23122024.xlsx",
  "bcctnhapTTKT_24122024.xlsx",
  "DATA_XUAT.xlsx",
  "motodetail.xlsx",
  "PLU ALL FRESH 22.03.2021.xlsx",
  "Sample - Superstore for Tableau 9.x versions.xls",
  "TỒN DỰ KIẾN HUBLAN.xlsx",
  "World Bank Indicators.xlsx",
  "WorldCupPlayers.xlsx",
];

function mime(name: string): string {
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

describe("Beta sample-data canonical audit", () => {
  it.each(SOURCES)("%s is inspectable through the production canonical path", async (name) => {
    resetCanonicalConsumerCacheForTests();
    const bytes = readFileSync(join(process.cwd(), "../..", "sample data", name));
    const file = new File([bytes], name, { type: mime(name) });
    const candidate = createFileSourceCandidate(file);
    expect("rawUrl" in candidate).toBe(true);
    if (!("rawUrl" in candidate)) return;
    const inspected = await inspectLocalFile(candidate);
    expect(inspected.status).toBe("accessible");
    if (inspected.status !== "accessible") return;
    const metadata = inspected.metadata;
    const selected = metadata.is_workbook && metadata.default_sheet && metadata.sheets
      ? metadata.sheets[metadata.default_sheet]
      : metadata;
    const boundary = createLocalCanonicalSourceBoundary({
      datasetId: name,
      columns: selected.columns ?? [],
      semanticRows: selected.semantic_rows ?? [],
      semanticSample: selected.semantic_sample,
      profile: selected.canonical_full_file_profile,
      file,
      sheetName: metadata.is_workbook ? metadata.default_sheet : undefined,
    });
    expect(boundary).not.toBeNull();
    if (!boundary) return;
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: boundary.datasetId,
      sourceKind: "local_file",
      sourceLabel: name,
      columns: boundary.semanticSample.columns,
      rows: boundary.semanticSample.rows,
      sourceRowCount: boundary.sourceRowCount,
      sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
      sourceBoundary: boundary,
    });
    if (artifact.status !== "valid") {
      console.log(`BETA_SAMPLE_INVALID ${JSON.stringify({ name, blockers: artifact.blockers })}`);
    }
    expect(artifact.status).toBe("valid");
    if (artifact.status !== "valid") return;
    const presentation = presentCanonicalConsumerArtifact(artifact);
    const perspectives = projectCanonicalDomainPerspectives(artifact);
    if (name.startsWith("2017-06-22 DANH SACH XEP HANG")) {
      console.log(`BETA_PERFORMANCE_SEMANTIC_AUDIT ${JSON.stringify(
        {
          semantics: artifact.canonicalSource.semantic.columns
            .filter((column) => column.selectedCandidateId)
            .map((column) => ({
            physicalColumn: column.physicalColumn,
            finalState: column.finalState,
            selectedCandidateId: column.selectedCandidateId,
          })),
          headerRowIndex: artifact.canonicalSource.physical.sourceProfile.header.selectedHeaderRowIndex,
          sourceRows: artifact.canonicalSource.physical.sourceProfile.dataRegion.rowCount,
          identity: artifact.canonicalSource.grain.signature.identityBasis.selectedCandidateIds,
        },
      )}`);
    }
    const supportedDomains = new Set<string>(listDomainCatalogs().map((catalog) => catalog.id));
    const hasPerspectiveEligibleSignal = artifact.canonicalSource.semantic.columns.some((column) =>
      column.selectedCandidateId
      && ["confirmed", "probable"].includes(column.finalState)
      && SEMANTIC_SIGNAL_BY_ID.get(column.selectedCandidateId)?.domains.some((domain) => supportedDomains.has(domain)));
    if (hasPerspectiveEligibleSignal) expect(perspectives.length).toBeGreaterThan(0);
    if (name.startsWith("2017-06-22 DANH SACH XEP HANG")) {
      const performanceActions = artifact.questionGeneration.actionCandidates
        .filter((action) => action.metricId === "average_quality_score");
      console.log(`BETA_PERFORMANCE_POLICY_AUDIT ${JSON.stringify({
        metric: (() => {
          const metric = artifact.metricPreflight.metrics.find((item) => item.metricId === "average_quality_score");
          return metric && {
            state: metric.state,
            blockers: metric.blockers.map((blocker) => blocker.code),
            bindings: metric.selectedBindings.map((binding) => `${binding.semanticId}:${binding.physicalColumn}`),
            identity: metric.selectedIdentityCandidateId,
          };
        })(),
        questions: artifact.questionGeneration.candidateQuestions.filter((question) =>
          question.metricId === "average_quality_score").map((question) => ({
            id: question.questionId,
            state: question.questionState,
          })),
        actions: performanceActions.map((action) => action.questionId),
      })}`);
      expect(performanceActions.map((action) => action.questionId)).toEqual(expect.arrayContaining([
        "performance.average_quality_score.summary",
        "performance.average_quality_score.by_rank",
      ]));
      const performancePerspective = perspectives.find((perspective) => perspective.perspectiveId === "performance");
      expect(performancePerspective?.state).toBe("governed_action_available");
      const materialized = materializeRuntimeFilePayloads([{
        name,
        buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        sheetName: metadata.default_sheet,
        headerRowIndex: boundary.runtimeSource.files[0]?.headerRowIndex,
      }]);
      const runtimeRows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
      if (materialized.rowCount !== boundary.sourceRowCount) {
        console.log(`BETA_PERFORMANCE_RUNTIME_REGION_MISMATCH ${JSON.stringify({
          canonicalRows: boundary.sourceRowCount,
          runtimeRows: materialized.rowCount,
          first: runtimeRows.slice(0, 3),
          last: runtimeRows.slice(-3),
        })}`);
      }
      expect(materialized.rowCount).toBe(boundary.sourceRowCount);
      const rankingAction = performanceActions.find((action) =>
        action.questionId === "performance.average_quality_score.by_rank")!;
      const handoff = prepareCanonicalInvestigationHandoff(artifact, rankingAction.actionCandidateId);
      expect(handoff.queryPlanning.state).toBe("planned");
      if (handoff.queryPlanning.state === "planned") {
        const result = await executeCanonicalConsumerMetricRequest({
          schemaVersion: "lightbi.governed-metric-execution-request.v1",
          requestId: "beta:performance:average-quality-score-by-rank",
          plan: handoff.queryPlanning.plan,
          rows: runtimeRows,
          runtimeSource: boundary.runtimeSource,
          expectedRuntimeBinding: boundary.runtimeSource.binding,
          artifactIdentity: artifact.identity,
          expectedSourceRowCount: boundary.sourceRowCount,
          groundTruth: {
            state: "unavailable",
            value: null,
            tolerance: null,
            provenance: "beta_sample_data_has_no_governed_ground_truth",
          },
        }, await nodeDuckDBBoundary(runtimeRows));
        console.log(`BETA_PERFORMANCE_EXECUTION_AUDIT ${JSON.stringify({
          status: result.status,
          rows: result.rowCount,
          materialized: result.fullFileExecution?.actualMaterializedRowCount,
          columns: result.columns,
          error: result.error,
          limitations: result.limitations,
          sql: result.status === "failed" ? handoff.queryPlanning.plan.sql : undefined,
        })}`);
        expect(result.status).toBe("executed");
        expect(result.fullFileExecution?.actualMaterializedRowCount).toBe(boundary.sourceRowCount);
        expect(result.columns).toEqual(["performance_rank", "average_quality_score"]);
        expect(result.rows.length).toBeGreaterThan(0);
      }
    }
    if (name.startsWith("Sample - Superstore")) {
      const initialRevenuePerspective = perspectives.find((perspective) => perspective.perspectiveId === "revenue");
      expect(initialRevenuePerspective?.state).toBe("governed_questions_available");
      expect(initialRevenuePerspective?.actionCandidateIds).toEqual([]);
      let overlay = createCanonicalUserOverlay(boundary, "2026-07-28T00:00:00.000Z");
      for (const [physicalColumn, selectedCanonicalSignal, createdAt] of [
        ["Sales", "revenue", "2026-07-28T00:00:01.000Z"],
        ["Quantity", "quantity", "2026-07-28T00:00:02.000Z"],
      ] as const) {
        const column = artifact.canonicalSource.semantic.columns.find((item) => item.physicalColumn === physicalColumn);
        expect(column).toBeTruthy();
        overlay = appendCanonicalMappingDecision(overlay, boundary, {
          physicalColumn,
          sourceColumnIndex: column!.sourceColumnIndex,
          selectedCanonicalSignal,
          decisionType: "map_to_existing_signal",
          originalCandidateList: column!.candidateTraces.map((trace) => trace.candidateId),
          createdAt,
        });
      }
      overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
        evidenceType: "document_identity",
        value: { kind: "document_identity", physicalColumn: "Order ID" },
        scope: { level: "physical_column", physicalColumn: "Order ID" },
        createdAt: "2026-07-28T00:00:03.000Z",
      });
      for (const [physicalColumn, semanticId, createdAt] of [
        ["Sales", "revenue", "2026-07-28T00:00:04.000Z"],
        ["Quantity", "quantity", "2026-07-28T00:00:05.000Z"],
      ] as const) {
        overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
          evidenceType: "line_measure",
          value: { kind: "line_measure", physicalColumn, semanticId, rowIdentityPhysicalColumn: "Row ID" },
          scope: { level: "canonical_signal_binding", physicalColumn, canonicalSignal: semanticId },
          createdAt,
        });
      }
      overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
        evidenceType: "reporting_period",
        value: { kind: "reporting_period", start: "2014-01-01", end: "2017-12-31" },
        scope: { level: "dataset" },
        createdAt: "2026-07-28T00:00:06.000Z",
      });
      overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
        evidenceType: "reporting_currency",
        value: { kind: "reporting_currency", currency: "USD", monetaryColumns: ["Sales"] },
        scope: { level: "canonical_signal_binding", physicalColumn: "Sales", canonicalSignal: "revenue" },
        createdAt: "2026-07-28T00:00:07.000Z",
      });
      const governed = getOrBuildCanonicalConsumerArtifact({
        datasetId: boundary.datasetId,
        sourceKind: "local_file",
        sourceLabel: name,
        columns: boundary.semanticSample.columns,
        rows: boundary.semanticSample.rows,
        sourceRowCount: boundary.sourceRowCount,
        sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
        sourceBoundary: boundary,
        userOverlay: overlay,
      });
      expect(governed.status).toBe("valid");
      if (governed.status === "valid") {
        const actions = governed.questionGeneration.actionCandidates.filter((action) =>
          action.businessPerspectiveIds.includes("revenue"));
        console.log(`BETA_REVENUE_PREFLIGHT_AUDIT ${JSON.stringify({
          rows: boundary.sourceRowCount,
          grain: governed.canonicalSource.grain.signature.structuralForm.value,
          identity: governed.canonicalSource.grain.signature.identityBasis.selectedCandidateIds,
          currencyEvidenceCount: governed.canonicalSource.sourceEvidence?.currency.length ?? 0,
          overlayBlockers: governed.overlayValidation.blockers,
          metrics: governed.metricPreflight.metrics
            .filter((metric) => ["sales_revenue", "quantity_sold", "transaction_count"].includes(metric.metricId))
            .map((metric) => ({
              id: metric.metricId,
              state: metric.state,
              blockers: metric.blockers.map((blocker) => blocker.code),
              limitations: metric.limitations.map((limitation) => limitation.code),
            })),
          actions: actions.map((action) => action.questionId),
        })}`);
        const governedRevenuePerspective = projectCanonicalDomainPerspectives(governed)
          .find((perspective) => perspective.perspectiveId === "revenue");
        expect(governedRevenuePerspective?.state).toBe("governed_action_available");
        expect(actions.map((action) => action.questionId)).toEqual(expect.arrayContaining([
          "commerce.sales_revenue.over_time",
          "commerce.sales_revenue.by_product",
          "commerce.quantity_sold.over_time",
          "commerce.quantity_sold.by_product",
          "commerce.transaction_count.summary",
        ]));
        const materialized = materializeRuntimeFilePayloads([{
          name,
          buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          sheetName: metadata.default_sheet,
          headerRowIndex: boundary.runtimeSource.files[0]?.headerRowIndex,
        }]);
        const runtimeRows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
        expect(materialized.rowCount).toBe(boundary.sourceRowCount);
        const productAction = actions.find((action) =>
          action.questionId === "commerce.sales_revenue.by_product")!;
        const handoff = prepareCanonicalInvestigationHandoff(governed, productAction.actionCandidateId);
        expect(handoff.queryPlanning.state).toBe("planned");
        if (handoff.queryPlanning.state === "planned") {
          const result = await executeCanonicalConsumerMetricRequest({
            schemaVersion: "lightbi.governed-metric-execution-request.v1",
            requestId: "beta:revenue:sales-revenue-by-product",
            plan: handoff.queryPlanning.plan,
            rows: runtimeRows,
            runtimeSource: boundary.runtimeSource,
            expectedRuntimeBinding: boundary.runtimeSource.binding,
            artifactIdentity: governed.identity,
            expectedSourceRowCount: boundary.sourceRowCount,
            groundTruth: {
              state: "unavailable",
              value: null,
              tolerance: null,
              provenance: "beta_sample_data_has_no_governed_ground_truth",
            },
          }, await nodeDuckDBBoundary(runtimeRows));
          console.log(`BETA_REVENUE_EXECUTION_AUDIT ${JSON.stringify({
            status: result.status,
            rows: result.rowCount,
            materialized: result.fullFileExecution?.actualMaterializedRowCount,
            columns: result.columns,
            error: result.error,
          })}`);
          expect(result.status).toBe("executed");
          expect(result.fullFileExecution?.actualMaterializedRowCount).toBe(boundary.sourceRowCount);
          expect(result.columns).toEqual(["product", "sales_revenue"]);
          expect(result.rows.length).toBeGreaterThan(0);
        }
        const transactionAction = actions.find((action) =>
          action.questionId === "commerce.transaction_count.summary")!;
        const transactionHandoff = prepareCanonicalInvestigationHandoff(governed, transactionAction.actionCandidateId);
        expect(transactionHandoff.queryPlanning.state).toBe("planned");
        if (transactionHandoff.queryPlanning.state === "planned") {
          const result = await executeCanonicalConsumerMetricRequest({
            schemaVersion: "lightbi.governed-metric-execution-request.v1",
            requestId: "beta:revenue:transaction-count",
            plan: transactionHandoff.queryPlanning.plan,
            rows: runtimeRows,
            runtimeSource: boundary.runtimeSource,
            expectedRuntimeBinding: boundary.runtimeSource.binding,
            artifactIdentity: governed.identity,
            expectedSourceRowCount: boundary.sourceRowCount,
            groundTruth: {
              state: "unavailable",
              value: null,
              tolerance: null,
              provenance: "beta_sample_data_has_no_governed_ground_truth",
            },
          }, await nodeDuckDBBoundary(runtimeRows));
          console.log(`BETA_TRANSACTION_COUNT_EXECUTION_AUDIT ${JSON.stringify({
            status: result.status,
            rows: result.rowCount,
            materialized: result.fullFileExecution?.actualMaterializedRowCount,
            columns: result.columns,
            result: result.rows,
            error: result.error,
          })}`);
          expect(result.status).toBe("executed");
          expect(result.fullFileExecution?.actualMaterializedRowCount).toBe(boundary.sourceRowCount);
          expect(result.columns).toEqual(["transaction_count"]);
          expect(result.rows).toHaveLength(1);
        }
      }
    }
    if (
      name.startsWith("Bao_cao_chi_tiet_")
      || name.endsWith("HUBLAN.xlsx")
    ) {
      const initialInventoryPerspective = perspectives.find((perspective) => perspective.perspectiveId === "inventory");
      expect(["governed_questions_available", "governed_action_available"])
        .toContain(initialInventoryPerspective?.state);
      let governed = artifact;
      if (initialInventoryPerspective?.actionCandidateIds.length === 0) {
        const shipmentColumn = artifact.canonicalSource.semantic.columns.find((column) =>
          column.selectedCandidateId === "shipment" && ["confirmed", "probable"].includes(column.finalState));
        expect(shipmentColumn).toBeTruthy();
        let overlay = createCanonicalUserOverlay(boundary, "2026-07-28T00:00:00.000Z");
        overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
          evidenceType: "document_identity",
          value: { kind: "document_identity", physicalColumn: shipmentColumn!.physicalColumn },
          scope: { level: "physical_column", physicalColumn: shipmentColumn!.physicalColumn },
          createdAt: "2026-07-28T00:00:01.000Z",
        });
        const rebuilt = getOrBuildCanonicalConsumerArtifact({
          datasetId: boundary.datasetId,
          sourceKind: "local_file",
          sourceLabel: name,
          columns: boundary.semanticSample.columns,
          rows: boundary.semanticSample.rows,
          sourceRowCount: boundary.sourceRowCount,
          sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
          sourceBoundary: boundary,
          userOverlay: overlay,
        });
        expect(rebuilt.status).toBe("valid");
        if (rebuilt.status !== "valid") return;
        governed = rebuilt;
      }
      expect(governed.status).toBe("valid");
      if (governed.status === "valid") {
        const actions = governed.questionGeneration.actionCandidates.filter((action) =>
          action.metricId === "delivery_count"
          && action.businessPerspectiveIds.includes("inventory"));
        const governedInventoryPerspective = projectCanonicalDomainPerspectives(governed)
          .find((perspective) => perspective.perspectiveId === "inventory");
        expect(governedInventoryPerspective?.state).toBe("governed_action_available");
        const expectedQuestions = [
          "inventory.shipment_count.by_current_location",
          "inventory.shipment_count.by_service_group",
          ...(name.startsWith("Bao_cao_chi_tiet_")
            ? [
                "inventory.shipment_count.by_load_status",
                "inventory.shipment_count.by_stock_age",
              ]
            : []),
        ];
        expect(actions.map((action) => action.questionId)).toEqual(expect.arrayContaining(expectedQuestions));
        console.log(`BETA_INVENTORY_SHIPMENT_AUDIT ${JSON.stringify({
          name,
          sourceRows: boundary.sourceRowCount,
          temporalMode: governed.canonicalSource.grain.signature.temporalMode.value,
          userConfirmedIdentity: (governed.canonicalSource.sourceEvidence?.documentIdentities?.length ?? 0) > 0,
          actions: actions.map((action) => action.questionId),
          metric: (() => {
            const metric = governed.metricPreflight.metrics.find((item) => item.metricId === "delivery_count");
            return metric && {
              state: metric.state,
              identity: metric.selectedBindings[0]?.physicalColumn,
              limitations: metric.limitations.map((limitation) => limitation.code),
            };
          })(),
        })}`);
        if (name.startsWith("Bao_cao_chi_tiet_")) {
          const materialized = materializeRuntimeFilePayloads([{
            name,
            buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            sheetName: metadata.default_sheet,
            headerRowIndex: boundary.runtimeSource.files[0]?.headerRowIndex,
          }]);
          const runtimeRows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
          expect(materialized.rowCount).toBe(boundary.sourceRowCount);
          const locationAction = actions.find((action) =>
            action.questionId === "inventory.shipment_count.by_current_location")!;
          const handoff = prepareCanonicalInvestigationHandoff(governed, locationAction.actionCandidateId);
          expect(handoff.queryPlanning.state).toBe("planned");
          if (handoff.queryPlanning.state === "planned") {
            const result = await executeCanonicalConsumerMetricRequest({
              schemaVersion: "lightbi.governed-metric-execution-request.v1",
              requestId: "beta:inventory:shipment-count-by-current-location",
              plan: handoff.queryPlanning.plan,
              rows: runtimeRows,
              runtimeSource: boundary.runtimeSource,
              expectedRuntimeBinding: boundary.runtimeSource.binding,
              artifactIdentity: governed.identity,
              expectedSourceRowCount: boundary.sourceRowCount,
              groundTruth: {
                state: "unavailable",
                value: null,
                tolerance: null,
                provenance: "beta_sample_data_has_no_governed_ground_truth",
              },
            }, await nodeDuckDBBoundary(runtimeRows));
            console.log(`BETA_INVENTORY_EXECUTION_AUDIT ${JSON.stringify({
              status: result.status,
              rows: result.rowCount,
              materialized: result.fullFileExecution?.actualMaterializedRowCount,
              columns: result.columns,
              error: result.error,
              limitations: result.limitations,
            })}`);
            expect(result.status).toBe("executed");
            expect(result.fullFileExecution?.actualMaterializedRowCount).toBe(boundary.sourceRowCount);
            expect(result.columns).toEqual(["current_location", "delivery_count"]);
            expect(result.rows.length).toBeGreaterThan(0);
          }
        }
      }
    }
    if (name.startsWith("bcctnhapTTKT_")) {
      const initialOperationsPerspective = perspectives.find((perspective) => perspective.perspectiveId === "operations");
      expect(initialOperationsPerspective?.state).toBe("governed_questions_available");
      expect(initialOperationsPerspective?.actionCandidateIds).toEqual([]);
      const tripColumn = artifact.canonicalSource.semantic.columns.find((column) =>
        column.selectedCandidateId === "trip" && ["confirmed", "probable"].includes(column.finalState));
      expect(tripColumn).toBeTruthy();
      let overlay = createCanonicalUserOverlay(boundary, "2026-07-28T00:00:00.000Z");
      overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, {
        evidenceType: "document_identity",
        value: { kind: "document_identity", physicalColumn: tripColumn!.physicalColumn },
        scope: { level: "physical_column", physicalColumn: tripColumn!.physicalColumn },
        createdAt: "2026-07-28T00:00:01.000Z",
      });
      const governed = getOrBuildCanonicalConsumerArtifact({
        datasetId: boundary.datasetId,
        sourceKind: "local_file",
        sourceLabel: name,
        columns: boundary.semanticSample.columns,
        rows: boundary.semanticSample.rows,
        sourceRowCount: boundary.sourceRowCount,
        sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
        sourceBoundary: boundary,
        userOverlay: overlay,
      });
      expect(governed.status).toBe("valid");
      if (governed.status === "valid") {
        const actions = governed.questionGeneration.actionCandidates.filter((action) => action.metricId === "trip_count");
        const governedOperationsPerspective = projectCanonicalDomainPerspectives(governed)
          .find((perspective) => perspective.perspectiveId === "operations");
        expect(governedOperationsPerspective?.state).toBe("governed_action_available");
        expect(governedOperationsPerspective?.actionCandidateIds).toEqual(
          expect.arrayContaining(actions.map((action) => action.actionCandidateId)),
        );
        console.log(`BETA_TRIP_EVIDENCE_AUDIT ${JSON.stringify({
          name,
          evidence: governed.canonicalSource.sourceEvidence?.documentIdentities,
          actions: actions.map((action) => action.questionId),
          metric: governed.metricPreflight.metrics.find((metric) => metric.metricId === "trip_count"),
        })}`);
        expect(actions.map((action) => action.questionId)).toEqual(expect.arrayContaining([
          "operations.trip_count.summary",
          "operations.trip_count.by_route",
          "operations.trip_count.by_driver",
          "operations.trip_count.by_on_time_status",
        ]));
        if (name === "bcctnhapTTKT_19122024.xlsx") {
          const materialized = materializeRuntimeFilePayloads([{
            name,
            buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            sheetName: metadata.default_sheet,
            headerRowIndex: boundary.runtimeSource.files[0]?.headerRowIndex,
          }]);
          const runtimeRows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
          expect(materialized.rowCount).toBe(boundary.sourceRowCount);
          const routeAction = actions.find((action) => action.questionId === "operations.trip_count.by_route")!;
          const handoff = prepareCanonicalInvestigationHandoff(governed, routeAction.actionCandidateId);
          expect(handoff.queryPlanning.state).toBe("planned");
          if (handoff.queryPlanning.state === "planned") {
            const result = await executeCanonicalConsumerMetricRequest({
              schemaVersion: "lightbi.governed-metric-execution-request.v1",
              requestId: "beta:operations:trip-count-by-route",
              plan: handoff.queryPlanning.plan,
              rows: runtimeRows,
              runtimeSource: boundary.runtimeSource,
              expectedRuntimeBinding: boundary.runtimeSource.binding,
              artifactIdentity: governed.identity,
              expectedSourceRowCount: boundary.sourceRowCount,
              groundTruth: {
                state: "unavailable",
                value: null,
                tolerance: null,
                provenance: "beta_sample_data_has_no_governed_ground_truth",
              },
            }, await nodeDuckDBBoundary(runtimeRows));
            console.log(`BETA_TRIP_EXECUTION_AUDIT ${JSON.stringify({
              status: result.status,
              rows: result.rowCount,
              materialized: result.fullFileExecution?.actualMaterializedRowCount,
              columns: result.columns,
              error: result.error,
              limitations: result.limitations,
            })}`);
            expect(result.status).toBe("executed");
            expect(result.fullFileExecution?.actualMaterializedRowCount).toBe(boundary.sourceRowCount);
            expect(result.columns).toEqual(["route", "trip_count"]);
            expect(result.rows.length).toBeGreaterThan(0);
          }
        }
      }
    }
    console.log(`BETA_SAMPLE_AUDIT ${JSON.stringify({
      name,
      rows: boundary.sourceRowCount,
      columns: boundary.semanticSample.columns.length,
      grain: artifact.canonicalSource.grain.signature.structuralForm.value,
      grainSignature: {
        structuralForm: artifact.canonicalSource.grain.signature.structuralForm,
        identityBasis: artifact.canonicalSource.grain.signature.identityBasis,
        temporalMode: artifact.canonicalSource.grain.signature.temporalMode,
        aggregationForm: artifact.canonicalSource.grain.signature.aggregationForm,
      },
      counts: presentation.counts,
      signals: artifact.canonicalSource.semantic.columns
        .filter((column) => column.selectedCandidateId && ["confirmed", "probable"].includes(column.finalState))
        .map((column) => column.selectedCandidateId),
      signalBindings: artifact.canonicalSource.semantic.columns
        .filter((column) => column.selectedCandidateId && ["confirmed", "probable"].includes(column.finalState))
        .map((column) => ({
          physicalColumn: column.physicalColumn,
          signal: column.selectedCandidateId,
          state: column.finalState,
        })),
      perspectives: perspectives.map((perspective) => ({
        id: perspective.perspectiveId,
        state: perspective.state,
        signals: perspective.matchedSignalIds,
        questions: perspective.questionIds.length,
        actions: perspective.actionCandidateIds.length,
      })),
      questionStates: artifact.questionGeneration.candidateQuestions.map((question) => ({
        id: question.questionId,
        metric: question.metricId,
        state: question.questionState,
        preflight: question.metricPreflightState,
        blockers: question.blockers.map((blocker) => blocker.code),
      })),
    })}`);
  }, 120_000);
});
